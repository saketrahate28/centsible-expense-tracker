/* =====================================================
   Centsible — App Logic
===================================================== */

// =====================================================
// DATA
// =====================================================
const TRANSACTIONS = [
  { id: 1, icon: '🍕', name: 'Zomato', meta: 'Food · GPay · Today', amount: -450, type: 'debit' },
  { id: 2, icon: '🚗', name: 'Rapido', meta: 'Transport · PhonePe · Today', amount: -120, type: 'debit' },
  { id: 3, icon: '🛒', name: 'BigBasket', meta: 'Groceries · GPay · Yesterday', amount: -1200, type: 'debit' },
  { id: 4, icon: '💊', name: 'PharmEasy', meta: 'Health · Paytm · Mar 8', amount: -380, type: 'debit' },
  { id: 5, icon: '💸', name: 'Salary Credit', meta: 'Income · HDFC · Mar 1', amount: 45000, type: 'credit' },
];

const CATEGORIES = [
  { id: 1, icon: '🍔', label: 'Food' },
  { id: 2, icon: '🚌', label: 'Transport' },
  { id: 3, icon: '🛍️', label: 'Shopping' },
  { id: 4, icon: '🏠', label: 'Bills' },
  { id: 5, icon: '💊', label: 'Health' },
  { id: 6, icon: '📚', label: 'Education' },
  { id: 7, icon: '🎬', label: 'Fun' },
  { id: 8, icon: '📦', label: 'Other' },
];

let selectedCategory = null;
let selectedPayment = 'GPay';
let currentScreen = 'screen-landing';
let accountMenuVisible = false;

// =====================================================
// NAVIGATION
// =====================================================
function goTo(screenId) {
  const prev = document.querySelector('.screen.active');
  if (prev) prev.classList.remove('active');
  const next = document.getElementById(screenId);
  if (next) next.classList.add('active');
  currentScreen = screenId;

  const nav = document.getElementById('bottom-nav');
  nav.style.display = screenId === 'screen-landing' ? 'none' : 'flex';

  closeAccountMenu();
}

function navTo(screenId, btn) {
  goTo(screenId);
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  goTo('screen-landing');
  renderTransactions();
  renderCategories();
  renderHeatmap();
  initCoinCanvas();
  initCoinStars();
  initPaymentOpts();

  // Animate bar chart on load
  setTimeout(() => {
    document.querySelectorAll('.bar').forEach((bar, i) => {
      bar.style.transition = `height ${0.4 + i * 0.08}s cubic-bezier(0.34,1.56,0.64,1)`;
    });
  }, 500);
});

// =====================================================
// RENDER TRANSACTIONS
// =====================================================
function renderTransactions() {
  const list = document.getElementById('txn-list');
  list.innerHTML = '';
  TRANSACTIONS.slice(0, 4).forEach((txn, i) => {
    const el = document.createElement('div');
    el.className = 'txn-item';
    el.style.animationDelay = `${i * 0.08}s`;
    el.innerHTML = `
      <div class="txn-icon">${txn.icon}</div>
      <div class="txn-body">
        <p class="txn-name">${txn.name}</p>
        <p class="txn-meta">${txn.meta}</p>
      </div>
      <span class="txn-amount ${txn.type}">
        ${txn.amount > 0 ? '+' : ''}₹${Math.abs(txn.amount).toLocaleString('en-IN')}
      </span>
    `;
    list.appendChild(el);
  });
}

// =====================================================
// RENDER EXPENSE CATEGORIES
// =====================================================
function renderCategories() {
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.id = cat.id;
    btn.innerHTML = `<span>${cat.icon}</span><span>${cat.label}</span>`;
    btn.onclick = () => selectCategory(cat.id, btn);
    grid.appendChild(btn);
  });
}

function selectCategory(id, btn) {
  selectedCategory = id;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// =====================================================
// RENDER HEATMAP
// =====================================================
function renderHeatmap() {
  const hm = document.getElementById('heatmap');
  hm.innerHTML = '';
  const spends = [0, 120, 450, 0, 800, 350, 200, 0, 150, 290, 1200, 0, 680, 420, 0, 180, 90, 560, 0, 330,
    240, 0, 450, 1100, 0, 320, 170, 0, 790, 380];
  const max = Math.max(...spends);
  const colors = ['#1a1035', '#2d1f6e', '#4c2aad', '#7c3aed', '#c084fc'];
  spends.forEach((v, i) => {
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    const ci = v === 0 ? 0 : Math.min(Math.floor((v / max) * 4), 4);
    cell.style.background = colors[ci];
    cell.title = `Day ${i + 1}: ₹${v}`;
    hm.appendChild(cell);
  });
}

// =====================================================
// PAYMENT OPTIONS (Add Expense)
// =====================================================
function initPaymentOpts() {
  document.querySelectorAll('.pay-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pay-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPayment = btn.dataset.val;
    });
  });
}

// =====================================================
// AMOUNT WORDS
// =====================================================
function updateAmount(val) {
  const el = document.getElementById('amount-words');
  if (!val || val === '0') { el.textContent = 'Enter amount'; return; }
  const n = parseInt(val);
  if (n >= 100000) el.textContent = `₹${(n / 100000).toFixed(1)}L`;
  else if (n >= 1000) el.textContent = `₹${(n / 1000).toFixed(1)}K`;
  else el.textContent = `₹${n}`;
}

