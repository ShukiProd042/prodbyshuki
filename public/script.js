/* ============================================================
   SHUKI PRODUCTION — script.js
   Главен JavaScript фајл за јавниот сајт
   ============================================================ */

/* ── Лиценца конфигурација ──────────────────────────────────
   Три типа лиценци со множители за цената               ── */
const LICS = [
  { id:'lease',     name:'Lease License',    desc:'Non-exclusive. Up to 50k streams, 5k downloads.', mult:1   },
  { id:'premium',   name:'Premium Lease',    desc:'Non-exclusive. Unlimited streams & downloads.',   mult:1.8 },
  { id:'exclusive', name:'Exclusive Rights', desc:'Full exclusive ownership. Beat removed from store.', mult:5 }
];

/* ── Глобални состојби ──────────────────────────────────────
   Чуваат тековни податоци за сесијата                   ── */
let token   = localStorage.getItem('sk_tok') || null;      // JWT токен на корисникот
let user    = JSON.parse(localStorage.getItem('sk_usr') || 'null'); // Тековен корисник
let cart    = JSON.parse(localStorage.getItem('sk_cart') || '[]'); // Содржина на кошничката
let beats   = [];           // Листа на beats од API
let presets = [];           // Листа на presets од API
let curBeat = null;         // Тековно пуштан beat
let playing = false;        // Дали аудиото е во play состојба
let selLic  = LICS[0];     // Избрана лиценца (default: Lease)
let selPm   = null;         // Избран начин на плаќање
let curSvcName = '';        // Тековна услуга за book

const audio = document.getElementById('audio'); // HTML5 аудио елемент

/* ── Централна API функција ─────────────────────────────────
   Сите повици до backend минуваат низ оваа функција.
   Автоматски додава JWT токен ако корисникот е логиран.  ── */
async function apiFetch(path, opts = {}) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token; // Додај токен ако постои
    Object.assign(headers, opts.headers || {});

    const res  = await fetch(path, { ...opts, headers });
    let data   = {};
    try { data = await res.json(); } catch(e) {} // Парсирај JSON ако е возможно

    if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
    return data;
  } catch(e) {
    // Ако серверот не е достапен — покажи јасна порака
    if (e.message.includes('fetch')) throw new Error('Cannot connect to server. Is it running?');
    throw e;
  }
}

/* ── Иницијализација ────────────────────────────────────────
   Се повикува при вчитување на страницата                ── */
async function init() {
  updateUserUI();      // Прикажи/скриј корисничко мени
  updateCartCount();   // Ажурирај бројач на кошничка
  loadBeats();         // Вчитај beats од API
  loadPresets();       // Вчитај presets од API
}

/* ── Вчитување на Beats ─────────────────────────────────── */
async function loadBeats() {
  try {
    beats = await apiFetch('/api/beats?type=beat');
    renderBeats(); // Прикажи ги на страницата
  } catch(e) {
    document.getElementById('beatsGrid').innerHTML =
      `<div class="loading-b" style="color:var(--ac)">
        <i class="fas fa-exclamation-circle" style="font-size:1.5rem;display:block;margin-bottom:1rem"></i>
        ${e.message}<br><small style="font-size:.65rem;margin-top:.5rem;display:block">Make sure the server is running</small>
      </div>`;
  }
}

/* ── Вчитување на Presets ───────────────────────────────── */
async function loadPresets() {
  try {
    presets = await apiFetch('/api/beats?type=preset');
    renderPresets();
  } catch(e) {
    document.getElementById('presetsGrid').innerHTML =
      `<div class="loading-b" style="color:var(--ac)">${e.message}</div>`;
  }
}

/* ── Помошна функција: CSS класа за жанра значка ────────── */
function bcls(g) {
  return { trap:'bbt', rnb:'bbr', drill:'bbd', hiphop:'bbh', preset:'bbp', mix:'bbp', master:'bbp', bundle:'bbr' }[g] || 'bbt';
}

/* ── Генерирање на waveform визуализација ───────────────────
   Прави случаен waveform од 32 барови базирано на seed    ── */
function wave(seed) {
  return Array.from({ length: 32 }, (_, i) =>
    `<div class="wb" style="height:${20 + Math.abs(Math.sin(seed * i + i * .7)) * 60}%"></div>`
  ).join('');
}

