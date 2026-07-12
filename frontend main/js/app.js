requireAuth();
const user = currentUser();
let DEPARTMENTS = [], CATEGORIES = [], EMPLOYEES = [];

const SCREEN_TITLES = {
  dashboard: 'Dashboard', orgsetup: 'Organization Setup', assets: 'Asset Directory',
  allocations: 'Allocation & Transfer', bookings: 'Resource Booking', maintenance: 'Maintenance Management',
  audits: 'Asset Audit', reports: 'Reports & Analytics', logs: 'Activity Logs & Notifications'
};

function toast(msg, isErr) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function badge(status) {
  const cls = 'badge-' + String(status).toLowerCase().replace(/\s+/g, '-');
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

/* ---------------- NAV ---------------- */
function goScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.screen === name));
  document.getElementById('screenTitle').textContent = SCREEN_TITLES[name];
  loadScreen(name);
}

function loadScreen(name) {
  if (name === 'dashboard') loadDashboard();
  else if (name === 'orgsetup') { loadDepartments(); loadCategories(); loadEmployees(); }
  else if (name === 'assets') loadAssets();
  else if (name === 'allocations') { loadAllocations(); loadTransfers(); }
  else if (name === 'bookings') loadBookings();
  else if (name === 'maintenance') loadMaintenance();
  else if (name === 'audits') loadAudits();
  else if (name === 'reports') loadReports();
  else if (name === 'logs') loadLogs();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => goScreen(item.dataset.screen));
});

document.body.addEventListener('click', (e) => {
  const tabBtn = e.target.closest('.tab-btn');
  if (tabBtn) {
    const group = tabBtn.parentElement;
    const panelHost = group.parentElement;
    group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    tabBtn.classList.add('active');
    panelHost.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    panelHost.querySelector('#tab-' + tabBtn.dataset.tab).classList.add('active');
  }
});

/* ---------------- MODAL HELPERS ---------------- */
function showModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});

/* ---------------- INIT / USER CHIP ---------------- */
function applyRoleVisibility() {
  document.querySelectorAll('[data-roles]').forEach(el => {
    const roles = el.dataset.roles.split(',');
    if (!roles.includes(user.role)) el.style.display = 'none';
  });
  const canRegister = ['Admin', 'Asset Manager'].includes(user.role);
  document.getElementById('quickRegisterBtn').style.display = canRegister ? '' : 'none';
  const qaRegister = document.getElementById('qaRegister');
  if (qaRegister) qaRegister.style.display = canRegister ? '' : 'none';
}

async function initShell() {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role;
  document.getElementById('userInitial').textContent = user.name.charAt(0).toUpperCase();
  applyRoleVisibility();
  document.getElementById('quickRegisterBtn').addEventListener('click', openRegisterModal);
  await loadLookups();
  loadDashboard();
  loadNotifications();
  setInterval(loadNotifications, 30000);
}

async function loadLookups() {
  [DEPARTMENTS, CATEGORIES, EMPLOYEES] = await Promise.all([
    api('/departments'), api('/categories'), api('/employees')
  ]);
  const catFilter = document.getElementById('assetCatFilter');
  catFilter.innerHTML = '<option value="">All categories</option>' + CATEGORIES.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

/* ---------------- NOTIFICATIONS ---------------- */
async function loadNotifications() {
  try {
    const notifs = await api('/notifications');
    const unread = notifs.filter(n => !n.is_read).length;
    const countEl = document.getElementById('notifCount');
    if (unread > 0) { countEl.style.display = 'flex'; countEl.textContent = unread; } else { countEl.style.display = 'none'; }
    const panel = document.getElementById('notifPanel');
    panel.innerHTML = notifs.length ? notifs.map(n => `
      <div class="notif-item">
        <div class="ntype">${escapeHtml(n.type)}</div>
        <div>${escapeHtml(n.message)}</div>
        <div class="ntime">${fmtDateTime(n.created_at)}</div>
      </div>`).join('') : '<div class="notif-item">No notifications yet.</div>';
  } catch (e) { /* silent */ }
}
document.getElementById('notifBtn').addEventListener('click', () => {
  document.getElementById('notifPanel').classList.toggle('show');
  document.querySelectorAll('#notifPanel .notif-item').forEach(async () => {});
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#notifBtn') && !e.target.closest('#notifPanel')) {
    document.getElementById('notifPanel').classList.remove('show');
  }
});

