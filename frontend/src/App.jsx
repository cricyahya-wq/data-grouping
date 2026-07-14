import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchAPI, API_BASE } from './api';
import './index.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const API_URL = `${API_BASE}/api`;
const PAGE_SIZE = 10;

// ── Colour helpers ────────────────────────────────────────────────
const CROP_COLOURS = {
  wheat:      { cls: 'crop-wheat',     chart: '#F59E0B' },
  rice:       { cls: 'crop-rice',      chart: '#22C55E' },
  cotton:     { cls: 'crop-cotton',    chart: '#3B82F6' },
  maize:      { cls: 'crop-maize',     chart: '#F97316' },
  sugarcane:  { cls: 'crop-sugarcane', chart: '#EC4899' },
};
const SEASON_COLOURS = {
  summer:  { cls: 'season-summer', chart: '#F59E0B' },
  winter:  { cls: 'season-winter', chart: '#3B82F6' },
  autumn:  { cls: 'season-autumn', chart: '#EA580C' },
  spring:  { cls: 'season-spring', chart: '#22C55E' },
  kharif:  { cls: 'season-kharif', chart: '#10B981' },
  rabi:    { cls: 'season-rabi',   chart: '#6366F1' },
  zaid:    { cls: 'season-zaid',   chart: '#EF4444' },
};
const CHART_PALETTE = [
  '#16A34A','#3B82F6','#F59E0B','#EC4899','#8B5CF6',
  '#06B6D4','#F97316','#6366F1','#10B981','#EAB308',
  '#84CC16','#EF4444',
];

const CROP_OPTIONS     = ['Wheat','Rice','Cotton','Maize','Sugarcane','Barley','Sorghum','Sunflower','Other'];
const SEASON_OPTIONS   = ['Summer','Winter','Autumn','Spring','Kharif','Rabi','Zaid'];
const LOCATION_OPTIONS = [
  'Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Multan',
  'Gujranwala','Peshawar','Quetta','Sialkot','Hyderabad','Bahawalpur',
  'Sahiwal','Sargodha','Sheikhupura','Other'
];

const EMPTY_FORM = {
  customer_details: '', phone_number: '', crop_type: '',
  area_of_crop: '', season: 'Summer', location: ''
};

function getCropClass(crop) {
  return CROP_COLOURS[(crop || '').toLowerCase()]?.cls || 'crop-default';
}
function getSeasonClass(season) {
  return SEASON_COLOURS[(season || '').toLowerCase()]?.cls || 'season-default';
}
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

// ── Chart data builders ───────────────────────────────────────────
function buildDoughnutData(grouped, field) {
  const labels = grouped.map(d => d[field]);
  const vals   = grouped.map(d => d.count);
  const bgs    = labels.map((l, i) => {
    const key = l.toLowerCase();
    return CROP_COLOURS[key]?.chart || SEASON_COLOURS[key]?.chart || CHART_PALETTE[i % CHART_PALETTE.length];
  });
  return { labels, datasets: [{ data: vals, backgroundColor: bgs, borderWidth: 2, borderColor: '#fff' }] };
}
function buildBarData(grouped, field, theme) {
  const labels = grouped.map(d => d[field]);
  const vals   = grouped.map(d => d.count);
  const bgs    = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);
  return { labels, datasets: [{ data: vals, backgroundColor: bgs, borderRadius: 5, borderSkipped: false }] };
}

const chartTickStyle = (theme) => ({
  color: theme === 'dark' ? '#94A3B8' : '#64748B',
  font: { family: 'Inter', size: 11 },
});