/* ── Генерирање на HTML картичка за beat/preset ─────────── */
function card(b) {
  const [d, c] = b.price.toFixed(2).split('.');
  return `<div class="beat-card" data-genre="${b.genre}" data-id="${b._id}">
    <span class="bb ${bcls(b.genre)}">${b.genre.toUpperCase()}</span>
    <div class="bn">${b.name}</div>
    <div class="bm">${b.bpm ? b.bpm + ' BPM · ' : ''}${b.key || ''}</div>
    <div class="bw" onclick="playBeat('${b._id}')">
      <div class="bprog" id="prog-${b._id}"></div>
      ${wave((b._id.charCodeAt(0) || 1) * 13)}
    </div>
    <div class="bf">
      <div class="bprice">$${d}<span class="cent">.${c}</span></div>
      <div class="bac">
        <button class="ib play" onclick="playBeat('${b._id}')"><i class="fas fa-play" id="icon-${b._id}"></i></button>
        <button class="ib" onclick="addCart('${b._id}')" title="${user ? 'Add to cart' : 'Sign in to buy'}">
          <i class="fas ${user ? 'fa-cart-plus' : 'fa-lock'}"></i>
        </button>
      </div>
    </div>
    ${!user ? '<div class="lock-hint"><i class="fas fa-lock"></i> Sign in to purchase</div>' : ''}
  </div>`;
}

/* ── Рендерирање на beats и presets на страницата ────────── */
function renderBeats()   { document.getElementById('beatsGrid').innerHTML   = beats.length   ? beats.map(card).join('')   : '<div class="loading-b">No beats added yet.</div>'; }
function renderPresets() { document.getElementById('presetsGrid').innerHTML = presets.length ? presets.map(card).join('') : '<div class="loading-b">No presets added yet.</div>'; }

/* ── Филтрирање по жанра ────────────────────────────────── */
document.getElementById('beatFilters').addEventListener('click', e => {
  const b = e.target.closest('.fb'); if (!b) return;
  document.querySelectorAll('.fb').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const f = b.dataset.f;
  // Прикажи/скриј картички според жанра
  document.querySelectorAll('#beatsGrid .beat-card').forEach(c =>
    c.style.display = (f === 'all' || c.dataset.genre === f) ? '' : 'none'
  );
});

/* ══════════════════════════════════════════════════════════
   АУДИО ПЛЕЕР
   ══════════════════════════════════════════════════════════ */

/* ── Пушти beat ─────────────────────────────────────────── */
function playBeat(id) {
  const b = [...beats, ...presets].find(x => x._id === id);
  if (!b) return;

  // Ако е ист beat — toggle play/pause
  if (curBeat && curBeat._id === id) { togPlay(); return; }

  // Ресетирај иконата на претходниот beat
  if (curBeat) document.getElementById('icon-' + curBeat._id)?.classList.replace('fa-pause', 'fa-play');

  curBeat = b;
  if (!b.previewFile) { showToast('No preview available', 'err'); return; }

  // Постави нов аудио извор
  audio.src = '/previews/' + b.previewFile;
  audio.volume = parseFloat(document.getElementById('pVol').value);
  audio.play().catch(e => showToast('Playback error: ' + e.message, 'err'));
  playing = true;

  // Прикажи плеер лента
  document.getElementById('pBar').classList.add('vis');
  document.getElementById('pTitle').textContent = b.name;
  document.getElementById('pMeta').textContent  = (b.bpm ? b.bpm + ' BPM · ' : '') + (b.key || '');
  document.getElementById('pPlayI').classList.replace('fa-play', 'fa-pause');
  document.getElementById('icon-' + id)?.classList.replace('fa-play', 'fa-pause');

  // Настани за аудиото
  audio.ontimeupdate = updProg;
  audio.onended = () => {
    playing = false;
    document.getElementById('pPlayI').classList.replace('fa-pause', 'fa-play');
    document.getElementById('icon-' + id)?.classList.replace('fa-pause', 'fa-play');
  };
}