/* ==================== DASHBOARD ==================== */
async function loadDashboard() {
  const data = await api('/dashboard');
  const k = data.kpis;
  const cards = [
    ['Assets Available', k.assets_available, ''],
    ['Assets Allocated', k.assets_allocated, 'accent'],
    ['Maintenance Today', k.maintenance_today, 'accent'],
    ['Active Bookings', k.active_bookings, ''],
    ['Pending Transfers', k.pending_transfers, 'alert'],
    ['Upcoming Returns', k.upcoming_returns, '']
  ];
  document.getElementById('kpiGrid').innerHTML = cards.map(([label, val, cls]) => `
    <div class="kpi-card ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value">${val}</div></div>`).join('');

  document.getElementById('overdueTable').innerHTML = data.overdueAllocations.length ? data.overdueAllocations.map(a => `
    <tr><td class="mono">${a.tag}</td><td>${escapeHtml(a.asset_name)}</td><td>${escapeHtml(a.employee_name || '—')}</td><td>${fmtDate(a.expected_return_date)}</td></tr>
  `).join('') : '<tr><td class="empty-row" colspan="4">No overdue returns 🎉</td></tr>';

  document.getElementById('upcomingTable').innerHTML = data.upcomingReturns.length ? data.upcomingReturns.map(a => `
    <tr><td class="mono">${a.tag}</td><td>${escapeHtml(a.asset_name)}</td><td>${escapeHtml(a.employee_name || '—')}</td><td>${fmtDate(a.expected_return_date)}</td></tr>
  `).join('') : '<tr><td class="empty-row" colspan="4">Nothing due soon</td></tr>';
}

/* ==================== ORG SETUP ==================== */
async function loadDepartments() {
  DEPARTMENTS = await api('/departments');
  document.getElementById('deptTable').innerHTML = DEPARTMENTS.map(d => `
    <tr>
      <td>${escapeHtml(d.name)}</td>
      <td>${escapeHtml(d.head_name || '—')}</td>
      <td>${escapeHtml(d.parent_name || '—')}</td>
      <td>${badge(d.status)}</td>
      <td><button class="btn btn-secondary btn-sm" onclick='openDeptModal(${d.id})'>Edit</button></td>
    </tr>`).join('') || '<tr><td class="empty-row" colspan="5">No departments yet</td></tr>';
}

function openDeptModal(id) {
  const d = id ? DEPARTMENTS.find(x => x.id === id) : null;
  const empOptions = EMPLOYEES.map(e => `<option value="${e.id}" ${d && d.head_id === e.id ? 'selected' : ''}>${escapeHtml(e.name)}</option>`).join('');
  const deptOptions = DEPARTMENTS.filter(x => x.id !== id).map(x => `<option value="${x.id}" ${d && d.parent_id === x.id ? 'selected' : ''}>${escapeHtml(x.name)}</option>`).join('');
  showModal(`
    <h3>${d ? 'Edit Department' : 'New Department'}</h3>
    <div class="f-field"><label>Name</label><input id="mDeptName" value="${d ? escapeHtml(d.name) : ''}"></div>
    <div class="f-field"><label>Department Head</label><select id="mDeptHead"><option value="">— None —</option>${empOptions}</select></div>
    <div class="f-field"><label>Parent Department</label><select id="mDeptParent"><option value="">— None (top-level) —</option>${deptOptions}</select></div>
    <div class="f-field"><label>Status</label><select id="mDeptStatus"><option ${d && d.status==='Active'?'selected':''}>Active</option><option ${d && d.status==='Inactive'?'selected':''}>Inactive</option></select></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveDept(${id || 'null'})">Save</button>
    </div>`);
}

async function saveDept(id) {
  const body = {
    name: document.getElementById('mDeptName').value.trim(),
    head_id: document.getElementById('mDeptHead').value || null,
    parent_id: document.getElementById('mDeptParent').value || null,
    status: document.getElementById('mDeptStatus').value
  };
  if (!body.name) return toast('Name is required', true);
  try {
    if (id) await api(`/departments/${id}`, 'PUT', body);
    else await api('/departments', 'POST', body);
    closeModal(); toast('Department saved'); loadDepartments(); loadLookups();
  } catch (e) { toast(e.message, true); }
}

