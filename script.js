// ===== Floating contact menu logic =====
let isMenuOpen = false;
function toggleContactMenu() {
  const overlay = document.getElementById('contactOverlay');
  const menu = document.getElementById('contactMenu');
  const fab = document.getElementById('fabMain');
  const icon = document.getElementById('fabIcon');
  isMenuOpen = !isMenuOpen;
  if (isMenuOpen) {
    overlay?.classList.add('active');
    menu?.classList.add('active');
    fab?.classList.add('active');
    if (icon) icon.className = 'fas fa-times';
  } else {
    overlay?.classList.remove('active');
    menu?.classList.remove('active');
    fab?.classList.remove('active');
    if (icon) icon.className = 'fas fa-comment';
  }
}

document.getElementById('contactOverlay')?.addEventListener('click', function () {
  if (isMenuOpen) toggleContactMenu();
});

function openMessenger(event) {
  if (event) event.preventDefault();
  window.open('https://www.facebook.com/share/19eN49NTUR/?mibextid=wwXIfr', '_blank');
  toggleContactMenu();
}

function openLine(event) {
  if (event) event.preventDefault();
  window.open('https://line.me/R/ti/p/sreenoomhihi', '_blank');
  toggleContactMenu();
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && isMenuOpen) toggleContactMenu();
});

// ===== Config & Variables =====
const SHEET_ID = '1T1ls-VUXfvBRAE4vOt5-b94POeZpG83jS4-SIqiN09U';
const SHEET_NAME = 'Product';
const VALID_CATEGORIES = ['new', 'gaming', 'gadget it', 'music equipment', 'common', 'motorcycle/car parts', 'sport', 'promotion'];
const menuEl = document.getElementById('menu-container');

let ALL_ITEMS = [];
let FILTERED_ITEMS = [];
let currentCategory = 'all';
let currentSearchQuery = '';
let currentSortOrder = '';

// ===== Infinite Scroll Variables =====
const ITEMS_PER_PAGE = 24;
let displayedCount = 0;

// ===== Dark Mode & Back To Top Setup =====
function initUIControls() {
  // Dark Mode Toggle
  const themeBtn = document.getElementById('darkToggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
  }

  themeBtn?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  });

  // Scroll Events (ซ่อน/แสดง Header ทั้งก้อน / ปุ่ม Back to Top / Infinite Scroll)
  const headerEl = document.querySelector('.header');
  const bttBtn = document.getElementById('backToTop');
  let anchorY = window.scrollY; // จุดอ้างอิงที่จะขยับก็ต่อเมื่อมีการเปลี่ยนสถานะจริงเท่านั้น
  let headerHidden = false;
  let scrollTicking = false;
  const TOGGLE_THRESHOLD = 10; // ต้องเลื่อนสะสมเกินกี่ px ถึงจะสลับสถานะ

  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;

    requestAnimationFrame(() => {
      const currentY = Math.max(0, window.scrollY);

      // 1. ซ่อน Header ทั้งก้อนเมื่อเลื่อนลง / แสดงกลับเมื่อเลื่อนขึ้น
      if (currentY <= 40) {
        // อยู่บนสุด แสดง header เต็มรูปแบบเสมอ
        headerEl?.classList.remove('header-hidden');
        headerEl?.classList.remove('scrolled');
        headerHidden = false;
        anchorY = currentY;
      } else if (!headerHidden && currentY > anchorY + TOGGLE_THRESHOLD) {
        // เลื่อนลงสะสมเกิน threshold -> ซ่อน header ทั้งก้อน
        headerEl?.classList.add('header-hidden');
        headerHidden = true;
        anchorY = currentY;
      } else if (headerHidden && currentY < anchorY - TOGGLE_THRESHOLD) {
        // เลื่อนขึ้นสะสมเกิน threshold -> แสดง header กลับมา (แบบพับกระชับ)
        headerEl?.classList.remove('header-hidden');
        headerEl?.classList.add('scrolled');
        headerHidden = false;
        anchorY = currentY;
      }
      // หมายเหตุ: ถ้ายังไม่ถึง threshold จะไม่ขยับ anchorY เพื่อให้ scroll เล็กๆ
      // ต่อเนื่องกันหลายเฟรมสะสมระยะทางได้ถูกต้อง แทนที่จะรีเซ็ตทุกเฟรม

      // 2. แสดง/ซ่อนปุ่ม Back to Top
      if (currentY > 300) {
        bttBtn?.classList.add('show');
      } else {
        bttBtn?.classList.remove('show');
      }

      // 3. Infinite Scroll trigger
      if ((window.innerHeight + currentY) >= document.body.offsetHeight - 500) {
        renderMoreItems();
      }

      scrollTicking = false;
    });
  });

  bttBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== Skeleton Loading =====