/* ── Toggle play/pause ──────────────────────────────────── */
function togPlay() {
  if (!curBeat) return;
  if (playing) {
    audio.pause(); playing = false;
    document.getElementById('pPlayI').classList.replace('fa-pause', 'fa-play');
    document.getElementById('icon-' + curBeat._id)?.classList.replace('fa-pause', 'fa-play');
  } else {
    audio.play(); playing = true;
    document.getElementById('pPlayI').classList.replace('fa-play', 'fa-pause');
    document.getElementById('icon-' + curBeat._id)?.classList.replace('fa-play', 'fa-pause');
  }
}

/* ── Ажурирање на прогрес барот ─────────────────────────── */
function updProg() {
  const pct = (audio.currentTime / audio.duration) * 100 || 0;
  document.getElementById('pProg').style.width = pct + '%';
  const fmt = s => { const m = Math.floor(s / 60), sc = Math.floor(s % 60); return m + ':' + (sc < 10 ? '0' : '') + sc; };
  document.getElementById('pTime').textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration || 0);
  const p = document.getElementById('prog-' + curBeat?._id);
  if (p) p.style.width = pct + '%';
}

/* ── Seek (прескокни на позиција) ───────────────────────── */
function seekA(e) {
  const r = e.currentTarget.getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * (audio.duration || 0);
}

/* ── Контрола на јачина ─────────────────────────────────── */
function setVol(v) { audio.volume = v; }

/* ── Затвори плеер ──────────────────────────────────────── */
function closePlayer() {
  audio.pause(); playing = false;
  document.getElementById('pBar').classList.remove('vis');
  if (curBeat) {
    document.getElementById('icon-' + curBeat._id)?.classList.replace('fa-pause', 'fa-play');
    curBeat = null;
  }
}

/* ══════════════════════════════════════════════════════════
   КОШНИЧКА
   ══════════════════════════════════════════════════════════ */

/* ── Додај во кошничка ──────────────────────────────────── */
function addCart(id) {
  if (!user) { showToast('Sign in first', 'err'); openAuth(); return; }
  const b = [...beats, ...presets].find(x => x._id === id);
  if (!b) return;
  if (cart.find(c => c._id === id)) { showToast('Already in cart', 'err'); return; }
  cart.push({ ...b });
  saveCart(); updateCartCount();
  showToast('"' + b.name + '" added to cart', 'ok');
}

/* ── Отстрани од кошничка ───────────────────────────────── */
function removeCart(id) { cart = cart.filter(c => c._id !== id); saveCart(); updateCartCount(); renderCart(); }

/* ── Зачувај кошничка во localStorage ───────────────────── */
function saveCart() { localStorage.setItem('sk_cart', JSON.stringify(cart)); }

/* ── Ажурирај бројач на кошничка ────────────────────────── */
function updateCartCount() { document.getElementById('cartCount').textContent = cart.length; }

/* ── Вкупна сума на кошничката ──────────────────────────── */
function cartTotal() { return cart.reduce((s, c) => s + c.price, 0); }

/* ── Отвори/затвори кошничка ────────────────────────────── */
function openCart()  { document.getElementById('cOv').classList.add('open'); document.getElementById('cBar').classList.add('open'); renderCart(); }
function closeCart() { document.getElementById('cOv').classList.remove('open'); document.getElementById('cBar').classList.remove('open'); }

/* ── Рендерирај содржина на кошничката ──────────────────── */
function renderCart() {
  const bd = document.getElementById('cBody'), ft = document.getElementById('cFoot');
  if (!cart.length) {
    bd.innerHTML = '<div class="empty"><i class="fas fa-shopping-cart"></i><p>Your cart is empty</p></div>';
    ft.innerHTML = ''; return;
  }
  bd.innerHTML = cart.map(c =>
    `<div class="ci">
      <div class="ci-info"><div class="ci-name">${c.name}</div><div class="ci-price">$${c.price.toFixed(2)}</div></div>
      <button class="cr" onclick="removeCart('${c._id}')"><i class="fas fa-times"></i></button>
    </div>`
  ).join('');
  ft.innerHTML = `
    <div class="ct"><span>TOTAL</span><span>$${cartTotal().toFixed(2)}</span></div>
    <button class="btn btn-ac" style="width:100%;padding:.75rem;justify-content:center" onclick="openCheckout()">CHECKOUT <i class="fas fa-arrow-right"></i></button>`;
}

