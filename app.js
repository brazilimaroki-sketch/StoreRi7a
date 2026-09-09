let cart=[];
let PRODUCT_LIST=[];
let currentSearch="";
let STORE_CURRENT_PRODUCT=null;
let PRODUCT_IMAGES=[];
let currentImageIndex=0;
let lightboxScale=1;
let lightboxPanX=0, lightboxPanY=0;
let dragStart=null;

function loadSavedCart(){
  try{const saved=JSON.parse(localStorage.getItem('storeri7a_cart')||'[]');cart=Array.isArray(saved)?saved:[]}catch(e){cart=[]}
}
function saveCart(){try{localStorage.setItem('storeri7a_cart',JSON.stringify(cart))}catch(e){}}

function parseImages(v){
  if(Array.isArray(v)) return v.filter(Boolean);
  if(typeof v==='string'&&v.trim()){
    try{const a=JSON.parse(v);if(Array.isArray(a))return a.filter(Boolean)}catch(e){}
  }
  return [];
}

async function loadStoreData(){
  loadSavedCart();
  try{
    const r=await fetch('/api/products?ts='+Date.now(),{cache:'no-store',headers:{accept:'application/json'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const raw=await r.json();
    const rows=Array.isArray(raw)?raw:(Array.isArray(raw.results)?raw.results:[]);
    PRODUCT_LIST=rows.filter(p=>p&&Number(p.active)!==0).map(p=>({
      id:Number(p.id),name:String(p.name||'منتج'),category:String(p.category||''),price:Number(p.price||0),
      image:String(p.image||''),images:parseImages(p.images),
      sale_price:p.sale_price!==undefined&&p.sale_price!==null&&p.sale_price!==''?Number(p.sale_price):null,
      discount:p.discount!==undefined&&p.discount!==null&&p.discount!==''?Number(p.discount):0,
      description:String(p.description||''),brand:String(p.brand||''),size:String(p.size||'')
    }));
  }catch(e){console.error(e);PRODUCT_LIST=[]}
  try{
    const r=await fetch('/api/settings?ts='+Date.now(),{cache:'no-store'});
    if(r.ok){const s=await r.json();STORE_CONFIG.storeName=s.store_name||STORE_CONFIG.storeName;STORE_CONFIG.whatsapp=s.whatsapp||STORE_CONFIG.whatsapp;STORE_CONFIG.currency=s.currency||STORE_CONFIG.currency}
  }catch(e){}
  renderCurrentPage();updateCart();
}

function normalizeCategory(c){
  c=String(c||'').trim();
  if(['عطور نسائية','نسائية','عطر نسائي'].includes(c))return'عطور نسائية';
  if(['عطور رجالية','رجالية','عطر رجالي'].includes(c))return'عطور رجالية';
  if(['تجميل','مواد التجميل','مستحضرات التجميل'].includes(c))return'تجميل';
  return c;
}
function categoryKeyFromName(c){const n=normalizeCategory(c);if(n==='عطور نسائية')return'women';if(n==='عطور رجالية')return'men';if(n==='تجميل')return'beauty';return'discounts'}
function finalPrice(p){return p.sale_price!==null&&p.sale_price>=0&&p.sale_price<p.price?p.sale_price:p.price}
function discountPercent(p){if(p.discount>0)return Math.round(p.discount);if(p.sale_price!==null&&p.sale_price<p.price&&p.price>0)return Math.round((1-p.sale_price/p.price)*100);return 0}
function isDiscounted(p){return discountPercent(p)>0||(p.sale_price!==null&&p.sale_price<p.price)}
function matchesSearch(p){if(!currentSearch)return true;const q=currentSearch.toLowerCase();return[p.name,p.category,p.brand,p.size,p.description].some(v=>String(v||'').toLowerCase().includes(q))}
function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function attr(v){return esc(v)}
function price(v){const n=Number(v||0);return Number.isInteger(n)?n:n.toFixed(2)}
function sizeText(v){const s=String(v||'').trim();if(!s)return'—';return/[a-zA-Z\u0600-\u06FF]/.test(s)?s:s+' ml'}

function renderCurrentPage(){
  if(document.getElementById('productView'))renderProductPage();
  else if(document.getElementById('categoryGrid'))renderCategoryPage();
  else{renderHome();setupHomeScrollNav()}
}

function renderHome(){
  const list=PRODUCT_LIST.filter(matchesSearch);
  renderDiscounts(list);renderSection('womenGrid',list,'عطور نسائية',6);renderSection('menGrid',list,'عطور رجالية',6);renderSection('beautyGrid',list,'تجميل',6);
}
function renderDiscounts(list){
  const grid=document.getElementById('discountGrid');if(!grid)return;
  const items=list.filter(isDiscounted).slice(0,6);
  grid.innerHTML=items.length?items.map(p=>card(p,true)).join(''):'<div class="empty">لا توجد منتجات مخفضة حالياً.</div>';
}
function renderSection(id,list,category,limit=6){
  const grid=document.getElementById(id);if(!grid)return;
  const items=list.filter(p=>normalizeCategory(p.category)===category).slice(0,limit);
  grid.innerHTML=items.length?items.map(p=>card(p,false)).join(''):'<div class="empty">لا توجد منتجات في هذا القسم حالياً.</div>';
}
function setupHomeScrollNav(){
  document.querySelectorAll('.mainNav a[href^="#"]').forEach(a=>{
    if(a.dataset.scrollReady==='1')return;a.dataset.scrollReady='1';
    a.addEventListener('click',e=>{e.preventDefault();document.querySelectorAll('.mainNav a').forEach(x=>x.classList.remove('active'));a.classList.add('active');const id=(a.getAttribute('href')||'#top').replace('#','')||'top';smartScroll(id,id==='top'?0:180)})
  })
}
function smartScroll(id,preview=180){
  const t=document.getElementById(id),h=document.querySelector('.siteHeader');if(!t)return;
  if(id==='top'){window.scrollTo({top:0,behavior:'smooth'});history.replaceState(null,'',location.pathname);return}
  const y=Math.max(0,t.getBoundingClientRect().top+scrollY-(h?h.offsetHeight:120)-preview);
  window.scrollTo({top:y,behavior:'smooth'});history.replaceState(null,'','#'+id)
}

function getCategoryConfig(){
  const cat=new URLSearchParams(location.search).get('cat')||'women';
  const map={
    women:{title:'العطور النسائية',eyebrow:'FOR HER',subtitle:'جميع العطور النسائية المتوفرة',filter:p=>normalizeCategory(p.category)==='عطور نسائية'},
    men:{title:'العطور الرجالية',eyebrow:'FOR HIM',subtitle:'جميع العطور الرجالية المتوفرة',filter:p=>normalizeCategory(p.category)==='عطور رجالية'},
    beauty:{title:'مواد التجميل',eyebrow:'BEAUTY',subtitle:'جميع منتجات مواد التجميل المتوفرة',filter:p=>normalizeCategory(p.category)==='تجميل'},
    discounts:{title:'منتجات مخفضة',eyebrow:'SPECIAL OFFERS',subtitle:'جميع المنتجات المتوفرة بتخفيض',filter:p=>isDiscounted(p)}
  };
  return{key:map[cat]?cat:'women',...(map[cat]||map.women)}
}
function renderCategoryPage(){
  const cfg=getCategoryConfig();document.title=cfg.title+' - StoreRi7a';
  if(document.getElementById('categoryTitle'))document.getElementById('categoryTitle').textContent=cfg.title;
  if(document.getElementById('categoryEyebrow'))document.getElementById('categoryEyebrow').textContent=cfg.eyebrow;
  if(document.getElementById('categorySubtitle'))document.getElementById('categorySubtitle').textContent=cfg.subtitle;
  const items=PRODUCT_LIST.filter(matchesSearch).filter(cfg.filter),grid=document.getElementById('categoryGrid'),empty=document.getElementById('categoryEmpty');
  if(items.length){grid.innerHTML=items.map(p=>card(p,isDiscounted(p))).join('');if(empty)empty.style.display='none'}else{grid.innerHTML='';if(empty)empty.style.display='block'}
}

function productUrl(id){return'/product?id='+encodeURIComponent(id)}
function card(p,isSale){
  const fp=finalPrice(p),d=discountPercent(p);
  return`<article class="card">${isSale&&d?`<span class="saleBadge">-${d}%</span>`:''}
  <a class="productLink" href="${productUrl(p.id)}"><div class="photo">${image(p)}</div></a>
  <div class="info"><span class="category">${esc(normalizeCategory(p.category))}</span>
  <a class="productLink" href="${productUrl(p.id)}"><h3>${esc(p.name)}</h3></a>
  <div class="priceRow"><span class="price">${price(fp)} ${esc(STORE_CONFIG.currency)}</span>${fp<p.price?`<span class="oldPrice">${price(p.price)} ${esc(STORE_CONFIG.currency)}</span>`:''}</div>
  <button class="add" onclick="add(${p.id})">🛒 أضف إلى السلة</button></div></article>`
}
function image(p){
  const i=String((p.images&&p.images[0])||p.image||'').trim();if(!i)return'✨';
  if(i.startsWith('http://')||i.startsWith('https://')||i.startsWith('/'))return`<img src="${attr(i)}" alt="${attr(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='✨'">`;
  return esc(i)
}

function renderProductPage(){
  const id=Number(new URLSearchParams(location.search).get('id'));
  const loading=document.getElementById('loadingBox'),error=document.getElementById('errorBox'),view=document.getElementById('productView');
  const p=PRODUCT_LIST.find(x=>x.id===id);
  if(!p){loading.hidden=true;error.hidden=false;return}
  STORE_CURRENT_PRODUCT=p;loading.hidden=true;view.hidden=false;document.title=p.name+' - StoreRi7a';
  const fp=finalPrice(p),d=discountPercent(p),saving=Math.max(0,p.price-fp),key=categoryKeyFromName(p.category);

  PRODUCT_IMAGES=[...p.images];
  if(p.image&&!PRODUCT_IMAGES.includes(p.image))PRODUCT_IMAGES.unshift(p.image);
  PRODUCT_IMAGES=PRODUCT_IMAGES.filter(Boolean);
  if(!PRODUCT_IMAGES.length)PRODUCT_IMAGES=[''];
  currentImageIndex=0;

  document.getElementById('productCategory').textContent=normalizeCategory(p.category);
  document.getElementById('productName').textContent=p.name;
  document.getElementById('currentPrice').textContent=price(fp)+' '+STORE_CONFIG.currency;
  const old=document.getElementById('oldPrice');old.textContent=saving?price(p.price)+' '+STORE_CONFIG.currency:'';old.style.display=saving?'inline':'none';
  const save=document.getElementById('savingBox');save.textContent=saving?'توفير '+price(saving)+' '+STORE_CONFIG.currency:'';save.hidden=!saving;
  const badge=document.getElementById('discountBadge');badge.textContent=d?'-'+d+'%':'';badge.hidden=!d;
  document.getElementById('productBrand').textContent=p.brand||'—';
  document.getElementById('productSize').textContent=sizeText(p.size);
  document.getElementById('productDescription').textContent=p.description||'لا يوجد وصف لهذا المنتج حالياً.';
  document.getElementById('backText').textContent='الرجوع إلى '+({women:'عطور نسائية',men:'عطور رجالية',beauty:'مواد التجميل',discounts:'الرئيسية'}[key]||'الرئيسية');

  renderMainProductImage();renderThumbs();renderSimilarProducts(p,key);setupLightboxGestures();updateFavoriteButton();
}
function renderMainProductImage(){
  const box=document.getElementById('productImage'),src=PRODUCT_IMAGES[currentImageIndex]||'';
  box.innerHTML=src?`<img src="${attr(src)}" alt="${attr(STORE_CURRENT_PRODUCT?.name||'منتج')}">`:'<span style="font-size:90px">✨</span>';
  document.querySelectorAll('.thumb').forEach((t,i)=>t.classList.toggle('active',i===currentImageIndex))
}
function renderThumbs(){
  const el=document.getElementById('thumbs');
  if(PRODUCT_IMAGES.length<=1){el.innerHTML='';return}
  el.innerHTML=PRODUCT_IMAGES.map((src,i)=>`<button class="thumb ${i===0?'active':''}" onclick="selectImage(${i})"><img src="${attr(src)}"></button>`).join('')
}
function selectImage(i){currentImageIndex=i;renderMainProductImage()}
function renderSimilarProducts(current,key){
  const items=PRODUCT_LIST.filter(p=>p.id!==current.id&&categoryKeyFromName(p.category)===key).slice(0,4);
  const sec=document.getElementById('similarSection'),grid=document.getElementById('similarGrid');
  if(!items.length){sec.hidden=true;return}
  grid.innerHTML=items.map(p=>`<a class="similarCard" href="${productUrl(p.id)}"><div class="similarImage">${image(p)}</div><div class="similarBody"><small>${esc(p.category)}</small><h3>${esc(p.name)}</h3><strong>${price(finalPrice(p))} ${STORE_CONFIG.currency}</strong></div></a>`).join('');
  sec.hidden=false
}

function openLightbox(i=0){currentImageIndex=i;const lb=document.getElementById('lightbox');lb.hidden=false;document.body.style.overflow='hidden';resetZoom();updateLightbox()}
function closeLightbox(){document.getElementById('lightbox').hidden=true;document.body.style.overflow=''}
function updateLightbox(){const img=document.getElementById('lightboxImage'),src=PRODUCT_IMAGES[currentImageIndex]||'';img.src=src;document.getElementById('lightboxCounter').textContent=(currentImageIndex+1)+' / '+PRODUCT_IMAGES.length;applyTransform();renderMainProductImage()}
function lightboxPrev(){currentImageIndex=(currentImageIndex-1+PRODUCT_IMAGES.length)%PRODUCT_IMAGES.length;resetZoom();updateLightbox()}
function lightboxNext(){currentImageIndex=(currentImageIndex+1)%PRODUCT_IMAGES.length;resetZoom();updateLightbox()}
function zoomIn(){lightboxScale=Math.min(4,lightboxScale+.25);applyTransform()}
function zoomOut(){lightboxScale=Math.max(1,lightboxScale-.25);if(lightboxScale===1){lightboxPanX=0;lightboxPanY=0}applyTransform()}
function resetZoom(){lightboxScale=1;lightboxPanX=0;lightboxPanY=0;applyTransform()}
function applyTransform(){
  const img=document.getElementById('lightboxImage');if(!img)return;
  img.style.transform=`translate(${lightboxPanX}px,${lightboxPanY}px) scale(${lightboxScale})`;
  const z=document.getElementById('zoomValue');if(z)z.textContent=Math.round(lightboxScale*100)+'%'
}
function setupLightboxGestures(){
  const stage=document.getElementById('lightboxStage');
  if(!stage||stage.dataset.ready)return;
  stage.dataset.ready='1';

  let lastTap=0;

  stage.addEventListener('pointerdown',e=>{
    if(lightboxScale<=1)return;
    dragStart={x:e.clientX-lightboxPanX,y:e.clientY-lightboxPanY};
    try{stage.setPointerCapture(e.pointerId)}catch(_){}
  });

  stage.addEventListener('pointermove',e=>{
    if(!dragStart||lightboxScale<=1)return;
    lightboxPanX=e.clientX-dragStart.x;
    lightboxPanY=e.clientY-dragStart.y;
    applyTransform();
  });

  stage.addEventListener('pointerup',()=>dragStart=null);
  stage.addEventListener('pointercancel',()=>dragStart=null);

  stage.addEventListener('touchend',e=>{
    const now=Date.now();

    if(now-lastTap<320){
      e.preventDefault();

      if(lightboxScale>1){
        resetZoom();
      }else{
        lightboxScale=2;
        lightboxPanX=0;
        lightboxPanY=0;
        applyTransform();
      }

      lastTap=0;
      return;
    }

    lastTap=now;
  },{passive:false});

  stage.addEventListener('dblclick',e=>{
    e.preventDefault();

    if(lightboxScale>1){
      resetZoom();
    }else{
      lightboxScale=2;
      lightboxPanX=0;
      lightboxPanY=0;
      applyTransform();
    }
  });
}
function backToCategory(){if(!STORE_CURRENT_PRODUCT){location.href='/';return}const k=categoryKeyFromName(STORE_CURRENT_PRODUCT.category);location.href=k==='discounts'?'/':'/category?cat='+encodeURIComponent(k)}
async function shareProduct(){if(!STORE_CURRENT_PRODUCT)return;try{if(navigator.share)await navigator.share({title:STORE_CURRENT_PRODUCT.name,text:'شاهد '+STORE_CURRENT_PRODUCT.name,url:location.href});else{await navigator.clipboard.writeText(location.href);alert('تم نسخ رابط المنتج')}}catch(e){}}
function addCurrentToCart(){if(STORE_CURRENT_PRODUCT)add(STORE_CURRENT_PRODUCT.id)}
function orderCurrentWhatsApp(){
  const p=STORE_CURRENT_PRODUCT;if(!p)return;
  const msg=`السلام عليكم، بغيت نطلب:\n${p.name}\nالثمن: ${price(finalPrice(p))} ${STORE_CONFIG.currency}\n${location.href}`;
  window.open(`https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,'_blank')
}
function searchAll(v){currentSearch=String(v||'').trim();renderCurrentPage()}
function productSearch(e){if(e.key==='Enter'&&e.target.value.trim())location.href='/?search='+encodeURIComponent(e.target.value.trim())}

function add(id){
  const p=PRODUCT_LIST.find(x=>x.id===id);if(!p)return;
  const i=cart.find(x=>x.id===id);i?i.qty++:cart.push({...p,qty:1});saveCart();updateCart();openCart()
}
function removeItem(id){cart=cart.filter(x=>x.id!==id);saveCart();updateCart()}
function updateCart(){
  const count=document.getElementById('cartCount'),items=document.getElementById('cartItems'),total=document.getElementById('total');
  if(count)count.textContent=cart.reduce((s,x)=>s+x.qty,0);
  if(items)items.innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div><b>${esc(x.name)}</b><br><small>${x.qty} × ${price(finalPrice(x))} ${STORE_CONFIG.currency}</small></div><button onclick="removeItem(${x.id})">حذف</button></div>`).join(''):'<p>السلة فارغة حالياً.</p>';
  if(total)total.textContent=price(cart.reduce((s,x)=>s+finalPrice(x)*x.qty,0))+' '+STORE_CONFIG.currency
}
function openCart(){document.getElementById('cart')?.classList.add('open');document.getElementById('cartShade')?.classList.add('show')}
function closeCart(){document.getElementById('cart')?.classList.remove('open');document.getElementById('cartShade')?.classList.remove('show')}
function checkout(){
  if(!cart.length)return alert('السلة فارغة');
  const total=cart.reduce((s,x)=>s+finalPrice(x)*x.qty,0);
  const lines=cart.map(x=>`• ${x.name} × ${x.qty} = ${price(finalPrice(x)*x.qty)} ${STORE_CONFIG.currency}`).join('\n');
  const msg=`السلام عليكم، بغيت نطلب من ${STORE_CONFIG.storeName}:\n\n${lines}\n\nالمجموع: ${price(total)} ${STORE_CONFIG.currency}`;
  window.open(`https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,'_blank')
}
loadStoreData();


function favoriteIds(){
  try{
    const ids=JSON.parse(localStorage.getItem('storeri7a_favorites')||'[]');
    return Array.isArray(ids)?ids.map(Number):[];
  }catch(e){return[]}
}
function updateFavoriteButton(){
  const btn=document.getElementById('favoriteBtn');
  if(!btn||!STORE_CURRENT_PRODUCT)return;
  const active=favoriteIds().includes(Number(STORE_CURRENT_PRODUCT.id));
  btn.classList.toggle('active',active);
  btn.textContent=active?'♥ تمت الإضافة إلى المفضلة':'♡ إضافة إلى المفضلة';
}
function toggleFavorite(){
  if(!STORE_CURRENT_PRODUCT)return;
  let ids=favoriteIds();
  const id=Number(STORE_CURRENT_PRODUCT.id);
  ids=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
  localStorage.setItem('storeri7a_favorites',JSON.stringify(ids));
  updateFavoriteButton();
}
