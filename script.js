// Car Logo Tracker - PWA
const DEFAULT_BRANDS = [
  "Toyota","Honda","Ford","BMW","Mercedes","Audi","Tesla","Chevrolet","Nissan",
  "Hyundai","Kia","Volkswagen","Subaru","Lexus","Jeep"
];

const state = {
  counts: {},          // { brand: number }
  custom: [],          // [{name, emoji?, dataUrl?}]
  startTime: null,
  timerInterval: null,
  deferredPrompt: null
};

const els = {
  grid: document.getElementById('logoGrid'),
  total: document.getElementById('totalCount'),
  endTripBtn: document.getElementById('endTripBtn'),
  resetBtn: document.getElementById('resetBtn'),
  addCustomBtn: document.getElementById('addCustomBtn'),
  installBtn: document.getElementById('installBtn'),
  themeBtn: document.getElementById('themeBtn'),
  reportDialog: document.getElementById('reportDialog'),
  reportContent: document.getElementById('reportContent'),
  downloadReportBtn: document.getElementById('downloadReportBtn'),
  customDialog: document.getElementById('customDialog'),
  customName: document.getElementById('customName'),
  customEmoji: document.getElementById('customEmoji'),
  customImage: document.getElementById('customImage'),
  saveCustomBtn: document.getElementById('saveCustomBtn'),
  tripTimer: document.getElementById('tripTimer'),
  template: document.getElementById('logoCardTemplate')
};

// --- Trip state ---
let tripActive = false;

// --- Start Trip ---
const startTripBtn = document.getElementById('startTripBtn');
startTripBtn.addEventListener('click', () => {
  tripActive = true;
  startTripBtn.disabled = true;
  els.endTripBtn.disabled = false;
  els.grid.classList.remove('disabled');
  state.startTime = Date.now();
  startTimer();
});

// --- End Trip ---
els.endTripBtn.addEventListener('click', () => {
  if (!tripActive) return;
  tripActive = false;
  startTripBtn.disabled = false;
  els.endTripBtn.disabled = true;
  els.grid.classList.add('disabled');
  clearInterval(state.timerInterval); // Stop timer
  showReport();
});

function showReport() {
  const total = Object.values(state.counts).reduce((a,b)=>a+b,0);
  const rows = Object.entries(state.counts).sort((a,b)=>b[1]-a[1]);
  const top3 = rows.slice(0,3).map(([n,c]) => `${n} (${c})`).join(', ') || '—';

  const durationMs = Date.now() - state.startTime;
  const s = Math.floor(durationMs / 1000);
  const hh = String(Math.floor(s/3600)).padStart(2,'0');
  const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  const duration = `${hh}:${mm}:${ss}`;

  els.reportContent.innerHTML = `
    <div><strong>Total spotted:</strong> <span class="pill">${total}</span></div>
    <div><strong>Trip duration:</strong> ${duration}</div>
    <div><strong>Top 3:</strong> ${top3}</div>
    <table>
      <thead><tr><th>Manufacturer</th><th>Count</th></tr></thead>
      <tbody>
        ${rows.map(([n,c]) => `<tr><td>${n}</td><td>${c}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
  els.reportDialog.showModal();
}

// --- PWA install prompt handling ---
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.deferredPrompt = e;
  els.installBtn.hidden = false;
});
els.installBtn.addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  els.installBtn.hidden = true;
});

// --- Theme toggle ---
(function initTheme(){
  const key = 'clt_theme';
  const saved = localStorage.getItem(key) || 'dark';
  if (saved === 'light') document.documentElement.classList.add('light');
  els.themeBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
    localStorage.setItem(key, document.documentElement.classList.contains('light') ? 'light' : 'dark');
  });
})();

// --- Audio feedback (WebAudio "ding") ---
let audioCtx;
function ding() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, audioCtx.currentTime);
    g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.14);
  } catch {}
}

// --- Persistence ---
function loadState() {
  const saved = JSON.parse(localStorage.getItem('clt_data') || '{}');
  state.counts = saved.counts || {};
  state.custom = saved.custom || [];
  state.startTime = saved.startTime || Date.now();
}
function saveState() {
  localStorage.setItem('clt_data', JSON.stringify({
    counts: state.counts,
    custom: state.custom,
    startTime: state.startTime
  }));
}

// --- Timer ---
function startTimer() {
  if (!state.startTime) state.startTime = Date.now();
  updateTimer();
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(updateTimer, 1000);
}
function updateTimer() {
  const elapsed = Date.now() - state.startTime;
  const s = Math.floor(elapsed / 1000);
  const hh = String(Math.floor(s/3600)).padStart(2,'0');
  const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  els.tripTimer.textContent = `${hh}:${mm}:${ss}`;
}

