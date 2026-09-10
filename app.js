let cart=[];
let PRODUCT_LIST=[];
let currentSearch="";

function loadSavedCart(){
  try{
    const saved=JSON.parse(localStorage.getItem('storeri7a_cart')||'[]');
    cart=Array.isArray(saved)?saved:[];
  }catch(e){
    cart=[];
  }
}

function saveCart(){
  try{
    localStorage.setItem('storeri7a_cart',JSON.stringify(cart));
  }catch(e){}
}

async function loadStoreData(){
  loadSavedCart();

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
            : 0,
        description:String(p.description||''),
        brand:String(p.brand||''),
        size:String(p.size||'')
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

  renderCurrentPage();
  updateCart();
}

function normalizeCategory(c){
  c=String(c||'').trim();

  if(['عطور نسائية','نسائية','عطر نسائي'].includes(c)) return 'عطور نسائية';
  if(['عطور رجالية','رجالية','عطر رجالي'].includes(c)) return 'عطور رجالية';
  if(['تجميل','مواد التجميل','مستحضرات التجميل'].includes(c)) return 'تجميل';

  return c;
}

function categoryKeyFromName(c){
  const n=normalizeCategory(c);

  if(n==='عطور نسائية') return 'women';
  if(n==='عطور رجالية') return 'men';
  if(n==='تجميل') return 'beauty';

  return 'women';
}

function finalPrice(p){
  return p.sale_price!==null &&
         p.sale_price>=0 &&
         p.sale_price<p.price
    ? p.sale_price
    : p.price;
}

function discountPercent(p){
  if(p.discount && p.discount>0){
    return Math.round(p.discount);
  }

  if(p.sale_price!==null && p.sale_price<p.price && p.price>0){
    return Math.round((1-p.sale_price/p.price)*100);
  }

  return 0;
}

function isDiscounted(p){
  return discountPercent(p)>0 ||
    (p.sale_price!==null && p.sale_price<p.price);
}

function matchesSearch(p){
  if(!currentSearch) return true;

  const q=currentSearch.toLowerCase();

  return [
    p.name,
    p.category,
    p.brand,
    p.size,
    p.description
  ].some(v=>String(v||'').toLowerCase().includes(q));
}

function renderCurrentPage(){
  if(document.getElementById('productDetails')){
    renderProductPage();
  }else if(document.getElementById('categoryGrid')){
    renderCategoryPage();
  }else{
    renderHome();
    setupHomeScrollNav();
  }
}

function renderHome(){
  const list=PRODUCT_LIST.filter(matchesSearch);

  renderDiscounts(list);
  renderSection('womenGrid',list,'عطور نسائية',6);
  renderSection('menGrid',list,'عطور رجالية',6);
  renderSection('beautyGrid',list,'تجميل',6);
}

function renderDiscounts(list){
  const grid=document.getElementById('discountGrid');
  if(!grid) return;

  const discounted=list.filter(isDiscounted).slice(0,6);

  grid.innerHTML=discounted.length
    ? discounted.map(p=>card(p,true)).join('')
    : '<div class="empty">لا توجد منتجات مخفضة حالياً.</div>';
}

function renderSection(id,list,category,limit=6){
  const grid=document.getElementById(id);
  if(!grid) return;

  const items=list
    .filter(p=>normalizeCategory(p.category)===category)
    .slice(0,limit);

  grid.innerHTML=items.length
    ? items.map(p=>card(p,false)).join('')
    : '<div class="empty">لا توجد منتجات في هذا القسم حالياً.</div>';
}

function setupHomeScrollNav(){
  document.querySelectorAll('.mainNav a[href^="#"]').forEach(a=>{
    if(a.dataset.scrollReady==='1') return;

    a.dataset.scrollReady='1';

    a.addEventListener('click',e=>{
      e.preventDefault();

      document.querySelectorAll('.mainNav a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');

      const id=(a.getAttribute('href')||'#top').replace('#','') || 'top';
      smartScroll(id,id==='top'?0:180);
    });
  });
}

function smartScroll(id,preview=180){
  const target=document.getElementById(id);
  const header=document.querySelector('.siteHeader');

  if(!target) return;

  if(id==='top'){
    window.scrollTo({top:0,behavior:'smooth'});
    history.replaceState(null,'',location.pathname);
    return;
  }

  const headerH=header?header.offsetHeight:120;
  const absoluteTop=target.getBoundingClientRect().top+window.scrollY;
  const y=Math.max(0,absoluteTop-headerH-preview);

  window.scrollTo({top:y,behavior:'smooth'});
  history.replaceState(null,'','#'+id);
}

