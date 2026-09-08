export async function onRequestPut({ request, env, params }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const p = await request.json();

  await env.DB
    .prepare(
      "UPDATE products SET name=?, category=?, price=?, image=?, active=? WHERE id=?"
    )
    .bind(
      String(p.name).slice(0, 120),
      String(p.category).slice(0, 60),
      Number(p.price),
      String(p.image || "").slice(0, 500),
      p.active === 0 ? 0 : 1,
      params.id
    )
    .run();

  return Response.json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  await env.DB
    .prepare("DELETE FROM products WHERE id=?")
    .bind(params.id)
    .run();

  return Response.json({ ok: true });
}
