let cart=[];
let PRODUCT_LIST=[];
let currentSearch="";

async function loadStoreData(){
  try{
    const r=await fetch('/api/products?ts='+Date.now(),{
      cache:'no-store',
      headers:{accept:'application/json'}
    });
    if(!r.ok) throw new Error('HTTP '+r.status);

    const raw=await r.json();
    const rows=Array.isArray(raw)?raw:(Array.isArray(raw.results)?raw.results:[]);

    PRODUCT_LIST=rows
      .filter(p=>p && Number(p.active)!==0)
      .map(p=>({
        id:Number(p.id),
        name:String(p.name||'منتج'),
        category:String(p.category||''),
        price:Number(p.price||0),
        image:String(p.image||''),
        sale_price:
          p.sale_price!==undefined && p.sale_price!==null && p.sale_price!==""
            ? Number(p.sale_price)
            : null,
        discount:
          p.discount!==undefined && p.discount!==null && p.discount!==""
            ? Number(p.discount)
            : 0
      }));
  }catch(e){
    console.error("Products API:",e);
    PRODUCT_LIST=[];
  }

  try{
    const r=await fetch('/api/settings?ts='+Date.now(),{cache:'no-store'});
    if(r.ok){
      const s=await r.json();
      STORE_CONFIG.storeName=s.store_name||STORE_CONFIG.storeName;
      STORE_CONFIG.whatsapp=s.whatsapp||STORE_CONFIG.whatsapp;
      STORE_CONFIG.currency=s.currency||STORE_CONFIG.currency;
    }
  }catch(e){}

  renderAll();
  updateCart();
}

function normalizeCategory(c){
  c=String(c||'').trim();
  if(['عطور نسائية','نسائية','عطر نسائي'].includes(c)) return 'عطور نسائية';
  if(['عطور رجالية','رجالية','عطر رجالي'].includes(c)) return 'عطور رجالية';
  if(['تجميل','مواد التجميل','مستحضرات التجميل'].includes(c)) return 'تجميل';
  return c;
}

function finalPrice(p){
  return p.sale_price!==null && p.sale_price>=0 && p.sale_price<p.price
    ? p.sale_price
    : p.price;
}

function discountPercent(p){
  if(p.discount && p.discount>0) return Math.round(p.discount);
  if(p.sale_price!==null && p.sale_price<p.price && p.price>0){
    return Math.round((1-p.sale_price/p.price)*100);
  }
  return 0;
}

function isDiscounted(p){
  return discountPercent(p)>0 || (p.sale_price!==null && p.sale_price<p.price);
}

function matchesSearch(p){
  if(!currentSearch) return true;
  const q=currentSearch.toLowerCase();
  return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
}

function renderAll(){
  const list=PRODUCT_LIST.filter(matchesSearch);
  renderDiscounts(list);
  renderSection('womenGrid',list,'عطور نسائية');
  renderSection('menGrid',list,'عطور رجالية');
  renderSection('beautyGrid',list,'تجميل');
}

function renderDiscounts(list){
  const discounted=list.filter(isDiscounted).slice(0,4);
  const grid=document.getElementById('discountGrid');

  grid.innerHTML=discounted.length
    ? discounted.map(p=>card(p,true)).join('')
    : '<div class="empty">لا توجد منتجات مخفضة حالياً. أضف سعر التخفيض من لوحة الإدارة.</div>';
}

function renderSection(id,list,category){
  const items=list
    .filter(p=>normalizeCategory(p.category)===category)
    .slice(0,8);

  document.getElementById(id).innerHTML=items.length
    ? items.map(p=>card(p,false)).join('')
    : '<div class="empty">لا توجد منتجات في هذا القسم حالياً.</div>';
}