// --- UI building ---
function brandImageSrc(name, customItem) {
  if (customItem?.dataUrl) return customItem.dataUrl;
  const file = name.toLowerCase() + '.svg';
  return `assets/logos/${file}`;
}
function renderGrid() {
  const brands = [...DEFAULT_BRANDS, ...state.custom.map(c => c.name)];
  els.grid.innerHTML = '';
  brands.forEach((name) => {
    const customItem = state.custom.find(c => c.name === name);
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.dataset.brand = name;
    node.querySelector('.name').textContent = customItem?.emoji ? `${name} ${customItem.emoji}` : name;
    node.querySelector('.badge').textContent = String(state.counts[name] || 0);
    const img = node.querySelector('img');
    img.src = brandImageSrc(name, customItem);
    img.alt = `${name} logo`;

    // Increment button
    node.querySelector('.increment').addEventListener('click', (e) => {
      if (!tripActive) return;
      state.counts[name] = (state.counts[name] || 0) + 1;
      node.querySelector('.badge').textContent = String(state.counts[name]);
      updateTotal();
      saveState();
      ding();
      e.stopPropagation();
    });

    // Decrement button
    node.querySelector('.decrement').addEventListener('click', (e) => {
      if (!tripActive) return;
      state.counts[name] = Math.max((state.counts[name] || 0) - 1, 0);
      node.querySelector('.badge').textContent = String(state.counts[name]);
      updateTotal();
      saveState();
      e.stopPropagation();
    });

    els.grid.appendChild(node);
  });
  updateTotal();
}
function updateTotal() {
  // Update total count logic here
  // Example:
  let total = 0;
  document.querySelectorAll('.card .badge').forEach(badge => {
    total += parseInt(badge.textContent, 10) || 0;
  });
  document.getElementById('totalCount').textContent = `Total: ${total}`;
}

// --- Counting ---
function increment(name) {
  state.counts[name] = (state.counts[name] || 0) + 1;
  const card = els.grid.querySelector(`.card[data-brand="${CSS.escape(name)}"]`);
  if (card) card.querySelector('.badge').textContent = String(state.counts[name]);
  updateTotal();
  saveState();
  ding();
}

// --- Reset ---
els.resetBtn.addEventListener('click', () => {
  if (!confirm('Reset all counts and timer?')) return;
  state.counts = {};
  state.startTime = Date.now();
  saveState();
  renderGrid();
});

// Download report as JSON
els.downloadReportBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const data = {
    generatedAt: new Date().toISOString(),
    total: Object.values(state.counts).reduce((a,b)=>a+b,0),
    counts: state.counts,
    durationSeconds: Math.floor((Date.now() - state.startTime)/1000)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'car-logo-trip-report.json';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
});

// --- Custom manufacturer ---
els.addCustomBtn.addEventListener('click', () => {
  els.customName.value = '';
  els.customEmoji.value = '';
  els.customImage.value = '';
  els.customDialog.showModal();
});

els.saveCustomBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const name = els.customName.value.trim();
  if (!name) return;
  let dataUrl = null;
  const file = els.customImage.files?.[0];
  if (file) {
    dataUrl = await fileToDataUrl(file);
  } else {
    // Generate a simple SVG data URL badge if no image uploaded
    const emoji = els.customEmoji.value.trim() || '🚗';
    dataUrl = makeBadgeDataUrl(`${name} ${emoji}`);
  }
  const emoji = els.customEmoji.value.trim() || '';
  // Avoid duplicates
  if (!state.custom.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    state.custom.push({ name, emoji, dataUrl });
  }
  saveState();
  renderGrid();
  els.customDialog.close();
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function makeBadgeDataUrl(text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
    <rect x="8" y="8" rx="22" ry="22" width="224" height="144" fill="#f0f4ff" stroke="#1a2a6c" stroke-width="4"/>
    <g font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
      <text x="120" y="90" font-size="34" fill="#1a2a6c" font-weight="700">${text}</text>
    </g>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// --- Boot ---
function init() {
  loadState();
  DEFAULT_BRANDS.forEach(b => { if (state.counts[b] == null) state.counts[b] = 0; });
  saveState();
  renderGrid();
  els.grid.classList.add('disabled'); // grid disabled until trip starts
  els.endTripBtn.disabled = true;
  startTripBtn.disabled = false;
  els.tripTimer.textContent = '00:00:00';
}
init();

// --- Service worker registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}

// Update logo card rendering logic
function createLogoCard(brand, count, imgSrc, name, emoji) {
  const template = document.getElementById('logoCardTemplate');
  const card = template.content.cloneNode(true);
  const cardDiv = card.querySelector('.card');
  cardDiv.dataset.brand = brand;

  const decrementBtn = cardDiv.querySelector('.decrement');
  const incrementBtn = cardDiv.querySelector('.increment');
  const img = incrementBtn.querySelector('img');
  const nameSpan = incrementBtn.querySelector('.name');
  const badge = incrementBtn.querySelector('.badge');

  img.src = imgSrc || '';
  img.alt = name || '';
  nameSpan.textContent = emoji ? `${emoji} ${name}` : name;
  badge.textContent = count;

  // Increment logic
  incrementBtn.addEventListener('click', () => {
    if (!tripActive) return;
    badge.textContent = ++count;
    updateTotal();
    // Save state if needed
  });

  // Decrement logic
  decrementBtn.addEventListener('click', () => {
    if (!tripActive) return;
    if (count > 0) {
      badge.textContent = --count;
      updateTotal();
      // Save state if needed
    }
  });

  return card;
}

// Update your logo grid population logic to use createLogoCard
