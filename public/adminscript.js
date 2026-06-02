/* ============================================================
   SHUKI PRODUCTION — adminscript.js
   JavaScript за Admin панелот
   ============================================================ */

/* ── Глобални состојби ──────────────────────────────────────
   Чуваат тековни податоци за admin сесијата             ── */
let adminToken    = sessionStorage.getItem('sk_admin') || null; // Admin JWT токен
let allOrders     = [];      // Сите нарачки (за филтрирање)
let curOrdFilter  = 'all';   // Тековен филтер за нарачки

/* ══════════════════════════════════════════════════════════
   API ПОМОШНА ФУНКЦИЈА
   ══════════════════════════════════════════════════════════ */

/* ── Централна API функција за Admin ────────────────────────
   Автоматски додава x-admin-token header на секој повик  ── */
async function apiFetch(path, opts = {}) {
  const headers = {};
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (adminToken) headers['x-admin-token'] = adminToken;

  const res  = await fetch(path, { ...opts, headers });
  if (res.status === 401) { adminLogout(); throw new Error('Session expired'); }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error ' + res.status);
  return data;
}

/* ══════════════════════════════════════════════════════════
   АВТЕНТИКАЦИЈА
   ══════════════════════════════════════════════════════════ */

/* ── Логирање во Admin панел ────────────────────────────── */
async function doLogin() {
  const u = document.getElementById('aUser').value.trim();
  const p = document.getElementById('aPass').value;
  if (!u || !p) { showFerr('loginErr', 'Enter credentials'); return; }

  document.getElementById('loginBtnTxt').textContent = 'Logging in...';
  try {
    const res  = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');

    adminToken = json.token;
    sessionStorage.setItem('sk_admin', adminToken); // Зачувај во session
    document.getElementById('loginScreen').style.display = 'none';
    initAdmin(); // Почни со вчитување на dashboard
  } catch(e) {
    showFerr('loginErr', e.message);
    document.getElementById('loginBtnTxt').textContent = 'LOGIN';
  }
}

/* ── Одјави се ──────────────────────────────────────────── */
function adminLogout() {
  adminToken = null;
  sessionStorage.removeItem('sk_admin');
  document.getElementById('loginScreen').style.display = 'flex';
}

/* Автоматски влези ако веќе има токен во session */
if (adminToken) {
  document.getElementById('loginScreen').style.display = 'none';
}

/* ══════════════════════════════════════════════════════════
   НАВИГАЦИЈА
   ══════════════════════════════════════════════════════════ */

/* Мета податоци за секоја страница */
const pageMeta = {
  dashboard: ['DASHBOARD', '// Overview & Analytics'],
  beats:     ['BEATS',     '// Beat Catalog'],
  presets:   ['PRESETS',   '// Vocal Presets'],
  orders:    ['ORDERS',    '// Purchase History'],
  users:     ['USERS',     '// Registered Members'],
  services:  ['SERVICES',  '// Service Requests']
};

/* ── Смени страница ─────────────────────────────────────── */
function showPage(name) {
  // Скриј сите страници и ресетирај навигација
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));

  document.getElementById('page-' + name).classList.add('active');
  event.currentTarget.classList.add('active');

  const [t, s] = pageMeta[name] || [name.toUpperCase(), ''];
  document.getElementById('topTitle').textContent = t;
  document.getElementById('topSub').textContent   = s;

  // Автоматски вчитај податоци за страницата
  ({ dashboard: loadDashboard, beats: loadBeats, presets: loadPresets, orders: loadOrders, users: loadUsers, services: loadServices })[name]?.();
}

/* ── Освежи тековна страница ────────────────────────────── */
function refreshPage() { document.querySelector('.ni.active')?.click(); }

/* ── Иницијализација на Admin панелот ───────────────────── */
async function initAdmin() { await loadDashboard(); }

/* ══════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════ */