async function loadCategories() {
  CATEGORIES = await api('/categories');
  document.getElementById('catTable').innerHTML = CATEGORIES.map(c => `
    <tr><td>${escapeHtml(c.name)}</td><td>${(JSON.parse(c.extra_fields || '[]')).join(', ') || '—'}</td>
    <td><button class="btn btn-secondary btn-sm" onclick='openCatModal(${c.id})'>Edit</button></td></tr>`).join('')
    || '<tr><td class="empty-row" colspan="3">No categories yet</td></tr>';
}

function openCatModal(id) {
  const c = id ? CATEGORIES.find(x => x.id === id) : null;
  showModal(`
    <h3>${c ? 'Edit Category' : 'New Category'}</h3>
    <div class="f-field"><label>Name</label><input id="mCatName" value="${c ? escapeHtml(c.name) : ''}"></div>
    <div class="f-field"><label>Extra Fields (comma-separated, optional)</label><input id="mCatFields" value="${c ? (JSON.parse(c.extra_fields||'[]')).join(', ') : ''}" placeholder="e.g. Warranty Period"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveCat(${id || 'null'})">Save</button>
    </div>`);
}

async function saveCat(id) {
  const name = document.getElementById('mCatName').value.trim();
  const fields = document.getElementById('mCatFields').value.split(',').map(s => s.trim()).filter(Boolean);
  if (!name) return toast('Name is required', true);
  try {
    if (id) await api(`/categories/${id}`, 'PUT', { name, extra_fields: fields });
    else await api('/categories', 'POST', { name, extra_fields: fields });
    closeModal(); toast('Category saved'); loadCategories(); loadLookups();
  } catch (e) { toast(e.message, true); }
}

async function loadEmployees() {
  EMPLOYEES = await api('/employees');
  const isAdmin = user.role === 'Admin';
  document.getElementById('empTable').innerHTML = EMPLOYEES.map(e => `
    <tr>
      <td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.email)}</td><td>${escapeHtml(e.department_name || '—')}</td>
      <td>${badge(e.role)}</td><td>${badge(e.status)}</td>
      <td>${isAdmin ? `
        <select onchange="promoteEmployee(${e.id}, this.value)" style="padding:5px 8px;border-radius:6px;border:1px solid var(--paper-200);font-size:12px;">
          <option value="">Change role…</option>
          <option value="Employee" ${e.role==='Employee'?'selected':''}>Employee</option>
          <option value="Department Head" ${e.role==='Department Head'?'selected':''}>Department Head</option>
          <option value="Asset Manager" ${e.role==='Asset Manager'?'selected':''}>Asset Manager</option>
        </select>` : '—'}</td>
    </tr>`).join('');
}

async function promoteEmployee(id, role) {
  if (!role) return;
  try {
    await api(`/employees/${id}/promote`, 'POST', { role });
    toast('Role updated'); loadEmployees(); loadLookups();
  } catch (e) { toast(e.message, true); }
}

/* ==================== ASSETS ==================== */
async function loadAssets() {
  const q = document.getElementById('assetSearch').value.trim();
  const status = document.getElementById('assetStatusFilter').value;
  const category_id = document.getElementById('assetCatFilter').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (category_id) params.set('category_id', category_id);
  const assets = await api('/assets?' + params.toString());
  document.getElementById('assetTable').innerHTML = assets.length ? assets.map(a => `
    <tr>
      <td class="mono">${a.tag}</td><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.category_name || '—')}</td>
      <td>${badge(a.status)}</td><td>${escapeHtml(a.location || '—')}</td><td>${escapeHtml(a.holder_name || '—')}</td>
      <td>${a.bookable ? '✓' : '—'}</td>
      <td><button class="btn btn-secondary btn-sm" onclick='viewAsset(${a.id})'>View</button></td>
    </tr>`).join('') : '<tr><td class="empty-row" colspan="8">No matching assets</td></tr>';
}
document.getElementById('assetSearch').addEventListener('input', debounce(loadAssets, 350));
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function openRegisterModal() {
  const catOptions = CATEGORIES.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const deptOptions = DEPARTMENTS.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  showModal(`
    <h3>Register Asset</h3>
    <div class="form-grid">
      <div class="f-field"><label>Name</label><input id="rName"></div>
      <div class="f-field"><label>Category</label><select id="rCat"><option value="">—</option>${catOptions}</select></div>
      <div class="f-field"><label>Serial Number</label><input id="rSerial"></div>
      <div class="f-field"><label>Acquisition Date</label><input type="date" id="rDate"></div>
      <div class="f-field"><label>Acquisition Cost</label><input type="number" id="rCost" placeholder="For reports only"></div>
      <div class="f-field"><label>Condition</label><select id="rCondition"><option>Good</option><option>Fair</option><option>Poor</option></select></div>
      <div class="f-field"><label>Location</label><input id="rLocation"></div>
      <div class="f-field"><label>Department</label><select id="rDept"><option value="">—</option>${deptOptions}</select></div>
    </div>
    <div class="f-field" style="margin-top:10px;"><label><input type="checkbox" id="rBookable" style="width:auto;"> Shared / bookable resource</label></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAsset()">Register</button>
    </div>`);
}

