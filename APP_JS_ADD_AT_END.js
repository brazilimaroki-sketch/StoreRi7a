
/* ===== StoreRi7a Product Page V3 ===== */
let STORE_CURRENT_PRODUCT = null;
let STORE_PRODUCT_LIST = [];

function _money(v){ return `${Number(v||0).toFixed(Number(v)%1?2:0)} DH`; }
function _salePrice(p){
  const regular=Number(p.price||0), sale=Number(p.sale_price||0);
  return sale>0 && sale<regular ? sale : regular;
}
function _catKey(category=''){
  const c=String(category).trim();
  if(['عطور نسائية','نسائية','عطر نسائي'].includes(c)) return 'women';
  if(['عطور رجالية','رجالية','عطر رجالي'].includes(c)) return 'men';
  if(['مواد التجميل','تجميل','مستحضرات التجميل'].includes(c)) return 'beauty';
  return 'discounts';
}
function _catLabel(key){
  return {women:'عطور نسائية',men:'عطور رجالية',beauty:'مواد التجميل',discounts:'المنتجات المخفضة'}[key] || 'الرئيسية';
}
function _sizeText(v){
  const s=String(v||'').trim();
  if(!s) return '—';
  if(/[a-zA-Z\u0600-\u06FF]/.test(s)) return s;
  return `${s} ml`;
}
function _imageHTML(p){
  const im=String(p.image||'').trim();
  if(/^https?:\/\//i.test(im)||im.startsWith('/')) return `<img src="${im.replace(/"/g,'&quot;')}" alt="${String(p.name||'منتج').replace(/"/g,'&quot;')}">`;
  if(/\.(png|jpe?g|webp|gif)$/i.test(im)) return `<img src="${im.replace(/"/g,'&quot;')}" alt="${String(p.name||'منتج').replace(/"/g,'&quot;')}">`;
  return `<span class="fallbackEmoji">${im||'✨'}</span>`;
}
async function loadProductPageV3(){
  if(!document.getElementById('productView')) return;
  const id=new URLSearchParams(location.search).get('id');
  const loading=document.getElementById('loadingBox'), error=document.getElementById('errorBox');
  if(!id){ loading.hidden=true; error.hidden=false; error.textContent='المنتج غير محدد.'; return; }
  try{
    const r=await fetch('/api/products',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    STORE_PRODUCT_LIST=await r.json();
    const p=STORE_PRODUCT_LIST.find(x=>String(x.id)===String(id));
    if(!p) throw new Error('Not found');
    STORE_CURRENT_PRODUCT=p;
    const regular=Number(p.price||0), final=_salePrice(p);
    const saving=Math.max(0,regular-final);
    const pct=regular>0&&saving>0 ? Math.round(saving/regular*100) : Number(p.discount||0);
    document.title=`${p.name} - StoreRi7a`;
    document.getElementById('productImage').innerHTML=_imageHTML(p);
    document.getElementById('productCategory').textContent=p.category||'';
    document.getElementById('productName').textContent=p.name||'';
    document.getElementById('currentPrice').textContent=_money(final);
    const old=document.getElementById('oldPrice');
    old.textContent=saving>0?_money(regular):''; old.hidden=!saving;
    const save=document.getElementById('savingBox');
    save.textContent=saving>0?`توفير ${_money(saving)}`:''; save.hidden=!saving;
    const badge=document.getElementById('discountBadge');
    badge.textContent=pct>0?`-${pct}%`:''; badge.hidden=!(pct>0);
    document.getElementById('productBrand').textContent=p.brand||'—';
    document.getElementById('productSize').textContent=_sizeText(p.size);
    document.getElementById('productDescription').textContent=p.description||'لا يوجد وصف لهذا المنتج حالياً.';
    const key=_catKey(p.category);
    document.getElementById('backText').textContent=`الرجوع إلى ${_catLabel(key)}`;
    renderSimilarV3(p,key);
    loading.hidden=true; document.getElementById('productView').hidden=false;
  }catch(e){
    console.error(e); loading.hidden=true; error.hidden=false;
  }
}
function renderSimilarV3(current,key){
  const similar=STORE_PRODUCT_LIST.filter(p=>String(p.id)!==String(current.id)&&_catKey(p.category)===key).slice(0,4);
  const section=document.getElementById('similarSection'), grid=document.getElementById('similarGrid');
  if(!similar.length){ section.hidden=true; return; }
  grid.innerHTML=similar.map(p=>`<a class="similarCard" href="/product?id=${encodeURIComponent(p.id)}"><div class="similarImage">${_imageHTML(p)}</div><div class="similarBody"><small>${p.category||''}</small><h3>${p.name||''}</h3><strong>${_money(_salePrice(p))}</strong></div></a>`).join('');
  section.hidden=false;
}
function backToCategory(){
  if(!STORE_CURRENT_PRODUCT){ location.href='/'; return; }
  location.href=`/category?cat=${encodeURIComponent(_catKey(STORE_CURRENT_PRODUCT.category))}`;
}
async function shareProduct(){
  if(!STORE_CURRENT_PRODUCT) return;
  const data={title:STORE_CURRENT_PRODUCT.name||'StoreRi7a',text:`شاهد ${STORE_CURRENT_PRODUCT.name||'هذا المنتج'} على StoreRi7a`,url:location.href};
  try{
    if(navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(location.href); alert('تم نسخ رابط المنتج'); }
  }catch(e){ if(e?.name!=='AbortError') console.error(e); }
}
function addCurrentToCart(){
  if(!STORE_CURRENT_PRODUCT) return;
  if(typeof addToCart==='function') return addToCart(STORE_CURRENT_PRODUCT.id);
  const cart=JSON.parse(localStorage.getItem('cart')||'[]');
  cart.push({...STORE_CURRENT_PRODUCT,price:_salePrice(STORE_CURRENT_PRODUCT)});
  localStorage.setItem('cart',JSON.stringify(cart));
  alert('تمت إضافة المنتج إلى السلة');
}
function orderCurrentWhatsApp(){
  if(!STORE_CURRENT_PRODUCT) return;
  const phone=(window.STORE_CONFIG&&STORE_CONFIG.whatsapp)||'';
  const text=`السلام عليكم، أريد طلب:\n${STORE_CURRENT_PRODUCT.name}\nالسعر: ${_money(_salePrice(STORE_CURRENT_PRODUCT))}\n${location.href}`;
  if(!phone){ alert('أضف رقم WhatsApp في config.js'); return; }
  location.href=`https://wa.me/${String(phone).replace(/\D/g,'')}?text=${encodeURIComponent(text)}`;
}
function productSearch(e){
  if(e.key==='Enter'&&e.target.value.trim()) location.href=`/?search=${encodeURIComponent(e.target.value.trim())}`;
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadProductPageV3);
else loadProductPageV3();
