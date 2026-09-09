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
  const params=new URLSearchParams(window.location.search);
  const id=Number(params.get('id'));

  const loading=document.getElementById('productLoading');
  const notFound=document.getElementById('productNotFound');
  const details=document.getElementById('productDetails');

  const p=PRODUCT_LIST.find(x=>x.id===id);

  if(loading){
    loading.style.display='none';
  }

  if(!p){
    if(notFound) notFound.style.display='flex';
    if(details) details.style.display='none';
    return;
  }

  if(notFound) notFound.style.display='none';
  if(details) details.style.display='grid';

  document.title=p.name+' - StoreRi7a';

  const fp=finalPrice(p);
  const d=discountPercent(p);
  const catKey=categoryKeyFromName(p.category);

  const name=document.getElementById('productName');
  const priceEl=document.getElementById('productPrice');
  const oldPrice=document.getElementById('productOldPrice');
  const badge=document.getElementById('productDiscountBadge');
  const imageBox=document.getElementById('productImage');
  const catLink=document.getElementById('productCategoryLink');
  const backLink=document.getElementById('backCategoryLink');
  const saving=document.getElementById('productSaving');
  const description=document.getElementById('productDescription');
  const brandCard=document.getElementById('brandCard');
  const sizeCard=document.getElementById('sizeCard');
  const productBrand=document.getElementById('productBrand');
  const productSize=document.getElementById('productSize');
  const shareBtn=document.getElementById('shareProductBtn');

  if(name) name.textContent=p.name;

  if(priceEl){
    priceEl.textContent=price(fp)+' '+STORE_CONFIG.currency;
  }

  if(catLink){
    catLink.textContent=normalizeCategory(p.category);
    catLink.href='category.html?cat='+catKey;
  }

  if(backLink){
    backLink.href='category.html?cat='+catKey;
    backLink.textContent='← الرجوع إلى '+normalizeCategory(p.category);
  }

  if(imageBox){
    imageBox.innerHTML=image(p);
  }

  if(description){
    description.innerHTML=buildProductDescription(p);
  }

  if(p.brand){
    if(productBrand) productBrand.textContent=p.brand;
    if(brandCard) brandCard.style.display='flex';
  }else if(brandCard){
    brandCard.style.display='none';
  }

  if(p.size){
    if(productSize) productSize.textContent=p.size;
    if(sizeCard) sizeCard.style.display='flex';
  }else if(sizeCard){
    sizeCard.style.display='none';
  }

  if(fp<p.price){
    if(oldPrice){
      oldPrice.style.display='inline';
      oldPrice.textContent=price(p.price)+' '+STORE_CONFIG.currency;
    }

    if(badge){
      badge.style.display='block';
      badge.textContent='-'+d+'%';
    }

    if(saving){
      saving.style.display='inline-block';
      saving.textContent=
        'توفير '+
        price(p.price-fp)+
        ' '+
        STORE_CONFIG.currency;
    }
  }else{
    if(oldPrice) oldPrice.style.display='none';
    if(badge) badge.style.display='none';
    if(saving) saving.style.display='none';
  }

  const addBtn=document.getElementById('addProductBtn');
  const waBtn=document.getElementById('buyWhatsappBtn');

  if(addBtn){
    addBtn.onclick=()=>add(p.id);
  }

  if(waBtn){
    waBtn.onclick=()=>buySingleProduct(p.id);
  }

  if(shareBtn){
    shareBtn.onclick=()=>shareProduct(p.id);
  }

  renderRelatedProducts(p);
}

function buildProductDescription(p){
  if(p.description){
    return esc(p.description).replace(/\n/g,'<br>');
  }

  return 'منتج متوفر حالياً في StoreRi7a. يمكنك إضافته إلى السلة أو طلبه مباشرة عبر WhatsApp.';
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

async function shareProduct(id){
  const p=PRODUCT_LIST.find(x=>x.id===id);
  if(!p) return;

  const url=window.location.href;
  const text=
    `${p.name} - ${price(finalPrice(p))} ${STORE_CONFIG.currency}`;

  try{
    if(navigator.share){
      await navigator.share({
        title:p.name+' - '+STORE_CONFIG.storeName,
        text,
        url
      });
      return;
    }

    if(navigator.clipboard){
      await navigator.clipboard.writeText(url);
      alert('تم نسخ رابط المنتج ✅');
      return;
    }

    prompt('انسخ رابط المنتج:',url);
  }catch(e){
    if(e && e.name==='AbortError') return;

    try{
      if(navigator.clipboard){
        await navigator.clipboard.writeText(url);
        alert('تم نسخ رابط المنتج ✅');
      }else{
        prompt('انسخ رابط المنتج:',url);
      }
    }catch(_){}
  }
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