function getCategoryConfig(){
  const params=new URLSearchParams(window.location.search);
  const cat=params.get('cat')||'women';

  const map={
    women:{
      title:'العطور النسائية',
      eyebrow:'FOR HER',
      subtitle:'جميع العطور النسائية المتوفرة',
      filter:p=>normalizeCategory(p.category)==='عطور نسائية'
    },

    men:{
      title:'العطور الرجالية',
      eyebrow:'FOR HIM',
      subtitle:'جميع العطور الرجالية المتوفرة',
      filter:p=>normalizeCategory(p.category)==='عطور رجالية'
    },

    beauty:{
      title:'مواد التجميل',
      eyebrow:'BEAUTY',
      subtitle:'جميع منتجات مواد التجميل المتوفرة',
      filter:p=>normalizeCategory(p.category)==='تجميل'
    },

    discounts:{
      title:'منتجات مخفضة',
      eyebrow:'SPECIAL OFFERS',
      subtitle:'جميع المنتجات المتوفرة بتخفيض',
      filter:p=>isDiscounted(p)
    }
  };

  return {
    key:map[cat]?cat:'women',
    ...(map[cat]||map.women)
  };
}

function renderCategoryPage(){
  const cfg=getCategoryConfig();

  document.title=cfg.title+' - StoreRi7a';

  const title=document.getElementById('categoryTitle');
  const eyebrow=document.getElementById('categoryEyebrow');
  const subtitle=document.getElementById('categorySubtitle');

  if(title) title.textContent=cfg.title;
  if(eyebrow) eyebrow.textContent=cfg.eyebrow;
  if(subtitle) subtitle.textContent=cfg.subtitle;

  document.querySelectorAll('.mainNav a[data-cat]').forEach(a=>{
    a.classList.toggle('active',a.dataset.cat===cfg.key);
  });

  const items=PRODUCT_LIST
    .filter(matchesSearch)
    .filter(cfg.filter);

  const grid=document.getElementById('categoryGrid');
  const empty=document.getElementById('categoryEmpty');

  if(items.length){
    grid.innerHTML=items.map(p=>card(p,isDiscounted(p))).join('');

    if(empty){
      empty.style.display='none';
    }
  }else{
    grid.innerHTML='';

    if(empty){
      empty.style.display='block';
    }
  }

  window.scrollTo({top:0,behavior:'auto'});
}

