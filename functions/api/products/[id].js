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

export async function onRequestPut({ request, env, params }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id=Number(params.id);
  if(!Number.isInteger(id) || id<=0){
    return new Response("Invalid id",{status:400});
  }

  try{
    const p=cleanProduct(await request.json());

    if(!p.name || !p.category){
      return new Response("Invalid product",{status:400});
    }

    await env.DB.prepare(`
      UPDATE products
      SET name=?, category=?, price=?, image=?, active=?, sale_price=?, discount=?
      WHERE id=?
    `).bind(
      p.name,p.category,p.price,p.image,p.active,p.sale_price,p.discount,id
    ).run();

    return Response.json({ok:true});
  }catch(e){
    return new Response(e.message || "Invalid product",{status:400});
  }
}

export async function onRequestDelete({ request, env, params }) {
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id=Number(params.id);
  if(!Number.isInteger(id) || id<=0){
    return new Response("Invalid id",{status:400});
  }

  await env.DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();
  return Response.json({ok:true});
}
