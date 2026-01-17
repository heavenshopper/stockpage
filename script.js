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
const VALID_CATEGORIES = ['new', 'gaming', 'gadget it', 'music equipment', 'common', 'motorcycle/car parts', 'sport', 'promotion'];
const menuEl = document.getElementById('menu-container');
let ALL_ITEMS = [];
let currentCategory = 'all';

// ตัวแปรสำหรับค้นหาและเรียงลำดับ
let currentSearchQuery = '';
let currentSortOrder = '';

(function loadViaJSONP() {
  if (menuEl) menuEl.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">กำลังโหลดสินค้า…</p>';
  
  // เปลี่ยนจาก select * เป็นระบุคอลัมน์ชัดเจน
  const query = 'select A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json;responseHandler:__sheet_cb__&tq=${encodeURIComponent(query)}`;
  
  const s = document.createElement('script');
  s.src = url;
  s.onerror = () => { if (menuEl) menuEl.innerHTML = '<p style="text-align:center;padding:40px;color:#c00;">โหลดข้อมูลไม่สำเร็จ (script load error)</p>'; };
  document.body.appendChild(s);
})();

// JSONP callback - เวอร์ชันทดสอบแบบง่าย
function __sheet_cb__(json) {
  try {
    const rows = json.table?.rows || [];
    
    // แสดงแถวแรกทั้งหมดเพื่อดูว่ามีคอลัมน์อะไรบ้าง
    if (rows.length > 0) {
      console.log('=== FIRST ROW DEBUG ===');
      const firstRow = rows[0].c || [];
      firstRow.forEach((col, idx) => {
        if (col?.v !== null && col?.v !== undefined) {
          console.log(`c[${idx}] = "${col.v}"`);
        }
      });
      console.log('======================');
    }
    
    ALL_ITEMS = rows.map((r, i) => {
      const c = r.c || [];
      
      // Debug แถวแรก 3 แถว
      if (i < 3) {
        console.log(`Row ${i} - c[19]:`, c[19]?.v);
      }

      return {
        name: c[0]?.v ?? c[3]?.v ?? 'ไม่ระบุชื่อ',
        detail: c[19]?.v ?? '', // ✅ ดึงจาก Product Detail คอลัมน์ใหม่
        price:
          (c[10]?.v === null ||
            c[10]?.v === undefined ||
            c[10]?.v === '' ||
            c[10]?.v === 0)
            ? 'ยังไม่ระบุราคา'
            : c[10]?.v,
        image: c[17]?.v ?? '',
        shopeeLink: c[18]?.v ?? '',
        stock: (c[6]?.v ?? '').toString().trim().toLowerCase(),
        category: (c[15]?.v ?? '').toString().trim().toLowerCase(),
        _rowIndex: i
      };
    }).filter(p =>
      ['in stock', 'instock', 'available'].includes(p.stock)
    );

    console.log('✅ Sample product with detail:', ALL_ITEMS.find(p => p.detail));
    console.log('📊 Total products loaded:', ALL_ITEMS.length);
    
    renderCategory(currentCategory);
    bindCategoryMenu();
    bindPreviewHandlers();
    bindSearchAndSort();
  } catch (err) {
    console.error(err);
    if (menuEl)
      menuEl.innerHTML =
        '<p style="text-align:center;padding:40px;color:#c00;">โหลดข้อมูลไม่สำเร็จ: ' +
        (err.message || '') +
        '</p>';
  }
}

// ===== ฟังก์ชันค้นหาและเรียงลำดับ =====
function bindSearchAndSort() {
  const searchInput = document.getElementById("searchInput");
  const priceSort = document.getElementById("priceSort");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentSearchQuery = searchInput.value.toLowerCase();
      renderCategory(currentCategory);
    });
  }

  if (priceSort) {
    priceSort.addEventListener("change", () => {
      currentSortOrder = priceSort.value;
      renderCategory(currentCategory);
    });
  }
}

function applyFilters(items) {
  let filtered = [...items];

  // ค้นหา
  if (currentSearchQuery) {
    filtered = filtered.filter(p =>
      p.name && p.name.toLowerCase().includes(currentSearchQuery)
    );
  }

  // เรียงลำดับราคา
  if (currentSortOrder === 'asc') {
    filtered.sort((a, b) => {
      const priceA = typeof a.price === 'number' ? a.price : 0;
      const priceB = typeof b.price === 'number' ? b.price : 0;
      return priceA - priceB;
    });
  } else if (currentSortOrder === 'desc') {
    filtered.sort((a, b) => {
      const priceA = typeof a.price === 'number' ? a.price : 0;
      const priceB = typeof b.price === 'number' ? b.price : 0;
      return priceB - priceA;
    });
  }

  return filtered;
}

