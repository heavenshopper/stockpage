// ===== Floating contact menu logic =====
let isMenuOpen = false;
function toggleContactMenu() {
  const overlay = document.getElementById('contactOverlay');
  const menu = document.getElementById('contactMenu');
  const fab = document.getElementById('fabMain');
  const icon = document.getElementById('fabIcon');
  isMenuOpen = !isMenuOpen;
  if (isMenuOpen) {
    overlay.classList.add('active');
    menu.classList.add('active');
    fab.classList.add('active');
    icon.className = 'fas fa-times';
  } else {
    overlay.classList.remove('active');
    menu.classList.remove('active');
    fab.classList.remove('active');
    icon.className = 'fas fa-comment';
  }
}
document.getElementById('contactOverlay')?.addEventListener('click', function () {
  if (isMenuOpen) toggleContactMenu();
});
function openMessenger(event) {
  event.preventDefault();
  window.open('https://www.facebook.com/share/19eN49NTUR/?mibextid=wwXIfr', '_blank');
  toggleContactMenu();
}
function openLine(event) {
  event.preventDefault();
  window.open('https://line.me/R/ti/p/sreenoomhihi', '_blank');
  toggleContactMenu();
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && isMenuOpen) toggleContactMenu();
});
setInterval(() => {
  if (!isMenuOpen) {
    const fab = document.getElementById('fabMain');
    if (fab) fab.style.animation = 'pulse 2s infinite';
  }
}, 5000);

// ===== Google Sheet config & data load (via JSONP to avoid CORS) =====
const SHEET_ID = '1T1ls-VUXfvBRAE4vOt5-b94POeZpG83jS4-SIqiN09U';
const SHEET_NAME = 'Product';
const VALID_CATEGORIES = ['new','gaming','gadget it','music equipment','common','motorcycle/car parts','sport','promotion'];
const menuEl = document.getElementById('menu-container');
let ALL_ITEMS = [];
let currentCategory = 'new';

(function loadViaJSONP() {
  if (menuEl) menuEl.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">กำลังโหลดสินค้า…</p>';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json;responseHandler:__sheet_cb__&tq=${encodeURIComponent('select *')}`;
  const s = document.createElement('script');
  s.src = url;
  s.onerror = () => { if (menuEl) menuEl.innerHTML = '<p style="text-align:center;padding:40px;color:#c00;">โหลดข้อมูลไม่สำเร็จ (script load error)</p>'; };
  document.body.appendChild(s);
})();

// JSONP callback
function __sheet_cb__(json) {
  try {
    const rows = json.table?.rows || [];
    ALL_ITEMS = rows.map((r, i) => {
      const c = r.c || [];
      return {
        name: c[3]?.v ?? 'ไม่ระบุชื่อ',
        price: c[10]?.v ?? 'ไม่ระบุราคา',
        image: c[17]?.v ?? '',
        stock: (c[6]?.v ?? '').toString().trim().toLowerCase(),
        category: (c[15]?.v ?? '').toString().trim().toLowerCase(),
        _rowIndex: i
      };
    }).filter(p => ['in stock','instock','available'].includes(p.stock));

    renderCategory(currentCategory);
    bindCategoryMenu();
    bindPreviewHandlers();
  } catch (err) {
    console.error(err);
    if (menuEl) menuEl.innerHTML = '<p style="text-align:center;padding:40px;color:#c00;">โหลดข้อมูลไม่สำเร็จ: ' + (err.message || '') + '</p>';
  }
}

// ===== Rendering =====
function renderCategory(cat) {
  const want = norm(cat);
  let list = ALL_ITEMS;
  if (VALID_CATEGORIES.includes(want)) {
    list = ALL_ITEMS.filter(p => (p.category || 'new') === want);
  }
  // ใหม่อยู่บน
  list = list.slice().sort((a,b) => (b._rowIndex ?? 0) - (a._rowIndex ?? 0));

  if (!list.length) {
    if (menuEl) menuEl.innerHTML = '<div class="no-products" style="text-align:center;padding:40px;color:#666;">ไม่มีสินค้าในหมวดนี้</div>';
    return;
  }
  if (!menuEl) return;
  menuEl.innerHTML = list.map(p => {
    const imgUrl = sanitizeDriveImage(p.image);
    const price = typeof p.price === 'number' ? p.price.toLocaleString('th-TH') : p.price;
    const name = (p.name || '').trim() || 'ไม่ระบุชื่อ';
    return `
      <div class="menu-item">
        <img src="${imgUrl}" alt="${escapeHtml(name)}" loading="lazy"
             onerror="this.onerror=null;this.src='';this.style.background='#f3f3f3';">
        <h3>${escapeHtml(name)}</h3>
        <div class="price-tag">ราคา : ${escapeHtml(price)} บาท</div>
      </div>`;
  }).join('');
}

// ===== Menu events =====
function bindCategoryMenu() {
  const btns = document.querySelectorAll('.category-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category || 'new';
      renderCategory(currentCategory);
    });
  });
}

