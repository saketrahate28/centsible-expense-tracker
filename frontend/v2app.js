/* ══════════════════════════════════════════
   Centsible v2 — App Logic
══════════════════════════════════════════ */

// ── DATA ──────────────────────────────────
const CATS_MONTH = [
    { icon: '🍔', bg: '#431407', name: 'Food & Drinks', pct: 27, amt: '₹4,200', color: '#f97316' },
    { icon: '🛍️', bg: '#2e1065', name: 'Shopping', pct: 20, amt: '₹3,100', color: '#a855f7' },
    { icon: '🏠', bg: '#083344', name: 'Bills', pct: 18, amt: '₹2,800', color: '#22d3ee' },
    { icon: '🚌', bg: '#052e16', name: 'Transport', pct: 10, amt: '₹1,600', color: '#4ade80' },
    { icon: '🎬', bg: '#4c0519', name: 'Fun', pct: 8, amt: '₹1,200', color: '#f43f5e' },
    { icon: '💊', bg: '#41380d', name: 'Health', pct: 6, amt: '₹950', color: '#facc15' },
];
const CATS_WEEK = [
    { icon: '🍔', bg: '#431407', name: 'Food & Drinks', pct: 33, amt: '₹1,820', color: '#f97316' },
    { icon: '🚌', bg: '#052e16', name: 'Transport', pct: 24, amt: '₹1,290', color: '#4ade80' },
    { icon: '🛍️', bg: '#2e1065', name: 'Shopping', pct: 18, amt: '₹980', color: '#a855f7' },
    { icon: '🎬', bg: '#4c0519', name: 'Fun', pct: 14, amt: '₹750', color: '#f43f5e' },
    { icon: '💊', bg: '#41380d', name: 'Health', pct: 11, amt: '₹570', color: '#facc15' },
];
const CATS_ALL = [
    { icon: '🍔', bg: '#431407', name: 'Food & Drinks', pct: 29, amt: '₹18,400', color: '#f97316' },
    { icon: '🛍️', bg: '#2e1065', name: 'Shopping', pct: 22, amt: '₹14,200', color: '#a855f7' },
    { icon: '🏠', bg: '#083344', name: 'Bills', pct: 20, amt: '₹12,900', color: '#22d3ee' },
    { icon: '🚌', bg: '#052e16', name: 'Transport', pct: 12, amt: '₹7,800', color: '#4ade80' },
    { icon: '🎬', bg: '#4c0519', name: 'Fun', pct: 9, amt: '₹5,900', color: '#f43f5e' },
    { icon: '💊', bg: '#41380d', name: 'Health', pct: 8, amt: '₹5,200', color: '#facc15' },
];

const TXNS = [
    { icon: '🍕', name: 'Zomato', meta: 'Food · GPay · Today', amt: -450, t: 'd' },
    { icon: '🚗', name: 'Rapido', meta: 'Transport · PhonePe · Today', amt: -120, t: 'd' },
    { icon: '🛒', name: 'BigBasket', meta: 'Groceries · GPay · Yesterday', amt: -1200, t: 'd' },
    { icon: '💊', name: 'PharmEasy', meta: 'Health · Paytm · Mar 8', amt: -380, t: 'd' },
    { icon: '💸', name: 'Salary Credit', meta: 'Income · HDFC · Mar 1', amt: 45000, t: 'c' },
];

const ADD_CATS_DATA = [
    { icon: '🍔', label: 'Food' }, { icon: '🚌', label: 'Transport' },
    { icon: '🛍️', label: 'Shopping' }, { icon: '🏠', label: 'Bills' },
    { icon: '💊', label: 'Health' }, { icon: '📚', label: 'Education' },
    { icon: '🎬', label: 'Fun' }, { icon: '📦', label: 'Other' },
];

