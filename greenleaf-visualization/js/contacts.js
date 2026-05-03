/* ═══════════════════════════════════════════
   contacts.js — 71 contacts: tenants,
   contractors, property manager
═══════════════════════════════════════════ */

let _contAll    = [];
let _contSearch = '';
let _contType   = '';
const _contStore = [];

function renderContacts(DATA) {
  const contacts = (DATA.contacts || {}).contacts  || [];
  const tenants  = (DATA.buildium || {}).tenants   || [];

  const tenantEmails = new Set(tenants.map(t => (t.email || '').toLowerCase()));
  const currentUserId = (DATA.contacts || {}).current_user_id;

  _contAll = [...contacts].map((c, i) => {
    let type = 'Contractor';
    if (c.is_user || c.contact_id === currentUserId) type = 'Manager';
    else if (tenantEmails.has((c.email || '').toLowerCase())) type = 'Tenant';
    return { ...c, _type: type, _idx: i };
  }).sort((a, b) => {
    const order = { Manager: 0, Tenant: 1, Contractor: 2 };
    if (order[a._type] !== order[b._type]) return order[a._type] - order[b._type];
    return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
  });

  _contStore.length = 0;
  _contAll.forEach(c => _contStore.push(c));

  document.getElementById('contacts-content').innerHTML = `
    <div class="explorer-bar">
      <input id="cont-search" class="ex-search" type="text" placeholder="Name, email, job…" />
      <select id="cont-type" class="ex-filter">
        <option value="">All Types</option>
        <option value="Tenant">Tenants</option>
        <option value="Contractor">Contractors</option>
        <option value="Manager">Manager</option>
      </select>
      <span class="ex-count" id="cont-count"></span>
    </div>
    <div id="cont-grid"></div>`;

  document.getElementById('cont-search').addEventListener('input', e => { _contSearch = e.target.value.toLowerCase(); _drawContacts(); });
  document.getElementById('cont-type').addEventListener('change', e => { _contType = e.target.value; _drawContacts(); });
  _drawContacts();
}

const TYPE_COLOR = { Manager: 'var(--green)', Tenant: 'var(--sky)', Contractor: 'var(--amber)' };
const TYPE_BADGE = { Manager: 'badge-green', Tenant: 'badge-sky', Contractor: 'badge-amber' };
function _typeInitials(c) {
  return ((c.first_name||'').charAt(0) + (c.last_name||'').charAt(0)).toUpperCase();
}

function _drawContacts() {
  const filtered = _contAll.filter(c => {
    if (_contType && c._type !== _contType) return false;
    if (!_contSearch) return true;
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    return name.includes(_contSearch)
      || (c.email || '').toLowerCase().includes(_contSearch)
      || (c.job   || '').toLowerCase().includes(_contSearch)
      || (c.description || '').toLowerCase().includes(_contSearch)
      || (c.phone || '').includes(_contSearch);
  });

  const countEl = document.getElementById('cont-count');
  if (countEl) countEl.textContent = `${filtered.length} contact${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    document.getElementById('cont-grid').innerHTML = '<div class="empty-state">No contacts match.</div>';
    return;
  }

  let html = '<div class="contact-grid">';
  filtered.forEach(c => {
    const col = TYPE_COLOR[c._type] || 'var(--text3)';
    html += `<div class="contact-card" onclick="showContactModal(${c._idx})">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div class="contact-avatar" style="background:${col}22;color:${col}">${_typeInitials(c)}</div>
        <span class="badge ${TYPE_BADGE[c._type]||''}">${escHtml(c._type)}</span>
      </div>
      <div class="contact-name">${escHtml(c.first_name)} ${escHtml(c.last_name)}</div>
      <div class="contact-role">${escHtml(c.job || c.description?.slice(0,50) || '—')}</div>
      <div class="contact-email">${escHtml(c.email || '—')}</div>
      ${c.phone ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">${escHtml(c.phone)}</div>` : ''}
    </div>`;
  });
  html += '</div>';
  document.getElementById('cont-grid').innerHTML = html;
}

function showContactModal(idx) {
  const c = _contStore[idx];
  if (!c) return;
  const col = TYPE_COLOR[c._type] || 'var(--text3)';

  const body = `<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
    <div class="contact-avatar" style="background:${col}22;color:${col};width:52px;height:52px;font-size:18px;border-radius:50%">${_typeInitials(c)}</div>
    <div>
      <div style="font-size:17px;font-weight:600">${escHtml(c.first_name)} ${escHtml(c.last_name)}</div>
      <span class="badge ${TYPE_BADGE[c._type]||''}" style="margin-top:4px">${escHtml(c._type)}</span>
    </div>
  </div>
  <div class="mf-grid">
    <div class="mf-item"><label>Email</label><span class="val">${escHtml(c.email||'—')}</span></div>
    <div class="mf-item"><label>Phone</label><span class="val">${escHtml(c.phone||'—')}</span></div>
    ${c.job ? `<div class="mf-item"><label>Job / Role</label><span class="val">${escHtml(c.job)}</span></div>` : ''}
    ${c.age ? `<div class="mf-item"><label>Age</label><span class="val">${c.age}</span></div>` : ''}
    ${c.gender && c.gender !== 'Unknown' ? `<div class="mf-item"><label>Gender</label><span class="val">${escHtml(c.gender)}</span></div>` : ''}
    ${c.nationality ? `<div class="mf-item"><label>Nationality</label><span class="val">${escHtml(c.nationality)}</span></div>` : ''}
    ${c.status && c.status !== 'Unknown' ? `<div class="mf-item"><label>Status</label><span class="val">${escHtml(c.status)}</span></div>` : ''}
    ${c.city_living ? `<div class="mf-item"><label>City</label><span class="val">${escHtml(c.city_living)}, ${escHtml(c.country||'')}</span></div>` : ''}
    ${c.address ? `<div class="mf-item mf-full"><label>Address</label><span class="val">${escHtml(c.address)}</span></div>` : ''}
    ${c.description ? `<div class="mf-item mf-full"><label>Description</label><span class="val">${escHtml(c.description)}</span></div>` : ''}
  </div>`;

  openModal(c._type, `${c.first_name} ${c.last_name}`, body);
}
