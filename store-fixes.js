/* StoreRi7a — Price RTL/LTR fix V2 */
(() => {
  const currency = (window.STORE_CONFIG && STORE_CONFIG.currency) || 'DH';

  function numberFrom(text){
    const m = String(text || '').replace(',', '.').match(/\d+(?:\.\d+)?/);
    return m ? m[0] : '';
  }

  function fixPrices(){
    const current = document.getElementById('currentPrice');
    const old = document.getElementById('oldPrice');
    const saving = document.getElementById('savingBox');

    if(current){
      const n = numberFrom(current.textContent);
      if(n){
        current.innerHTML = `<span class="priceNumber">${n}</span><span class="priceCurrency">${currency}</span>`;
      }
    }

    if(old){
      const n = numberFrom(old.textContent);
      if(n){
        old.innerHTML = `<span class="priceNumber">${n}</span><span class="priceCurrency">${currency}</span>`;
      }
    }

    if(saving && !saving.hidden){
      const n = numberFrom(saving.textContent);
      if(n){
        saving.innerHTML =
          `<span class="savingLabel">توفير</span>` +
          `<span class="savingAmount">${n} ${currency}</span>`;
      }
    }
  }

  function fixHomeSectionLinks(){
    const routes = {
      discounts: '/category?cat=discounts',
      women: '/category?cat=women',
      men: '/category?cat=men',
      beauty: '/category?cat=beauty'
    };

    Object.entries(routes).forEach(([id,url])=>{
      const section = document.getElementById(id);
      if(!section) return;

      const title = section.querySelector('.sectionTitle h2');
      if(title && !title.dataset.fixedLink){
        title.dataset.fixedLink = '1';
        title.style.cursor = 'pointer';
        title.setAttribute('role','link');
        title.setAttribute('tabindex','0');
        title.addEventListener('click',()=>location.href=url);
        title.addEventListener('keydown',e=>{
          if(e.key==='Enter' || e.key===' '){
            e.preventDefault();
            location.href=url;
          }
        });
      }

      const more = section.querySelector('.sectionTitle a');
      if(more) more.href = url;
    });
  }

  function run(){
    fixPrices();
    fixHomeSectionLinks();
  }

  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement,{
    childList:true,
    subtree:true,
    characterData:true
  });

  setTimeout(run,400);
  setTimeout(run,1000);
  setTimeout(run,2000);
})();