const FINANCE_TERMS = [
    { name: 'SIP', def: 'Systematic Investment Plan — invest a fixed amount monthly in a mutual fund automatically. Even ₹500/mo can grow significantly via compounding over 10+ years.' },
    { name: 'Mutual Fund', def: 'A pool of money from many investors managed by a professional fund manager who invests in stocks, bonds, or both. Lower risk than direct stocks.' },
    { name: 'Index Fund', def: 'A mutual fund that mirrors a market index like NIFTY 50. Low cost, passive investing — simply grows with the market. Warren Buffett recommends it!' },
    { name: 'Compounding', def: 'Earning returns on both your original investment AND past returns. The longer you stay invested, the faster your money grows — time is the real power.' },
    { name: 'COGS', def: 'Cost Of Goods Sold — total direct cost to produce what a business sells. Used to calculate gross profit. Lower COGS = higher profit margins.' },
    { name: 'ELSS Fund', def: 'Equity Linked Savings Scheme — a mutual fund with a 3-year lock-in that gives you ₹1.5 lakh tax deduction under Section 80C. Invest and save tax!' },
    { name: 'Emergency Fund', def: 'Keep 3–6 months of expenses in a liquid savings account or FD. This is your financial safety net before you start investing.' },
    { name: 'CAGR', def: 'Compound Annual Growth Rate — the rate at which an investment grows year over year. A 12% CAGR means your money doubles every ~6 years.' },
    { name: 'Net Worth', def: 'Total assets (savings, investments, property) minus total liabilities (loans, credit card debt). Track it monthly to see your real financial progress.' },
    { name: 'Debt Fund', def: 'A mutual fund that invests in bonds and government securities. Lower risk than equity funds, but also lower returns. Good for short-term goals.' },
    { name: 'Expense Ratio', def: 'Annual fee a mutual fund charges to manage your money. A 0.1% ratio is great; above 1.5% eats your returns. Always pick low-cost funds.' },
    { name: 'PPF', def: 'Public Provident Fund — a government-backed savings scheme with 7.1% interest + tax-free returns + Section 80C benefit. Best for long-term wealth.' },
    { name: 'Inflation', def: 'The gradual rise in prices over time. If inflation is 6% and your savings earn 4%, you\'re actually losing money in real terms. Invest to beat it!' },
    { name: 'Diversification', def: 'Don\'t put all eggs in one basket. Spread investments across stocks, debt, gold, and real estate to reduce risk and smooth returns.' },
    { name: 'IPO', def: 'Initial Public Offering — when a private company first sells shares to the public. Profits possible but also risky. Research before applying!' },
];

const SPENDING_REMINDERS = [
    'You\'re spending 15% more on food than last month — maybe cook at home more this week? 🍳',
    'Your bills are coming up next week — keep ₹3,000 aside just in case 💸',
    'Transport spend is up this week — consider a monthly pass or carpooling 🚌',
    'Great job! you\'re 38% under budget this week. keep that momentum going! 🎉',
    'Shopping jumped this month — try the 24-hour rule before buying anything non-essential ✋',
    'Your food & drinks category is your biggest spend this month. meal-prepping could save ₹2,000+ 🥗',
    'You\'ve been consistent with tracking for 7 days! that\'s the first step to financial freedom 🔥',
];

let selCat = null;
let selPay = 'GPay';
let acctOpen = false;
let amtStr = '0';

// ── INIT ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    goTo('s-landing');
    renderCatList('cat-list', CATS_MONTH);
    renderTxns();
    renderAddCats();
    renderHeatmap();
    initAISection();
    initFallingCoins();   // replaces old star canvas + initCoinStars
    initCoinStars();
    initPayChips();
});

// ── SCREEN NAV ────────────────────────────
function goTo(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    const bnav = document.getElementById('bnav');
    if (bnav) bnav.classList.toggle('show', id !== 's-landing');
    if (acctOpen) closeAcctMenu();
}

function navTo(id, btn) {
    goTo(id);
    document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
}

// logout — go back to landing page
function logout() {
    goTo('s-landing');
    showToast('👋 Logged out. See you soon!');
}