/* ══════════════════════════════════════════════════════════
   CHECKOUT ПРОЦЕС
   ══════════════════════════════════════════════════════════ */

/* ── Отвори checkout ────────────────────────────────────── */
function openCheckout() {
  if (!user) { closeCart(); openAuth(); showToast('Sign in first', 'err'); return; }
  if (!cart.length) { showToast('Cart is empty', 'err'); return; }
  closeCart();
  // Ресетирај состојба
  selLic = LICS[0]; selPm = null;
  document.querySelectorAll('.cstep').forEach(s => s.classList.remove('active'));
  document.getElementById('cs1').classList.add('active');
  document.getElementById('wBox').classList.remove('show');
  document.getElementById('pBox').classList.remove('show');
  document.getElementById('pwrap').style.display = 'none';
  document.getElementById('txRef').value = '';
  document.getElementById('pmW').className = 'pm-card';
  document.getElementById('pmP').className = 'pm-card';
  renderLics();
  openMo('coMo');
}

/* ── Рендерирај лиценца опции ───────────────────────────── */
function renderLics() {
  const base = cartTotal();
  document.getElementById('licOpts').innerHTML = LICS.map(l =>
    `<div class="lopt${l.id === selLic.id ? ' sel' : ''}" onclick="pickLic('${l.id}')">
      <h4>${l.name}</h4><p>${l.desc}</p>
      <div class="lp">$${(base * l.mult).toFixed(2)}</div>
    </div>`
  ).join('');
}

/* ── Избери лиценца ─────────────────────────────────────── */
function pickLic(id) { selLic = LICS.find(l => l.id === id); renderLics(); }

/* ── Оди на следен чекор во checkout ────────────────────── */
function goStep(n) {
  document.querySelectorAll('.cstep').forEach(s => s.classList.remove('active'));
  document.getElementById('cs' + n).classList.add('active');
  if (n === 2) {
    // Пресметај вкупна сума со множител на лиценцата
    const t = (cartTotal() * selLic.mult).toFixed(2);
    document.getElementById('wAmt').textContent = '$' + t;
    document.getElementById('pAmt').textContent = '$' + t;
  }
}

/* ── Избери начин на плаќање ────────────────────────────── */
function selPay(m) {
  selPm = m;
  document.getElementById('pmW').className = 'pm-card' + (m === 'wise'     ? ' aw' : '');
  document.getElementById('pmP').className = 'pm-card' + (m === 'payoneer' ? ' ap' : '');
  document.getElementById('wBox').classList.toggle('show', m === 'wise');
  document.getElementById('pBox').classList.toggle('show', m === 'payoneer');
  document.getElementById('pwrap').style.display = 'block';
}

/* ── Поднеси нарачка ────────────────────────────────────── */
async function submitOrder() {
  if (!selPm) { showToast('Select payment method', 'err'); return; }
  const txRef = document.getElementById('txRef').value.trim();
  if (!txRef) { showToast('Paste your transaction reference', 'err'); return; }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

  try {
    // Испрати нарачка до backend
    const res = await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items:     cart.map(c => ({ beatId: c._id })),
        license:   selLic.id,
        payMethod: selPm,
        txRef
      })
    });
    // По успешна нарачка — исчисти кошничка
    cart = []; saveCart(); updateCartCount();
    document.getElementById('oRef').textContent   = 'Order ID: ' + res.orderId;
    document.getElementById('sEmail').textContent = user.email;
    goStep(3); // Прикажи success екран
  } catch(e) {
    showToast(e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> SUBMIT ORDER';
  }
}

/* ══════════════════════════════════════════════════════════
   АВТЕНТИКАЦИЈА
   ══════════════════════════════════════════════════════════ */

/* ── Отвори auth модал ──────────────────────────────────── */
function openAuth() { openMo('authMo'); }

/* ── Смени таб (Sign In / Register) ────────────────────── */
function swTab(t) {
  document.querySelectorAll('.mtab').forEach((x, i) => x.classList.toggle('active', i === (t === 'login' ? 0 : 1)));
  document.getElementById('loginF').style.display   = t === 'login' ? '' : 'none';
  document.getElementById('regF').style.display     = t === 'reg'   ? '' : 'none';
  document.getElementById('authTitle').textContent  = t === 'login' ? 'SIGN IN' : 'REGISTER';
}

