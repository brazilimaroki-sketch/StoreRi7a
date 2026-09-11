const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store"
    }
  });

function cleanText(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizePhone(value) {
  return String(value ?? "")
    .replace(/[^\d+]/g, "")
    .slice(0, 30);
}

function normalizeItems(value) {
  if (!Array.isArray(value)) return [];

  const map = new Map();

  for (const row of value.slice(0, 50)) {
    const productId = Number(row?.product_id ?? row?.id);
    const quantity = Math.floor(Number(row?.quantity ?? row?.qty ?? 1));

    if (!Number.isInteger(productId) || productId <= 0) continue;
    if (!Number.isInteger(quantity) || quantity <= 0) continue;

    const safeQty = Math.min(quantity, 20);
    map.set(productId, Math.min((map.get(productId) || 0) + safeQty, 20));
  }

  return [...map.entries()]
    .map(([product_id, quantity]) => ({ product_id, quantity }))
    .slice(0, 20);
}

function finalPrice(row) {
  const price = Number(row.price || 0);
  const sale = row.sale_price;

  if (
    sale !== null &&
    sale !== undefined &&
    sale !== "" &&
    Number.isFinite(Number(sale)) &&
    Number(sale) >= 0 &&
    Number(sale) < price
  ) {
    return Number(sale);
  }

  return price;
}

async function requireAdmin(request, env) {
  const supplied = request.headers.get("x-admin-key") || "";
  return Boolean(env.ADMIN_KEY && supplied === env.ADMIN_KEY);
}

/* =====================================================
   GET /api/orders
   Admin only: list orders with their items
===================================================== */
export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results: orders } = await env.DB.prepare(`
    SELECT
      id,
      customer_name,
      customer_phone,
      city,
      address,
      total,
      status,
      notes,
      created_at,
      updated_at
    FROM orders
    ORDER BY id DESC
    LIMIT 300
  `).all();

  const list = orders || [];
  if (!list.length) return json([]);

  const ids = list.map(o => Number(o.id)).filter(Number.isInteger);
  const placeholders = ids.map(() => "?").join(",");

  const { results: items } = await env.DB.prepare(`
    SELECT
      id,
      order_id,
      product_id,
      product_name,
      price,
      quantity
    FROM order_items
    WHERE order_id IN (${placeholders})
    ORDER BY id ASC
  `).bind(...ids).all();

  const byOrder = new Map();
  for (const item of items || []) {
    const key = Number(item.order_id);
    if (!byOrder.has(key)) byOrder.set(key, []);
    byOrder.get(key).push(item);
  }

  return json(
    list.map(order => ({
      ...order,
      items: byOrder.get(Number(order.id)) || []
    }))
  );
}

/* =====================================================
   POST /api/orders
   Public: customer creates an order
   IMPORTANT: prices are recalculated from D1, not trusted
   from the browser.
===================================================== */
export async function onRequestPost({ request, env }) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const customerName = cleanText(body.customer_name, 120);
  const customerPhone = normalizePhone(body.customer_phone);
  const city = cleanText(body.city, 120);
  const address = cleanText(body.address, 500);
  const notes = cleanText(body.notes, 1000);
  const requestedItems = normalizeItems(body.items);

  if (customerName.length < 2) {
    return json({ ok: false, error: "الاسم غير صالح" }, 400);
  }

  if (customerPhone.replace(/\D/g, "").length < 8) {
    return json({ ok: false, error: "رقم الهاتف غير صالح" }, 400);
  }

  if (city.length < 2) {
    return json({ ok: false, error: "المدينة مطلوبة" }, 400);
  }

  if (address.length < 3) {
    return json({ ok: false, error: "العنوان مطلوب" }, 400);
  }

  if (!requestedItems.length) {
    return json({ ok: false, error: "السلة فارغة" }, 400);
  }

  const ids = requestedItems.map(x => x.product_id);
  const placeholders = ids.map(() => "?").join(",");

  const { results: products } = await env.DB.prepare(`
    SELECT
      id,
      name,
      price,
      sale_price,
      active
    FROM products
    WHERE id IN (${placeholders})
      AND active = 1
  `).bind(...ids).all();

  const productMap = new Map(
    (products || []).map(p => [Number(p.id), p])
  );

  if (productMap.size !== requestedItems.length) {
    return json({
      ok: false,
      error: "واحد أو أكثر من المنتجات لم يعد متوفراً"
    }, 409);
  }

  const resolvedItems = [];
  let total = 0;

  for (const item of requestedItems) {
    const product = productMap.get(item.product_id);
    const unitPrice = finalPrice(product);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return json({ ok: false, error: "ثمن منتج غير صالح" }, 400);
    }

    const lineTotal = unitPrice * item.quantity;
    total += lineTotal;

    resolvedItems.push({
      product_id: Number(product.id),
      product_name: String(product.name || "منتج").slice(0, 120),
      price: unitPrice,
      quantity: item.quantity
    });
  }

  total = Math.round((total + Number.EPSILON) * 100) / 100;

  const inserted = await env.DB.prepare(`
    INSERT INTO orders(
      customer_name,
      customer_phone,
      city,
      address,
      total,
      status,
      notes,
      created_at,
      updated_at
    )
    VALUES(?,?,?,?,?,'new',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    RETURNING id, created_at
  `).bind(
    customerName,
    customerPhone,
    city,
    address,
    total,
    notes
  ).first();

  if (!inserted?.id) {
    return json({ ok: false, error: "تعذر إنشاء الطلب" }, 500);
  }

  try {
    await env.DB.batch(
      resolvedItems.map(item =>
        env.DB.prepare(`
          INSERT INTO order_items(
            order_id,
            product_id,
            product_name,
            price,
            quantity
          )
          VALUES(?,?,?,?,?)
        `).bind(
          Number(inserted.id),
          item.product_id,
          item.product_name,
          item.price,
          item.quantity
        )
      )
    );
  } catch (error) {
    // Avoid leaving an empty order if item insertion fails.
    try {
      await env.DB.prepare("DELETE FROM orders WHERE id=?")
        .bind(Number(inserted.id))
        .run();
    } catch {}

    console.error("Order items insert failed:", error);
    return json({ ok: false, error: "تعذر حفظ منتجات الطلب" }, 500);
  }

  return json({
    ok: true,
    order_id: Number(inserted.id),
    status: "new",
    total,
    created_at: inserted.created_at,
    customer: {
      name: customerName,
      phone: customerPhone,
      city,
      address
    },
    items: resolvedItems
  }, 201);
}