// ── ACCOUNT SWITCHER ──────────────────────
function toggleAcctMenu() {
    acctOpen = !acctOpen;
    document.getElementById('acct-menu')?.classList.toggle('hidden', !acctOpen);
}
function closeAcctMenu() {
    acctOpen = false;
    document.getElementById('acct-menu')?.classList.add('hidden');
}
function switchAccount(row, name, letter, avClass) {
    document.querySelectorAll('.acct-item').forEach(r => {
        r.classList.remove('active');
        r.querySelector('.check-mark')?.remove();
    });
    row.classList.add('active');
    const ck = document.createElement('span');
    ck.className = 'check-mark'; ck.textContent = '✓';
    row.appendChild(ck);
    const av = document.getElementById('main-av');
    av.textContent = letter;
    av.className = `av ${avClass}`;
    closeAcctMenu();
    showToast(`Switched to ${name}`);
}

document.addEventListener('click', e => {
    if (!e.target.closest('.acct-switcher') && !e.target.closest('#acct-menu')) closeAcctMenu();
});

// ── TAB SWITCHER ──────────────────────────
function switchTab(btn, period) {
    btn.closest('.tab-switcher').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const data = period === 'week' ? CATS_WEEK : period === 'all' ? CATS_ALL : CATS_MONTH;
    const total = period === 'week' ? '₹5.4K total' : period === 'all' ? '₹64.4K total' : '₹15.4K total';
    renderCatList('cat-list', data);
    const tot = document.getElementById('stats-total');
    if (tot) tot.textContent = total;
}

// ── CATEGORY LIST ─────────────────────────
function renderCatList(id, data) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    data.forEach(c => {
        const row = document.createElement('div');
        row.className = 'cat-row';
        row.innerHTML = `
      <div class="ci" style="background:${c.bg}">${c.icon}</div>
      <div class="cat-body">
        <div class="cat-top-row">
          <span class="cat-name">${c.name}</span>
          <div><span class="cat-pct">${c.pct}%</span><span class="cat-amt">${c.amt}</span></div>
        </div>
        <div class="cat-bar"><div class="cat-fill" style="width:0%;background:${c.color}" data-w="${c.pct}%"></div></div>
      </div>`;
        el.appendChild(row);
    });
    requestAnimationFrame(() => {
        el.querySelectorAll('.cat-fill').forEach((f, i) => {
            setTimeout(() => f.style.width = f.dataset.w, 80 + i * 40);
        });
    });
}

// ── TRANSACTIONS ──────────────────────────
function renderTxns() {
    const el = document.getElementById('txn-list');
    if (!el) return;
    el.innerHTML = '';
    TXNS.slice(0, 4).forEach(tx => {
        const d = document.createElement('div');
        d.className = 'txn-row';
        d.innerHTML = `
      <div class="ti">${tx.icon}</div>
      <div class="tb"><p class="tn">${tx.name}</p><p class="tm">${tx.meta}</p></div>
      <span class="ta ${tx.t}">${tx.amt > 0 ? '+' : ''}₹${Math.abs(tx.amt).toLocaleString('en-IN')}</span>`;
        el.appendChild(d);
    });
}

// ── ADD CATS GRID ─────────────────────────
function renderAddCats() {
    const g = document.getElementById('cat-grid');
    if (!g) return;
    g.innerHTML = '';
    ADD_CATS_DATA.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'cg-btn';
        btn.innerHTML = `<span class="cg-icon">${c.icon}</span><span class="cg-lbl">${c.label}</span>`;
        btn.onclick = () => {
            document.querySelectorAll('.cg-btn').forEach(b => b.classList.remove('sel'));
            btn.classList.add('sel'); selCat = c.label;
        };
        g.appendChild(btn);
    });
}

// ── PAY CHIPS ────────────────────────────
function initPayChips() {
    document.querySelectorAll('.pay-chip').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.pay-chip').forEach(x => x.classList.remove('active'));
            b.classList.add('active'); selPay = b.dataset.v;
        });
    });
}

// ── NUMPAD ────────────────────────────────
function numInput(char) {
    if (char === '.' && amtStr.includes('.')) return;
    if (amtStr === '0' && char !== '.') amtStr = char;
    else amtStr += char;
    const disp = document.getElementById('amt-display');
    const hint = document.getElementById('amt-hint');
    if (disp) disp.textContent = amtStr;
    if (hint) {
        const n = parseFloat(amtStr);
        if (!isNaN(n) && n > 0) {
            const fmt = n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;
            hint.textContent = fmt + ' to log';
        } else {
            hint.textContent = 'Tap numbers below 👇';
        }
    }
}