/* ── Логирање ───────────────────────────────────────────── */
async function doLogin() {
  const email = document.getElementById('lEmail').value.trim();
  const pass  = document.getElementById('lPass').value;
  if (!email || !pass) { showFerr('lErr', 'Please fill in all fields'); return; }

  const btn = event.target; btn.disabled = true; btn.textContent = 'Signing in...';
  try {
    const d = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    setUser(d);
    closeMo('authMo');
    renderBeats(); renderPresets(); // Ажурирај со lock/unlock иконки
    showToast('Welcome back, ' + d.user.name.split(' ')[0] + '!', 'ok');
  } catch(e) {
    showFerr('lErr', e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'SIGN IN';
  }
}

/* ── Регистрација ───────────────────────────────────────── */
async function doReg() {
  const name  = document.getElementById('rName').value.trim();
  const email = document.getElementById('rEmail').value.trim();
  const pass  = document.getElementById('rPass').value;
  if (!name || !email || !pass) { showFerr('rErr', 'Please fill in all fields'); return; }
  if (pass.length < 8) { showFerr('rErr', 'Password must be at least 8 characters'); return; }

  const btn = event.target; btn.disabled = true; btn.textContent = 'Creating account...';
  try {
    const d = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: pass })
    });
    setUser(d);
    closeMo('authMo');
    renderBeats(); renderPresets();
    showToast('Welcome, ' + d.user.name.split(' ')[0] + '!', 'ok');
  } catch(e) {
    showFerr('rErr', e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'CREATE ACCOUNT';
  }
}

/* ── Зачувај корисник во localStorage ───────────────────── */
function setUser(d) {
  token = d.token; user = d.user;
  localStorage.setItem('sk_tok', token);
  localStorage.setItem('sk_usr', JSON.stringify(user));
  updateUserUI();
}

/* ── Одјави се ──────────────────────────────────────────── */
function logout() {
  token = null; user = null;
  localStorage.removeItem('sk_tok');
  localStorage.removeItem('sk_usr');
  updateUserUI();
  document.getElementById('uDrop').classList.remove('open');
  renderBeats(); renderPresets();
  showToast('Signed out');
}

/* ── Ажурирај кориснички интерфејс ─────────────────────── */
function updateUserUI() {
  const on = !!user;
  document.getElementById('gBtns').style.display = on ? 'none' : '';  // Скриј "Sign In" копче
  document.getElementById('uBtns').style.display = on ? '' : 'none';  // Прикажи корисничко мени
  if (on) document.getElementById('uName').textContent = user.name.split(' ')[0].toUpperCase();
}

/* ── Toggle корисничко dropdown ─────────────────────────── */
function togDrop() { document.getElementById('uDrop').classList.toggle('open'); }

/* ══════════════════════════════════════════════════════════
   МОЈ БИБЛИОТЕКА — Купени фајлови
   ══════════════════════════════════════════════════════════ */

/* ── Отвори библиотека ──────────────────────────────────── */
async function openLibrary() {
  if (!user) { openAuth(); return; }
  closeMo('authMo');
  openMo('libMo');
  document.getElementById('libBody').innerHTML = '<div class="empty"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    const orders = await apiFetch('/api/orders/my'); // Земи нарачки на тековниот корисник
    const b = document.getElementById('libBody');

    if (!orders.length) {
      b.innerHTML = '<div class="empty"><i class="fas fa-music"></i><p>No purchases yet</p></div>';
      return;
    }

    // Рендерирај секоја ставка од секоја нарачка
    b.innerHTML = orders.flatMap(o => o.items.map(it => `
      <div class="li">
        <div class="li-icon"><i class="fas fa-music"></i></div>
        <div style="flex:1">
          <div style="font-family:var(--fm);font-size:.8rem">${it.beatName}</div>
          <div style="font-size:.68rem;color:var(--mu);font-family:var(--fm);margin-top:.2rem">
            ${o.license.toUpperCase()} · ${o.payMethod.toUpperCase()}
          </div>
          ${o.status === 'pending'   ? '<div style="font-size:.68rem;color:var(--go);font-family:var(--fm)"><i class="fas fa-clock"></i> Pending verification</div>' : ''}
          ${o.status === 'confirmed' ? '<div style="font-size:.68rem;color:var(--gr);font-family:var(--fm)"><i class="fas fa-check"></i> Confirmed</div>' : ''}
          ${o.status === 'rejected'  ? '<div style="font-size:.68rem;color:var(--ac)"><i class="fas fa-times"></i> Rejected</div>' : ''}
        </div>
        <div style="font-size:.72rem;color:var(--mu)">${new Date(o.createdAt).toLocaleDateString()}</div>
        ${o.status === 'confirmed'
          ? `<button class="btn btn-gh" style="padding:.4rem .75rem;font-size:.6rem" onclick="dlBeat('${it.beat}','${it.beatName}')"><i class="fas fa-download"></i></button>`
          : `<span style="font-family:var(--fm);font-size:.58rem;color:var(--go)">${o.status}</span>`
        }
      </div>`
    )).join('');
  } catch(e) {
    document.getElementById('libBody').innerHTML = `<div class="empty" style="color:var(--ac)">${e.message}</div>`;
  }
}