async function saveAsset() {
  const body = {
    name: document.getElementById('rName').value.trim(),
    category_id: document.getElementById('rCat').value || null,
    serial_number: document.getElementById('rSerial').value.trim(),
    acquisition_date: document.getElementById('rDate').value || null,
    acquisition_cost: parseFloat(document.getElementById('rCost').value) || null,
    condition: document.getElementById('rCondition').value,
    location: document.getElementById('rLocation').value.trim(),
    department_id: document.getElementById('rDept').value || null,
    bookable: document.getElementById('rBookable').checked
  };
  if (!body.name) return toast('Asset name is required', true);
  try {
    const r = await api('/assets', 'POST', body);
    closeModal(); toast(`Asset registered as ${r.tag}`);
    if (document.getElementById('screen-assets').classList.contains('active')) loadAssets();
  } catch (e) { toast(e.message, true); }
}

async function viewAsset(id) {
  const a = await api(`/assets/${id}`);
  showModal(`
    <h3>${a.tag} — ${escapeHtml(a.name)}</h3>
    <p style="margin-top:-8px;color:var(--grey-500);font-size:13px;">
      ${badge(a.status)} &nbsp; Category: ${escapeHtml(a.category_name || '—')} &nbsp; Location: ${escapeHtml(a.location || '—')}<br>
      Serial: <span class="mono">${escapeHtml(a.serial_number || '—')}</span> &nbsp; Condition: ${escapeHtml(a.condition)} &nbsp; Holder: ${escapeHtml(a.holder_name || '—')}
    </p>
    <h4 style="margin-bottom:6px;">Allocation History</h4>
    <div class="table-wrap"><table><thead><tr><th>Employee</th><th>Allocated</th><th>Returned</th><th>Status</th></tr></thead><tbody>
      ${a.allocation_history.length ? a.allocation_history.map(h => `<tr><td>${escapeHtml(h.employee_name || '—')}</td><td>${fmtDate(h.allocated_date)}</td><td>${fmtDate(h.returned_date)}</td><td>${badge(h.status)}</td></tr>`).join('') : '<tr><td class="empty-row" colspan="4">No allocations yet</td></tr>'}
    </tbody></table></div>
    <h4 style="margin:14px 0 6px;">Maintenance History</h4>
    <div class="table-wrap"><table><thead><tr><th>Issue</th><th>Priority</th><th>Status</th></tr></thead><tbody>
      ${a.maintenance_history.length ? a.maintenance_history.map(h => `<tr><td>${escapeHtml(h.issue)}</td><td>${escapeHtml(h.priority)}</td><td>${badge(h.status)}</td></tr>`).join('') : '<tr><td class="empty-row" colspan="3">No maintenance yet</td></tr>'}
    </tbody></table></div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
  `);
}

/* ==================== ALLOCATIONS & TRANSFERS ==================== */
async function loadAllocations() {
  const allocs = await api('/allocations');
  document.getElementById('allocTable').innerHTML = allocs.length ? allocs.map(a => `
    <tr>
      <td class="mono">${a.tag}</td><td>${escapeHtml(a.asset_name)}</td><td>${escapeHtml(a.employee_name || a.department_name || '—')}</td>
      <td>${fmtDate(a.allocated_date)}</td><td>${fmtDate(a.expected_return_date)}</td><td>${badge(a.status)}</td>
      <td>${a.status === 'Active' ? `<button class="btn btn-secondary btn-sm" onclick='returnAsset(${a.id})'>Mark Returned</button> <button class="btn btn-ghost btn-sm" onclick='openTransferModal(${a.asset_id})'>Transfer</button>` : ''}</td>
    </tr>`).join('') : '<tr><td class="empty-row" colspan="7">No allocations yet</td></tr>';
}

