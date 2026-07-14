const API = 'http://localhost:3000/api';

// ── Tab Navigation ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const tab = item.dataset.tab;
    switchTab(tab);
  });
});

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById('page-title').textContent =
    { dashboard: 'Dashboard', customers: 'Customers', add: 'Add Customer', upload: 'CSV Import', groups: 'Groupings' }[tab];

  if (tab === 'dashboard') loadDashboard();
  if (tab === 'customers') loadCustomers();
  if (tab === 'groups') loadGroups('crop');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => t.className = 'toast', 3000);
}

// ── API helpers ───────────────────────────────────────────────────────────────
const CONFIG = { token: 'agron_secure_token_2024' };

async function apiFetch(path, opts = {}) {
  const headers = {
    Authorization: `Bearer ${CONFIG.token}`,
    ...(opts.headers || {}),
  };
  const res = await fetch(API + path, { ...opts, headers });
  return res.json();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const stats = await apiFetch('/customers/stats');
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-crops').textContent = stats.uniqueCrops;
  document.getElementById('stat-locations').textContent = stats.uniqueLocations;
  document.getElementById('stat-seasons').textContent = stats.uniqueSeasons;

  const grouped = await apiFetch('/customers/grouped');
  renderBarChart('chart-crop', grouped.groups.byCrop);
  renderBarChart('chart-season', grouped.groups.bySeason);
  renderBarChart('chart-location', grouped.groups.byLocation);
  renderBarChart('chart-area', grouped.groups.byArea);
}

function renderBarChart(containerId, groupObj) {
  const container = document.getElementById(containerId);
  if (!groupObj || !Object.keys(groupObj).length) {
    container.innerHTML = '<div class="empty-chart">No data yet</div>';
    return;
  }
  const entries = Object.entries(groupObj).sort((a, b) => b[1].length - a[1].length);
  const max = entries[0][1].length;
  container.innerHTML = entries.map(([key, arr]) => `
    <div class="bar-row">
      <div class="bar-label">
        <span>${key}</span>
        <span>${arr.length}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.round((arr.length / max) * 100)}%"></div>
      </div>
    </div>
  `).join('');
}

// ── Customer Table ────────────────────────────────────────────────────────────
async function loadCustomers() {
  const res = await apiFetch('/customers');
  renderCustomerTable(res.data);
}

function renderCustomerTable(customers) {
  const tbody = document.getElementById('customer-tbody');
  const empty = document.getElementById('empty-customers');
  const countEl = document.getElementById('customer-count');
  countEl.textContent = `${customers.length} customer${customers.length !== 1 ? 's' : ''}`;

  if (!customers.length) {
    tbody.innerHTML = '';
    empty.classList.add('show');
    return;
  }
  empty.classList.remove('show');
  tbody.innerHTML = customers.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.phone)}</td>
      <td><span class="badge badge-crop">${esc(c.cropType) || '—'}</span></td>
      <td>${c.area ? c.area + ' ac' : '—'}</td>
      <td><span class="badge badge-season">${esc(c.season) || '—'}</span></td>
      <td>${esc(c.location) || '—'}</td>
      <td>
        <button class="btn-icon" onclick="deleteCustomer('${c.id}')" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  const res = await apiFetch(`/customers/${id}`, { method: 'DELETE' });
  if (res.success) { showToast('Customer deleted'); loadCustomers(); loadDashboard(); }
  else showToast(res.message, true);
}

// ── Add Customer Form ─────────────────────────────────────────────────────────
document.getElementById('add-customer-btn').addEventListener('click', async () => {
  const body = {
    name: val('f-name'), phone: val('f-phone'), cropType: val('f-crop'),
    area: val('f-area'), season: val('f-season'), location: val('f-location')
  };
  if (!body.name || !body.phone) {
    setFormMsg('form-msg', 'Name and phone are required.', true);
    return;
  }
  const res = await apiFetch('/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res.success) {
    setFormMsg('form-msg', `✓ ${res.data.name} added successfully!`, false);
    resetForm();
    showToast('Customer added!');
  } else {
    setFormMsg('form-msg', res.message, true);
  }
});

document.getElementById('reset-form-btn').addEventListener('click', resetForm);

function resetForm() {
  ['f-name','f-phone','f-crop','f-area','f-location'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-season').value = '';
  setFormMsg('form-msg', '', false);
}

// ── CSV Upload ────────────────────────────────────────────────────────────────
let selectedFile = null;

const csvInput = document.getElementById('csv-input');
const dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});
csvInput.addEventListener('change', e => { if (e.target.files[0]) setFile(e.target.files[0]); });

function setFile(file) {
  selectedFile = file;
  document.getElementById('selected-file-name').textContent = `📄 ${file.name}`;
  document.getElementById('upload-btn').disabled = false;
}

