/* ═══════════════════════════════════════════
   properties.js — 12 properties with units
   and tenant detail per property
═══════════════════════════════════════════ */

const _propStore = [];

function renderProperties(DATA) {
  const props   = (DATA.buildium || {}).properties || [];
  const units   = (DATA.buildium || {}).units      || [];
  const tenants = (DATA.buildium || {}).tenants    || [];

  const unitsByProp  = {};
  units.forEach(u => {
    if (!unitsByProp[u.property_id]) unitsByProp[u.property_id] = [];
    unitsByProp[u.property_id].push(u);
  });
  const tenantByUnit = {};
  tenants.forEach(t => { tenantByUnit[t.unit_id] = t; });

  _propStore.length = 0;
  props.forEach((p, i) => {
    _propStore.push({ ...p, _units: unitsByProp[p.id] || [], _tenantByUnit: tenantByUnit, _idx: i });
  });

  let html = '<div class="grid-3">';
  props.forEach((p, i) => {
    const propUnits = unitsByProp[p.id] || [];
    const occ = propUnits.filter(u => u.status === 'occupied').length;
    const vac = propUnits.filter(u => u.status === 'vacant').length;
    const pct = propUnits.length ? occ / propUnits.length * 100 : 0;
    const mRent = propUnits.reduce((s, u) => {
      const t = tenantByUnit[u.id];
      return s + (u.status === 'occupied' && t ? t.rent_amount || 0 : 0);
    }, 0);

    html += `<div class="property-card" onclick="showPropertyModal(${i})">
      <div class="pc-name">${escHtml(p.name)}</div>
      <div class="pc-address">${escHtml(p.address)}</div>
      <div style="font-size:10px;color:var(--text4);margin-bottom:8px">${escHtml(p.city)}, ${escHtml(p.state)} ${escHtml(p.zip)} · Built ${p.year_built||'—'}</div>
      <div class="pc-occ-bar"><div class="pc-occ-fill" style="width:${pct.toFixed(0)}%"></div></div>
      <div class="pc-stats" style="margin-bottom:8px">
        <span class="pc-stat"><strong>${occ}/${propUnits.length}</strong> occupied</span>
        ${vac > 0 ? `<span class="pc-stat" style="color:var(--rose)"><strong>${vac}</strong> vacant</span>` : '<span class="pc-stat" style="color:var(--green)">fully occupied</span>'}
        ${p.parking_spots ? `<span class="pc-stat"><strong>${p.parking_spots}</strong> parking</span>` : ''}
      </div>
      <div style="font-size:12px;font-weight:600;color:var(--emerald)">${fmtCurrency(mRent)}<span style="font-size:10px;font-weight:400;color:var(--text3)">/mo</span></div>
    </div>`;
  });

  html += '</div>';
  document.getElementById('properties-content').innerHTML = html;
}

function showPropertyModal(idx) {
  const item = _propStore[idx];
  if (!item) return;
  const p = item;
  const propUnits = item._units;
  const tenantByUnit = item._tenantByUnit;

  const occ  = propUnits.filter(u => u.status === 'occupied').length;
  const vac  = propUnits.filter(u => u.status === 'vacant').length;
  const mRent = propUnits.reduce((s, u) => {
    const t = tenantByUnit[u.id];
    return s + (u.status === 'occupied' && t ? t.rent_amount || 0 : 0);
  }, 0);

  let body = `<div class="mf-grid" style="margin-bottom:16px">
    <div class="mf-item"><label>Address</label><span class="val">${escHtml(p.address)}</span></div>
    <div class="mf-item"><label>City / State</label><span class="val">${escHtml(p.city)}, ${escHtml(p.state)} ${escHtml(p.zip)}</span></div>
    <div class="mf-item"><label>Year Built</label><span class="val">${p.year_built || '—'}</span></div>
    <div class="mf-item"><label>Parking Spots</label><span class="val">${p.parking_spots ?? '—'}</span></div>
    <div class="mf-item"><label>Occupancy</label><span class="val">${occ}/${propUnits.length} units <span style="color:var(--text3)">(${propUnits.length ? Math.round(occ/propUnits.length*100) : 0}%)</span></span></div>
    <div class="mf-item"><label>Monthly Rent</label><span class="val" style="color:var(--emerald)">${fmtCurrency(mRent)}</span></div>
    ${p.notes ? `<div class="mf-item mf-full"><label>Notes</label><span class="val">${escHtml(p.notes)}</span></div>` : ''}
  </div>
  <div class="mf-sep"></div>
  <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:10px">Units (${propUnits.length})</div>
  <div class="table-wrap"><table>
    <thead><tr>
      <th>Unit</th><th>Bed / Bath</th><th>Sqft</th><th>Status</th><th>Tenant</th><th>Lease End</th><th style="text-align:right">Rent</th>
    </tr></thead>
    <tbody>`;

  const sorted = [...propUnits].sort((a, b) => String(a.unit_number).localeCompare(String(b.unit_number), undefined, { numeric: true }));
  sorted.forEach(u => {
    const t = tenantByUnit[u.id];
    body += `<tr>
      <td class="mono" style="color:var(--green)">${escHtml(u.unit_number)}</td>
      <td class="dim">${u.bedrooms}bd / ${u.bathrooms}ba</td>
      <td class="dim">${u.sqft ? u.sqft.toLocaleString() : '—'} sqft</td>
      <td><span class="badge ${u.status==='occupied'?'badge-occupied':'badge-vacant'}">${escHtml(u.status)}</span></td>
      <td>${t ? escHtml(t.first_name + ' ' + t.last_name) : '<span style="color:var(--text4)">—</span>'}</td>
      <td class="mono dim">${t ? fmtDate(t.lease_end) : '—'}</td>
      <td style="text-align:right;color:var(--emerald);font-weight:600">${fmtCurrency(u.rent_amount)}</td>
    </tr>`;
  });

  body += `</tbody></table></div>`;
  if (vac > 0) {
    body += `<div style="margin-top:10px;padding:10px 12px;background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.15);border-radius:var(--radius-sm);font-size:12px;color:var(--rose)">${vac} unit${vac>1?'s are':' is'} currently vacant.</div>`;
  }

  openModal('Property', p.name, body);
}
