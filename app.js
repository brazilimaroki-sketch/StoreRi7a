let cart=[];let PRODUCT_LIST=[];let currentSearch="";
async function loadStoreData(){
  try{
    const r=await fetch('/api/products?ts='+Date.now(),{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const raw=await r.json();
    const rows=Array.isArray(raw)?raw:(Array.isArray(raw.results)?raw.results:[]);
    PRODUCT_LIST=rows.filter(p=>p&&Number(p.active)!==0).map(p=>({
      id:Number(p.id),name:String(p.name||'منتج'),category:String(p.category||''),
      price:Number(p.price||0),image:String(p.image||''),
      sale_price:p.sale_price!=null&&p.sale_price!==''?Number(p.sale_price):null,
      discount:p.discount!=null&&p.discount!==''?Number(p.discount):null
    }));
  }catch(e){PRODUCT_LIST=[]}
  try{
    const r=await fetch('/api/settings?ts='+Date.now(),{cache:'no-store'});
    if(r.ok){const s=await r.json();STORE_CONFIG.storeName=s.store_name||STORE_CONFIG.storeName;STORE_CONFIG.whatsapp=s.whatsapp||STORE_CONFIG.whatsapp;STORE_CONFIG.currency=s.currency||STORE_CONFIG.currency}
  }catch(e){}
  renderAll();updateCart();
}
function finalPrice(p){return p.sale_price!==null&&p.sale_price<p.price?p.sale_price:p.price}
function discountPercent(p){if(p.discount&&p.discount>0)return Math.round(p.discount);if(p.sale_price!==null&&p.sale_price<p.price&&p.price>0)return Math.round((1-p.sale_price/p.price)*100);return 0}
function normalizeCategory(c){c=String(c||'').trim();if(['عطور نسائية','نسائية','عطر نسائي'].includes(c))return'عطور نسائية';if(['عطور رجالية','رجالية','عطر رجالي'].includes(c))return'عطور رجالية';if(['تجميل','مواد التجميل','مستحضرات التجميل'].includes(c))return'تجميل';return c}
function matchesSearch(p){if(!currentSearch)return true;const q=currentSearch.toLowerCase();return p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)}
function renderAll(){const list=PRODUCT_LIST.filter(matchesSearch);renderDiscounts(list);renderSection('womenGrid',list,'عطور نسائية');renderSection('menGrid',list,'عطور رجالية');renderSection('beautyGrid',list,'تجميل')}
function renderDiscounts(list){let a=list.filter(p=>discountPercent(p)>0);if(a.length<4){const ids=new Set(a.map(p=>p.id));a=a.concat(list.filter(p=>!ids.has(p.id)).slice(0,4-a.length))}document.getElementById('discountGrid').innerHTML=a.slice(0,4).map(p=>card(p,true)).join('')||'<div class="empty">لا توجد منتجات حالياً.</div>'}
function renderSection(id,list,cat){const a=list.filter(p=>normalizeCategory(p.category)===cat).slice(0,8);document.getElementById(id).innerHTML=a.map(p=>card(p,false)).join('')||'<div class="empty">لا توجد منتجات في هذا القسم حالياً.</div>'}
function card(p,sale){const fp=finalPrice(p),d=discountPercent(p);return `<article class="card">${sale&&d?`<span class="saleBadge">-${d}%</span>`:''}<div class="photo">${image(p)}</div><div class="info"><span class="category">${esc(normalizeCategory(p.category))}</span><h3>${esc(p.name)}</h3><span class="price">${price(fp)} ${esc(STORE_CONFIG.currency)}</span>${sale&&fp<p.price?`<span class="oldPrice">${price(p.price)} ${esc(STORE_CONFIG.currency)}</span>`:''}<button class="add" onclick="add(${p.id})">🛒 أضف إلى السلة</button></div></article>`}
function image(p){const i=String(p.image||'').trim();if(!i)return'✨';if(i.startsWith('http://')||i.startsWith('https://')||i.startsWith('/'))return `<img src="${attr(i)}" alt="${attr(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='✨'">`;return esc(i)}
function searchAll(v){currentSearch=String(v||'').trim();renderAll();if(currentSearch)document.getElementById('discounts').scrollIntoView({behavior:'smooth'})}
function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function attr(v){return esc(v)} function price(v){const n=Number(v||0);return Number.isInteger(n)?n:n.toFixed(2)}
function add(id){const p=PRODUCT_LIST.find(x=>x.id===id);if(!p)return;const i=cart.find(x=>x.id===id);i?i.qty++:cart.push({...p,qty:1});updateCart();openCart()}
function removeItem(id){cart=cart.filter(x=>x.id!==id);updateCart()}
function updateCart(){document.getElementById('cartCount').textContent=cart.reduce((s,x)=>s+x.qty,0);document.getElementById('cartItems').innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div><b>${esc(x.name)}</b><br><small>${x.qty} × ${price(finalPrice(x))} ${esc(STORE_CONFIG.currency)}</small></div><button onclick="removeItem(${x.id})">حذف</button></div>`).join(''):'<p>السلة فارغة حالياً.</p>';document.getElementById('total').textContent=price(cart.reduce((s,x)=>s+finalPrice(x)*x.qty,0))+' '+STORE_CONFIG.currency}
function openCart(){document.getElementById('cart').classList.add('open');document.getElementById('cartShade').classList.add('show')}
function closeCart(){document.getElementById('cart').classList.remove('open');document.getElementById('cartShade').classList.remove('show')}
function checkout(){if(!cart.length)return alert('السلة فارغة');const total=cart.reduce((s,x)=>s+finalPrice(x)*x.qty,0);const lines=cart.map(x=>`• ${x.name} × ${x.qty} = ${price(finalPrice(x)*x.qty)} ${STORE_CONFIG.currency}`).join('\n');const msg=`السلام عليكم، بغيت نطلب من ${STORE_CONFIG.storeName}:\n\n${lines}\n\nالمجموع: ${price(total)} ${STORE_CONFIG.currency}`;window.open(`https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,'_blank')}
document.querySelectorAll('.mainNav a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.mainNav a').forEach(x=>x.classList.remove('active'));a.classList.add('active')}));
loadStoreData();