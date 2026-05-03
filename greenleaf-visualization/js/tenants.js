/* ═══════════════════════════════════════════
   tenants.js — Active tenants, lease info,
   emergency contacts, Stripe customer link
═══════════════════════════════════════════ */

let _tenAll    = [];
let _tenPage   = 1;
let _tenSearch = '';
let _tenProp   = '';
const _tenStore = [];
const TEN_PAGE  = 40;

function renderTenants(DATA) {
  const tenants   = (DATA.buildium || {}).tenants    || [];
  const units     = (DATA.buildium || {}).units      || [];
  const props     = (DATA.buildium || {}).properties || [];
  const strCusts  = (DATA.stripe   || {}).customers  || [];
  const contacts  = (DATA.contacts || {}).contacts   || [];

  const unitMap  = Object.fromEntries(units.map(u => [u.id, u]));
  const propMap  = Object.fromEntries(props.map(p => [p.id, p]));
  const strByTen = Object.fromEntries(strCusts.map(c => [c.metadata?.tenant_id, c]));
  const contByEmail = Object.fromEntries(contacts.map(c => [c.email?.toLowerCase(), c]));

  _tenAll = [...tenants]
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
    .map((t, i) => {
      const unit = unitMap[t.unit_id] || {};
      const prop = propMap[unit.property_id] || {};
      return { ...t, _unit: unit, _prop: prop, _stripe: strByTen[String(t.id)] || null, _contact: contByEmail[t.email?.toLowerCase()] || null, _idx: i };
    });

  _tenStore.length = 0;
  _tenAll.forEach(t => _tenStore.push(t));

  const propOptions = props.map(p => `<option value="${p.id}">${escHtml(p.name)}</option>`).join('');

  document.getElementById('tenants-content').innerHTML = `
    <div class="explorer-bar">
      <input id="ten-search" class="ex-search" type="text" placeholder="Name, email, unit…" />
      <select id="ten-prop" class="ex-filter">
        <option value="">All Properties</option>
        ${propOptions}
      </select>
      <span class="ex-count" id="ten-count"></span>
    </div>
    <div id="ten-table"></div>
    <div class="pagination" id="ten-pag"></div>`;

  document.getElementById('ten-search').addEventListener('input', e => { _tenSearch = e.target.value.toLowerCase(); _tenPage = 1; _drawTenants(); });
  document.getElementById('ten-prop').addEventListener('change', e => { _tenProp = e.target.value; _tenPage = 1; _drawTenants(); });
  _drawTenants();
}

function _drawTenants() {
  const filtered = _tenAll.filter(t => {
    if (_tenProp && String(t._prop.id) !== _tenProp) return false;
    if (!_tenSearch) return true;
    const name = `${t.first_name} ${t.last_name}`.toLowerCase();
    return name.includes(_tenSearch)
      || (t.email || '').toLowerCase().includes(_tenSearch)
      || (t._unit.unit_number || '').toLowerCase().includes(_tenSearch)
      || (t._prop.name || '').toLowerCase().includes(_tenSearch)
      || (t.phone || '').includes(_tenSearch);
  });

  const countEl = document.getElementById('ten-count');
  if (countEl) countEl.textContent = `${filtered.length} tenant${filtered.length !== 1 ? 's' : ''}`;

  const page = paginate(filtered, _tenPage, TEN_PAGE);
  let html = `<div class="table-wrap"><table>
    <thead><tr>
      <th>Tenant</th><th>Property</th><th>Unit</th><th>Lease Start</th>
      <th>Lease End</th><th>Status</th><th style="text-align:right">Rent</th>
    </tr></thead><tbody>`;

  page.forEach(t => {
    const leaseEndDate = new Date(t.lease_end + 'T00:00:00Z');
    const daysLeft = Math.round((leaseEndDate - Date.now()) / 86400000);
    const expiring = daysLeft >= 0 && daysLeft <= 90;
    const expired  = daysLeft < 0;

    html += `<tr class="clickable" onclick="showTenantModal(${t._idx})">
      <td>
        <div style="font-weight:500;color:var(--text)">${escHtml(t.first_name)} ${escHtml(t.last_name)}</div>
        <div style="font-size:10px;color:var(--text3)">${escHtml(t.email)}</div>
      </td>
      <td class="dim">${escHtml(t._prop.name || '—')}</td>
      <td class="mono" style="color:var(--green)">${escHtml(t._unit.unit_number || '—')}</td>
      <td class="mono dim">${fmtDate(t.lease_start)}</td>
      <td class="mono ${expired?'neg':expiring?'':'dim'}">${fmtDate(t.lease_end)}
        ${expiring ? `<div style="font-size:9px;color:var(--amber)">${daysLeft}d left</div>` : ''}
        ${expired  ? `<div style="font-size:9px;color:var(--rose)">expired</div>` : ''}
      </td>
      <td><span class="badge ${t.status==='active'?'badge-active':'badge-expired'}">${escHtml(t.status)}</span></td>
      <td style="text-align:right;color:var(--emerald);font-weight:600">${fmtCurrency(t.rent_amount)}</td>
    </tr>`;
  });

  if (!filtered.length) html += `<tr><td colspan="7"><div class="empty-state">No tenants match.</div></td></tr>`;
  html += '</tbody></table></div>';
  document.getElementById('ten-table').innerHTML = html;
  renderPagination('ten-pag', filtered.length, _tenPage, TEN_PAGE, `function(p){_tenPage=p;_drawTenants();}`);
}

