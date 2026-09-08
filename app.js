let selected="الكل",cart=[],PRODUCT_LIST=[];
async function boot(){
 try{
  const [pr,sr]=await Promise.all([fetch('/api/products'),fetch('/api/settings')]);
  if(!pr.ok)throw 0;
  const dbProducts=await pr.json();
  PRODUCT_LIST=dbProducts.length?dbProducts:PRODUCTS;
  if(sr.ok){
    const s=await sr.json();
    STORE_CONFIG.storeName=s.store_name||STORE_CONFIG.storeName;
    STORE_CONFIG.whatsapp=s.whatsapp||STORE_CONFIG.whatsapp;
    STORE_CONFIG.currency=s.currency||STORE_CONFIG.currency;
  }
 }catch(e){PRODUCT_LIST=PRODUCTS}
 renderProducts();updateCart()
}
document.querySelectorAll(".filters button").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".filters button").forEach(x=>x.classList.remove("active"));
 b.classList.add("active");selected=b.dataset.cat;renderProducts()
});
function renderProducts(){
 let q=document.getElementById("search").value.toLowerCase();
 let list=PRODUCT_LIST.filter(p=>(selected==="الكل"||p.category===selected)&&p.name.toLowerCase().includes(q));
 document.getElementById("grid").innerHTML=list.map(p=>`<article class="card">
 <div class="photo">${p.image&&p.image.startsWith("http")?`<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover">`:(p.image||p.icon||"✨")}</div>
 <div class="info"><span class="category">${p.category}</span><h3>${p.name}</h3>
 <span class="price">${p.price} ${STORE_CONFIG.currency}</span>
 <button class="add" onclick="add(${p.id})">أضف إلى السلة</button></div></article>`).join("")||"<p>لا توجد منتجات.</p>"
}
function add(id){let p=PRODUCT_LIST.find(x=>x.id===id),i=cart.find(x=>x.id===id);i?i.qty++:cart.push({...p,qty:1});updateCart();openCart()}
function removeItem(id){cart=cart.filter(x=>x.id!==id);updateCart()}
function updateCart(){
 document.getElementById("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
 document.getElementById("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cartItem"><div><b>${x.name}</b><br><small>${x.qty} × ${x.price} ${STORE_CONFIG.currency}</small></div><button onclick="removeItem(${x.id})">حذف</button></div>`).join(""):"<p>السلة فارغة حالياً.</p>";
 document.getElementById("total").textContent=cart.reduce((s,x)=>s+x.price*x.qty,0)+" "+STORE_CONFIG.currency
}
function openCart(){document.getElementById("cart").classList.add("open");document.getElementById("shade").classList.add("show")}
function closeCart(){document.getElementById("cart").classList.remove("open");document.getElementById("shade").classList.remove("show")}
function checkout(){
 if(!cart.length)return alert("السلة فارغة");
 let total=cart.reduce((s,x)=>s+x.price*x.qty,0);
 let lines=cart.map(x=>`• ${x.name} × ${x.qty} = ${x.price*x.qty} ${STORE_CONFIG.currency}`).join("\n");
 let msg=`السلام عليكم، بغيت نطلب من ${STORE_CONFIG.storeName}:\n\n${lines}\n\nالمجموع: ${total} ${STORE_CONFIG.currency}`;
 window.open(`https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,"_blank")
}
boot();