function numDel() {
    if (amtStr.length <= 1) { amtStr = '0'; }
    else amtStr = amtStr.slice(0, -1);
    const disp = document.getElementById('amt-display');
    if (disp) disp.textContent = amtStr;
}

// ── ADD EXPENSE ───────────────────────────
function addExpense() {
    const amount = parseFloat(amtStr);
    const note = document.getElementById('exp-note')?.value || 'Expense';
    if (!amount || amount <= 0) { showToast('⚠️ Enter an amount'); return; }
    if (!selCat) { showToast('⚠️ Pick a category'); return; }

    showBurst(amount);
    TXNS.unshift({ icon: '💳', name: note, meta: `${selCat} · ${selPay} · Just now`, amt: -amount, t: 'd' });

    amtStr = '0';
    const disp = document.getElementById('amt-display');
    const hint = document.getElementById('amt-hint');
    const noteEl = document.getElementById('exp-note');
    if (disp) disp.textContent = '0';
    if (hint) hint.textContent = 'Tap numbers below 👇';
    if (noteEl) noteEl.value = '';
    selCat = null;
    document.querySelectorAll('.cg-btn').forEach(b => b.classList.remove('sel'));

    setTimeout(() => {
        navTo('s-home', document.getElementById('nb-home'));
        renderTxns();
        showToast(`✅ ₹${amount.toLocaleString('en-IN')} Logged!`);
    }, 1300);
}

// ── BURST ─────────────────────────────────
function showBurst(amount) {
    const el = document.getElementById('burst');
    const num = document.getElementById('burst-num');
    if (!el || !num) return;
    num.textContent = parseFloat(amount).toLocaleString('en-IN');
    el.classList.remove('hidden');
    playCoinSound();
    setTimeout(() => el.classList.add('hidden'), 1300);
}

function playCoinSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, .08, .14, .2].forEach(t => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.frequency.setValueAtTime(650 + Math.random() * 450, ctx.currentTime + t);
            o.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + t + .12);
            g.gain.setValueAtTime(.11, ctx.currentTime + t);
            g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .12);
            o.start(ctx.currentTime + t);
            o.stop(ctx.currentTime + t + .13);
        });
    } catch (e) { }
}

// ── TOAST ─────────────────────────────────
let _tt = null;
function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(_tt);
    _tt = setTimeout(() => el.classList.add('hidden'), 2400);
}

// ── AI SECTION — truly daily via localStorage ──
function initAISection() {
    const TODAY = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Check if we stored a term for today already
    let storedDate = localStorage.getItem('cs_ai_date');
    let storedIdx = parseInt(localStorage.getItem('cs_ai_idx') || '0', 10);
    let storedRem = parseInt(localStorage.getItem('cs_ai_rem') || '0', 10);

    if (storedDate !== TODAY) {
        // New day — advance to next term
        storedIdx = (storedIdx + 1) % FINANCE_TERMS.length;
        storedRem = (storedRem + 1) % SPENDING_REMINDERS.length;
        localStorage.setItem('cs_ai_date', TODAY);
        localStorage.setItem('cs_ai_idx', storedIdx);
        localStorage.setItem('cs_ai_rem', storedRem);
    }

    const term = FINANCE_TERMS[storedIdx];
    const reminder = SPENDING_REMINDERS[storedRem];

    const nameEl = document.getElementById('ai-term-name');
    const defEl = document.getElementById('ai-term-def');
    const remEl = document.getElementById('ai-reminder');
    if (nameEl) nameEl.textContent = term.name;
    if (defEl) defEl.textContent = term.def;
    if (remEl) remEl.textContent = reminder;
    // No more 8-second interval — content stays fixed for 24 hours
}

