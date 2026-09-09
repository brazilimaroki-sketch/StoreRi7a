export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" }
    });
  }

  // حماية الرفع بمفتاح الإدارة
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  // التأكد من إعداد Supabase
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Supabase configuration missing", {
      status: 500
    });
  }

  try {
    const form = await request.formData();
    const file = form.get("image");

    if (!file || typeof file === "string") {
      return new Response("Image required", {
        status: 400
      });
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowed.includes(file.type)) {
      return new Response("Invalid image type", {
        status: 400
      });
    }

    // الحد الأقصى 5MB
    if (file.size > 5 * 1024 * 1024) {
      return new Response("Image too large", {
        status: 400
      });
    }

    let ext = "jpg";

    if (file.type === "image/png") {
      ext = "png";
    }

    if (file.type === "image/webp") {
      ext = "webp";
    }

    const filename =
      "product-" +
      Date.now() +
      "-" +
      crypto.randomUUID() +
      "." +
      ext;

    const bucket = "product-images";

    const uploadUrl =
      env.SUPABASE_URL +
      "/storage/v1/object/" +
      bucket +
      "/" +
      filename;

    const upload = await fetch(uploadUrl, {
      method: "POST",

      headers: {
        "Authorization":
          "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,

        "apikey":
          env.SUPABASE_SERVICE_ROLE_KEY,

        "Content-Type":
          file.type,

        "x-upsert":
          "false"
      },

      body: file
    });

    const result = await upload.text();

    if (!upload.ok) {
      return new Response(
        "Supabase error " +
        upload.status +
        ": " +
        result,
        {
          status: 502
        }
      );
    }

    const publicUrl =
      env.SUPABASE_URL +
      "/storage/v1/object/public/" +
      bucket +
      "/" +
      filename;

    return Response.json({
      ok: true,
      url: publicUrl
    });

  } catch (e) {
    return new Response(
      "Upload error: " + e.message,
      {
        status: 500
      }
    );
  }
}
