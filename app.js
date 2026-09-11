let cart=[];
let PRODUCT_LIST=[];
let currentSearch="";

let STORE_CURRENT_PRODUCT=null;
let PRODUCT_IMAGES=[];
let currentImageIndex=0;
let lightboxScale=1;
let lightboxPanX=0;
let lightboxPanY=0;
let dragStart=null;

function loadSavedCart(){
  try{
    const saved=JSON.parse(localStorage.getItem('storeri7a_cart')||'[]');
    cart=Array.isArray(saved)?saved:[];
  }catch(e){ cart=[]; }
}

function saveCart(){
  try{ localStorage.setItem('storeri7a_cart',JSON.stringify(cart)); }catch(e){}
}

function parseImagesField(value){
  if(Array.isArray(value)) return value.filter(Boolean);
  if(typeof value==='string' && value.trim()){
    try{
      const parsed=JSON.parse(value);
      if(Array.isArray(parsed)) return parsed.filter(Boolean);
    }catch(e){}
  }
  return [];
}

function reconcileCart(){
  if(!Array.isArray(cart) || !cart.length) return;
  cart=cart.map(old=>{
    const current=PRODUCT_LIST.find(p=>Number(p.id)===Number(old.id));
    if(!current) return null;
    const qty=Math.max(1,Math.min(20,Math.floor(Number(old.qty)||1)));
    return {...current,qty};
  }).filter(Boolean);
  saveCart();
}

async function loadStoreData(){
  loadSavedCart();
  updateCart();

  let renderedFromCache=false;

  try{
    const cachedRaw=sessionStorage.getItem('storeri7a_products');
    if(cachedRaw){
      const cached=JSON.parse(cachedRaw);
      if(Array.isArray(cached) && cached.length){
        PRODUCT_LIST=cached;
        reconcileCart();

        const productPage=document.getElementById('productView') || document.getElementById('loadingBox');
        if(productPage){
          const id=Number(new URLSearchParams(location.search).get('id'));
          if(PRODUCT_LIST.some(p=>Number(p.id)===id)){
            renderCurrentPage();
            renderedFromCache=true;
          }
        }else{
          renderCurrentPage();
          renderedFromCache=true;
        }
      }
    }
  }catch(e){ console.warn('Cache:',e); }

  try{
    const r=await fetch('/api/settings',{headers:{accept:'application/json'}});
    if(r.ok){
      const s=await r.json();
      if(s){
        STORE_CONFIG.storeName=s.store_name||STORE_CONFIG.storeName;
        STORE_CONFIG.whatsapp=s.whatsapp||STORE_CONFIG.whatsapp;
        STORE_CONFIG.currency=s.currency||STORE_CONFIG.currency;
      }
    }
  }catch(e){
    console.warn('Settings API:',e);
  }

  try{
    const r=await fetch('/api/products',{headers:{accept:'application/json'}});
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
        images:parseImagesField(p.images),
        sale_price:p.sale_price!==undefined && p.sale_price!==null && p.sale_price!=='' ? Number(p.sale_price) : null,
        discount:p.discount!==undefined && p.discount!==null && p.discount!=='' ? Number(p.discount) : 0,
        description:p.description==null?'':String(p.description),
        brand:p.brand==null?'':String(p.brand),
        size:p.size==null?'':String(p.size)
      }));

    try{ sessionStorage.setItem('storeri7a_products',JSON.stringify(PRODUCT_LIST)); }catch(e){}

    reconcileCart();
    renderCurrentPage();
    updateCart();
  }catch(e){
    console.error('Products API:',e);
    if(renderedFromCache) return;

    const loading=document.getElementById('loadingBox');
    const error=document.getElementById('errorBox');
    if(loading) loading.hidden=true;
    if(error){
      error.hidden=false;
      error.innerHTML='تعذر تحميل المنتجات.<br><button onclick="location.reload()">إعادة المحاولة</button>';
    }

    const checkoutError=document.getElementById('checkoutError');
    if(checkoutError){
      checkoutError.hidden=false;
      checkoutError.textContent='تعذر تحميل بيانات المنتجات. حاول مرة أخرى.';
    }
  }
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
  return p.sale_price!==null && Number.isFinite(Number(p.sale_price)) && Number(p.sale_price)>=0 && Number(p.sale_price)<Number(p.price)
    ? Number(p.sale_price) : Number(p.price||0);
}

function discountPercent(p){
  if(Number(p.discount)>0) return Math.round(Number(p.discount));
  if(p.sale_price!==null && Number(p.sale_price)<Number(p.price) && Number(p.price)>0){
    return Math.round((1-Number(p.sale_price)/Number(p.price))*100);
  }
  return 0;
}