function renderSkeleton() {
  if (!menuEl) return;
  let skeletonHTML = '';
  for (let i = 0; i < 12; i++) {
    skeletonHTML += `
      <div class="skeleton-card">
        <div class="skeleton-box skeleton-img-box"></div>
        <div class="skeleton-box skeleton-title-box"></div>
        <div class="skeleton-box skeleton-price-box"></div>
      </div>
    `;
  }
  menuEl.innerHTML = skeletonHTML;
}

// ===== JSONP Data Fetching (พร้อม Retry) =====
let dataLoaded = false;
let loadTimeoutId = null;
let currentSheetScript = null;
const LOAD_TIMEOUT_MS = 20000;

function showLoadError() {
  if (!menuEl) return;
  menuEl.innerHTML = `
    <div style="text-align:center;grid-column:1/-1;padding:40px;color:#c00;">
      <p style="margin-bottom:14px;">⚠️ โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง</p>
      <button id="retryLoadBtn" class="retry-btn">
        <i class="fas fa-rotate-right"></i> ลองใหม่
      </button>
    </div>
  `;
  document.getElementById('retryLoadBtn')?.addEventListener('click', retryLoad);
}

function retryLoad() {
  dataLoaded = false;
  const lastUpdateEl = document.getElementById('lastUpdate');
  if (lastUpdateEl) lastUpdateEl.textContent = 'กำลังโหลดสต๊อก...';
  loadViaJSONP();
}

function loadViaJSONP() {
  renderSkeleton();

  // ลบ script tag เก่าออกก่อน (เผื่อเป็นการลองใหม่)
  if (currentSheetScript) {
    currentSheetScript.remove();
    currentSheetScript = null;
  }
  if (loadTimeoutId) {
    clearTimeout(loadTimeoutId);
    loadTimeoutId = null;
  }

  const query = 'select A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json;responseHandler:__sheet_cb__&tq=${encodeURIComponent(query)}`;

  const s = document.createElement('script');
  s.src = url;
  s.onerror = () => {
    showLoadError();
  };
  document.body.appendChild(s);
  currentSheetScript = s;

  // Fallback timeout เผื่อ callback ไม่ถูกเรียกเลย (เช่น เน็ตช้ามาก/ตัน)
  loadTimeoutId = setTimeout(() => {
    if (!dataLoaded) showLoadError();
  }, LOAD_TIMEOUT_MS);
}

// เริ่มโหลดครั้งแรก
loadViaJSONP();
initUIControls();