function renderProductPage(){
  const id=Number(new URLSearchParams(location.search).get('id'));

  const loading=document.getElementById('loadingBox');
  const error=document.getElementById('errorBox');
  const view=document.getElementById('productView');

  if(loading) loading.hidden=false;
  if(error) error.hidden=true;
  if(view) view.hidden=true;

  if(!Number.isFinite(id)){
    if(loading) loading.hidden=true;
    if(error){
      error.hidden=false;
      error.innerHTML='المنتج غير موجود.<br><a href="/">العودة للرئيسية</a>';
    }
    return;
  }

  const p=PRODUCT_LIST.find(x=>Number(x.id)===id);

  if(!p){
    if(loading) loading.hidden=true;
    if(error){
      error.hidden=false;
      error.innerHTML='المنتج غير موجود أو تم حذفه.<br><a href="/">العودة للرئيسية</a>';
    }
    return;
  }

  STORE_CURRENT_PRODUCT=p;

  if(loading) loading.hidden=true;
  if(error) error.hidden=true;
  if(view) view.hidden=false;

  document.title=(p.name||'منتج')+' - StoreRi7a';

  const fp=finalPrice(p);
  const d=discountPercent(p);
  const saving=Math.max(0,Number(p.price||0)-Number(fp||0));
  const key=categoryKeyFromName(p.category);

  PRODUCT_IMAGES=[];

  if(Array.isArray(p.images)){
    PRODUCT_IMAGES=[...p.images].filter(Boolean);
  }else if(typeof p.images==='string' && p.images.trim()){
    try{
      const parsed=JSON.parse(p.images);
      if(Array.isArray(parsed)) PRODUCT_IMAGES=parsed.filter(Boolean);
    }catch(e){}
  }

  if(p.image && !PRODUCT_IMAGES.includes(p.image)){
    PRODUCT_IMAGES.unshift(p.image);
  }

  if(!PRODUCT_IMAGES.length){
    PRODUCT_IMAGES=[''];
  }

  currentImageIndex=0;

  const categoryEl=document.getElementById('productCategory');
  const nameEl=document.getElementById('productName');
  const currentPriceEl=document.getElementById('currentPrice');
  const old=document.getElementById('oldPrice');
  const save=document.getElementById('savingBox');
  const badge=document.getElementById('discountBadge');
  const brandEl=document.getElementById('productBrand');
  const sizeEl=document.getElementById('productSize');
  const descEl=document.getElementById('productDescription');
  const backEl=document.getElementById('backText');

  if(categoryEl) categoryEl.textContent=normalizeCategory(p.category)||'منتج';
  if(nameEl) nameEl.textContent=p.name||'منتج';
  if(currentPriceEl) currentPriceEl.textContent=price(fp)+' '+STORE_CONFIG.currency;

  if(old){
    old.textContent=saving?price(p.price)+' '+STORE_CONFIG.currency:'';
    old.style.display=saving?'inline':'none';
  }

  if(save){
    save.textContent=saving?'توفير '+price(saving)+' '+STORE_CONFIG.currency:'';
    save.hidden=!saving;
  }

  if(badge){
    badge.textContent=d?'-'+d+'%':'';
    badge.hidden=!d;
  }

  if(brandEl) brandEl.textContent=(p.brand&&String(p.brand).trim())?p.brand:'—';
  if(sizeEl) sizeEl.textContent=(p.size&&String(p.size).trim())?sizeText(p.size):'—';

  if(descEl){
    descEl.textContent=(p.description&&String(p.description).trim())
      ?String(p.description).trim()
      :'لا يوجد وصف لهذا المنتج حالياً.';
  }

  if(backEl){
    backEl.textContent='الرجوع إلى '+({
      women:'عطور نسائية',
      men:'عطور رجالية',
      beauty:'مواد التجميل',
      discounts:'الرئيسية'
    }[key]||'الرئيسية');
  }

  if(typeof renderMainProductImage==='function') renderMainProductImage();
  if(typeof renderThumbs==='function') renderThumbs();
  if(typeof renderSimilarProducts==='function') renderSimilarProducts(p,key);
  if(typeof setupLightboxGestures==='function') setupLightboxGestures();
  if(typeof updateFavoriteButton==='function') updateFavoriteButton();
}

function buildProductDescription(p){
  const bits=[];

  if(p.brand){
    bits.push(`<strong>الماركة:</strong> ${esc(p.brand)}`);
  }

  if(p.size){
    bits.push(`<strong>الحجم:</strong> ${esc(p.size)}`);
  }

  if(p.description){
    bits.push(`<span class="detailLongText">${esc(p.description).replace(/\n/g,'<br>')}</span>`);
  }else{
    bits.push('منتج متوفر حالياً في StoreRi7a. يمكنك إضافته إلى السلة أو طلبه مباشرة عبر WhatsApp.');
  }

  return bits.join('<br><br>');
}

function renderRelatedProducts(product){
  const grid=document.getElementById('relatedGrid');

  if(!grid) return;

  const related=PRODUCT_LIST
    .filter(p=>
      p.id!==product.id &&
      normalizeCategory(p.category)===normalizeCategory(product.category)
    )
    .slice(0,6);

  grid.innerHTML=related.length
    ? related.map(p=>card(p,isDiscounted(p))).join('')
    : '<div class="empty">لا توجد منتجات مشابهة حالياً.</div>';
}

function productUrl(id){
  return 'product.html?id='+encodeURIComponent(id);
}

function card(p,isSale){
  const fp=finalPrice(p);
  const d=discountPercent(p);

  return `<article class="card">
    ${isSale && d ? `<span class="saleBadge">-${d}%</span>` : ''}

    <a class="productLink" href="${productUrl(p.id)}" aria-label="${attr(p.name)}">
      <div class="photo">${image(p)}</div>
    </a>

    <div class="info">
      <span class="category">${esc(normalizeCategory(p.category))}</span>

      <a class="productLink" href="${productUrl(p.id)}">
        <h3>${esc(p.name)}</h3>
      </a>

      ${p.brand?`<small class="productBrand">${esc(p.brand)}</small>`:''}

      <div class="priceLine">
        <span class="price">${price(fp)} ${esc(STORE_CONFIG.currency)}</span>

        ${fp<p.price
          ? `<span class="oldPrice">${price(p.price)} ${esc(STORE_CONFIG.currency)}</span>`
          : ''}
      </div>

      <button class="add" onclick="add(${p.id})">
        🛒 أضف إلى السلة
      </button>
    </div>
  </article>`;
}