/* ── Преземи beat фајл ──────────────────────────────────── */
function dlBeat(id, name) {
  // Fetch со Authorization header — фајловите се заштитени
  fetch('/api/downloads/' + id, { headers: { Authorization: 'Bearer ' + token } })
    .then(r => { if (!r.ok) throw new Error('Download failed'); return r.blob(); })
    .then(blob => {
      // Создај привремен линк и автоматски кликни
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    })
    .catch(e => showToast(e.message, 'err'));
}

/* ══════════════════════════════════════════════════════════
   УСЛУГИ (SERVICES)
   ══════════════════════════════════════════════════════════ */

/* ── Отвори book service модал ──────────────────────────── */
function bookService(svc) {
  curSvcName = svc;
  document.getElementById('svcTitle').textContent = 'BOOK — ' + svc.toUpperCase();
  document.getElementById('sName').value   = user?.name  || '';
  document.getElementById('sEmail2').value = user?.email || '';
  document.getElementById('sMsg').value    = '';
  openMo('svcMo');
}

/* ── Поднеси service request ────────────────────────────── */
async function submitService() {
  const name  = document.getElementById('sName').value.trim();
  const email = document.getElementById('sEmail2').value.trim();
  const msg   = document.getElementById('sMsg').value.trim();
  if (!name || !email) { showFerr('sErr', 'Name and email required'); return; }

  try {
    await apiFetch('/api/services', {
      method: 'POST',
      body: JSON.stringify({ name, email, service: curSvcName, message: msg })
    });
    closeMo('svcMo');
    showToast('Request sent! We will contact you soon.', 'ok');
  } catch(e) { showFerr('sErr', e.message); }
}

/* ══════════════════════════════════════════════════════════
   ПОМОШНИ ФУНКЦИИ
   ══════════════════════════════════════════════════════════ */

/* ── Копирај во клипборд ────────────────────────────────── */
function cp(t) {
  navigator.clipboard.writeText(t)
    .then(() => showToast('Copied!', 'ok'))
    .catch(() => showToast('Copy failed'));
}

/* ── Отвори/затвори модален прозорец ────────────────────── */
function openMo(id)  { document.getElementById(id).classList.add('open'); }
function closeMo(id) { document.getElementById(id).classList.remove('open'); }

/* ── Затвори модал при клик на overlay ──────────────────── */
document.addEventListener('click', e => {
  // Затвори dropdown ако се кликне надвор
  if (!document.getElementById('uMenu').contains(e.target))
    document.getElementById('uDrop').classList.remove('open');
  // Затвори модал ако се кликне на темната позадина
  if (e.target.classList.contains('mo')) closeMo(e.target.id);
});

/* ── Прикажи грешка под форма ───────────────────────────── */
function showFerr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000); // Скриј по 5 секунди
}

/* ── Прикажи toast нотификација ─────────────────────────── */
function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 't ' + type;
  t.textContent = msg;
  document.getElementById('toast').appendChild(t);
  setTimeout(() => t.remove(), 3500); // Отстрани по 3.5 секунди
}

/* ── Стартувај апликацијата ─────────────────────────────── */
init();