function __sheet_cb__(json) {
  dataLoaded = true;
  if (loadTimeoutId) {
    clearTimeout(loadTimeoutId);
    loadTimeoutId = null;
  }
  try {
    const rows = json.table?.rows || [];

    ALL_ITEMS = rows.map((r, i) => {
      const c = r.c || [];
      return {
        name: c[0]?.v ?? c[3]?.v ?? 'ไม่ระบุชื่อ',
        detail: c[3]?.v ?? '',
        price: (c[10]?.v === null || c[10]?.v === undefined || c[10]?.v === '' || c[10]?.v === 0)
          ? 'ยังไม่ระบุราคา' : c[10]?.v,
        image: c[17]?.v ?? '',
        shopeeLink: c[18]?.v ?? '', // คอลัมน์ S
        stock: (c[6]?.v ?? '').toString().trim().toLowerCase(),
        category: (c[15]?.v ?? '').toString().trim().toLowerCase(),
        _rowIndex: i
      };
    }).filter(p => ['in stock', 'instock', 'available'].includes(p.stock));

    // แสดงเวลาอัปเดตสต๊อกล่าสุด
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
      const now = new Date();
      lastUpdateEl.textContent = `อัปเดตสต๊อก: ${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
    }

    renderCategory(currentCategory);
    bindCategoryMenu();
    bindPreviewHandlers();
    bindSearchAndSort();
  } catch (err) {
    console.error(err);
    showLoadError();
  }
}

// ===== Filter & Search =====
function bindSearchAndSort() {
  const searchInput = document.getElementById("searchInput");
  const priceSort = document.getElementById("priceSort");

  searchInput?.addEventListener("input", () => {
    currentSearchQuery = searchInput.value.toLowerCase();
    renderCategory(currentCategory);
  });

  priceSort?.addEventListener("change", () => {
    currentSortOrder = priceSort.value;
    renderCategory(currentCategory);
  });
}

function applyFilters(items) {
  let filtered = [...items];

  if (currentSearchQuery) {
    filtered = filtered.filter(p => p.name && p.name.toLowerCase().includes(currentSearchQuery));
  }

  if (currentSortOrder === 'asc') {
    filtered.sort((a, b) => (typeof a.price === 'number' ? a.price : 0) - (typeof b.price === 'number' ? b.price : 0));
  } else if (currentSortOrder === 'desc') {
    filtered.sort((a, b) => (typeof b.price === 'number' ? b.price : 0) - (typeof a.price === 'number' ? a.price : 0));
  }

  return filtered;
}

// ===== Rendering & Infinite Scroll =====
function renderCategory(cat) {
  const want = norm(cat);
  let list = ALL_ITEMS;

  if (want === 'all') {
    list = ALL_ITEMS.filter(p => VALID_CATEGORIES.includes(p.category || 'new'));
  } else if (VALID_CATEGORIES.includes(want)) {
    list = ALL_ITEMS.filter(p => (p.category || 'new') === want);
  } else {
    list = ALL_ITEMS.filter(p => VALID_CATEGORIES.includes(p.category || 'new'));
  }

  FILTERED_ITEMS = applyFilters(list);

  if (!currentSortOrder) {
    FILTERED_ITEMS.sort((a, b) => (b._rowIndex ?? 0) - (a._rowIndex ?? 0));
  }

  if (!menuEl) return;
  menuEl.innerHTML = '';
  displayedCount = 0;

  if (!FILTERED_ITEMS.length) {
    menuEl.innerHTML = '<div style="text-align:center;grid-column:1/-1;padding:40px;color:var(--text-sub);">ไม่พบสินค้าที่พร้อมขายในสต๊อกขณะนี้</div>';
    return;
  }

  renderMoreItems();
}

function renderMoreItems() {
  if (displayedCount >= FILTERED_ITEMS.length || !menuEl) return;

  const nextBatch = FILTERED_ITEMS.slice(displayedCount, displayedCount + ITEMS_PER_PAGE);

  const html = nextBatch.map(p => {
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
             onerror="this.onerror=null;this.style.background='#eee';">
        <h3>${escapeHtml(name)}</h3>
        <div class="price-tag">ราคา : ${escapeHtml(price)} บาท</div>
      </div>`;
  }).join('');

  menuEl.insertAdjacentHTML('beforeend', html);
  displayedCount += nextBatch.length;

  bindQuickView();
}

// ===== Quick View & Action Buttons =====
function bindQuickView() {
  const items = document.querySelectorAll('.menu-item');
  items.forEach(item => {
    item.onclick = (e) => {
      if (e.target.tagName === 'IMG') return;
      const productJson = item.getAttribute('data-product');
      if (!productJson) return;
      try {
        showQuickView(JSON.parse(productJson));
      } catch (err) {
        console.error('Error parsing product data:', err);
      }
    };
  });
}

