const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store"
    }
  });

const ALLOWED_STATUSES = new Set([
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled"
]);

function requireAdmin(request, env) {
  const supplied = request.headers.get("x-admin-key") || "";
  return Boolean(env.ADMIN_KEY && supplied === env.ADMIN_KEY);
}

function validId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/* =====================================================
   GET /api/orders/:id
   Admin only
===================================================== */
export async function onRequestGet({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id = validId(params.id);
  if (!id) return json({ ok: false, error: "Invalid id" }, 400);

  const order = await env.DB.prepare(`
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
    WHERE id=?
  `).bind(id).first();

  if (!order) {
    return json({ ok: false, error: "Order not found" }, 404);
  }

  const { results: items } = await env.DB.prepare(`
    SELECT
      id,
      order_id,
      product_id,
      product_name,
      price,
      quantity
    FROM order_items
    WHERE order_id=?
    ORDER BY id ASC
  `).bind(id).all();

  return json({
    ...order,
    items: items || []
  });
}

/* =====================================================
   PUT /api/orders/:id
   Admin only: update status and/or notes
===================================================== */
export async function onRequestPut({ request, env, params }) {
  if (!requireAdmin(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id = validId(params.id);
  if (!id) return json({ ok: false, error: "Invalid id" }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const current = await env.DB.prepare(
    "SELECT id,status,notes FROM orders WHERE id=?"
  ).bind(id).first();

  if (!current) {
    return json({ ok: false, error: "Order not found" }, 404);
  }

  const nextStatus =
    body.status === undefined
      ? String(current.status)
      : String(body.status);

  if (!ALLOWED_STATUSES.has(nextStatus)) {
    return json({ ok: false, error: "Invalid status" }, 400);
  }

  const nextNotes =
    body.notes === undefined
      ? String(current.notes || "")
      : String(body.notes || "").trim().slice(0, 1000);

  await env.DB.prepare(`
    UPDATE orders
    SET status=?, notes=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).bind(nextStatus, nextNotes, id).run();

  return json({
    ok: true,
    id,
    status: nextStatus,
    notes: nextNotes
  });
}