function openAllocateModal() {
  const availAssets = []; // will populate async
  api('/assets?status=Available').then(assets => {
    const empOptions = EMPLOYEES.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
    const assetOptions = assets.map(a => `<option value="${a.id}">${a.tag} — ${escapeHtml(a.name)}</option>`).join('');
    showModal(`
      <h3>Allocate Asset</h3>
      <div class="f-field"><label>Asset</label><select id="alAsset">${assetOptions || '<option>No available assets</option>'}</select></div>
      <div class="f-field"><label>Employee</label><select id="alEmp">${empOptions}</select></div>
      <div class="f-field"><label>Expected Return Date (optional)</label><input type="date" id="alReturn"></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAllocate()">Allocate</button></div>
    `);
  });
}

async function doAllocate() {
  const body = {
    asset_id: document.getElementById('alAsset').value,
    employee_id: document.getElementById('alEmp').value,
    expected_return_date: document.getElementById('alReturn').value || null
  };
  try {
    await api('/allocations', 'POST', body);
    closeModal(); toast('Asset allocated'); loadAllocations();
  } catch (e) {
    if (e.message.includes('currently held')) {
      closeModal();
      showModal(`<h3>Allocation Blocked</h3><p>${escapeHtml(e.message)}</p>
        <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">OK</button>
        <button class="btn btn-primary" onclick='closeModal(); openTransferModal(${body.asset_id})'>Request Transfer</button></div>`);
    } else toast(e.message, true);
  }
}

async function returnAsset(allocId) {
  const notes = prompt('Condition check-in notes (optional):') || '';
  try {
    await api(`/allocations/${allocId}/return`, 'POST', { condition_notes: notes });
    toast('Asset marked as returned'); loadAllocations(); loadAssets();
  } catch (e) { toast(e.message, true); }
}

function openTransferModal(assetId) {
  const empOptions = EMPLOYEES.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  showModal(`
    <h3>Request Transfer</h3>
    <div class="f-field"><label>Transfer to Employee</label><select id="trTo">${empOptions}</select></div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick='submitTransfer(${assetId})'>Submit Request</button></div>
  `);
}

async function submitTransfer(assetId) {
  try {
    await api('/transfers', 'POST', { asset_id: assetId, to_holder_id: document.getElementById('trTo').value });
    closeModal(); toast('Transfer request submitted'); loadTransfers();
  } catch (e) { toast(e.message, true); }
}

async function loadTransfers() {
  const transfers = await api('/transfers');
  const canDecide = ['Admin', 'Asset Manager', 'Department Head'].includes(user.role);
  document.getElementById('transferTable').innerHTML = transfers.length ? transfers.map(t => `
    <tr>
      <td class="mono">${t.tag}</td><td>${escapeHtml(t.asset_name)}</td><td>${escapeHtml(t.from_name || '—')}</td><td>${escapeHtml(t.to_name || '—')}</td>
      <td>${badge(t.status)}</td><td>${fmtDateTime(t.requested_at)}</td>
      <td>${(canDecide && t.status === 'Requested') ? `<button class="btn btn-secondary btn-sm" onclick='transferDecision(${t.id},"Approved")'>Approve</button> <button class="btn btn-danger btn-sm" onclick='transferDecision(${t.id},"Rejected")'>Reject</button>` : ''}</td>
    </tr>`).join('') : '<tr><td class="empty-row" colspan="7">No transfer requests</td></tr>';
}

async function transferDecision(id, decision) {
  try {
    await api(`/transfers/${id}/decision`, 'POST', { decision });
    toast('Transfer ' + decision.toLowerCase()); loadTransfers(); loadAllocations(); loadAssets();
  } catch (e) { toast(e.message, true); }
}

/* ==================== BOOKINGS ==================== */
async function loadBookings() {
  const bookableAssets = await api('/assets');
  const bookable = bookableAssets.filter(a => a.bookable);
  const filterSel = document.getElementById('bookingAssetFilter');
  filterSel.innerHTML = '<option value="">All bookable resources</option>' + bookable.map(a => `<option value="${a.id}">${a.tag} — ${escapeHtml(a.name)}</option>`).join('');

  const asset_id = filterSel.value;
  const bookings = await api('/bookings' + (asset_id ? `?asset_id=${asset_id}` : ''));
  document.getElementById('bookingTable').innerHTML = bookings.length ? bookings.map(b => `
    <tr>
      <td class="mono">${b.tag}</td><td>${escapeHtml(b.booked_by_name)}</td><td>${fmtDateTime(b.start_time)}</td><td>${fmtDateTime(b.end_time)}</td>
      <td>${escapeHtml(b.purpose || '—')}</td><td>${badge(b.status)}</td>
      <td>${b.status === 'Upcoming' ? `<button class="btn btn-danger btn-sm" onclick='cancelBooking(${b.id})'>Cancel</button>` : ''}</td>
    </tr>`).join('') : '<tr><td class="empty-row" colspan="7">No bookings yet</td></tr>';
}
document.getElementById('bookingAssetFilter').addEventListener('change', loadBookings);