function showQuickView(product) {
  document.getElementById('quick-view-popup')?.remove();

  const popup = document.createElement('div');
  popup.id = 'quick-view-popup';
  popup.className = 'quick-view-popup';

  // ลิงก์สั่งซื้อผ่าน LINE พร้อมพิมพ์ข้อความให้อัตโนมัติ
  const linePreFilledMsg = `สนใจสั่งซื้อสินค้าพร้อมส่ง: ${product.name} (ราคา ${product.price} บาท) ยังมีของอยู่ไหมครับ?`;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(linePreFilledMsg)}`;

  // ตรวจสอบข้อมูล Shopee จากคอลัมน์ S
  const rawShopeeLink = (product.shopeeLink || '').toString().trim();
  const hasShopeeLink = rawShopeeLink !== '';
  
  // แสดงปุ่มเฉพาะเมื่อมีข้อมูลในคอลัมน์ S
  const shopeeBtnHtml = hasShopeeLink ? `
    <a href="${escapeHtml(rawShopeeLink)}" target="_blank" class="qv-btn qv-btn-shopee">
      <i class="fas fa-shopping-bag"></i> เช็คราคาตลาดใน Shopee
    </a>
  ` : '';

  popup.innerHTML = `
    <div class="qv-overlay"></div>
    <div class="qv-card">
      <button class="qv-close">×</button>
      <div class="qv-content">
        <div class="qv-left">
          <img src="${product.image}" alt="${escapeHtml(product.name)}" onerror="this.style.background='#eee';">
          <div class="qv-price">ราคาพร้อมส่ง: ${escapeHtml(product.price)} บาท</div>
        </div>
        <div class="qv-right">
          <h3 style="font-size: 20px; font-weight: 600;">${escapeHtml(product.name)}</h3>
          ${product.detail ? `<p style="font-size: 14px; color: var(--text-sub); white-space: pre-wrap;">${escapeHtml(product.detail)}</p>` : ''}
          
          <div class="qv-actions">
            <a href="${lineUrl}" target="_blank" class="qv-btn qv-btn-order">
              <i class="fab fa-line" style="font-size: 18px;"></i> สั่งซื้อ / สอบถามสินค้านี้
            </a>
            ${shopeeBtnHtml}
            <button id="qvShareBtn" class="qv-btn qv-btn-share">
              <i class="fas fa-share-alt"></i> แชร์สินค้านี้
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  setTimeout(() => popup.classList.add('active'), 10);

  const closePopup = () => {
    popup.classList.remove('active');
    setTimeout(() => popup.remove(), 300);
  };

  popup.querySelector('.qv-close').onclick = closePopup;
  popup.querySelector('.qv-overlay').onclick = closePopup;

  // กด "สั่งซื้อ" หรือ "เช็คราคาใน Shopee" -> ให้ feedback สั้นๆ ว่ากดแล้ว (ลิงก์เปิดแท็บใหม่ทำงานตามปกติ)
  popup.querySelectorAll('.qv-btn-order, .qv-btn-shopee').forEach(link => {
    link.addEventListener('click', () => {
      link.classList.add('qv-btn-pressed');
      setTimeout(() => link.classList.remove('qv-btn-pressed'), 400);
    });
  });

  // Web Share API Action พร้อม loading state
  const shareBtn = document.getElementById('qvShareBtn');
  const shareBtnDefaultHTML = shareBtn.innerHTML;

  shareBtn.onclick = async () => {
    if (shareBtn.disabled) return;
    shareBtn.disabled = true;
    shareBtn.classList.add('qv-btn-loading');
    shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังแชร์...';

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `เช็คสต๊อกสินค้าพร้อมส่ง: ${product.name} ราคา ${product.price} บาท`,
          url: window.location.href
        });
        shareBtn.innerHTML = '<i class="fas fa-check"></i> แชร์สำเร็จ!';
      } else {
        await navigator.clipboard.writeText(window.location.href);
        shareBtn.innerHTML = '<i class="fas fa-check"></i> คัดลอกลิงก์แล้ว!';
      }
    } catch (err) {
      console.log('Error sharing:', err);
      shareBtn.innerHTML = shareBtnDefaultHTML;
    } finally {
      shareBtn.classList.remove('qv-btn-loading');
      setTimeout(() => {
        shareBtn.innerHTML = shareBtnDefaultHTML;
        shareBtn.disabled = false;
      }, 1800);
    }
  };
}

// ===== Menu Navigation =====
function bindCategoryMenu() {
  const btns = document.querySelectorAll('.category-btn');
  btns.forEach(btn => {
    btn.onclick = () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category || 'all';
      renderCategory(currentCategory);
    };
  });
}

// ===== Zoom Image Modal =====
function bindPreviewHandlers() {
  const modal = document.getElementById('preview-modal');
  const modalImg = document.getElementById('zoom-img');
  const closeBtn = modal?.querySelector('.close-modal');
  if (!modal || !modalImg) return;

  function openModalWith(src) {
    if (!src) return;
    modalImg.src = src;
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  document.getElementById('menu-container')?.addEventListener('click', (e) => {
    const img = e.target.closest?.('.menu-item img');
    if (!img) return;
    e.preventDefault(); e.stopPropagation();
    openModalWith(img.getAttribute('src'));
  });
}

// Helper Functions
function norm(s) { return (s || '').toString().trim().toLowerCase(); }
function sanitizeDriveImage(url) {
  const u = (url || '').toString().trim();
  if (!u) return '';
  let m = u.match(/\/d\/([a-zA-Z0-9_-]{10,})\//) || u.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  return u;
}
function escapeHtml(s) {
  return (s ?? '').toString()
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", "&#39;");
}