async function loadDashboard() {
  try {
    const stats = await apiFetch('/api/orders/admin/stats');

    // Ажурирај статистики
    document.getElementById('s-rev').textContent      = '$' + stats.totalRevenue.toFixed(2);
    document.getElementById('s-beats').textContent    = stats.activeBeats;
    document.getElementById('s-orders').textContent   = stats.totalOrders;
    document.getElementById('s-users').textContent    = stats.totalUsers;
    document.getElementById('s-pend-txt').textContent = stats.pendingOrders + ' pending';
    document.getElementById('pendCount').textContent  = stats.pendingOrders ? stats.pendingOrders + ' need attention' : 'All clear ✓';

    // Значка за pending нарачки во sidebar
    const bdg = document.getElementById('pendingBadge');
    if (stats.pendingOrders > 0) { bdg.style.display = ''; bdg.textContent = stats.pendingOrders; }
    else { bdg.style.display = 'none'; }

    // Генерирај revenue chart
    const m = stats.monthlyRevenue || {}, keys = Object.keys(m), max = Math.max(...Object.values(m), 1);
    document.getElementById('revChart').innerHTML = keys.length
      ? keys.map(k =>
          `<div class="bar-wrap">
            <div class="bar-val">$${m[k] >= 1000 ? (m[k]/1000).toFixed(1) + 'k' : m[k].toFixed(0)}</div>
            <div class="bar" style="height:${(m[k]/max)*100}px" title="${k}"></div>
            <div class="bar-label">${k}</div>
          </div>`
        ).join('')
      : '<div style="color:var(--mu);font-family:var(--fm);font-size:.7rem">No confirmed orders yet</div>';

    // Прикажи pending нарачки
    const pending = await apiFetch('/api/orders/admin/all?status=pending');
    renderOrdTable(pending, 'dashPendTable', true);
  } catch(e) { showToast(e.message, 'err'); }
}

/* ══════════════════════════════════════════════════════════
   BEATS УПРАВУВАЊЕ
   ══════════════════════════════════════════════════════════ */

/* ── Вчитај ги сите beats ───────────────────────────────── */
async function loadBeats() {
  document.getElementById('beatsTable').innerHTML = `<tr><td colspan="9"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></td></tr>`;
  try {
    const all = await apiFetch('/api/beats/admin/all');
    const b   = all.filter(x => x.type === 'beat');
    document.getElementById('beatCountTxt').textContent = b.length + ' beats';
    document.getElementById('beatsTable').innerHTML = b.length ? b.map(beatRow).join('') : emptyRow(9, 'No beats yet');
  } catch(e) { showToast(e.message, 'err'); }
}

/* ── Генерирај HTML ред за beat во табела ───────────────── */
function beatRow(b) {
  return `<tr>
    <td style="font-family:var(--fd);letter-spacing:1px">${b.name}</td>
    <td><span class="badge b-${b.genre}">${b.genre}</span></td>
    <td class="mono">${b.bpm || '—'}</td>
    <td class="mono" style="font-size:.75rem">${b.key || '—'}</td>
    <td style="color:var(--ac);font-family:var(--fm)">$${b.price.toFixed(2)}</td>
    <td>${b.previewFile ? '<span class="badge b-active"><i class="fas fa-check"></i> Yes</span>' : '<span class="badge b-draft">No</span>'}</td>
    <td>${b.beatFile    ? '<span class="badge b-active"><i class="fas fa-check"></i> Yes</span>' : '<span class="badge b-draft">No</span>'}</td>
    <td><span class="badge b-${b.status}">${b.status}</span></td>
    <td><div class="act-btns">
      <button class="btn btn-gh" style="padding:.3rem .6rem;font-size:.6rem" onclick='editBeat(${JSON.stringify(b)})'><i class="fas fa-edit"></i></button>
      <button class="btn btn-re" style="padding:.3rem .6rem;font-size:.6rem" onclick="delBeat('${b._id}','${b.name}')"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`;
}

/* ── Отвори модал за нов beat ───────────────────────────── */
function openBeatMo() { clearBeatForm(); document.getElementById('beatMoTitle').textContent = 'ADD BEAT'; openMo('beatMo'); }