function isDiscounted(p){
  return discountPercent(p)>0 || (p.sale_price!==null && Number(p.sale_price)<Number(p.price));
}

function matchesSearch(p){
  if(!currentSearch) return true;
  const q=currentSearch.toLowerCase();
  return [p.name,p.category,p.brand,p.size,p.description].some(v=>String(v||'').toLowerCase().includes(q));
}

function renderCurrentPage(){
  if(document.getElementById('checkoutPage')){
    renderCheckoutPage();
    return;
  }
  if(document.getElementById('productView') || document.getElementById('loadingBox')){
    renderProductPage();
    return;
  }
  if(document.getElementById('categoryGrid')){
    renderCategoryPage();
    return;
  }
  renderHome();
  setupHomeScrollNav();
  setupHomeCategoryLinks();
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
  grid.innerHTML=discounted.length ? discounted.map(p=>card(p,true)).join('') : '<div class="empty">لا توجد منتجات مخفضة حالياً.</div>';
}

function renderSection(id,list,category,limit=6){
  const grid=document.getElementById(id);
  if(!grid) return;
  const items=list.filter(p=>normalizeCategory(p.category)===category).slice(0,limit);
  grid.innerHTML=items.length ? items.map(p=>card(p,false)).join('') : '<div class="empty">لا توجد منتجات في هذا القسم حالياً.</div>';
}

