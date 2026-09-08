export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare("SELECT key,value FROM settings")
    .all();

  return Response.json(
    Object.fromEntries(results.map(x => [x.key, x.value]))
  );
}

export async function onRequestPut({ request, env }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const settings = await request.json();

  for (const [key, value] of Object.entries(settings)) {
    if (!["store_name", "whatsapp", "currency"].includes(key)) {
      continue;
    }

    await env.DB
      .prepare(
        "INSERT INTO settings(key,value) VALUES(?,?) " +
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value"
      )
      .bind(key, String(value))
      .run();
  }

  return Response.json({ ok: true });
}