function openBookingModal() {
  api('/assets').then(assets => {
    const bookable = assets.filter(a => a.bookable);
    const options = bookable.map(a => `<option value="${a.id}">${a.tag} — ${escapeHtml(a.name)}</option>`).join('');
    showModal(`
      <h3>Book a Resource</h3>
      <div class="f-field"><label>Resource</label><select id="bkAsset">${options || '<option>No bookable resources</option>'}</select></div>
      <div class="form-grid">
        <div class="f-field"><label>Start</label><input type="datetime-local" id="bkStart"></div>
        <div class="f-field"><label>End</label><input type="datetime-local" id="bkEnd"></div>
      </div>
      <div class="f-field"><label>Purpose</label><input id="bkPurpose" placeholder="e.g. Team standup"></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doBooking()">Book</button></div>
    `);
  });
}

async function doBooking() {
  const start = document.getElementById('bkStart').value.replace('T', ' ') + ':00';
  const end = document.getElementById('bkEnd').value.replace('T', ' ') + ':00';
  try {
    await api('/bookings', 'POST', { asset_id: document.getElementById('bkAsset').value, start_time: start, end_time: end, purpose: document.getElementById('bkPurpose').value.trim() });
    closeModal(); toast('Booking confirmed'); loadBookings();
  } catch (e) { toast(e.message, true); }
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking?')) return;
  try { await api(`/bookings/${id}/cancel`, 'POST'); toast('Booking cancelled'); loadBookings(); }
  catch (e) { toast(e.message, true); }
}

/* ==================== MAINTENANCE ==================== */
async function loadMaintenance() {
  const reqs = await api('/maintenance');
  const canManage = ['Admin', 'Asset Manager'].includes(user.role);
  document.getElementById('maintTable').innerHTML = reqs.length ? reqs.map(m => `
    <tr>
      <td class="mono">${m.tag}</td><td>${escapeHtml(m.asset_name)}</td><td>${escapeHtml(m.issue)}</td><td>${escapeHtml(m.priority)}</td>
      <td>${escapeHtml(m.raised_by_name)}</td><td>${badge(m.status)}</td>
      <td>${maintActions(m, canManage)}</td>
    </tr>`).join('') : '<tr><td class="empty-row" colspan="7">No maintenance requests</td></tr>';
}

function maintActions(m, canManage) {
  if (!canManage) return '';
  if (m.status === 'Pending') return `<button class="btn btn-secondary btn-sm" onclick='maintDecision(${m.id},"Approved")'>Approve</button> <button class="btn btn-danger btn-sm" onclick='maintDecision(${m.id},"Rejected")'>Reject</button>`;
  if (m.status === 'Approved') return `<button class="btn btn-secondary btn-sm" onclick='assignTech(${m.id})'>Assign Technician</button>`;
  if (m.status === 'Technician Assigned') return `<button class="btn btn-secondary btn-sm" onclick='maintProgress(${m.id})'>Start Work</button>`;
  if (m.status === 'In Progress') return `<button class="btn btn-primary btn-sm" onclick='maintResolve(${m.id})'>Mark Resolved</button>`;
  return '';
}

function openMaintModal() {
  api('/assets').then(assets => {
    const options = assets.map(a => `<option value="${a.id}">${a.tag} — ${escapeHtml(a.name)}</option>`).join('');
    showModal(`
      <h3>Raise Maintenance Request</h3>
      <div class="f-field"><label>Asset</label><select id="mtAsset">${options}</select></div>
      <div class="f-field"><label>Issue Description</label><textarea id="mtIssue" rows="3"></textarea></div>
      <div class="f-field"><label>Priority</label><select id="mtPriority"><option>Low</option><option selected>Medium</option><option>High</option></select></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitMaint()">Submit Request</button></div>
    `);
  });
}