function setupHomeScrollNav(){
  document.querySelectorAll('.mainNav a[href^="#"]').forEach(a=>{
    if(a.dataset.scrollReady==='1') return;
    a.dataset.scrollReady='1';
    a.addEventListener('click',e=>{
      e.preventDefault();
      document.querySelectorAll('.mainNav a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      const id=(a.getAttribute('href')||'#top').replace('#','')||'top';
      smartScroll(id,id==='top'?0:180);
    });
  });
}

function setupHomeCategoryLinks(){
  const routes={discounts:'/category.html?cat=discounts',women:'/category.html?cat=women',men:'/category.html?cat=men',beauty:'/category.html?cat=beauty'};
  Object.entries(routes).forEach(([id,url])=>{
    const section=document.getElementById(id);
    if(!section) return;
    const title=section.querySelector('.sectionTitle h2');
    if(title && title.dataset.categoryReady!=='1'){
      title.dataset.categoryReady='1';
      title.style.cursor='pointer';
      title.setAttribute('role','link');
      title.setAttribute('tabindex','0');
      const go=()=>{ location.href=url; };
      title.addEventListener('click',go);
      title.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();go();} });
    }
    const more=section.querySelector('.sectionTitle a');
    if(more) more.href=url;
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
  const cat=new URLSearchParams(window.location.search).get('cat')||'women';
  const map={
    women:{title:'العطور النسائية',eyebrow:'FOR HER',subtitle:'جميع العطور النسائية المتوفرة',filter:p=>normalizeCategory(p.category)==='عطور نسائية'},
    men:{title:'العطور الرجالية',eyebrow:'FOR HIM',subtitle:'جميع العطور الرجالية المتوفرة',filter:p=>normalizeCategory(p.category)==='عطور رجالية'},
    beauty:{title:'مواد التجميل',eyebrow:'BEAUTY',subtitle:'جميع منتجات مواد التجميل المتوفرة',filter:p=>normalizeCategory(p.category)==='تجميل'},
    discounts:{title:'منتجات مخفضة',eyebrow:'SPECIAL OFFERS',subtitle:'جميع المنتجات المتوفرة بتخفيض',filter:p=>isDiscounted(p)}
  };
  return {key:map[cat]?cat:'women',...(map[cat]||map.women)};
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
  document.querySelectorAll('.mainNav a[data-cat]').forEach(a=>a.classList.toggle('active',a.dataset.cat===cfg.key));
  const items=PRODUCT_LIST.filter(matchesSearch).filter(cfg.filter);
  const grid=document.getElementById('categoryGrid');
  const empty=document.getElementById('categoryEmpty');
  if(!grid) return;
  if(items.length){
    grid.innerHTML=items.map(p=>card(p,isDiscounted(p))).join('');
    if(empty) empty.style.display='none';
  }else{
    grid.innerHTML='';
    if(empty) empty.style.display='block';
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

  if(!Number.isFinite(id) || id<=0){
    if(loading) loading.hidden=true;
    if(error){error.hidden=false;error.innerHTML='المنتج غير موجود.<br><a href="/">العودة للرئيسية</a>';}
    return;
  }

  const p=PRODUCT_LIST.find(x=>Number(x.id)===id);
  if(!p){
    if(loading) loading.hidden=true;
    if(error){error.hidden=false;error.innerHTML='المنتج غير موجود أو تعذر تحميله.<br><a href="/">العودة للرئيسية</a>';}
    return;
  }

  STORE_CURRENT_PRODUCT=p;
  const fp=finalPrice(p);
  const d=discountPercent(p);
  const saving=Math.max(0,Number(p.price||0)-Number(fp||0));
  const key=categoryKeyFromName(p.category);

  PRODUCT_IMAGES=parseImagesField(p.images);
  if(p.image && !PRODUCT_IMAGES.includes(p.image)) PRODUCT_IMAGES.unshift(p.image);
  if(!PRODUCT_IMAGES.length) PRODUCT_IMAGES=[''];
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

  document.title=(p.name||'منتج')+' - StoreRi7a';
  if(categoryEl) categoryEl.textContent=normalizeCategory(p.category)||'منتج';
  if(nameEl) nameEl.textContent=p.name||'منتج';
  if(currentPriceEl) currentPriceEl.innerHTML=`<bdi dir="ltr">${price(fp)} ${esc(STORE_CONFIG.currency)}</bdi>`;
  if(old){old.innerHTML=saving?`<bdi dir="ltr">${price(p.price)} ${esc(STORE_CONFIG.currency)}</bdi>`:'';old.style.display=saving?'inline':'none';}
  if(save){save.innerHTML=saving?`توفير <bdi dir="ltr">${price(saving)} ${esc(STORE_CONFIG.currency)}</bdi>`:'';save.hidden=!saving;}
  if(badge){badge.innerHTML=d?`<bdi dir="ltr">-${d}%</bdi>`:'';badge.hidden=!d;}
  if(brandEl) brandEl.textContent=p.brand.trim()?p.brand:'—';
  if(sizeEl) sizeEl.textContent=p.size.trim()?sizeText(p.size):'—';
  if(descEl) descEl.textContent=p.description.trim()?p.description:'لا يوجد وصف لهذا المنتج حالياً.';
  if(backEl) backEl.textContent='الرجوع إلى '+({women:'عطور نسائية',men:'عطور رجالية',beauty:'مواد التجميل'}[key]||'الرئيسية');

  renderProductSwipeGallery();
  renderSimilarProducts(p,key);
  setupLightboxGestures();
  updateFavoriteButton();

  if(loading) loading.hidden=true;
  if(error) error.hidden=true;
  if(view) view.hidden=false;
}

function sizeText(v){
  const s=String(v||'').trim();
  if(!s) return '—';
  if(/^\d+(?:\.\d+)?$/.test(s)) return s+' ml';
  return s;
}

function renderProductSwipeGallery(){
  const gallery=document.getElementById('productSwipeGallery');
  const dots=document.getElementById('productSwipeDots');

  if(!gallery) return;

  const images=Array.isArray(PRODUCT_IMAGES) && PRODUCT_IMAGES.length
    ? PRODUCT_IMAGES
    : [''];

  currentImageIndex=Math.max(0,Math.min(currentImageIndex,images.length-1));

  gallery.innerHTML=images.map((src,index)=>{
    const valid=src && (
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('/')
    );

    const content=valid
      ? `<img src="${attr(src)}" alt="${attr(STORE_CURRENT_PRODUCT?.name||'منتج')} - ${index+1}" loading="${index===0?'eager':'lazy'}" decoding="async" draggable="false" onerror="this.closest('.productSwipeImageButton').innerHTML='<span class=&quot;productSwipePlaceholder&quot;>✨</span>'">`
      : `<span class="productSwipePlaceholder">✨</span>`;

    return `
      <div class="productSwipeSlide" data-index="${index}">
        <button
          class="productSwipeImageButton"
          type="button"
          onclick="openLightbox(${index})"
          aria-label="فتح الصورة ${index+1}"
        >
          ${content}
        </button>

        ${
          images.length>1
          ? `<span class="productSwipeNumber">${index+1} / ${images.length}</span>`
          : ''
        }
      </div>
    `;
  }).join('');

  if(dots){
    dots.innerHTML=images.length>1
      ? images.map((_,index)=>`
          <button
            class="productSwipeDot ${index===currentImageIndex?'active':''}"
            type="button"
            onclick="goToProductImage(${index})"
            aria-label="الانتقال إلى الصورة ${index+1}"
          ></button>
        `).join('')
      : '';
  }

  gallery.onscroll=()=>{
    if(gallery._swipeRaf) cancelAnimationFrame(gallery._swipeRaf);

    gallery._swipeRaf=requestAnimationFrame(()=>{
      const slides=[...gallery.querySelectorAll('.productSwipeSlide')];
      if(!slides.length) return;

      const galleryCenter=gallery.scrollLeft+(gallery.clientWidth/2);

      let nearest=0;
      let best=Infinity;

      slides.forEach((slide,index)=>{
        const center=slide.offsetLeft+(slide.offsetWidth/2);
        const distance=Math.abs(center-galleryCenter);

        if(distance<best){
          best=distance;
          nearest=index;
        }
      });

      currentImageIndex=nearest;
      updateProductSwipeDots(nearest);
    });
  };

  requestAnimationFrame(()=>{
    const slide=gallery.children[currentImageIndex];
    if(slide){
      gallery.scrollTo({
        left:slide.offsetLeft,
        behavior:'auto'
      });
    }
    updateProductSwipeDots(currentImageIndex);
  });
}

function updateProductSwipeDots(index){
  document
    .querySelectorAll('.productSwipeDot')
    .forEach((dot,i)=>{
      dot.classList.toggle('active',i===index);
    });
}

function goToProductImage(index){
  if(index<0 || index>=PRODUCT_IMAGES.length) return;

  const gallery=document.getElementById('productSwipeGallery');
  if(!gallery) return;

  const slide=gallery.children[index];
  if(!slide) return;

  currentImageIndex=index;
  updateProductSwipeDots(index);

  gallery.scrollTo({
    left:slide.offsetLeft,
    behavior:'smooth'
  });
}

function renderMainProductImage(){
  const box=document.getElementById('productImage');
  if(!box) return;
  const src=PRODUCT_IMAGES[currentImageIndex]||'';
  if(!src){box.innerHTML='<span style="font-size:72px">✨</span>';return;}
  if(src.startsWith('http://')||src.startsWith('https://')||src.startsWith('/')){
    box.innerHTML=`<img src="${attr(src)}" alt="${attr(STORE_CURRENT_PRODUCT?.name||'منتج')}" onerror="this.parentElement.innerHTML='✨'">`;
  }else box.innerHTML=esc(src);
  document.querySelectorAll('.thumb').forEach((el,i)=>el.classList.toggle('active',i===currentImageIndex));
}

function renderThumbs(){
  const box=document.getElementById('thumbs');
  if(!box) return;
  if(PRODUCT_IMAGES.length<=1){box.innerHTML='';box.style.display='none';return;}
  box.style.display='flex';
  box.innerHTML=PRODUCT_IMAGES.map((src,i)=>{
    const content=src && (src.startsWith('http://')||src.startsWith('https://')||src.startsWith('/')) ? `<img src="${attr(src)}" alt="">` : '<span>✨</span>';
    return `<button type="button" class="thumb ${i===currentImageIndex?'active':''}" onclick="selectProductImage(${i})" aria-label="الصورة ${i+1}">${content}</button>`;
  }).join('');
}

function selectProductImage(index){
  if(index<0||index>=PRODUCT_IMAGES.length) return;
  currentImageIndex=index;

  if(document.getElementById('productSwipeGallery')){
    goToProductImage(index);
    return;
  }

  renderMainProductImage();
  renderThumbs();
}

function renderSimilarProducts(product,key){
  const section=document.getElementById('similarSection');
  const grid=document.getElementById('similarGrid');
  if(!section||!grid) return;
  const related=PRODUCT_LIST.filter(p=>Number(p.id)!==Number(product.id)&&normalizeCategory(p.category)===normalizeCategory(product.category)).slice(0,6);
  if(!related.length){grid.innerHTML='';section.hidden=true;return;}
  section.hidden=false;
  grid.innerHTML=related.map(p=>{
    const src=(p.images&&p.images[0])||p.image||'';
    const fp=finalPrice(p);
    const img=src && (src.startsWith('http://')||src.startsWith('https://')||src.startsWith('/')) ? `<img src="${attr(src)}" alt="${attr(p.name)}" loading="lazy">` : '<span>✨</span>';
    return `<a class="similarCard" href="${productUrl(p.id)}"><div class="similarImage">${img}</div><div class="similarBody"><small>${esc(normalizeCategory(p.category))}</small><h3>${esc(p.name)}</h3><strong><bdi dir="ltr">${price(fp)} ${esc(STORE_CONFIG.currency)}</bdi></strong></div></a>`;
  }).join('');
}

function backToCategory(){
  if(!STORE_CURRENT_PRODUCT){location.href='/';return;}
  location.href='/category.html?cat='+encodeURIComponent(categoryKeyFromName(STORE_CURRENT_PRODUCT.category));
}

async function shareProduct(){
  const data={title:STORE_CURRENT_PRODUCT?.name||'StoreRi7a',text:'شوف هذا المنتج في StoreRi7a',url:location.href};
  try{
    if(navigator.share) await navigator.share(data);
    else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);alert('تم نسخ رابط المنتج');}
  }catch(e){}
}

