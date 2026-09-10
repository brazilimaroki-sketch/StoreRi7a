/* StoreRi7a — Price direction + clickable section titles
   ضع هذا الملف بعد app.js في index.html و product.html
*/
(() => {
  const CURRENCY = (window.STORE_CONFIG && STORE_CONFIG.currency) || 'DH';

  function extractNumber(text) {
    const m = String(text || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
    return m ? m[0] : '';
  }

  function ltrPrice(value) {
    return `<bdi dir="ltr">${value} ${CURRENCY}</bdi>`;
  }

  function fixProductPrices() {
    if (!document.getElementById('productView')) return;

    const current = document.getElementById('currentPrice');
    const old = document.getElementById('oldPrice');
    const saving = document.getElementById('savingBox');
    const badge = document.getElementById('discountBadge');

    if (current) {
      const n = extractNumber(current.textContent);
      if (n) current.innerHTML = ltrPrice(n);
      current.style.direction = 'ltr';
      current.style.unicodeBidi = 'isolate';
      current.style.whiteSpace = 'nowrap';
    }

    if (old) {
      const n = extractNumber(old.textContent);
      if (n) old.innerHTML = ltrPrice(n);
      old.style.direction = 'ltr';
      old.style.unicodeBidi = 'isolate';
      old.style.whiteSpace = 'nowrap';
    }

    if (saving && !saving.hidden) {
      const n = extractNumber(saving.textContent);
      if (n) saving.innerHTML = `توفير <bdi dir="ltr">${n} ${CURRENCY}</bdi>`;
    }

    if (badge && !badge.hidden) {
      const n = extractNumber(badge.textContent);
      if (n) badge.innerHTML = `<bdi dir="ltr">-${n}%</bdi>`;
    }
  }

  const routes = {
    discounts: '/category?cat=discounts',
    women: '/category?cat=women',
    men: '/category?cat=men',
    beauty: '/category?cat=beauty'
  };

  function makeSectionTitleClickable(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const url = routes[sectionId];
    if (!url) return;

    const title = section.querySelector('.sectionTitle h2');
    if (title && !title.dataset.categoryLinkReady) {
      title.dataset.categoryLinkReady = '1';
      title.setAttribute('role', 'link');
      title.setAttribute('tabindex', '0');
      title.style.cursor = 'pointer';
      title.style.textDecoration = 'none';

      const go = () => { window.location.href = url; };
      title.addEventListener('click', go);
      title.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      });
    }

    const more = section.querySelector('.sectionTitle a');
    if (more) more.setAttribute('href', url);
  }

  function fixHomeSectionLinks() {
    makeSectionTitleClickable('discounts');
    makeSectionTitleClickable('women');
    makeSectionTitleClickable('men');
    makeSectionTitleClickable('beauty');
  }

  function runFixes() {
    fixProductPrices();
    fixHomeSectionLinks();
  }

  document.addEventListener('DOMContentLoaded', runFixes);
  window.addEventListener('load', runFixes);

  // app.js loads products asynchronously, so watch for its rendering.
  const observer = new MutationObserver(() => runFixes());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Safety refresh after API render.
  setTimeout(runFixes, 500);
  setTimeout(runFixes, 1500);
})();