async function submitMaint() {
  const issue = document.getElementById('mtIssue').value.trim();
  if (!issue) return toast('Please describe the issue', true);
  try {
    await api('/maintenance', 'POST', { asset_id: document.getElementById('mtAsset').value, issue, priority: document.getElementById('mtPriority').value });
    closeModal(); toast('Maintenance request submitted');
    if (document.getElementById('screen-maintenance').classList.contains('active')) loadMaintenance();
  } catch (e) { toast(e.message, true); }
}

async function maintDecision(id, decision) {
  try { await api(`/maintenance/${id}/decision`, 'POST', { decision }); toast('Request ' + decision.toLowerCase()); loadMaintenance(); loadAssets(); }
  catch (e) { toast(e.message, true); }
}
async function assignTech(id) {
  const tech = prompt('Technician name:');
  if (!tech) return;
  try { await api(`/maintenance/${id}/assign-technician`, 'POST', { technician: tech }); toast('Technician assigned'); loadMaintenance(); }
  catch (e) { toast(e.message, true); }
}
async function maintProgress(id) {
  try { await api(`/maintenance/${id}/progress`, 'POST'); toast('Marked In Progress'); loadMaintenance(); }
  catch (e) { toast(e.message, true); }
}
async function maintResolve(id) {
  try { await api(`/maintenance/${id}/resolve`, 'POST'); toast('Maintenance resolved — asset available again'); loadMaintenance(); loadAssets(); }
  catch (e) { toast(e.message, true); }
}

/* ==================== AUDITS ==================== */
async function loadAudits() {
  const cycles = await api('/audits');
  const isAdmin = user.role === 'Admin';
  document.getElementById('auditCycles').innerHTML = cycles.length ? cycles.map(c => {
    const discrepancies = c.items.filter(i => i.result === 'Missing' || i.result === 'Damaged');
    return `
    <div class="card">
      <div class="card-head">
        <h3>${escapeHtml(c.name)} ${badge(c.status)}</h3>
        <div style="font-size:12px;color:var(--grey-500);">${fmtDate(c.start_date)} → ${fmtDate(c.end_date)} ${c.location ? '· ' + escapeHtml(c.location) : ''}</div>
      </div>
      <p style="font-size:12.5px;color:var(--grey-500);margin-top:-8px;">Auditors: ${c.auditors.map(a => escapeHtml(a.name)).join(', ') || '—'}</p>
      <div class="table-wrap"><table><thead><tr><th>Tag</th><th>Asset</th><th>Result</th><th>Notes</th>${c.status==='Open' ? '<th></th>' : ''}</tr></thead><tbody>
        ${c.items.map(it => `
          <tr>
            <td class="mono">${it.tag}</td><td>${escapeHtml(it.asset_name)}</td><td>${badge(it.result)}</td><td>${escapeHtml(it.notes || '—')}</td>
            ${c.status === 'Open' ? `<td>
              <select onchange='markAuditItem(${it.id}, this.value)' style="padding:5px 8px;border-radius:6px;border:1px solid var(--paper-200);font-size:12px;">
                <option value="">Mark…</option>
                <option value="Verified" ${it.result==='Verified'?'selected':''}>Verified</option>
                <option value="Missing" ${it.result==='Missing'?'selected':''}>Missing</option>
                <option value="Damaged" ${it.result==='Damaged'?'selected':''}>Damaged</option>
              </select></td>` : ''}
          </tr>`).join('')}
      </tbody></table></div>
      ${discrepancies.length ? `<div class="hint-banner">⚠ ${discrepancies.length} discrepancy report item(s) flagged</div>` : ''}
      ${c.status === 'Open' && isAdmin ? `<div class="modal-actions" style="margin-top:12px;"><button class="btn btn-danger btn-sm" onclick='closeAudit(${c.id})'>Close Audit Cycle</button></div>` : ''}
    </div>`;
  }).join('') : '<div class="card">No audit cycles yet.</div>';
}