function showTenantModal(idx) {
  const t = _tenStore[idx];
  if (!t) return;

  const leaseEndDate = new Date(t.lease_end + 'T00:00:00Z');
  const daysLeft = Math.round((leaseEndDate - Date.now()) / 86400000);

  const body = `<div class="mf-grid">
    <div class="mf-item"><label>Name</label><span class="val">${escHtml(t.first_name)} ${escHtml(t.last_name)}</span></div>
    <div class="mf-item"><label>Email</label><span class="val">${escHtml(t.email || '—')}</span></div>
    <div class="mf-item"><label>Phone</label><span class="val">${escHtml(t.phone || '—')}</span></div>
    <div class="mf-item"><label>Status</label><span class="val"><span class="badge ${t.status==='active'?'badge-active':'badge-expired'}">${escHtml(t.status)}</span></span></div>
  </div>
  <div class="mf-sep"></div>
  <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">Lease</div>
  <div class="mf-grid">
    <div class="mf-item"><label>Property</label><span class="val">${escHtml(t._prop.name || '—')}</span></div>
    <div class="mf-item"><label>Unit</label><span class="val mono" style="color:var(--green)">${escHtml(t._unit.unit_number || '—')} · ${t._unit.bedrooms || '?'}bd/${t._unit.bathrooms || '?'}ba · ${t._unit.sqft?.toLocaleString() || '—'} sqft</span></div>
    <div class="mf-item"><label>Lease Start</label><span class="val">${fmtDate(t.lease_start)}</span></div>
    <div class="mf-item"><label>Lease End</label><span class="val" style="${daysLeft>=0&&daysLeft<=90?'color:var(--amber)':daysLeft<0?'color:var(--rose)':''}">${fmtDate(t.lease_end)}${daysLeft>=0&&daysLeft<=90?' ('+daysLeft+'d left)':''}${daysLeft<0?' (expired)':''}</span></div>
    <div class="mf-item"><label>Monthly Rent</label><span class="val" style="color:var(--emerald)">${fmtCurrency(t.rent_amount)}</span></div>
    <div class="mf-item"><label>Security Deposit</label><span class="val">${fmtCurrency(t.security_deposit)}</span></div>
    ${t.ssn_last_four ? `<div class="mf-item"><label>SSN Last 4</label><span class="val mono">····${escHtml(t.ssn_last_four)}</span></div>` : ''}
    ${t.notes ? `<div class="mf-item mf-full"><label>Notes</label><span class="val">${escHtml(t.notes)}</span></div>` : ''}
  </div>
  <div class="mf-sep"></div>
  <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">Employment &amp; Income</div>
  <div class="mf-grid">
    <div class="mf-item"><label>Employer</label><span class="val">${escHtml(t.employer || '—')}</span></div>
    <div class="mf-item"><label>Annual Income</label><span class="val">${t.annual_income ? fmtCurrency(t.annual_income) : '—'}</span></div>
  </div>
  <div class="mf-sep"></div>
  <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">Emergency Contact</div>
  <div class="mf-grid">
    <div class="mf-item"><label>Name</label><span class="val">${escHtml(t.emergency_contact_name || '—')}</span></div>
    <div class="mf-item"><label>Phone</label><span class="val">${escHtml(t.emergency_contact_phone || '—')}</span></div>
  </div>
  ${t._stripe ? `
  <div class="mf-sep"></div>
  <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">Stripe Customer</div>
  <div class="mf-grid">
    <div class="mf-item"><label>Customer ID</label><span class="val mono" style="font-size:11px">${escHtml(t._stripe.id)}</span></div>
    <div class="mf-item"><label>Description</label><span class="val">${escHtml(t._stripe.description || '—')}</span></div>
  </div>` : ''}
  ${t._contact && (t._contact.description || t._contact.age || t._contact.nationality) ? `
  <div class="mf-sep"></div>
  <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">Contact Profile</div>
  <div class="mf-grid">
    ${t._contact.age ? `<div class="mf-item"><label>Age</label><span class="val">${t._contact.age}</span></div>` : ''}
    ${t._contact.gender ? `<div class="mf-item"><label>Gender</label><span class="val">${escHtml(t._contact.gender)}</span></div>` : ''}
    ${t._contact.nationality ? `<div class="mf-item"><label>Nationality</label><span class="val">${escHtml(t._contact.nationality)}</span></div>` : ''}
    ${t._contact.status ? `<div class="mf-item"><label>Status</label><span class="val">${escHtml(t._contact.status)}</span></div>` : ''}
    ${t._contact.description ? `<div class="mf-item mf-full"><label>Description</label><span class="val">${escHtml(t._contact.description)}</span></div>` : ''}
  </div>` : ''}`;

  openModal('Tenant', `${t.first_name} ${t.last_name}`, body);
}
