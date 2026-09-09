export async function onRequestPut({ request, env, params }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response("Invalid id", { status: 400 });
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

  await env.DB
    .prepare(`
      UPDATE products
      SET
        name=?,
        category=?,
        price=?,
        image=?,
        active=?,
        sale_price=?,
        discount=?,
        description=?,
        brand=?,
        size=?
      WHERE id=?
    `)
    .bind(
      String(p.name).slice(0, 120),
      String(p.category).slice(0, 60),
      price,
      String(p.image || "").slice(0, 1000),
      Number(p.active) === 0 ? 0 : 1,
      salePrice,
      Number.isFinite(discount) ? Math.max(0, Math.min(100, Math.round(discount))) : 0,
      String(p.description || "").slice(0, 3000),
      String(p.brand || "").slice(0, 120),
      String(p.size || "").slice(0, 80),
      id
    )
    .run();

  return Response.json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response("Invalid id", { status: 400 });
  }

  await env.DB
    .prepare("DELETE FROM products WHERE id=?")
    .bind(id)
    .run();

  return Response.json({ ok: true });
}