document.getElementById('upload-btn').addEventListener('click', async () => {
  if (!selectedFile) return;
  const fd = new FormData();
  fd.append('file', selectedFile);
  setFormMsg('upload-msg', 'Uploading...', false);
  const res = await fetch(API + '/customers/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CONFIG.token}` },
    body: fd
  }).then(r => r.json());
  if (res.success) {
    setFormMsg('upload-msg', `✓ ${res.message}${res.errors?.length ? ` (${res.errors.length} rows skipped)` : ''}`, false);
    showToast(`${res.imported} customers imported`);
    selectedFile = null;
    document.getElementById('selected-file-name').textContent = '';
    document.getElementById('upload-btn').disabled = true;
    csvInput.value = '';
  } else {
    setFormMsg('upload-msg', res.message, true);
  }
});

// Sample CSV download
document.getElementById('download-sample').addEventListener('click', e => {
  e.preventDefault();
  const csv = `name,phone,cropType,area,season,location\nAli Hassan,0300-1234567,Wheat,15,Rabi,Lahore\nTariq Khan,0321-9876543,Cotton,30,Kharif,Multan\nFatima Bibi,0333-5551234,Rice,8,Kharif,Gujranwala\nAhmed Raza,0345-7890123,Maize,22,Zaid,Faisalabad`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'sample_customers.csv'; a.click();
  URL.revokeObjectURL(url);
});

// ── Groupings Tab ─────────────────────────────────────────────────────────────
document.querySelectorAll('.group-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.group-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadGroups(btn.dataset.group);
  });
});

async function loadGroups(by) {
  const res = await apiFetch(`/customers/grouped?by=${by}`);
  const container = document.getElementById('group-content');
  const groups = res.groups;

  if (!groups || !Object.keys(groups).length) {
    container.innerHTML = '<div style="color:var(--text-dim);padding:40px;text-align:center">No customers to group yet.</div>';
    return;
  }

  const iconMap = { crop: 'fa-wheat-awn', season: 'fa-sun', location: 'fa-location-dot', area: 'fa-expand' };
  const icon = iconMap[by] || 'fa-layer-group';

  container.innerHTML = `<div class="group-grid">` +
    Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([key, customers]) => `
      <div class="group-card">
        <div class="group-card-header">
          <span class="group-card-title"><i class="fa-solid ${icon}"></i> ${esc(key)}</span>
          <span class="group-count">${customers.length} farmer${customers.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="group-card-body">
          ${customers.slice(0, 6).map(c => `
            <div class="group-row">
              <div>
                <div class="name">${esc(c.name)}</div>
                <div class="phone">${esc(c.phone)}</div>
              </div>
              <div>${esc(c.cropType) || '—'}</div>
              <div>${c.area ? c.area + ' ac' : '—'}</div>
              <div>${esc(c.location) || '—'}</div>
            </div>
          `).join('')}
          ${customers.length > 6 ? `<div style="padding:10px 18px;font-size:0.78rem;color:var(--text-dim)">+${customers.length - 6} more</div>` : ''}
        </div>
      </div>
    `).join('') + `</div>`;
}

// ── Global Search ─────────────────────────────────────────────────────────────
let searchTimer;
document.getElementById('global-search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  if (!q) { document.getElementById('search-overlay').classList.add('hidden'); return; }
  searchTimer = setTimeout(() => runSearch(q), 350);
});

async function runSearch(q) {
  const res = await apiFetch(`/customers/search?q=${encodeURIComponent(q)}`);
  const overlay = document.getElementById('search-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('search-results-title').textContent = `${res.count} result${res.count !== 1 ? 's' : ''} for "${q}"`;
  const body = document.getElementById('search-results-body');
  if (!res.data?.length) {
    body.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-dim)">No matches found.</div>';
    return;
  }
  body.innerHTML = res.data.map(c => `
    <div class="group-row" style="grid-template-columns:2fr 1.5fr 1fr 1fr;">
      <div>
        <div class="name">${esc(c.name)}</div>
        <div class="phone">${esc(c.phone)}</div>
      </div>
      <div><span class="badge badge-crop">${esc(c.cropType) || '—'}</span></div>
      <div><span class="badge badge-season">${esc(c.season) || '—'}</span></div>
      <div>${esc(c.location) || '—'}</div>
    </div>
  `).join('');
}

document.getElementById('close-search').addEventListener('click', () => {
  document.getElementById('search-overlay').classList.add('hidden');
  document.getElementById('global-search').value = '';
});

// Clear all
document.getElementById('clear-all-btn').addEventListener('click', async () => {
  if (!confirm('Delete ALL customers? This cannot be undone.')) return;
  const res = await apiFetch('/customers', { method: 'DELETE' });
  if (res.success) { showToast('All customers cleared'); loadCustomers(); loadDashboard(); }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function val(id) { return document.getElementById(id)?.value?.trim() || ''; }
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function setFormMsg(id, msg, isError) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'form-msg ' + (isError ? 'error' : msg ? 'success' : '');
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadDashboard();
