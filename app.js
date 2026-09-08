let selected="الكل";
let cart=[];
let PRODUCT_LIST=[];
let dbLoaded=false;

const labels={
  "الكل":"جميع المنتجات",
  "عطور نسائية":"عطور نسائية",
  "عطور رجالية":"عطور رجالية",
  "تجميل":"مواد التجميل"
};

async function loadStoreData(){
  const status=document.getElementById("dbStatus");
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
      image:String(p.image||'')
    }));
    dbLoaded=true;
    if(status) status.textContent=PRODUCT_LIST.length?`تم تحميل ${PRODUCT_LIST.length} منتج.`:"لا توجد منتجات مضافة بعد.";
  }catch(e){
    PRODUCT_LIST=[];
    dbLoaded=false;
    if(status){
      status.classList.add("error");
      status.textContent="تعذر جلب المنتجات من قاعدة البيانات.";
    }
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

  renderProducts();
  renderFeatured();
  updateCart();
}

function markMenu(key){
  document.querySelectorAll(".horizontalMenu button").forEach(b=>b.classList.toggle("active",b.dataset.menu===key));
}

function showHome(e){
  if(e) e.preventDefault();
  document.getElementById("homeView").classList.remove("hidden");
  document.getElementById("catalogView").classList.add("hidden");
  markMenu("home");
  window.scrollTo({top:0,behavior:"smooth"});
}

function showCategory(e,cat){
  if(e) e.preventDefault();
  selected=cat;
  document.getElementById("homeView").classList.add("hidden");
  document.getElementById("catalogView").classList.remove("hidden");
  document.getElementById("catalogTitle").textContent=labels[cat]||"المنتجات";
  document.querySelectorAll(".catalogTabs button").forEach(b=>b.classList.toggle("active",b.dataset.cat===cat));
  markMenu(cat);
  renderProducts();
  window.scrollTo({top:0,behavior:"smooth"});
}

function showOffers(e){
  if(e) e.preventDefault();
  showHome(null);
  markMenu("offers");
  setTimeout(()=>document.getElementById("offersSection").scrollIntoView({behavior:"smooth"}),50);
}

function showContact(e){
  if(e) e.preventDefault();
  showHome(null);
  markMenu("contact");
  setTimeout(()=>document.getElementById("contactSection").scrollIntoView({behavior:"smooth"}),50);
}

document.querySelectorAll(".catalogTabs button").forEach(b=>{
  b.onclick=()=>{
    selected=b.dataset.cat;
    document.querySelectorAll(".catalogTabs button").forEach(x=>x.classList.toggle("active",x===b));
    document.getElementById("catalogTitle").textContent=labels[selected]||"المنتجات";
    renderProducts();
    window.scrollTo({top:0,behavior:"smooth"});
  };
});

function syncSearch(v){
  const a=document.getElementById("search");
  const b=document.getElementById("searchTop");
  if(a&&a.value!==v)a.value=v;
  if(b&&b.value!==v)b.value=v;

  if(document.getElementById("catalogView").classList.contains("hidden")){
    showCategory(null,"الكل");
  }else{
    renderProducts();
  }
}

function productCard(p){
  return `<article class="card">
    <div class="photo">${renderImage(p)}</div>
    <div class="info">
      <span class="category">${esc(p.category)}</span>
      <h3>${esc(p.name)}</h3>
      <span class="price">${formatPrice(p.price)} ${esc(STORE_CONFIG.currency)}</span>
      <button class="add" onclick="add(${p.id})">🛒 أضف إلى السلة</button>
    </div>
  </article>`;
}

function renderProducts(){
  const grid=document.getElementById("grid");
  const q=(document.getElementById("search")?.value||"").trim().toLowerCase();
  if(!dbLoaded){grid.innerHTML="";return;}
  const list=PRODUCT_LIST.filter(p=>(selected==="الكل"||p.category===selected)&&String(p.name).toLowerCase().includes(q));
  grid.innerHTML=list.length?list.map(productCard).join(""):"<p>لا توجد منتجات في هذا القسم حالياً.</p>";
}

function renderFeatured(){
  const g=document.getElementById("featuredGrid");
  if(!g)return;
  const list=PRODUCT_LIST.slice(0,6);
  g.innerHTML=list.length?list.map(productCard).join(""):"<p>أضف منتجات من لوحة الإدارة لتظهر هنا.</p>";
}

function renderImage(p){
  const img=String(p.image||"").trim();
  if(!img)return "✨";
  if(img.startsWith("http://")||img.startsWith("https://")||img.startsWith("/")){
    return `<img src="${attr(img)}" alt="${attr(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='✨'">`;
  }
  return esc(img);
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
  document.getElementById("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div><b>${esc(x.name)}</b><br><small>${x.qty} × ${formatPrice(x.price)} ${esc(STORE_CONFIG.currency)}</small></div><button onclick="removeItem(${x.id})">حذف</button></div>`).join(""):"<p>السلة فارغة حالياً.</p>";
  document.getElementById("total").textContent=cart.reduce((s,x)=>s+x.price*x.qty,0)+" "+STORE_CONFIG.currency;
}
function openCart(){document.getElementById("cart").classList.add("open");document.getElementById("cartShade").classList.add("show")}
function closeCart(){document.getElementById("cart").classList.remove("open");document.getElementById("cartShade").classList.remove("show")}
function openWhatsApp(){window.open(`https://wa.me/${STORE_CONFIG.whatsapp}`,"_blank")}
function checkout(){
  if(!cart.length)return alert("السلة فارغة");
  const total=cart.reduce((s,x)=>s+x.price*x.qty,0);
  const lines=cart.map(x=>`• ${x.name} × ${x.qty} = ${x.price*x.qty} ${STORE_CONFIG.currency}`).join("\n");
  const msg=`السلام عليكم، بغيت نطلب من ${STORE_CONFIG.storeName}:\n\n${lines}\n\nالمجموع: ${total} ${STORE_CONFIG.currency}`;
  window.open(`https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,"_blank");
}

loadStoreData();