function openAuditModal() {
  const deptOptions = DEPARTMENTS.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  const empOptions = EMPLOYEES.map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${e.role})</option>`).join('');
  showModal(`
    <h3>New Audit Cycle</h3>
    <div class="f-field"><label>Cycle Name</label><input id="adName" placeholder="e.g. Q3 IT Asset Audit"></div>
    <div class="form-grid">
      <div class="f-field"><label>Scope Department (optional)</label><select id="adDept"><option value="">All</option>${deptOptions}</select></div>
      <div class="f-field"><label>Location filter (optional)</label><input id="adLocation" placeholder="e.g. Floor 2"></div>
      <div class="f-field"><label>Start Date</label><input type="date" id="adStart"></div>
      <div class="f-field"><label>End Date</label><input type="date" id="adEnd"></div>
    </div>
    <div class="f-field"><label>Assign Auditors</label>
      <select id="adAuditors" multiple size="4">${empOptions}</select>
      <div style="font-size:11px;color:var(--grey-500);margin-top:4px;">Ctrl/Cmd-click to select multiple</div>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveAudit()">Create Cycle</button></div>
  `);
}

async function saveAudit() {
  const auditor_ids = Array.from(document.getElementById('adAuditors').selectedOptions).map(o => o.value);
  const body = {
    name: document.getElementById('adName').value.trim(),
    scope_department_id: document.getElementById('adDept').value || null,
    location: document.getElementById('adLocation').value.trim() || null,
    start_date: document.getElementById('adStart').value,
    end_date: document.getElementById('adEnd').value,
    auditor_ids
  };
  if (!body.name || !body.start_date || !body.end_date) return toast('Name, start and end dates are required', true);
  try { await api('/audits', 'POST', body); closeModal(); toast('Audit cycle created'); loadAudits(); }
  catch (e) { toast(e.message, true); }
}

async function markAuditItem(itemId, result) {
  if (!result) return;
  try { await api(`/audits/items/${itemId}/mark`, 'POST', { result }); toast('Item marked ' + result); loadAudits(); }
  catch (e) { toast(e.message, true); }
}

async function closeAudit(id) {
  if (!confirm('Closing locks this audit cycle and updates asset statuses for confirmed discrepancies. Continue?')) return;
  try {
    const r = await api(`/audits/${id}/close`, 'POST');
    toast(`Audit closed — ${r.discrepancy_count} discrepancy item(s) processed`);
    loadAudits(); loadAssets();
  } catch (e) { toast(e.message, true); }
}

/* ==================== REPORTS ==================== */
function simpleBarList(rows, labelKey, valKey) {
  const max = Math.max(1, ...rows.map(r => r[valKey] || 0));
  return `<div>${rows.map(r => `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px;"><span>${escapeHtml(r[labelKey] ?? '—')}</span><b>${r[valKey] || 0}</b></div>
      <div style="background:var(--paper-200);border-radius:4px;height:8px;overflow:hidden;"><div style="width:${((r[valKey]||0)/max)*100}%;background:var(--tag-amber);height:100%;"></div></div>
    </div>`).join('')}</div>`;
}

async function loadReports() {
  const r = await api('/reports/summary');
  document.getElementById('rpt-status').innerHTML = simpleBarList(r.byStatus, 'status', 'c');
  document.getElementById('rpt-category').innerHTML = simpleBarList(r.byCategory, 'name', 'c_count');
  document.getElementById('rpt-maint').innerHTML = simpleBarList(r.maintenanceByCategory, 'name', 'm_count');
  document.getElementById('rpt-dept').innerHTML = simpleBarList(r.departmentAllocation, 'name', 'alloc_count');
  document.getElementById('rpt-retire').innerHTML = r.nearingRetirement.length ? `<div class="table-wrap"><table><thead><tr><th>Tag</th><th>Name</th><th>Acquired</th></tr></thead><tbody>${r.nearingRetirement.map(a => `<tr><td class="mono">${a.tag}</td><td>${escapeHtml(a.name)}</td><td>${fmtDate(a.acquisition_date)}</td></tr>`).join('')}</tbody></table></div>` : '<p style="color:var(--grey-500);font-size:13px;">No assets nearing retirement</p>';
  document.getElementById('rpt-heatmap').innerHTML = r.bookingHeatmap.length ? simpleBarList(r.bookingHeatmap, 'hour', 'c') : '<p style="color:var(--grey-500);font-size:13px;">No booking data yet</p>';
}

/* ==================== LOGS ==================== */
async function loadLogs() {
  const logs = await api('/logs');
  document.getElementById('logsTable').innerHTML = logs.length ? logs.map(l => `
    <tr><td>${fmtDateTime(l.created_at)}</td><td>${escapeHtml(l.user_name || 'System')}</td><td>${escapeHtml(l.action)}</td><td>${escapeHtml(l.details || '—')}</td></tr>
  `).join('') : '<tr><td class="empty-row" colspan="4">No activity yet</td></tr>';
}

initShell();