function addCurrentToCart(){if(STORE_CURRENT_PRODUCT) add(Number(STORE_CURRENT_PRODUCT.id));}
function orderCurrentWhatsApp(){if(STORE_CURRENT_PRODUCT) buySingleProduct(Number(STORE_CURRENT_PRODUCT.id));}

function favoriteIds(){
  try{const ids=JSON.parse(localStorage.getItem('storeri7a_favorites')||'[]');return Array.isArray(ids)?ids.map(Number):[];}catch(e){return[];}
}

function updateFavoriteButton(){
  const btn=document.getElementById('favoriteBtn');
  if(!btn||!STORE_CURRENT_PRODUCT) return;
  const active=favoriteIds().includes(Number(STORE_CURRENT_PRODUCT.id));
  btn.classList.toggle('active',active);
  btn.textContent=active?'♥ تمت الإضافة إلى المفضلة':'♡ إضافة إلى المفضلة';
}

function toggleFavorite(){
  if(!STORE_CURRENT_PRODUCT) return;
  let ids=favoriteIds();
  const id=Number(STORE_CURRENT_PRODUCT.id);
  ids=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
  localStorage.setItem('storeri7a_favorites',JSON.stringify(ids));
  updateFavoriteButton();
}

function openLightbox(index=0){
  if(!PRODUCT_IMAGES.length) return;
  currentImageIndex=Math.max(0,Math.min(index,PRODUCT_IMAGES.length-1));
  const lightbox=document.getElementById('lightbox');
  if(!lightbox) return;
  lightbox.hidden=false;
  document.body.style.overflow='hidden';
  resetZoom();
  updateLightboxImage();
}