// ═════════════════════════════════════════════════════════════════
// TOAST
// ═════════════════════════════════════════════════════════════════
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === 'success' ? '' : t.type === 'error' ? '' : ''}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// CONFIRM DELETE MODAL
// ═════════════════════════════════════════════════════════════════
function ConfirmModal({ customer, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Confirm Delete</span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <div className="confirm-icon">Delete</div>
          <p className="confirm-msg">
            Are you sure you want to delete{' '}
            <span className="confirm-name">"{customer?.customer_details}"</span>?
            <br />This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// CUSTOMER DETAIL MODAL
// ═════════════════════════════════════════════════════════════════
function DetailModal({ customer, onClose, onEdit, onDelete }) {
  if (!customer) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"> Customer Details</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="detail-header">
            <div className="detail-avatar">{getInitials(customer.customer_details)}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-1)' }}>{customer.customer_details}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>ID #{customer.id}</div>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Phone Number</label>
              <div className="detail-value">{customer.phone_number}</div>
            </div>
            <div className="detail-item">
              <label>Crop Type</label>
              <div className="detail-value">
                <span className={`crop-badge ${getCropClass(customer.crop_type)}`}>{customer.crop_type}</span>
              </div>
            </div>
            <div className="detail-item">
              <label>Area of Crop</label>
              <div className="detail-value">{customer.area_of_crop}</div>
            </div>
            <div className="detail-item">
              <label>Season</label>
              <div className="detail-value">
                <span className={`season-badge ${getSeasonClass(customer.season)}`}>{customer.season}</span>
              </div>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <label>Location</label>
              <div className="detail-value">{customer.location}</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={() => { onClose(); onDelete(customer); }}>Delete Delete</button>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => { onClose(); onEdit(customer); }}>Edit</button>
        </div>
      </div>
    </div>
  );
}

//═════════════════════════════════════════════════════════════════
// QUICK-ADD FORM  (compact, lives on dashboard left panel)
// ═════════════════════════════════════════════════════════════════