// ── HEATMAP ───────────────────────────────
function renderHeatmap() {
    const el = document.getElementById('heatmap');
    if (!el) return;
    const vals = [0, 120, 450, 0, 800, 350, 200, 0, 150, 290, 1200, 0, 680, 420, 0, 180, 90, 560, 0, 330, 240, 0, 450, 1100, 0, 320, 170, 0, 790, 380];
    const mx = Math.max(...vals);
    const cols = ['#0f172a', '#312e81', '#5b21b6', '#a21caf', '#ec4899'];
    vals.forEach((v, i) => {
        const d = document.createElement('div');
        d.className = 'hm-cell';
        d.style.background = cols[v === 0 ? 0 : Math.min(Math.floor((v / mx) * 4), 4)];
        d.title = `Mar ${i + 1}: ₹${v.toLocaleString('en-IN')}`;
        el.appendChild(d);
    });
}

// ── FALLING COINS (landing page canvas) ───
function initFallingCoins() {
    const canvas = document.getElementById('coin-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Mix of coin & rupee-note emojis
    const coinChars = ['🪙', '💰', '💵', '💴', '💶', '🪙', '💰', '🪙'];

    const N = 45; // Increased amount to fill more of the page
    const particles = Array.from({ length: N }, (_, i) => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * (window.innerHeight * 0.5) - (window.innerHeight * 0.5), // start entirely offscreen/upper half
        vy: 0.4 + Math.random() * 0.8, // strictly falling downward speed
        vx: (Math.random() - 0.5) * 0.3, // very slight horizontal drift
        sz: 14 + Math.random() * 18,
        r: Math.random() * Math.PI * 2,
        rs: (Math.random() - 0.5) * 0.035,
        e: coinChars[Math.floor(Math.random() * coinChars.length)],
    }));

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const H = canvas.height;

        particles.forEach(p => {
            // Fade: fully visible in top half, fades out securely in the bottom half
            const fadeStart = H * 0.50; // Starts diminishing right at the halfway mark
            const fadeEnd = H * 0.85; // Fully vanished near the bottom
            let alpha;
            if (p.y < fadeStart) alpha = 0.65 + Math.random() * 0.1;  // fully visible up top
            else if (p.y > fadeEnd) alpha = 0; // vanished
            else alpha = (1 - (p.y - fadeStart) / (fadeEnd - fadeStart)) * 0.75;

            if (alpha > 0.01) {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.r);
                ctx.font = `${p.sz}px serif`;
                ctx.fillText(p.e, -p.sz / 2, p.sz / 2);
                ctx.restore();
            }

            // Move straight down (with very slight horizontal drift)
            p.y += p.vy;
            p.x += p.vx;
            p.r += p.rs;

            // Respawn at the very top when they vanish
            if (p.y > fadeEnd + 20) {
                p.y = -p.sz * 2;
                p.x = Math.random() * canvas.width;
                p.e = coinChars[Math.floor(Math.random() * coinChars.length)];
            }

            // Wrap around horizontally if they drift off the sides
            if (p.x < -20) p.x = canvas.width + 20;
            if (p.x > canvas.width + 20) p.x = -20;
        });

        requestAnimationFrame(draw);
    };
    draw();
}

// ── COIN STAR RING ───────────────────────
function initCoinStars() {
    const wrap = document.getElementById('star-ring');
    if (!wrap) return;
    const chars = ['🪙', '✨', '💰', '★', '✦', '🌟'];
    const cols = ['#a855f7', '#22d3ee', '#f59e0b', '#f43f5e', '#4ade80', '#ec4899'];
    const pos = [
        { top: '0%', left: '18%' }, { top: '5%', left: '75%' },
        { top: '28%', left: '-2%' }, { top: '22%', left: '96%' },
        { top: '60%', left: '2%' }, { top: '68%', left: '92%' },
        { top: '88%', left: '18%' }, { top: '82%', left: '76%' },
        { top: '12%', left: '50%' }, { top: '92%', left: '52%' },
    ];
    pos.forEach((p, i) => {
        const s = document.createElement('span');
        s.className = 'star';
        const sz = (9 + Math.random() * 10).toFixed(1);
        const dur = (1.0 + Math.random() * 1.6).toFixed(2);
        const del = (i * .13).toFixed(2);
        s.style.cssText = `top:${p.top};left:${p.left};--sz:${sz}px;--col:${cols[i % cols.length]};--dur:${dur}s;--del:${del}s`;
        s.textContent = chars[i % chars.length];
        wrap.appendChild(s);
    });
}