function closeLightbox(){
  const lightbox=document.getElementById('lightbox');
  if(lightbox) lightbox.hidden=true;
  document.body.style.overflow='';
  resetZoom();
}

function updateLightboxImage(){
  const img=document.getElementById('lightboxImage');
  const counter=document.getElementById('lightboxCounter');
  if(!img) return;
  const src=PRODUCT_IMAGES[currentImageIndex]||'';
  if(src && (src.startsWith('http://')||src.startsWith('https://')||src.startsWith('/'))){img.src=src;img.style.display='block';}
  else{img.removeAttribute('src');img.style.display='none';}
  if(counter){counter.textContent=PRODUCT_IMAGES.length>1?`${currentImageIndex+1} / ${PRODUCT_IMAGES.length}`:'';counter.dir='ltr';}
  resetZoom();
}

function lightboxPrev(){if(PRODUCT_IMAGES.length<=1)return;currentImageIndex=(currentImageIndex-1+PRODUCT_IMAGES.length)%PRODUCT_IMAGES.length;updateLightboxImage();}
function lightboxNext(){if(PRODUCT_IMAGES.length<=1)return;currentImageIndex=(currentImageIndex+1)%PRODUCT_IMAGES.length;updateLightboxImage();}

function clampLightboxPan(){
  const img=document.getElementById('lightboxImage');
  const stage=document.getElementById('lightboxStage');
  if(!img||!stage) return;

  if(lightboxScale<=1){
    lightboxPanX=0;
    lightboxPanY=0;
    return;
  }

  const imageWidth=img.offsetWidth;
  const imageHeight=img.offsetHeight;
  const scaledWidth=imageWidth*lightboxScale;
  const scaledHeight=imageHeight*lightboxScale;
  const stageWidth=stage.clientWidth;
  const stageHeight=stage.clientHeight;

  const maxX=Math.max(0,(scaledWidth-stageWidth)/2);
  const maxY=Math.max(0,(scaledHeight-stageHeight)/2);

  lightboxPanX=Math.max(-maxX,Math.min(maxX,lightboxPanX));
  lightboxPanY=Math.max(-maxY,Math.min(maxY,lightboxPanY));
}

function applyTransform(){
  const img=document.getElementById('lightboxImage');
  const label=document.getElementById('zoomValue');

  clampLightboxPan();

  if(img){
    img.style.transform=`translate3d(${lightboxPanX}px,${lightboxPanY}px,0) scale(${lightboxScale})`;
  }
  if(label) label.textContent=Math.round(lightboxScale*100)+'%';
}

function zoomIn(){
  lightboxScale=Math.min(4,lightboxScale+.5);
  applyTransform();
}

function zoomOut(){
  lightboxScale=Math.max(1,lightboxScale-.5);
  if(lightboxScale===1){
    lightboxPanX=0;
    lightboxPanY=0;
  }
  applyTransform();
}

function resetZoom(){
  lightboxScale=1;
  lightboxPanX=0;
  lightboxPanY=0;
  dragStart=null;
  applyTransform();
}