function image(p){
  const i=String(p.image||'').trim();

  if(!i){
    return '✨';
  }

  if(
    i.startsWith('http://') ||
    i.startsWith('https://') ||
    i.startsWith('/')
  ){
    return `<img
      src="${attr(i)}"
      alt="${attr(p.name)}"
      loading="lazy"
      onerror="this.parentElement.innerHTML='✨'"
    >`;
  }

  return esc(i);
}

function searchAll(v){
  currentSearch=String(v||'').trim();
  renderCurrentPage();
}

function productSearch(e){
  if(e.key!=='Enter') return;

  const q=String(e.target.value||'').trim();

  if(!q) return;

  window.location.href='/?search='+encodeURIComponent(q);
}

function esc(v){
  return String(v).replace(/[&<>"']/g,m=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[m]));
}

function attr(v){
  return esc(v);
}

function price(v){
  const n=Number(v||0);
  return Number.isInteger(n)?n:n.toFixed(2);
}

function add(id){
  const p=PRODUCT_LIST.find(x=>x.id===id);

  if(!p) return;

  const item=cart.find(x=>x.id===id);

  if(item){
    item.qty++;
  }else{
    cart.push({...p,qty:1});
  }

  saveCart();
  updateCart();
  openCart();
}

function removeItem(id){
  cart=cart.filter(x=>x.id!==id);
  saveCart();
  updateCart();
}

function updateCart(){
  const count=document.getElementById('cartCount');
  const items=document.getElementById('cartItems');
  const total=document.getElementById('total');

  if(count){
    count.textContent=cart.reduce((s,x)=>s+x.qty,0);
  }

  if(items){
    items.innerHTML=
      cart.length
        ? cart.map(x=>`
          <div class="cartItem">
            <div>
              <b>${esc(x.name)}</b><br>
              <small>
                ${x.qty} ×
                ${price(finalPrice(x))}
                ${esc(STORE_CONFIG.currency)}
              </small>
            </div>

            <button onclick="removeItem(${x.id})">
              حذف
            </button>
          </div>
        `).join('')
        : '<p>السلة فارغة حالياً.</p>';
  }

  if(total){
    total.textContent=
      price(
        cart.reduce(
          (s,x)=>s+finalPrice(x)*x.qty,
          0
        )
      )+
      ' '+
      STORE_CONFIG.currency;
  }
}

function openCart(){
  document.getElementById('cart')?.classList.add('open');
  document.getElementById('cartShade')?.classList.add('show');
}

function closeCart(){
  document.getElementById('cart')?.classList.remove('open');
  document.getElementById('cartShade')?.classList.remove('show');
}

function buySingleProduct(id){
  const p=PRODUCT_LIST.find(x=>x.id===id);

  if(!p) return;

  const fp=finalPrice(p);

  const extras=[
    p.brand ? `• الماركة: ${p.brand}` : '',
    p.size ? `• الحجم: ${p.size}` : ''
  ].filter(Boolean).join('\n');

  const msg=
    `السلام عليكم، بغيت نطلب هاد المنتج من ${STORE_CONFIG.storeName}:\n\n`+
    `• ${p.name}\n`+
    `• ${normalizeCategory(p.category)}\n`+
    (extras?extras+'\n':'')+
    `• الثمن: ${price(fp)} ${STORE_CONFIG.currency}`;

  window.open(
    `https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,
    '_blank'
  );
}

function checkout(){
  if(!cart.length){
    return alert('السلة فارغة');
  }

  const total=cart.reduce(
    (s,x)=>s+finalPrice(x)*x.qty,
    0
  );

  const lines=cart.map(x=>
    `• ${x.name} × ${x.qty} = `+
    `${price(finalPrice(x)*x.qty)} `+
    `${STORE_CONFIG.currency}`
  ).join('\n');

  const msg=
    `السلام عليكم، بغيت نطلب من ${STORE_CONFIG.storeName}:\n\n`+
    `${lines}\n\n`+
    `المجموع: ${price(total)} ${STORE_CONFIG.currency}`;

  window.open(
    `https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,
    '_blank'
  );
}

loadStoreData();