// ===== Rendering =====
function renderCategory(cat) {
  const want = norm(cat);
  let list = ALL_ITEMS;
  
  // กรองตามหมวดหมู่
  if (want === 'all') {
    // ถ้าเป็น 'all' ให้แสดงเฉพาะสินค้าที่อยู่ใน VALID_CATEGORIES เท่านั้น
    list = ALL_ITEMS.filter(p => VALID_CATEGORIES.includes(p.category || 'new'));
  } else if (VALID_CATEGORIES.includes(want)) {
    // ถ้าเป็นหมวดหมู่เฉพาะ ให้กรองเฉพาะหมวดหมู่นั้น
    list = ALL_ITEMS.filter(p => (p.category || 'new') === want);
  } else {
    // ถ้าไม่ตรงเงื่อนไขใดๆ ให้แสดงทั้งหมดที่อยู่ใน VALID_CATEGORIES
    list = ALL_ITEMS.filter(p => VALID_CATEGORIES.includes(p.category || 'new'));
  }
  
  // ใช้ filters (ค้นหา + เรียงลำดับ)
  list = applyFilters(list);
  
  // เรียงจากใหม่สุดไปเก่าสุด (ถ้ายังไม่ได้เรียงด้วยราคา)
  if (!currentSortOrder) {
    list = list.slice().sort((a, b) => (b._rowIndex ?? 0) - (a._rowIndex ?? 0));
  }

  if (!list.length) {
    if (menuEl) menuEl.innerHTML = '<div class="no-products" style="text-align:center;padding:40px;color:#666;">ไม่พบสินค้าที่ต้องการ</div>';
    return;
  }
  
  if (!menuEl) return;
  
  menuEl.innerHTML = list.map(p => {
    const imgUrl = sanitizeDriveImage(p.image);
    const price = typeof p.price === 'number' ? p.price.toLocaleString('th-TH') : p.price;
    const name = (p.name || '').trim() || 'ไม่ระบุชื่อ';
    const detail = (p.detail || '').trim();
    const productData = escapeHtml(JSON.stringify({
      name: name,
      price: price,
      image: imgUrl,
      detail: detail,
      shopeeLink: p.shopeeLink || ''
    }));
    
    return `
      <div class="menu-item" data-product='${productData}'>
        <img src="${imgUrl}" alt="${escapeHtml(name)}" loading="lazy"
             onerror="this.onerror=null;this.src='';this.style.background='#f3f3f3';">
        <h3>${escapeHtml(name)}</h3>
        <div class="price-tag">ราคา : ${escapeHtml(price)} บาท</div>

         <!-- 
   ${p.shopeeLink ? `<a href="${p.shopeeLink}" target="_blank" class="compare-btn" onclick="event.stopPropagation()">เปรียบเทียบราคา</a>` : ""} -->
      </div>`;
  }).join('');
  
  // เพิ่ม event listener สำหรับ Quick View
  bindQuickView();
}

// ===== Quick View Popup =====
function bindQuickView() {
  const items = document.querySelectorAll('.menu-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      // ไม่เปิด popup ถ้ากดที่รูปภาพ (เพราะมี zoom อยู่แล้ว)
      if (e.target.tagName === 'IMG') return;
      // ไม่เปิด popup ถ้ากดที่ปุ่ม Shopee
      if (e.target.classList.contains('compare-btn')) return;
      
      const productJson = item.getAttribute('data-product');
      if (!productJson) return;
      
      try {
        const product = JSON.parse(productJson);
        showQuickView(product);
      } catch (err) {
        console.error('Error parsing product data:', err);
      }
    });
  });
}

function showQuickView(product) {
  // ลบ popup เก่าถ้ามี
  let popup = document.getElementById('quick-view-popup');
  if (popup) popup.remove();
  
  // สร้าง popup ใหม่
  popup = document.createElement('div');
  popup.id = 'quick-view-popup';
  popup.className = 'quick-view-popup';
  
  const detailHtml = product.detail
    ? `<div class="qv-detail">
         <h4>รายละเอียด</h4>
         <p>${escapeHtml(product.detail).replace(/\n/g, '<br>')}</p>
       </div>`
    : '';
  
  const shopeeBtn = product.shopeeLink
    ? `<a href="${product.shopeeLink}" target="_blank" class="qv-shopee-btn">
         <i class="fas fa-shopping-cart"></i> เปรียบเทียบราคาที่ Shopee
       </a>`
    : '';
  
  popup.innerHTML = `
    <div class="qv-overlay"></div>
    <div class="qv-card">
      <button class="qv-close">×</button>
      <div class="qv-content">
        <div class="qv-left">
          <img src="${product.image}" alt="${escapeHtml(product.name)}" 
               onerror="this.onerror=null;this.src='';this.style.background='#f3f3f3';">
          <div class="qv-price">ราคา: ${escapeHtml(product.price)} บาท</div>
        </div>
        <div class="qv-right">
          <h3 class="qv-name">${escapeHtml(product.name)}</h3>
          ${detailHtml}
          ${shopeeBtn}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  document.body.style.overflow = 'hidden';
  
  // แสดง popup ด้วย animation
  setTimeout(() => popup.classList.add('active'), 10);
  
  // ปิด popup
  const closePopup = () => {
    popup.classList.remove('active');
    setTimeout(() => {
      popup.remove();
      document.body.style.overflow = '';
    }, 300);
  };
  
  popup.querySelector('.qv-close').addEventListener('click', closePopup);
  popup.querySelector('.qv-overlay').addEventListener('click', closePopup);
  
  // ปิดด้วย ESC
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// ===== Menu events =====
function bindCategoryMenu() {
  const btns = document.querySelectorAll('.category-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category || 'all';
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
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", "&#39;");
}

// Smart header
(function smartHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  let lastY = window.scrollY || 0;
  const SHOW_AT_TOP_PX = 24;
  const THRESH = 2;

  function onScroll() {
    const y = window.scrollY || 0;

    if (y <= SHOW_AT_TOP_PX) {
      header.classList.remove('hide');
      lastY = y;
      return;
    }

    if (y > lastY + THRESH) {
      header.classList.add('hide');
    } else if (y < lastY - THRESH) {
      header.classList.remove('hide');
    }
    lastY = y;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();