// ═════════════════════════════════════════════════════════════════
// FORM MODAL (Add / Edit Customer)
// ═════════════════════════════════════════════════════════════════
function FormModal({ editCustomer, onClose, onSaved, uniqueCrops, uniqueLocations }) {
  const [form, setForm] = useState(editCustomer || { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const allCrops = [...new Set([...CROP_OPTIONS, ...(uniqueCrops || [])])];
  const allLocations = [...new Set([...LOCATION_OPTIONS, ...(uniqueLocations || [])])];

  const validate = () => {
    const e = {};
    if (!form.customer_details?.trim())  e.customer_details = 'Required';
    if (!form.phone_number?.trim())      e.phone_number = 'Required';
    else if (!/^\d{10,15}$/.test(form.phone_number.replace(/[\s\-+]/g, '')))
      e.phone_number = '10–15 digits';
    if (!form.crop_type)   e.crop_type   = 'Required';
    if (!form.area_of_crop?.trim()) e.area_of_crop = 'Required';
    if (!form.location)    e.location    = 'Required';
    return e;
  };

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: undefined }));
  };

  const handleSubmit = async ev => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const isEdit = !!editCustomer?.id;
      const url = isEdit ? `${API_URL}/customers/${editCustomer.id}` : `${API_URL}/customers`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetchAPI(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (res.ok) { onSaved(isEdit ? 'updated' : 'added'); onClose(); }
      else         setErrors({ _global: json.error });
    } catch {
      setErrors({ _global: 'Server error.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{editCustomer ? 'Edit Customer' : 'Add Customer'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <form id="customer-form" onSubmit={handleSubmit}>
            {errors._global && <div className="alert-error">{errors._global}</div>}

            <div className="mform-row">
              <div className="mform-field">
                <label className="mform-label">Customer Name</label>
                <input name="customer_details" value={form.customer_details} onChange={handleChange}
                  className={`mform-input ${errors.customer_details ? 'err' : ''}`} />
                {errors.customer_details && <div className="mform-error">{errors.customer_details}</div>}
              </div>
              <div className="mform-field">
                <label className="mform-label">Phone Number</label>
                <input name="phone_number" value={form.phone_number} onChange={handleChange}
                  className={`mform-input ${errors.phone_number ? 'err' : ''}`} />
                {errors.phone_number && <div className="mform-error">{errors.phone_number}</div>}
              </div>
            </div>

            <div className="mform-row">
              <div className="mform-field">
                <label className="mform-label">Crop Type</label>
                <select name="crop_type" value={form.crop_type} onChange={handleChange}
                  className={`mform-select ${errors.crop_type ? 'err' : ''}`}>
                  <option value="">Select…</option>
                  {allCrops.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.crop_type && <div className="mform-error">{errors.crop_type}</div>}
              </div>
              <div className="mform-field">
                <label className="mform-label">Area</label>
                <input name="area_of_crop" value={form.area_of_crop} onChange={handleChange}
                  className={`mform-input ${errors.area_of_crop ? 'err' : ''}`} />
                {errors.area_of_crop && <div className="mform-error">{errors.area_of_crop}</div>}
              </div>
            </div>

            <div className="mform-row">
              <div className="mform-field">
                <label className="mform-label">Season</label>
                <select name="season" value={form.season} onChange={handleChange} className="mform-select">
                  {SEASON_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="mform-field">
                <label className="mform-label">Location</label>
                <select name="location" value={form.location} onChange={handleChange}
                  className={`mform-select ${errors.location ? 'err' : ''}`}>
                  <option value="">Select…</option>
                  {allLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                {errors.location && <div className="mform-error">{errors.location}</div>}
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="customer-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════
export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('agron-theme') || 'light');
  const [tab,   setTab]   = useState('dashboard');

  const [customers, setCustomers] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [grouped,   setGrouped]   = useState({ crop_type: [], season: [], location: [] });
  const [loading,   setLoading]   = useState(false);

  // Customers tab filters
  const [search,       setSearch]       = useState('');
  const [filterCrop,   setFilterCrop]   = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterLoc,    setFilterLoc]    = useState('');
  const [sortBy,       setSortBy]       = useState('newest');
  const [page,         setPage]         = useState(1);

  // Reports tab
  const [activeGroup, setActiveGroup] = useState('crop_type');

  // Modals
  const [detailCust, setDetailCust] = useState(null);
  const [editCust,   setEditCust]   = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [deleteCust, setDeleteCust] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  // ── Theme ──────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agron-theme', theme);
  }, [theme]);

  // ── Toast ──────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cR, sR, cgR, sgR, lgR] = await Promise.all([
        fetchAPI(`${API_URL}/customers`),
        fetchAPI(`${API_URL}/stats`),
        fetchAPI(`${API_URL}/crop_type`),
        fetchAPI(`${API_URL}/season`),
        fetchAPI(`${API_URL}/location`),
      ]);
      const [cJ, sJ, cgJ, sgJ, lgJ] = await Promise.all([cR.json(), sR.json(), cgR.json(), sgR.json(), lgR.json()]);
      if (cJ.data)  setCustomers(cJ.data);
      if (sJ.data)  setStats(sJ.data);
      setGrouped({ crop_type: cgJ.data || [], season: sgJ.data || [], location: lgJ.data || [] });
    } catch {
      showToast('Could not connect to server.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ────────────────────────────────────────────────────
  const uniqueCrops     = [...new Set(customers.map(c => c.crop_type).filter(Boolean))];
  const uniqueLocations = [...new Set(customers.map(c => c.location).filter(Boolean))];
  const uniqueSeasons   = [...new Set(customers.map(c => c.season).filter(Boolean))];

  // ── Filtered + sorted ─────────────────────────────────────────
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || [c.customer_details, c.phone_number, c.crop_type, c.area_of_crop, c.season, c.location]
      .some(v => (v || '').toLowerCase().includes(q));
    return matchSearch
      && (!filterCrop   || c.crop_type === filterCrop)
      && (!filterSeason || c.season    === filterSeason)
      && (!filterLoc    || c.location  === filterLoc);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return b.id - a.id;
    if (sortBy === 'oldest') return a.id - b.id;
    if (sortBy === 'az')     return (a.customer_details || '').localeCompare(b.customer_details || '');
    if (sortBy === 'za')     return (b.customer_details || '').localeCompare(a.customer_details || '');
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, filterCrop, filterSeason, filterLoc, sortBy]);

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteCust) return;
    try {
      const res = await fetchAPI(`${API_URL}/customers/${deleteCust.id}`, { method: 'DELETE' });
      if (res.ok) { showToast(`"${deleteCust.customer_details}" deleted.`); fetchAll(); }
      else          showToast('Delete failed.', 'error');
    } catch     { showToast('Server error.', 'error'); }
    finally     { setDeleteCust(null); }
  };

  // ── Export ─────────────────────────────────────────────────────
  const exportExcel = () => {
    const data = sorted.map(c => ({ ID: c.id, Name: c.customer_details, Phone: c.phone_number, Crop: c.crop_type, Area: c.area_of_crop, Season: c.season, Location: c.location }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'agron_customers.xlsx');
    showToast('Excel exported!', 'info');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Agron Customer Report', 14, 16);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Records: ${sorted.length}`, 14, 23);
    autoTable(doc, {
      startY: 28,
      head: [['#','Name','Phone','Crop','Area','Season','Location']],
      body: sorted.map(c => [c.id, c.customer_details, c.phone_number, c.crop_type, c.area_of_crop, c.season, c.location]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [22, 101, 52] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
    });
    doc.save('agron_customers.pdf');
    showToast('PDF exported!', 'info');
  };

  // ── Page number list ───────────────────────────────────────────
  const pageNums = () => {
    const pages = []; const s = Math.max(1, page - 2); const e = Math.min(totalPages, page + 2);
    for (let i = s; i <= e; i++) pages.push(i);
    return pages;
  };

  // ── Shared chart options ───────────────────────────────────────
  const chartBase = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { bodyFont: { family: 'Inter' }, titleFont: { family: 'Inter' } } }
  };
  const barScales = {
    x: { ticks: chartTickStyle(theme), grid: { display: false } },
    y: { ticks: chartTickStyle(theme), grid: { color: theme === 'dark' ? '#1E3048' : '#F1F5F9' } }
  };

  // ══════════════════════════════════════════════════════════════
  return (
    <div className="app">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo"></div>
          <div>
            <div className="header-title">Agron Customer Management</div>
            <div className="header-subtitle">Agricultural CRM Portal</div>
          </div>
        </div>

        <nav className="header-nav">
          {[
            { key: 'dashboard', icon: '', label: 'Dashboard' },
            { key: 'customers', icon: '', label: 'Customers' },
            { key: 'reports',   icon: '', label: 'Reports'   },
          ].map(n => (
            <button key={n.key} className={`nav-btn ${tab === n.key ? 'active' : ''}`} onClick={() => setTab(n.key)}>
              {n.icon} {n.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="icon-btn" title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditCust(null); setShowForm(true); }}>
            Add Customer
          </button>
        </div>
      </header>

      <main className="page-content">

        {/* ══════════════════════════════════════════════════════
            DASHBOARD TAB
        ══════════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <>
            {/* TOP ROW: Stats grid */}
            <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
              {[
                { label: 'Total Customers', value: stats?.totalCustomers ?? '–', icon: '', color: '#16A34A' },
                { label: 'Crop Types',      value: stats?.uniqueCrops    ?? '–', icon: '', color: '#F59E0B' },
                { label: 'Locations',       value: stats?.uniqueLocations ?? '–', icon: '', color: '#3B82F6' },
                { label: 'Seasons',         value: stats?.uniqueSeasons   ?? '–', icon: '', color: '#8B5CF6' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ '--stat-color': s.color }}>
                  <div className="stat-body">
                    <div className="stat-label" style={{ fontWeight: 900, fontSize: '1.05rem', textTransform: 'uppercase', marginBottom: '0.25rem', color: 'var(--text-1)' }}>{s.label}</div>
                    <div className="stat-value">
                      {loading && !stats ? <span className="spinner" /> : s.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Charts row ── */}
            <div className="charts-grid">
              {/* Doughnut: by Crop */}
              <div className="chart-card">
                <div className="chart-title">Customers by Crop</div>
                <div className="chart-wrap">
                  {grouped.crop_type.length > 0
                    ? <Doughnut
                        data={buildDoughnutData(grouped.crop_type, 'crop_type')}
                        options={{
                          ...chartBase, cutout: '62%',
                          plugins: { ...chartBase.plugins, legend: { display: true, position: 'right',
                            labels: { font: { family: 'Inter', size: 11 }, color: theme === 'dark' ? '#94A3B8' : '#475569', boxWidth: 12 } } }
                        }}
                      />
                    : <div className="empty-state"><div className="empty-icon"></div><div className="empty-text">No data</div></div>
                  }
                </div>
              </div>

              {/* Bar: by Season */}
              <div className="chart-card">
                <div className="chart-title"> Customers by Season</div>
                <div className="chart-wrap">
                  {grouped.season.length > 0
                    ? <Bar data={buildBarData(grouped.season, 'season')} options={{ ...chartBase, scales: barScales }} />
                    : <div className="empty-state"><div className="empty-icon"></div><div className="empty-text">No data</div></div>
                  }
                </div>
              </div>

              {/* Horizontal bar: by Location (full width) */}
              <div className="chart-card span-2">
                <div className="chart-title">Customers by Location</div>
                <div className="chart-wrap lg">
                  {grouped.location.length > 0
                    ? <Bar
                        data={buildBarData(grouped.location, 'location')}
                        options={{
                          ...chartBase, indexAxis: 'y',
                          scales: {
                            x: { ticks: chartTickStyle(theme), grid: { color: theme === 'dark' ? '#1E3048' : '#F1F5F9' } },
                            y: { ticks: chartTickStyle(theme), grid: { display: false } }
                          }
                        }}
                      />
                    : <div className="empty-state"><div className="empty-icon"></div><div className="empty-text">No data</div></div>
                  }
                </div>
              </div>
            </div>

            {/* ── Recently Added ── */}
            <div className="recent-card">
              <div className="card-header">
                <span className="card-title">Recently Added</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('customers')}>View All →</button>
              </div>
              <div className="table-wrap">
                <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Name</th>
                      <th style={{ textAlign: 'left' }}>Phone</th>
                      <th style={{ textAlign: 'center' }}>Crop</th>
                      <th style={{ textAlign: 'center' }}>Season</th>
                      <th style={{ textAlign: 'left' }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recentlyAdded || []).map(c => (
                      <tr key={c.id} onClick={() => setDetailCust(c)}>
                        <td style={{ textAlign: 'left' }}>
                          <div className="name-cell">
                            <div className="avatar">{getInitials(c.customer_details)}</div>
                            <span className="name-text">{c.customer_details}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-2)', textAlign: 'left' }}>{c.phone_number}</td>
                        <td style={{ textAlign: 'center' }}><span className={`crop-badge ${getCropClass(c.crop_type)}`}>{c.crop_type}</span></td>
                        <td style={{ textAlign: 'center' }}><span className={`season-badge ${getSeasonClass(c.season)}`}>{c.season}</span></td>
                        <td style={{ color: 'var(--text-2)', textAlign: 'left' }}>{c.location}</td>
                      </tr>
                    ))}
                    {!stats?.recentlyAdded?.length && (
                      <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon"></div><div className="empty-text">No customers yet.</div></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            CUSTOMERS TAB
        ══════════════════════════════════════════════════════ */}
        {tab === 'customers' && (
          <>
            {/* Filter bar */}
            <div className="filter-bar">
              <div className="search-wrap">
                <span className="search-icon"></span>
                <input type="text" className="search-input"
                  placeholder="Search name, phone, crop, location…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {[
                { label: 'Crop',     value: filterCrop,   setter: setFilterCrop,   opts: uniqueCrops,     def: 'All Crops' },
                { label: 'Season',   value: filterSeason, setter: setFilterSeason, opts: uniqueSeasons,   def: 'All Seasons' },
                { label: 'Location', value: filterLoc,    setter: setFilterLoc,    opts: uniqueLocations, def: 'All Locations' },
              ].map(f => (
                <label key={f.label} className="filter-group">
                  <span className="filter-label-text">{f.label}</span>
                  <select className="filter-select" value={f.value} onChange={e => f.setter(e.target.value)}>
                    <option value="">{f.def}</option>
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              ))}

              <label className="filter-group">
                <span className="filter-label-text">Sort</span>
                <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                </select>
              </label>

              {(search || filterCrop || filterSeason || filterLoc) && (
                <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }}
                  onClick={() => { setSearch(''); setFilterCrop(''); setFilterSeason(''); setFilterLoc(''); }}>
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Table card */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                   All Customers
                  <span className="badge">{sorted.length} records</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={exportExcel}>Excel</button>
                  <button className="btn btn-ghost btn-sm" onClick={exportPDF}>PDF</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print</button>
                </div>
              </div>

              <div className="table-wrap table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Name</th><th>Phone</th>
                      <th>Crop</th><th>Area</th><th>Season</th>
                      <th>Location</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((cust, idx) => (
                      <tr key={cust.id} onClick={() => setDetailCust(cust)}>
                        <td style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td>
                          <div className="name-cell">
                            <div className="avatar">{getInitials(cust.customer_details)}</div>
                            <span className="name-text">{cust.customer_details}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-2)' }}>{cust.phone_number}</td>
                        <td><span className={`crop-badge ${getCropClass(cust.crop_type)}`}>{cust.crop_type}</span></td>
                        <td style={{ color: 'var(--text-2)' }}>{cust.area_of_crop}</td>
                        <td><span className={`season-badge ${getSeasonClass(cust.season)}`}>{cust.season}</span></td>
                        <td style={{ color: 'var(--text-2)' }}>{cust.location}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button className="btn btn-outline-green btn-sm" title="Edit"
                              onClick={() => { setEditCust(cust); setShowForm(true); }}>Edit</button>
                            <button className="btn btn-danger btn-sm" title="Delete"
                              onClick={() => setDeleteCust(cust)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginated.length === 0 && (
                      <tr>
                        <td colSpan={8}>
                          <div className="empty-state">
                            <div className="empty-icon"></div>
                            <div className="empty-text">No customers match your filters.</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <span className="pagination-info">
                  Showing {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                </span>
                <div className="pagination-controls">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                  {pageNums().map(n => (
                    <button key={n} className={`page-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                  ))}
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            REPORTS TAB
        ══════════════════════════════════════════════════════ */}
        {tab === 'reports' && (
          <>
            <div className="export-bar">
              <button className="btn btn-primary" onClick={exportExcel}>Export Excel</button>
              <button className="btn btn-secondary" onClick={exportPDF}>Export PDF</button>
              <button className="btn btn-ghost" onClick={() => window.print()}>Print</button>
            </div>

            <div className="card card-pad" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <span className="card-title"> Group By</span>
                <div className="group-tabs">
                  {[
                    { k: 'crop_type', label: 'Crop Type' },
                    { k: 'season',    label: ' Season' },
                    { k: 'location',  label: 'Location' },
                  ].map(f => (
                    <button key={f.k} className={`group-tab ${activeGroup === f.k ? 'active' : ''}`} onClick={() => setActiveGroup(f.k)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const data  = grouped[activeGroup] || [];
                const total = data.reduce((s, d) => s + d.count, 0);
                const maxC  = data[0]?.count || 1;
                return data.length === 0
                  ? <div className="empty-state"><div className="empty-icon"></div><div className="empty-text">No data.</div></div>
                  : data.map((item, i) => {
                      const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                      return (
                        <div key={i} className="group-item">
                          <div className="group-item-header">
                            <span className="group-item-label">{item[activeGroup]}</span>
                            <span className="group-item-meta">{item.count} customers ({pct}%)</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${(item.count / maxC) * 100}%` }} />
                          </div>
                        </div>
                      );
                    });
              })()}
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-title">Pie / Doughnut</div>
                <div className="chart-wrap lg">
                  {grouped[activeGroup]?.length > 0
                    ? <Doughnut data={buildDoughnutData(grouped[activeGroup], activeGroup)}
                        options={{ ...chartBase, cutout: '55%',
                          plugins: { ...chartBase.plugins, legend: { display: true, position: 'right',
                            labels: { font: { family: 'Inter', size: 11 }, color: theme === 'dark' ? '#94A3B8' : '#475569' } } } }} />
                    : <div className="empty-state"><div className="empty-icon"></div></div>
                  }
                </div>
              </div>
              <div className="chart-card">
                <div className="chart-title">Bar Chart</div>
                <div className="chart-wrap lg">
                  {grouped[activeGroup]?.length > 0
                    ? <Bar data={buildBarData(grouped[activeGroup], activeGroup)} options={{ ...chartBase, scales: barScales }} />
                    : <div className="empty-state"><div className="empty-icon"></div></div>
                  }
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── MODALS ─────────────────────────────────────────────── */}
      {detailCust && (
        <DetailModal customer={detailCust} onClose={() => setDetailCust(null)}
          onEdit={c => { setEditCust(c); setShowForm(true); }}
          onDelete={c => setDeleteCust(c)} />
      )}
      {showForm && (
        <FormModal editCustomer={editCust}
          onClose={() => { setShowForm(false); setEditCust(null); }}
          onSaved={action => { showToast(`Customer ${action} successfully! `); fetchAll(); }}
          uniqueCrops={uniqueCrops} uniqueLocations={uniqueLocations} />
      )}
      {deleteCust && (
        <ConfirmModal customer={deleteCust} onConfirm={handleDelete} onCancel={() => setDeleteCust(null)} />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