function card(p,isSale){
  const fp=finalPrice(p);
  const d=discountPercent(p);

  return `<article class="card">
    ${isSale && d ? `<span class="saleBadge">-${d}%</span>` : ''}
    <div class="photo">${image(p)}</div>
    <div class="info">
      <span class="category">${esc(normalizeCategory(p.category))}</span>
      <h3>${esc(p.name)}</h3>
      <span class="price">${price(fp)} ${esc(STORE_CONFIG.currency)}</span>
      ${isSale && fp<p.price
        ? `<span class="oldPrice">${price(p.price)} ${esc(STORE_CONFIG.currency)}</span>`
        : ''}
      <button class="add" onclick="add(${p.id})">🛒 أضف إلى السلة</button>
    </div>
  </article>`;
}

function image(p){
  const i=String(p.image||'').trim();
  if(!i) return '✨';

  if(i.startsWith('http://') || i.startsWith('https://') || i.startsWith('/')){
    return `<img src="${attr(i)}" alt="${attr(p.name)}" loading="lazy"
      onerror="this.parentElement.innerHTML='✨'">`;
  }

  return esc(i);
}

function searchAll(v){
  currentSearch=String(v||'').trim();
  renderAll();
  if(currentSearch) smartScroll('discounts',80);
}

/* عند الضغط على الأقسام نظهر جزءاً من القسم السابق مثل الصورة المطلوبة */
function smartScroll(id, preview=180){
  const target=document.getElementById(id);
  const header=document.querySelector('.siteHeader');
  if(!target) return;

  if(id==='top'){
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }

  const headerH=header ? header.offsetHeight : 120;
  const absoluteTop=target.getBoundingClientRect().top + window.scrollY;
  const y=Math.max(0, absoluteTop - headerH - preview);

  window.scrollTo({top:y,behavior:'smooth'});
  history.replaceState(null,'','#'+id);
}

document.querySelectorAll('.mainNav a').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();

    document.querySelectorAll('.mainNav a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');

    const id=(a.getAttribute('href')||'#top').replace('#','') || 'top';
    smartScroll(id, id==='top' ? 0 : 180);
  });
});

function esc(v){
  return String(v).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
function attr(v){return esc(v)}
function price(v){
  const n=Number(v||0);
  return Number.isInteger(n)?n:n.toFixed(2);
}

function add(id){
  const p=PRODUCT_LIST.find(x=>x.id===id);
  if(!p) return;
  const i=cart.find(x=>x.id===id);
  i ? i.qty++ : cart.push({...p,qty:1});
  updateCart();
  openCart();
}

function removeItem(id){
  cart=cart.filter(x=>x.id!==id);
  updateCart();
}

function updateCart(){
  document.getElementById('cartCount').textContent=
    cart.reduce((s,x)=>s+x.qty,0);

  document.getElementById('cartItems').innerHTML=
    cart.length
      ? cart.map(x=>`
        <div class="cartItem">
          <div>
            <b>${esc(x.name)}</b><br>
            <small>${x.qty} × ${price(finalPrice(x))} ${esc(STORE_CONFIG.currency)}</small>
          </div>
          <button onclick="removeItem(${x.id})">حذف</button>
        </div>`).join('')
      : '<p>السلة فارغة حالياً.</p>';

  document.getElementById('total').textContent=
    price(cart.reduce((s,x)=>s+finalPrice(x)*x.qty,0))+' '+STORE_CONFIG.currency;
}

function openCart(){
  document.getElementById('cart').classList.add('open');
  document.getElementById('cartShade').classList.add('show');
}
function closeCart(){
  document.getElementById('cart').classList.remove('open');
  document.getElementById('cartShade').classList.remove('show');
}

function checkout(){
  if(!cart.length) return alert('السلة فارغة');

  const total=cart.reduce((s,x)=>s+finalPrice(x)*x.qty,0);
  const lines=cart.map(x=>
    `• ${x.name} × ${x.qty} = ${price(finalPrice(x)*x.qty)} ${STORE_CONFIG.currency}`
  ).join('\n');

  const msg=`السلام عليكم، بغيت نطلب من ${STORE_CONFIG.storeName}:\n\n${lines}\n\nالمجموع: ${price(total)} ${STORE_CONFIG.currency}`;
  window.open(
    `https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,
    '_blank'
  );
}

loadStoreData();