// =====================================================
// ADD EXPENSE
// =====================================================
function addExpense() {
  const amount = document.getElementById('exp-amount').value;
  const merchant = document.getElementById('exp-merchant').value || 'Expense';

  if (!amount || amount <= 0) {
    showToast('⚠️ Please enter an amount');
    return;
  }
  if (!selectedCategory) {
    showToast('⚠️ Please select a category');
    return;
  }

  showCoinAnimation(amount);

  const cat = CATEGORIES.find(c => c.id === selectedCategory);
  TRANSACTIONS.unshift({
    id: Date.now(),
    icon: cat.icon,
    name: merchant,
    meta: `${cat.label} · ${selectedPayment} · Just now`,
    amount: -parseFloat(amount),
    type: 'debit'
  });

  // Update total
  const prev = 15480 + parseFloat(amount);
  document.getElementById('total-spent').textContent = `₹${prev.toLocaleString('en-IN')}`;

  // Reset form
  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-merchant').value = '';
  document.getElementById('amount-words').textContent = 'Enter amount';
  selectedCategory = null;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));

  setTimeout(() => {
    goTo('screen-dashboard');
    renderTransactions();
    showToast(`✅ ₹${parseFloat(amount).toLocaleString('en-IN')} added!`);
  }, 1200);
}

// =====================================================
// COIN ANIMATION
// =====================================================
function showCoinAnimation(amount) {
  const overlay = document.getElementById('coin-overlay');
  document.getElementById('coin-amount').textContent = parseFloat(amount).toLocaleString('en-IN');
  overlay.classList.remove('hidden');

  // Play coin sound via Web Audio API
  playCoinSound();

  setTimeout(() => overlay.classList.add('hidden'), 1200);
}

function playCoinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const times = [0, 0.1, 0.18, 0.25];
    times.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime + t);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + t + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.15);
    });
  } catch (e) { }
}

// =====================================================
// TOAST
// =====================================================
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

// =====================================================
// ACCOUNT SWITCHER
// =====================================================
function showAccountMenu() {
  const menu = document.getElementById('account-menu');
  accountMenuVisible = !accountMenuVisible;
  menu.classList.toggle('hidden', !accountMenuVisible);
}

function closeAccountMenu() {
  accountMenuVisible = false;
  document.getElementById('account-menu').classList.add('hidden');
}

function switchAccount(name, letter, type) {
  document.querySelectorAll('.account-item').forEach(i => {
    i.classList.remove('active');
    i.querySelector('.check')?.remove();
  });
  const items = document.querySelectorAll('.account-item');
  items.forEach(item => {
    if (item.querySelector('.acc-name')?.textContent === name) {
      item.classList.add('active');
      const check = document.createElement('span');
      check.className = 'check';
      check.textContent = '✓';
      item.appendChild(check);
    }
  });
  const avatar = document.querySelector('.account-switcher .account-avatar');
  avatar.textContent = letter;
  avatar.className = `account-avatar ${type}`;
  closeAccountMenu();
  showToast(`Switched to ${name}`);
}

// =====================================================
// LANDING COIN CANVAS (particle animation)
// =====================================================
function initCoinCanvas() {
  const canvas = document.getElementById('coin-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 18 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vy: 0.4 + Math.random() * 0.8,
    vx: (Math.random() - 0.5) * 0.4,
    size: 10 + Math.random() * 16,
    opacity: 0.15 + Math.random() * 0.35,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.04,
    emoji: ['🪙', '💰', '✨'][Math.floor(Math.random() * 3)]
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.font = `${p.size}px serif`;
      ctx.fillText(p.emoji, -p.size / 2, p.size / 2);
      ctx.restore();
      p.y += p.vy;
      p.x += p.vx;
      p.rotation += p.rotSpeed;
      if (p.y > canvas.height + 30) { p.y = -30; p.x = Math.random() * canvas.width; }
      if (p.x < -30) p.x = canvas.width + 30;
      if (p.x > canvas.width + 30) p.x = -30;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// =====================================================
// COIN STARS (Landing Page Glitter)
// =====================================================
function initCoinStars() {
  const wrap = document.getElementById('coin-stars');
  if (!wrap) return;
  wrap.innerHTML = '';

  const starChars = ['✶', '★', '•', '✩', '✴'];
  const positions = [
    { top: '5%', left: '20%' }, { top: '10%', left: '75%' },
    { top: '30%', left: '5%' }, { top: '25%', left: '90%' },
    { top: '60%', left: '8%' }, { top: '70%', left: '85%' },
    { top: '85%', left: '25%' }, { top: '80%', left: '70%' },
    { top: '50%', left: '0%' }, { top: '15%', left: '50%' },
    { top: '90%', left: '50%' }, { top: '40%', left: '95%' },
  ];

  positions.forEach((pos, i) => {
    const star = document.createElement('span');
    star.className = 'coin-star';
    const size = 8 + Math.random() * 10;
    const dur = (1.2 + Math.random() * 1.5).toFixed(2);
    const colors = ['#a855f7', '#22d3ee', '#f59e0b', '#f43f5e', '#4ade80'];
    star.style.cssText = `
      top: ${pos.top}; left: ${pos.left};
      width: ${size}px; height: ${size}px;
      font-size: ${size}px;
      color: ${colors[i % colors.length]};
      --dur: ${dur}s;
      animation-delay: ${(i * 0.15).toFixed(2)}s;
    `;
    star.textContent = starChars[i % starChars.length];
    wrap.appendChild(star);
  });
}

// =====================================================
// MISC UI
// =====================================================
function showSignup() { showToast('📝 Sign up coming soon!'); }
function showNotif() { showToast('🔔 3 new alerts'); }
function showMonthPicker() { showToast('📅 Month picker coming soon'); }
function showProfile() { showToast('👤 Profile screen coming soon'); }
function createGroup() { showToast('➕ Group creation coming soon'); }
function settleUp() { showToast('💸 Opening GPay...'); }
function viewGroup() { showToast('🏖️ Trip details coming soon'); }

// Close account menu on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.account-switcher') && !e.target.closest('.account-menu')) {
    closeAccountMenu();
  }
});