/* ── Отвори модал за уредување beat ────────────────────── */
function editBeat(b) {
  clearBeatForm();
  document.getElementById('beatMoTitle').textContent = 'EDIT BEAT';
  // Пополни ги полињата со постоечките вредности
  document.getElementById('beatEditId').value = b._id;
  document.getElementById('bName').value      = b.name;
  document.getElementById('bGenre').value     = b.genre;
  document.getElementById('bBpm').value       = b.bpm   || '';
  document.getElementById('bKey').value       = b.key   || '';
  document.getElementById('bPrice').value     = b.price;
  document.getElementById('bDesc').value      = b.description || '';
  if (b.previewFile) { document.getElementById('previewFileName').textContent = '✓ ' + b.previewFile; document.getElementById('previewUz').classList.add('has-file'); }
  if (b.beatFile)    { document.getElementById('beatFileName').textContent    = '✓ ' + b.beatFile;    document.getElementById('beatFileUz').classList.add('has-file'); }
  openMo('beatMo');
}

/* ── Исчисти beat форма ─────────────────────────────────── */
function clearBeatForm() {
  ['beatEditId','bName','bBpm','bKey','bPrice','bDesc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('bGenre').value = 'trap';
  document.getElementById('previewFileName').textContent = 'Click to upload MP3 preview';
  document.getElementById('beatFileName').textContent    = 'Click to upload WAV / ZIP';
  ['previewFile','beatFileInput'].forEach(id => document.getElementById(id).value = '');
  ['previewUz','beatFileUz'].forEach(id => document.getElementById(id).classList.remove('has-file'));
}

/* ── Зачувај beat (CREATE или UPDATE) ───────────────────── */
async function saveBeat() {
  const name  = document.getElementById('bName').value.trim();
  const price = document.getElementById('bPrice').value;
  if (!name || !price) { showToast('Name and price required', 'err'); return; }

  const btn = document.getElementById('saveBeatBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  // Користи FormData за file upload
  const fd = new FormData();
  fd.append('name',  name);
  fd.append('genre', document.getElementById('bGenre').value);
  fd.append('bpm',   document.getElementById('bBpm').value);
  fd.append('key',   document.getElementById('bKey').value);
  fd.append('price', price);
  fd.append('description', document.getElementById('bDesc').value);
  fd.append('type',  'beat');

  const pf = document.getElementById('previewFile').files[0];
  const bf = document.getElementById('beatFileInput').files[0];
  if (pf) fd.append('preview',  pf);  // MP3 preview фајл
  if (bf) fd.append('beatfile', bf);  // WAV/ZIP beat фајл

  try {
    const editId  = document.getElementById('beatEditId').value;
    const headers = { 'x-admin-token': adminToken };
    if (editId) {
      await fetch('/api/beats/' + editId, { method: 'PUT',  headers, body: fd }); // Ажурирај
    } else {
      await fetch('/api/beats',           { method: 'POST', headers, body: fd }); // Создај нов
    }
    showToast(editId ? 'Beat updated!' : 'Beat added! Live on site.', 'ok');
    closeMo('beatMo');
    loadBeats(); // Освежи табела
  } catch(e) { showToast(e.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> SAVE BEAT'; }
}

/* ── Избриши beat ───────────────────────────────────────── */
async function delBeat(id, name) {
  if (!confirm('Delete "' + name + '"?')) return;
  try { await apiFetch('/api/beats/' + id, { method: 'DELETE' }); showToast('Deleted', 'ok'); loadBeats(); }
  catch(e) { showToast(e.message, 'err'); }
}

/* ══════════════════════════════════════════════════════════
   PRESETS УПРАВУВАЊЕ
   ══════════════════════════════════════════════════════════ */

async function loadPresets() {
  document.getElementById('presetsTable').innerHTML = `<tr><td colspan="6"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></td></tr>`;
  try {
    const all = await apiFetch('/api/beats/admin/all');
    const p   = all.filter(x => x.type === 'preset');
    document.getElementById('presetCountTxt').textContent = p.length + ' presets';
    document.getElementById('presetsTable').innerHTML = p.length ? p.map(presetRow).join('') : emptyRow(6, 'No presets yet');
  } catch(e) { showToast(e.message, 'err'); }
}

function presetRow(p) {
  return `<tr>
    <td style="font-family:var(--fd);letter-spacing:1px">${p.name}</td>
    <td><span class="badge b-${p.genre}">${p.genre}</span></td>
    <td style="color:var(--ac);font-family:var(--fm)">$${p.price.toFixed(2)}</td>
    <td>${p.beatFile ? '<span class="badge b-active"><i class="fas fa-check"></i> Yes</span>' : '<span class="badge b-draft">No</span>'}</td>
    <td><span class="badge b-${p.status}">${p.status}</span></td>
    <td><div class="act-btns">
      <button class="btn btn-gh" style="padding:.3rem .6rem;font-size:.6rem" onclick='editPreset(${JSON.stringify(p)})'><i class="fas fa-edit"></i></button>
      <button class="btn btn-re" style="padding:.3rem .6rem;font-size:.6rem" onclick="delBeat('${p._id}','${p.name}')"><i class="fas fa-trash"></i></button>
    </div></td>
  </tr>`;
}

function openPresetMo() { clearPresetForm(); document.getElementById('presetMoTitle').textContent = 'ADD PRESET'; openMo('presetMo'); }

function editPreset(p) {
  clearPresetForm();
  document.getElementById('presetMoTitle').textContent = 'EDIT PRESET';
  document.getElementById('presetEditId').value = p._id;
  document.getElementById('pName').value        = p.name;
  document.getElementById('pType').value        = p.genre;
  document.getElementById('pPrice').value       = p.price;
  document.getElementById('pDesc').value        = p.description || '';
  if (p.previewFile) { document.getElementById('pPreviewFileName').textContent = '✓ ' + p.previewFile; document.getElementById('pPreviewUz').classList.add('has-file'); }
  if (p.beatFile)    { document.getElementById('pFileName').textContent        = '✓ ' + p.beatFile;    document.getElementById('pFileUz').classList.add('has-file'); }
  openMo('presetMo');
}

function clearPresetForm() {
  ['presetEditId','pName','pPrice','pDesc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pType').value = 'preset';
  document.getElementById('pPreviewFileName').textContent = 'Click to upload preview';
  document.getElementById('pFileName').textContent        = 'Click to upload ZIP / RAR';
  ['pPreviewFile','pFileInput'].forEach(id => document.getElementById(id).value = '');
  ['pPreviewUz','pFileUz'].forEach(id => document.getElementById(id).classList.remove('has-file'));
}

async function savePreset() {
  const name  = document.getElementById('pName').value.trim();
  const price = document.getElementById('pPrice').value;
  if (!name || !price) { showToast('Name and price required', 'err'); return; }

  const btn = document.getElementById('savePresetBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  const fd = new FormData();
  fd.append('name',  name);
  fd.append('genre', document.getElementById('pType').value);
  fd.append('price', price);
  fd.append('description', document.getElementById('pDesc').value);
  fd.append('type',  'preset');

  const pf = document.getElementById('pPreviewFile').files[0];
  const bf = document.getElementById('pFileInput').files[0];
  if (pf) fd.append('preview',  pf);
  if (bf) fd.append('beatfile', bf);

  try {
    const editId  = document.getElementById('presetEditId').value;
    const headers = { 'x-admin-token': adminToken };
    if (editId) { await fetch('/api/beats/' + editId, { method: 'PUT',  headers, body: fd }); }
    else        { await fetch('/api/beats',           { method: 'POST', headers, body: fd }); }
    showToast(editId ? 'Preset updated!' : 'Preset added! Live on site.', 'ok');
    closeMo('presetMo'); loadPresets();
  } catch(e) { showToast(e.message, 'err'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> SAVE PRESET'; }
}

/* ══════════════════════════════════════════════════════════
   НАРАЧКИ УПРАВУВАЊЕ
   ══════════════════════════════════════════════════════════ */

/* ── Вчитај ги сите нарачки ─────────────────────────────── */
async function loadOrders() {
  document.getElementById('ordersTable').innerHTML = `<tr><td colspan="10"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></td></tr>`;
  try {
    allOrders = await apiFetch('/api/orders/admin/all');
    renderOrdTable(filterOrdList(allOrders, curOrdFilter), 'ordersTable', false);
  } catch(e) { showToast(e.message, 'err'); }
}

/* ── Филтрирај листа на нарачки по статус ───────────────── */
function filterOrdList(list, f) { return f === 'all' ? list : list.filter(o => o.status === f); }

/* ── Смени активен филтер ───────────────────────────────── */
function filterOrd(f, btn) {
  curOrdFilter = f;
  document.querySelectorAll('.otab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderOrdTable(filterOrdList(allOrders, f), 'ordersTable', false);
}

/* ── Рендерирај табела со нарачки ───────────────────────── */
function renderOrdTable(orders, tableId, compact = false) {
  const tbody = document.getElementById(tableId);
  if (!orders.length) { tbody.innerHTML = emptyRow(compact ? 8 : 10, 'No orders found'); return; }

  tbody.innerHTML = orders.map(o => {
    const beats = o.items.map(i => i.beatName || '—').join(', ');
    const sid   = String(o._id).slice(-8).toUpperCase(); // Кратко ID за приказ
    return `<tr>
      <td class="mono" style="font-size:.7rem">#${sid}</td>
      <td>
        <div>${o.userName || '—'}</div>
        <div class="mono" style="font-size:.65rem;color:var(--mu)">${o.userEmail || ''}</div>
      </td>
      <td style="max-width:140px;font-size:.8rem">${beats}</td>
      ${!compact ? `<td><span class="badge b-active">${o.license}</span></td>` : ''}
      <td><span class="badge ${o.payMethod === 'wise' ? 'b-active' : 'b-pending'}">${(o.payMethod || '').toUpperCase()}</span></td>
      <td class="mono" style="font-size:.65rem;max-width:100px;word-break:break-all">${o.txRef}</td>
      <td style="color:var(--gr);font-family:var(--fm)">$${o.totalAmount?.toFixed(2)}</td>
      ${!compact ? `<td style="font-size:.75rem">${new Date(o.createdAt).toLocaleDateString()}</td>` : ''}
      <td><span class="badge b-${o.status}">${o.status}</span></td>
      <td><div class="act-btns">
        <button class="btn btn-gh" style="padding:.3rem .6rem;font-size:.6rem" onclick="viewOrder('${o._id}')"><i class="fas fa-eye"></i></button>
        ${o.status === 'pending' ? `
          <button class="btn btn-gr" style="padding:.3rem .6rem;font-size:.6rem" onclick="confirmOrd('${o._id}')"><i class="fas fa-check"></i></button>
          <button class="btn btn-re" style="padding:.3rem .6rem;font-size:.6rem" onclick="rejectOrd('${o._id}')"><i class="fas fa-times"></i></button>` : ''}
      </div></td>
    </tr>`;
  }).join('');
}

/* ── Прегледај детали на нарачка ────────────────────────── */
async function viewOrder(id) {
  try {
    const orders = await apiFetch('/api/orders/admin/all');
    const o      = orders.find(x => x._id === id); if (!o) return;
    const beats  = o.items.map(i => `<div style="padding:.3rem 0;font-family:var(--fm);font-size:.78rem">• ${i.beatName} — $${i.price?.toFixed(2)}</div>`).join('');

    document.getElementById('orderDetail').innerHTML = `
      <div class="od">
        <div class="od-row"><span class="od-lbl">Order ID</span><span class="od-val" style="word-break:break-all">${o._id}</span></div>
        <div class="od-row"><span class="od-lbl">User</span><span class="od-val">${o.userName} &lt;${o.userEmail}&gt;</span></div>
        <div class="od-row"><span class="od-lbl">License</span><span class="od-val">${(o.license || '').toUpperCase()}</span></div>
        <div class="od-row"><span class="od-lbl">Payment</span><span class="od-val">${(o.payMethod || '').toUpperCase()}</span></div>
        <div class="od-row"><span class="od-lbl">Tx Reference</span><span class="od-val" style="word-break:break-all">${o.txRef}</span></div>
        <div class="od-row"><span class="od-lbl">Total</span><span class="od-val" style="color:var(--gr)">$${o.totalAmount?.toFixed(2)}</span></div>
        <div class="od-row"><span class="od-lbl">Status</span><span class="od-val"><span class="badge b-${o.status}">${o.status}</span></span></div>
        <div class="od-row"><span class="od-lbl">Date</span><span class="od-val">${new Date(o.createdAt).toLocaleString()}</span></div>
      </div>
      <div style="margin-bottom:1.25rem">
        <div style="font-family:var(--fm);font-size:.6rem;letter-spacing:2px;color:var(--mu);margin-bottom:.75rem">ITEMS</div>
        ${beats}
      </div>
      ${o.status === 'pending' ? `
        <div style="display:flex;gap:.75rem">
          <button class="btn btn-gr" style="flex:1;justify-content:center" onclick="confirmOrd('${o._id}')">
            <i class="fas fa-check"></i> CONFIRM & SEND EMAIL
          </button>
          <button class="btn btn-re" onclick="rejectOrd('${o._id}')"><i class="fas fa-times"></i> Reject</button>
        </div>
        <p style="font-size:.75rem;color:var(--mu);margin-top:.75rem;text-align:center">
          <i class="fas fa-info-circle"></i> Confirming sends download email to buyer and unlocks library.
        </p>` :
        `<div style="text-align:center;padding:1rem;color:var(--mu);font-family:var(--fm);font-size:.7rem">Order is ${o.status.toUpperCase()}</div>`
      }`;
    openMo('orderMo');
  } catch(e) { showToast(e.message, 'err'); }
}

/* ── Потврди нарачка ────────────────────────────────────── */
async function confirmOrd(id) {
  if (!confirm('Confirm this order?\n• Mark as confirmed\n• Send download email to buyer\n• Unlock buyer\'s library')) return;
  try {
    await apiFetch('/api/orders/admin/' + id + '/confirm', { method: 'PUT', body: JSON.stringify({}) });
    showToast('✅ Confirmed! Email sent.', 'ok');
    closeMo('orderMo');
    loadDashboard(); // Освежи dashboard
    if (document.getElementById('page-orders').classList.contains('active')) loadOrders();
  } catch(e) { showToast(e.message, 'err'); }
}

/* ── Одбиј нарачка ──────────────────────────────────────── */
async function rejectOrd(id) {
  if (!confirm('Reject this order?')) return;
  try {
    await apiFetch('/api/orders/admin/' + id + '/reject', { method: 'PUT', body: JSON.stringify({}) });
    showToast('Rejected', 'ok');
    closeMo('orderMo');
    loadDashboard();
    if (document.getElementById('page-orders').classList.contains('active')) loadOrders();
  } catch(e) { showToast(e.message, 'err'); }
}

/* ══════════════════════════════════════════════════════════
   КОРИСНИЦИ
   ══════════════════════════════════════════════════════════ */

async function loadUsers() {
  document.getElementById('usersTable').innerHTML = `<tr><td colspan="5"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></td></tr>`;
  try {
    const users = await apiFetch('/api/users/admin/all');
    document.getElementById('userCountTxt').textContent = users.length + ' users';
    document.getElementById('usersTable').innerHTML = users.length
      ? users.map(u => `<tr>
          <td>${u.name}</td>
          <td class="mono" style="font-size:.75rem">${u.email}</td>
          <td style="font-size:.8rem">${new Date(u.createdAt).toLocaleDateString()}</td>
          <td class="mono">${u.purchaseCount || 0}</td>
          <td><button class="btn btn-re" style="padding:.3rem .6rem;font-size:.6rem" onclick="delUser('${u._id}','${u.name}')"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('')
      : emptyRow(5, 'No users yet');
  } catch(e) { showToast(e.message, 'err'); }
}

async function delUser(id, name) {
  if (!confirm('Delete "' + name + '"?')) return;
  try { await apiFetch('/api/users/admin/' + id, { method: 'DELETE' }); showToast('Deleted', 'ok'); loadUsers(); }
  catch(e) { showToast(e.message, 'err'); }
}

/* ══════════════════════════════════════════════════════════
   УСЛУГИ (SERVICE REQUESTS)
   ══════════════════════════════════════════════════════════ */

async function loadServices() {
  document.getElementById('servicesTable').innerHTML = `<tr><td colspan="7"><div class="loading"><i class="fas fa-spinner fa-spin"></i></div></td></tr>`;
  try {
    const svcs = await apiFetch('/api/services/admin/all');
    document.getElementById('servicesTable').innerHTML = svcs.length
      ? svcs.map(s => `<tr>
          <td>${s.name}</td>
          <td class="mono" style="font-size:.75rem">${s.email}</td>
          <td>${s.service}</td>
          <td style="font-size:.8rem;max-width:180px;color:var(--mu)">${s.message || '—'}</td>
          <td style="font-size:.8rem">${new Date(s.createdAt).toLocaleDateString()}</td>
          <td><span class="badge b-${s.status === 'completed' ? 'confirmed' : s.status === 'contacted' ? 'active' : 'pending'}">${s.status}</span></td>
          <td><div class="act-btns">
            ${s.status === 'pending'    ? `<button class="btn btn-go" style="padding:.3rem .6rem;font-size:.6rem" onclick="updSvc('${s._id}','contacted')"><i class="fas fa-phone"></i></button>` : ''}
            ${s.status !== 'completed'  ? `<button class="btn btn-gr" style="padding:.3rem .6rem;font-size:.6rem" onclick="updSvc('${s._id}','completed')"><i class="fas fa-check"></i></button>` : ''}
          </div></td>
        </tr>`).join('')
      : emptyRow(7, 'No service requests yet');
  } catch(e) { showToast(e.message, 'err'); }
}

/* ── Ажурирај статус на услуга ──────────────────────────── */
async function updSvc(id, status) {
  try { await apiFetch('/api/services/admin/' + id, { method: 'PUT', body: JSON.stringify({ status }) }); showToast('Updated', 'ok'); loadServices(); }
  catch(e) { showToast(e.message, 'err'); }
}

/* ══════════════════════════════════════════════════════════
   ПОМОШНИ ФУНКЦИИ
   ══════════════════════════════════════════════════════════ */

/* ── Обработи избор на фајл за upload ───────────────────── */
function handleFile(input, uzId, labelId) {
  const f = input.files[0]; if (!f) return;
  document.getElementById(labelId).textContent = '✓ ' + f.name; // Прикажи ime на фајлот
  document.getElementById(uzId).classList.add('has-file');       // Додај зелен стил
}

/* ── Генерирај празен ред за табела ─────────────────────── */
function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}"><div class="empty-s"><i class="fas fa-inbox"></i><p>${msg}</p></div></td></tr>`;
}

/* ── Отвори/затвори модален прозорец ────────────────────── */
function openMo(id)  { document.getElementById(id).classList.add('open'); }
function closeMo(id) { document.getElementById(id).classList.remove('open'); }

/* ── Затвори модал при клик на overlay ──────────────────── */
document.addEventListener('click', e => {
  if (e.target.classList.contains('mo')) closeMo(e.target.id);
});

/* ── Прикажи грешка под форма ───────────────────────────── */
function showFerr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

/* ── Прикажи toast нотификација ─────────────────────────── */
function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 't ' + type; t.textContent = msg;
  document.getElementById('toast').appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* ── Автоматски старт ако веќе е логиран ────────────────── */
if (adminToken) initAdmin();