function setupLightboxGestures(){
  const stage=document.getElementById('lightboxStage');
  if(!stage||stage.dataset.ready==='1') return;
  stage.dataset.ready='1';

  const pointers=new Map();
  let lastTap=0;
  let startDistance=0;
  let startScale=1;
  let startPanX=0;
  let startPanY=0;
  let dragPointerId=null;
  let dragStartX=0;
  let dragStartY=0;

  function pointerDistance(){
    const pts=[...pointers.values()];
    if(pts.length<2) return 0;
    const dx=pts[0].x-pts[1].x;
    const dy=pts[0].y-pts[1].y;
    return Math.hypot(dx,dy);
  }

  stage.addEventListener('pointerdown',e=>{
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});

    try{stage.setPointerCapture(e.pointerId);}catch(_){}

    if(pointers.size===1&&lightboxScale>1){
      dragPointerId=e.pointerId;
      dragStartX=e.clientX;
      dragStartY=e.clientY;
      startPanX=lightboxPanX;
      startPanY=lightboxPanY;
    }

    if(pointers.size===2){
      dragPointerId=null;
      startDistance=pointerDistance();
      startScale=lightboxScale;
      startPanX=lightboxPanX;
      startPanY=lightboxPanY;
    }
  });

  stage.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)) return;

    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});

    if(pointers.size>=2){
      const distance=pointerDistance();
      if(startDistance>0){
        const ratio=distance/startDistance;
        lightboxScale=Math.max(1,Math.min(4,startScale*ratio));

        if(lightboxScale<=1){
          lightboxPanX=0;
          lightboxPanY=0;
        }
        applyTransform();
      }
      return;
    }

    if(pointers.size===1&&lightboxScale>1&&dragPointerId===e.pointerId){
      lightboxPanX=startPanX+(e.clientX-dragStartX);
      lightboxPanY=startPanY+(e.clientY-dragStartY);
      applyTransform();
    }
  });

  function endPointer(e){
    pointers.delete(e.pointerId);

    if(pointers.size===0){
      dragPointerId=null;
      startDistance=0;
      clampLightboxPan();
      applyTransform();
      return;
    }

    if(pointers.size===1){
      const remaining=[...pointers.entries()][0];
      dragPointerId=remaining[0];
      dragStartX=remaining[1].x;
      dragStartY=remaining[1].y;
      startPanX=lightboxPanX;
      startPanY=lightboxPanY;
      startDistance=0;
    }
  }

  stage.addEventListener('pointerup',endPointer);
  stage.addEventListener('pointercancel',endPointer);

  stage.addEventListener('touchend',e=>{
    if(e.touches.length!==0) return;

    const now=Date.now();
    if(now-lastTap<300){
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
    }else{
      lastTap=now;
    }
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

  const img=document.getElementById('lightboxImage');
  if(img) img.addEventListener('dragstart',e=>e.preventDefault());
}

function productUrl(id){return '/product-1.html?id='+encodeURIComponent(id);}

function card(p,isSale){
  const fp=finalPrice(p);
  const d=discountPercent(p);
  return `<article class="card">
    ${isSale&&d?`<span class="saleBadge"><bdi dir="ltr">-${d}%</bdi></span>`:''}
    <a class="productLink" href="${productUrl(p.id)}" aria-label="${attr(p.name)}"><div class="photo">${image(p)}</div></a>
    <div class="info">
      <span class="category">${esc(normalizeCategory(p.category))}</span>
      <a class="productLink" href="${productUrl(p.id)}"><h3>${esc(p.name)}</h3></a>
      ${p.brand?`<small class="productBrand">${esc(p.brand)}</small>`:''}
      <div class="priceLine">
        <span class="price"><bdi dir="ltr">${price(fp)} ${esc(STORE_CONFIG.currency)}</bdi></span>
        ${fp<p.price?`<span class="oldPrice"><bdi dir="ltr">${price(p.price)} ${esc(STORE_CONFIG.currency)}</bdi></span>`:''}
      </div>
      <button class="add" onclick="add(${p.id})">🛒 أضف إلى السلة</button>
    </div>
  </article>`;
}

function image(p){
  const arr=Array.isArray(p?.images)?p.images:[];
  const i=String(p?.image||arr[0]||'').trim();
  if(!i) return '✨';
  if(i.startsWith('http://')||i.startsWith('https://')||i.startsWith('/')){
    return `<img src="${attr(i)}" alt="${attr(p?.name||'منتج')}" loading="lazy" onerror="this.parentElement.innerHTML='✨'">`;
  }
  return esc(i);
}

function searchAll(v){currentSearch=String(v||'').trim();renderCurrentPage();}
function productSearch(e){if(e.key!=='Enter')return;const q=String(e.target.value||'').trim();if(q)window.location.href='/?search='+encodeURIComponent(q);}

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function attr(v){return esc(v);}
function price(v){const n=Number(v||0);return Number.isInteger(n)?n:n.toFixed(2);}

function add(id){
  const p=PRODUCT_LIST.find(x=>x.id===id);
  if(!p) return;
  const item=cart.find(x=>x.id===id);
  if(item) item.qty=Math.min(20,item.qty+1);
  else cart.push({...p,qty:1});
  saveCart();updateCart();openCart();
}

function changeQty(id,delta){
  const item=cart.find(x=>Number(x.id)===Number(id));
  if(!item) return;
  item.qty=Math.max(1,Math.min(20,(Number(item.qty)||1)+Number(delta||0)));
  saveCart();
  updateCart();
  if(document.getElementById('checkoutPage')) renderCheckoutPage();
}

function removeItem(id){
  cart=cart.filter(x=>Number(x.id)!==Number(id));
  saveCart();
  updateCart();
  if(document.getElementById('checkoutPage')) renderCheckoutPage();
}

function updateCart(){
  const count=document.getElementById('cartCount');
  const items=document.getElementById('cartItems');
  const total=document.getElementById('total');
  if(count) count.textContent=cart.reduce((s,x)=>s+(Number(x.qty)||0),0);
  if(items){
    items.innerHTML=cart.length?cart.map(x=>`
      <div class="cartItem">
        <div>
          <b>${esc(x.name)}</b><br>
          <small>${x.qty} × <bdi dir="ltr">${price(finalPrice(x))} ${esc(STORE_CONFIG.currency)}</bdi></small>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button onclick="changeQty(${x.id},-1)" aria-label="نقص الكمية">−</button>
          <button onclick="changeQty(${x.id},1)" aria-label="زيادة الكمية">+</button>
          <button onclick="removeItem(${x.id})">حذف</button>
        </div>
      </div>`).join(''):'<p>السلة فارغة حالياً.</p>';
  }
  if(total){
    const totalValue=cart.reduce((s,x)=>s+finalPrice(x)*(Number(x.qty)||0),0);
    total.innerHTML=`<bdi dir="ltr">${price(totalValue)} ${esc(STORE_CONFIG.currency)}</bdi>`;
  }
}

function openCart(){document.getElementById('cart')?.classList.add('open');document.getElementById('cartShade')?.classList.add('show');}
function closeCart(){document.getElementById('cart')?.classList.remove('open');document.getElementById('cartShade')?.classList.remove('show');}

function buySingleProduct(id){
  const p=PRODUCT_LIST.find(x=>x.id===id);
  if(!p) return;
  const fp=finalPrice(p);
  const extras=[p.brand?`• الماركة: ${p.brand}`:'',p.size?`• الحجم: ${p.size}`:''].filter(Boolean).join('\n');
  const msg=`السلام عليكم، بغيت نطلب هاد المنتج من ${STORE_CONFIG.storeName}:\n\n• ${p.name}\n• ${normalizeCategory(p.category)}\n${extras?extras+'\n':''}• الثمن: ${price(fp)} ${STORE_CONFIG.currency}`;
  window.open(`https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,'_blank');
}

/* =====================================================
   CHECKOUT
===================================================== */

function checkout(){
  if(!cart.length) return alert('السلة فارغة');
  location.href='/checkout.html';
}

function checkoutTotal(){
  return cart.reduce((sum,item)=>sum+finalPrice(item)*(Number(item.qty)||1),0);
}

function renderCheckoutPage(){
  const list=document.getElementById('checkoutItems');
  const totalEl=document.getElementById('checkoutTotal');
  const empty=document.getElementById('checkoutEmpty');
  const form=document.getElementById('checkoutForm');
  const submitBtn=document.getElementById('checkoutSubmit');

  if(!list) return;

  if(!cart.length){
    list.innerHTML='';
    if(totalEl) totalEl.textContent='0 '+STORE_CONFIG.currency;
    if(empty) empty.hidden=false;
    if(form) form.hidden=true;
    return;
  }

  if(empty) empty.hidden=true;
  if(form) form.hidden=false;

  list.innerHTML=cart.map(item=>{
    const src=String(item.image||(Array.isArray(item.images)?item.images[0]:'')||'');
    const thumb=src && (src.startsWith('http://')||src.startsWith('https://')||src.startsWith('/'))
      ? `<img src="${attr(src)}" alt="${attr(item.name)}" loading="lazy">`
      : `<span class="checkoutEmoji">✨</span>`;

    return `
      <article class="checkoutItem">
        <div class="checkoutThumb">${thumb}</div>
        <div class="checkoutItemInfo">
          <strong>${esc(item.name)}</strong>
          <small>${esc(normalizeCategory(item.category))}</small>
          <div class="checkoutLinePrice">
            <bdi dir="ltr">${price(finalPrice(item))} ${esc(STORE_CONFIG.currency)}</bdi>
          </div>
        </div>
        <div class="checkoutQty">
          <button type="button" onclick="changeQty(${item.id},-1)">−</button>
          <span>${Number(item.qty)||1}</span>
          <button type="button" onclick="changeQty(${item.id},1)">+</button>
        </div>
      </article>
    `;
  }).join('');

  if(totalEl){
    totalEl.innerHTML=`<bdi dir="ltr">${price(checkoutTotal())} ${esc(STORE_CONFIG.currency)}</bdi>`;
  }

  if(submitBtn) submitBtn.disabled=false;
}

function checkoutStatus(message,type=''){
  const box=document.getElementById('checkoutStatus');
  if(!box) return;
  box.hidden=!message;
  box.textContent=message||'';
  box.className='checkoutStatus'+(type?' '+type:'');
}

function normalizeWhatsappNumber(value){
  let s=String(value||'').replace(/[^\d]/g,'');
  if(s.startsWith('00')) s=s.slice(2);
  return s;
}

function buildWhatsappOrderMessage(order){
  const currency=STORE_CONFIG.currency||'DH';
  const lines=(order.items||[]).map(item=>{
    const lineTotal=Number(item.price||0)*Number(item.quantity||1);
    return `• ${item.product_name} × ${item.quantity} = ${price(lineTotal)} ${currency}`;
  }).join('\n');

  return `السلام عليكم، بغيت نأكد الطلب ديالي من ${STORE_CONFIG.storeName}.

رقم الطلب: #${order.order_id}

الاسم: ${order.customer.name}
الهاتف: ${order.customer.phone}
المدينة: ${order.customer.city}
العنوان: ${order.customer.address}

${lines}

المجموع: ${price(order.total)} ${currency}
الدفع عند الاستلام.

المرجو تأكيد الطلب، شكراً.`;
}

async function submitCheckout(event){
  event.preventDefault();

  if(!cart.length){
    checkoutStatus('السلة فارغة.','error');
    return;
  }

  const form=event.currentTarget;
  const submitBtn=document.getElementById('checkoutSubmit');

  const customer_name=String(form.customer_name.value||'').trim();
  const customer_phone=String(form.customer_phone.value||'').trim();
  const city=String(form.city.value||'').trim();
  const address=String(form.address.value||'').trim();
  const notes=String(form.notes.value||'').trim();

  if(customer_name.length<2){
    checkoutStatus('دخل الاسم الكامل.','error');
    form.customer_name.focus();
    return;
  }

  if(customer_phone.replace(/\D/g,'').length<8){
    checkoutStatus('دخل رقم هاتف صحيح.','error');
    form.customer_phone.focus();
    return;
  }

  if(city.length<2){
    checkoutStatus('دخل المدينة.','error');
    form.city.focus();
    return;
  }

  if(address.length<3){
    checkoutStatus('دخل العنوان.','error');
    form.address.focus();
    return;
  }

  const payload={
    customer_name,
    customer_phone,
    city,
    address,
    notes,
    items:cart.map(item=>({
      product_id:Number(item.id),
      quantity:Math.max(1,Math.min(20,Math.floor(Number(item.qty)||1)))
    }))
  };

  if(submitBtn){
    submitBtn.disabled=true;
    submitBtn.textContent='جاري تسجيل الطلب...';
  }

  checkoutStatus('جاري تسجيل الطلب...','loading');

  try{
    const response=await fetch('/api/orders',{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'accept':'application/json'
      },
      body:JSON.stringify(payload)
    });

    let data=null;
    try{ data=await response.json(); }catch(e){}

    if(!response.ok || !data?.ok){
      throw new Error(data?.error || 'تعذر تسجيل الطلب');
    }

    try{
      localStorage.setItem('storeri7a_last_order',JSON.stringify({
        order_id:data.order_id,
        created_at:data.created_at||new Date().toISOString()
      }));
    }catch(e){}

    cart=[];
    saveCart();
    updateCart();

    checkoutStatus(`✅ تم تسجيل الطلب رقم #${data.order_id}. جاري فتح WhatsApp للتأكيد...`,'success');

    const phone=normalizeWhatsappNumber(STORE_CONFIG.whatsapp);
    const message=buildWhatsappOrderMessage(data);
    const url=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    setTimeout(()=>{
      location.href=url;
    },600);

  }catch(error){
    console.error('Checkout:',error);
    checkoutStatus(error?.message||'وقع خطأ أثناء تسجيل الطلب. حاول مرة أخرى.','error');

    if(submitBtn){
      submitBtn.disabled=false;
      submitBtn.textContent='تأكيد الطلب عبر WhatsApp';
    }
  }
}

loadStoreData();
