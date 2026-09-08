let cart=[];
let PRODUCT_LIST=[];

async function loadStoreData(){
  try{
    const r=await fetch('/api/products?ts='+Date.now(),{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const raw=await r.json();
    const rows=Array.isArray(raw)?raw:(Array.isArray(raw.results)?raw.results:[]);
    PRODUCT_LIST=rows.filter(p=>Number(p.active)!==0).map(p=>({
      id:Number(p.id),
      name:String(p.name||'منتج'),
      category:String(p.category||''),
      price:Number(p.price||0),
      image:String(p.image||''),
      sale_price:p.sale_price!==undefined&&p.sale_price!==null?Number(p.sale_price):null,
      discount:p.discount!==undefined&&p.discount!==null?Number(p.discount):null
    }));
  }catch(e){
    PRODUCT_LIST=[];
  }

  try{
    const sR=await fetch('/api/settings?ts='+Date.now(),{cache:'no-store'});
    if(sR.ok){
      const s=await sR.json();
      STORE_CONFIG.storeName=s.store_name||STORE_CONFIG.storeName;
      STORE_CONFIG.whatsapp=s.whatsapp||STORE_CONFIG.whatsapp;
      STORE_CONFIG.currency=s.currency||STORE_CONFIG.currency;
    }
  }catch(e){}

  renderAll();
  updateCart();
}

function renderAll(){
  renderDiscounts();
  renderSection("womenGrid","عطور نسائية");
  renderSection("menGrid","عطور رجالية");
  renderSection("beautyGrid","تجميل");
}

function renderDiscounts(){
  const discounted=PRODUCT_LIST.filter(p=>(p.sale_price!==null&&p.sale_price<p.price)||(p.discount&&p.discount>0)).slice(0,4);
  const fallback=discounted.length?discounted:PRODUCT_LIST.slice(0,4);
  document.getElementById("discountGrid").innerHTML=fallback.map(p=>productCard(p,true)).join("") || "<p>لا توجد منتجات حالياً.</p>";
}

function renderSection(id,category){
  const list=PRODUCT_LIST.filter(p=>p.category===category).slice(0,8);
  document.getElementById(id).innerHTML=list.map(p=>productCard(p,false)).join("") || "<p>لا توجد منتجات في هذا القسم حالياً.</p>";
}

function productCard(p,isSale){
  const finalPrice=(p.sale_price!==null&&p.sale_price<p.price)?p.sale_price:p.price;
  const discount=p.discount&&p.discount>0?p.discount:(p.sale_price!==null&&p.sale_price<p.price?Math.round((1-p.sale_price/p.price)*100):0);
  return `<article class="card">
    ${isSale&&discount?`<span class="saleBadge">-${discount}%</span>`:""}
    <div class="photo">${renderImage(p)}</div>
    <div class="info">
      <span class="category">${esc(p.category)}</span>
      <h3>${esc(p.name)}</h3>
      <span class="price">${formatPrice(finalPrice)} ${esc(STORE_CONFIG.currency)}</span>
      ${isSale&&finalPrice<p.price?`<span class="oldPrice">${formatPrice(p.price)} ${esc(STORE_CONFIG.currency)}</span>`:""}
      <button class="add" onclick="add(${p.id})">🛒 أضف إلى السلة</button>
    </div>
  </article>`;
}

function renderImage(p){
  const img=String(p.image||"").trim();
  if(!img)return "✨";
  if(img.startsWith("http://")||img.startsWith("https://")||img.startsWith("/")){
    return `<img src="${attr(img)}" alt="${attr(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='✨'">`;
  }
  return esc(img);
}

function searchAll(v){
  const q=String(v||"").trim().toLowerCase();
  if(!q){renderAll();return;}
  const filtered=PRODUCT_LIST.filter(p=>String(p.name).toLowerCase().includes(q)||String(p.category).toLowerCase().includes(q));
  const html=filtered.map(p=>productCard(p,false)).join("")||"<p>لا توجد نتائج.</p>";
  document.getElementById("discountGrid").innerHTML=html;
  document.getElementById("womenGrid").innerHTML="";
  document.getElementById("menGrid").innerHTML="";
  document.getElementById("beautyGrid").innerHTML="";
  document.getElementById("discounts").scrollIntoView({behavior:"smooth"});
}

function esc(v){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function attr(v){return esc(v)}
function formatPrice(v){const n=Number(v||0);return Number.isInteger(n)?n:n.toFixed(2)}

function add(id){
  const p=PRODUCT_LIST.find(x=>x.id===id);
  if(!p)return;
  const i=cart.find(x=>x.id===id);
  i?i.qty++:cart.push({...p,qty:1});
  updateCart();
  openCart();
}
function removeItem(id){cart=cart.filter(x=>x.id!==id);updateCart()}
function updateCart(){
  document.getElementById("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
  document.getElementById("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div><b>${esc(x.name)}</b><br><small>${x.qty} × ${formatPrice(x.sale_price!==null&&x.sale_price<x.price?x.sale_price:x.price)} ${esc(STORE_CONFIG.currency)}</small></div><button onclick="removeItem(${x.id})">حذف</button></div>`).join(""):"<p>السلة فارغة حالياً.</p>";
  document.getElementById("total").textContent=cart.reduce((s,x)=>s+(x.sale_price!==null&&x.sale_price<x.price?x.sale_price:x.price)*x.qty,0)+" "+STORE_CONFIG.currency;
}
function openCart(){document.getElementById("cart").classList.add("open");document.getElementById("cartShade").classList.add("show")}
function closeCart(){document.getElementById("cart").classList.remove("open");document.getElementById("cartShade").classList.remove("show")}
function checkout(){
  if(!cart.length)return alert("السلة فارغة");
  const total=cart.reduce((s,x)=>s+(x.sale_price!==null&&x.sale_price<x.price?x.sale_price:x.price)*x.qty,0);
  const lines=cart.map(x=>{
    const price=(x.sale_price!==null&&x.sale_price<x.price)?x.sale_price:x.price;
    return `• ${x.name} × ${x.qty} = ${price*x.qty} ${STORE_CONFIG.currency}`;
  }).join("\\n");
  const msg=`السلام عليكم، بغيت نطلب من ${STORE_CONFIG.storeName}:\\n\\n${lines}\\n\\nالمجموع: ${total} ${STORE_CONFIG.currency}`;
  window.open(`https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,"_blank");
}

loadStoreData();