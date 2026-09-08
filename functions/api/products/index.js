export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare("SELECT * FROM products WHERE active=1 ORDER BY id DESC")
    .all();

  return Response.json(results);
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const p = await request.json();

  if (!p.name || !p.category || Number(p.price) < 0) {
    return new Response("Invalid product", { status: 400 });
  }

  const r = await env.DB
    .prepare(
      "INSERT INTO products(name,category,price,image,active) VALUES(?,?,?,?,1)"
    )
    .bind(
      String(p.name).slice(0, 120),
      String(p.category).slice(0, 60),
      Number(p.price),
      String(p.image || "").slice(0, 500)
    )
    .run();

  return Response.json({
    ok: true,
    id: r.meta.last_row_id
  });
}
