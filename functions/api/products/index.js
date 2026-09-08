function cleanProduct(p){
  const price=Number(p.price);
  let salePrice =
    p.sale_price===null || p.sale_price===undefined || p.sale_price===""
      ? null
      : Number(p.sale_price);

  let discount =
    p.discount===null || p.discount===undefined || p.discount===""
      ? 0
      : Number(p.discount);

  if(!Number.isFinite(price) || price<0) throw new Error("Invalid price");

  if(salePrice!==null){
    if(!Number.isFinite(salePrice) || salePrice<0 || salePrice>=price){
      throw new Error("Invalid sale price");
    }
    if(!discount && price>0){
      discount=Math.round((1-salePrice/price)*100);
    }
  }else{
    discount=0;
  }

  return {
    name:String(p.name||"").trim().slice(0,120),
    category:String(p.category||"").trim().slice(0,60),
    price,
    image:String(p.image||"").trim().slice(0,500),
    sale_price:salePrice,
    discount:Math.max(0,Math.min(100,Math.round(discount||0))),
    active:p.active===0 ? 0 : 1
  };
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(`
    SELECT id,name,category,price,image,active,sale_price,discount
    FROM products
    WHERE active=1
    ORDER BY id DESC
  `).all();

  return Response.json(results);
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  try{
    const p=cleanProduct(await request.json());

    if(!p.name || !p.category){
      return new Response("Invalid product", { status: 400 });
    }

    const r=await env.DB.prepare(`
      INSERT INTO products(name,category,price,image,active,sale_price,discount)
      VALUES(?,?,?,?,?,?,?)
    `).bind(
      p.name,p.category,p.price,p.image,p.active,p.sale_price,p.discount
    ).run();

    return Response.json({ok:true,id:r.meta.last_row_id});
  }catch(e){
    return new Response(e.message || "Invalid product",{status:400});
  }
}
