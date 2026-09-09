export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare(`
      SELECT
        id,
        name,
        category,
        price,
        image,
        active,
        sale_price,
        discount,
        description,
        brand,
        size
      FROM products
      WHERE active=1
      ORDER BY id DESC
    `)
    .all();

  return Response.json(results || []);
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const p = await request.json();

  const price = Number(p.price);
  const salePrice =
    p.sale_price === null || p.sale_price === undefined || p.sale_price === ""
      ? null
      : Number(p.sale_price);

  const discount =
    p.discount === null || p.discount === undefined || p.discount === ""
      ? 0
      : Number(p.discount);

  if (!p.name || !p.category || !Number.isFinite(price) || price < 0) {
    return new Response("Invalid product", { status: 400 });
  }

  if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)) {
    return new Response("Invalid sale price", { status: 400 });
  }

  const r = await env.DB
    .prepare(`
      INSERT INTO products(
        name,
        category,
        price,
        image,
        active,
        sale_price,
        discount,
        description,
        brand,
        size
      )
      VALUES(?,?,?,?,1,?,?,?,?,?)
    `)
    .bind(
      String(p.name).slice(0, 120),
      String(p.category).slice(0, 60),
      price,
      String(p.image || "").slice(0, 1000),
      salePrice,
      Number.isFinite(discount) ? Math.max(0, Math.min(100, Math.round(discount))) : 0,
      String(p.description || "").slice(0, 3000),
      String(p.brand || "").slice(0, 120),
      String(p.size || "").slice(0, 80)
    )
    .run();

  return Response.json({
    ok: true,
    id: r.meta.last_row_id
  });
}
