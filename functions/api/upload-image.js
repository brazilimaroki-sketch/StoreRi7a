export async function onRequest({ request, env }) {
  // السماح فقط بطلب POST
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" }
    });
  }

  // التحقق من مفتاح الإدارة
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  // التحقق من إعدادات Supabase
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    return new Response("Supabase configuration missing", {
      status: 500
    });
  }

  try {
    // قراءة الصورة المرسلة من لوحة الإدارة
    const form = await request.formData();
    const file = form.get("image");

    if (!file || typeof file === "string") {
      return new Response("Image required", {
        status: 400
      });
    }

    // أنواع الصور المسموح بها
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

    // تحديد امتداد الصورة
    let ext = "jpg";

    if (file.type === "image/png") {
      ext = "png";
    }

    if (file.type === "image/webp") {
      ext = "webp";
    }

    // إنشاء اسم فريد للصورة
    const filename =
      "product-" +
      Date.now() +
      "-" +
      crypto.randomUUID() +
      "." +
      ext;

    const bucket = "product-images";

    // رابط رفع الصورة إلى Supabase
    const uploadUrl =
      env.SUPABASE_URL +
      "/storage/v1/object/" +
      bucket +
      "/" +
      filename;

    // رفع الصورة
    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SECRET_KEY,
        "Content-Type": file.type,
        "x-upsert": "false"
      },
      body: file
    });

    const result = await upload.text();

    // إظهار خطأ Supabase إذا فشل الرفع
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

    // إنشاء الرابط العمومي للصورة
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