// ===== Preview & Zoom =====
function bindPreviewHandlers() {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const modal = document.getElementById('preview-modal');
  const modalImg = document.getElementById('zoom-img');
  const closeBtn = modal?.querySelector('.close-modal');
  if (!modal || !modalImg || !closeBtn) return;
  attachZoom(modal);

  function openModalWith(src) {
    if (!src) return;
    modalImg.src = src;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    modal.dispatchEvent(new Event('show-zoom'));
  }
  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

  document.getElementById('menu-container')?.addEventListener('click', (e) => {
    const img = e.target.closest?.('.menu-item img');
    if (!img) return;
    e.preventDefault(); e.stopPropagation();
    openModalWith(img.getAttribute('src'));
  });

  if (!isTouch) {
    const preview = document.getElementById('image-preview');
    let moveHandler = null;
    document.addEventListener('mouseover', function (e) {
      if (e.target.tagName === 'IMG' && e.target.closest('.menu-item')) {
        const src = e.target.getAttribute('src');
        if (src) {
          preview.style.display = 'block';
          preview.querySelector('img').src = src;
          moveHandler = (ev) => {
            const offset = 20;
            const rect = preview.getBoundingClientRect();
            const ww = window.innerWidth, wh = window.innerHeight;
            let left = ev.pageX + offset, top = ev.pageY + offset;
            if (left + rect.width > ww) left = ev.pageX - rect.width - offset;
            if (top + rect.height > wh) top = ev.pageY - rect.height - offset;
            preview.style.left = left + 'px';
            preview.style.top = top + 'px';
          };
          document.addEventListener('mousemove', moveHandler);
        }
      } else {
        preview.style.display = 'none';
        if (moveHandler) { document.removeEventListener('mousemove', moveHandler); moveHandler = null; }
      }
    });
  }
}

function attachZoom(modal) {
  const wrap = modal.querySelector('.zoom-wrap');
  const img = modal.querySelector('#zoom-img');
  const state = { scale: 1, tx: 0, ty: 0, minScale: 1, maxScale: 4, startX: 0, startY: 0, startTx: 0, startTy: 0, isPanning: false, lastTap: 0 };
  function apply() { img.style.setProperty('--scale', state.scale); img.style.setProperty('--tx', state.tx + 'px'); img.style.setProperty('--ty', state.ty + 'px'); }
  function clampPan() {
    const prevScale = state.scale, prevTx = state.tx, prevTy = state.ty;
    img.style.setProperty('--scale', 1); img.style.setProperty('--tx', '0px'); img.style.setProperty('--ty', '0px');
    const baseRect = img.getBoundingClientRect();
    img.style.setProperty('--scale', prevScale); img.style.setProperty('--tx', prevTx + 'px'); img.style.setProperty('--ty', prevTy + 'px');
    const contW = wrap.clientWidth, contH = wrap.clientHeight;
    const curW = baseRect.width * state.scale, curH = baseRect.height * state.scale;
    const maxX = Math.max(0, (curW - contW) / 2), maxY = Math.max(0, (curH - contH) / 2);
    state.tx = Math.min(maxX, Math.max(-maxX, state.tx));
    state.ty = Math.min(maxY, Math.max(-maxY, state.ty));
  }
  function setScale(val) { state.scale = Math.min(state.maxScale, Math.max(state.minScale, val)); clampPan(); apply(); }
  function resetView() { state.scale = 1; state.tx = 0; state.ty = 0; apply(); }

  img.addEventListener('mousedown', (e) => {
    if (state.scale <= 1) return;
    state.isPanning = true;
    state.startX = e.clientX; state.startY = e.clientY;
    state.startTx = state.tx; state.startTy = state.ty;
    img.classList.add('zooming');
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.isPanning) return;
    state.tx = state.startTx + (e.clientX - state.startX);
    state.ty = state.startTy + (e.clientY - state.startY);
    clampPan(); apply();
  });
  window.addEventListener('mouseup', () => { state.isPanning = false; img.classList.remove('zooming'); });

  wrap.addEventListener('wheel', (e) => { e.preventDefault(); const d = -Math.sign(e.deltaY) * 0.2; setScale(state.scale + d); }, { passive: false });
  img.addEventListener('dblclick', () => { (state.scale === 1) ? setScale(2.5) : resetView(); });

  let tDist = 0, tScale = 1;
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  wrap.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      state.isPanning = state.scale > 1;
      state.startX = t.clientX; state.startY = t.clientY;
      state.startTx = state.tx; state.startTy = state.ty;
      const now = Date.now();
      if (now - state.lastTap < 300) { (state.scale === 1) ? setScale(2.5) : resetView(); }
      state.lastTap = now;
    } else if (e.touches.length === 2) {
      tDist = dist(e.touches[0], e.touches[1]); tScale = state.scale; state.isPanning = false;
    }
  }, { passive: true });
  wrap.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && state.scale > 1 && state.isPanning) {
      const t = e.touches[0];
      state.tx = state.startTx + (t.clientX - state.startX);
      state.ty = state.startTy + (t.clientY - state.startY);
      clampPan(); apply();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      setScale(tScale * (d / (tDist || d)));
    }
  }, { passive: false });
  modal.addEventListener('show-zoom', () => { resetView(); setTimeout(() => { clampPan(); apply(); }, 0); });
}

// Helpers
function norm(s) { return (s || '').toString().trim().toLowerCase(); }
function sanitizeDriveImage(url) {
  const u = (url || '').toString().trim();
  if (!u) return '';
  let m = u.match(/\/d\/([a-zA-Z0-9_-]{10,})\//);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  m = u.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  m = u.match(/uc\?export=view&(?:amp;)?id=([a-zA-Z0-9_-]{10,})/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  return u;
}
function escapeHtml(s) {
  return (s ?? '').toString()
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

// Smart header
(function smartHeader() {
  const header = document.querySelector('.header');
  if (!header) return;
  let lastY = window.scrollY || 0;
  let ticking = false;
  function onScroll() {
    const y = window.scrollY || 0;
    if (y > 10) header.classList.add('compact'); else header.classList.remove('compact');
    if (y > lastY && y > 80) header.classList.add('hide'); else header.classList.remove('hide');
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
})();
