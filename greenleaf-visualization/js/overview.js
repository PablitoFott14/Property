/* ═══════════════════════════════════════════
   overview.js — KPIs, property occupancy grid,
   upcoming events, recent emails
═══════════════════════════════════════════ */

function renderOverview(DATA) {
  const props   = (DATA.buildium || {}).properties || [];
  const units   = (DATA.buildium || {}).units      || [];
  const tenants = (DATA.buildium || {}).tenants    || [];
  const events  = (DATA.calendar || {}).events     || [];
  const emails  = (DATA.email    || {}).emails     || [];

  // Build maps
  const unitsByProp = {};
  units.forEach(u => {
    if (!unitsByProp[u.property_id]) unitsByProp[u.property_id] = [];
    unitsByProp[u.property_id].push(u);
  });
  const tenantByUnit = {};
  tenants.forEach(t => { tenantByUnit[t.unit_id] = t; });

  // KPIs
  const occupied    = units.filter(u => u.status === 'occupied').length;
  const vacant      = units.filter(u => u.status === 'vacant').length;
  const occPct      = units.length ? Math.round(occupied / units.length * 100) : 0;
  const totalMRR    = tenants.filter(t => t.status === 'active').reduce((s, t) => s + (t.rent_amount || 0), 0);
  const activeTen   = tenants.filter(t => t.status === 'active').length;
  const unreadEmail = emails.filter(e => !e.is_read && e.folder === 'INBOX').length;

  // Upcoming events (next 5 by date, sorted ascending)
  const now = Date.now() / 1000;
  const upcoming = [...events]
    .sort((a, b) => a.start_datetime - b.start_datetime)
    .filter(e => e.start_datetime >= now - 86400 * 30)
    .slice(0, 5);

  // Recent inbox emails (last 5)
  const recentEmails = [...emails]
    .filter(e => e.folder === 'INBOX')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 5);

  const tagColor = { Maintenance: 'var(--sky)', Lease: 'var(--green)' };

  let html = '';

  // KPI row
  html += `<div class="kpi-row">
    <div class="kpi-tile">
      <div class="kpi-label">Properties</div>
      <div class="kpi-value" style="color:var(--green)">${props.length}</div>
      <div class="kpi-sub">Austin, TX</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Total Units</div>
      <div class="kpi-value" style="color:var(--sky)">${units.length}</div>
      <div class="kpi-sub">${occupied} occupied · ${vacant} vacant</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Occupancy</div>
      <div class="kpi-value" style="color:${occPct>=90?'var(--emerald)':'var(--amber)'}">${occPct}%</div>
      <div class="kpi-sub">${occupied} of ${units.length} units</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Monthly Rent</div>
      <div class="kpi-value" style="color:var(--emerald)">${fmtCurrency(totalMRR)}</div>
      <div class="kpi-sub">from ${activeTen} active leases</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Active Tenants</div>
      <div class="kpi-value" style="color:var(--teal)">${activeTen}</div>
      <div class="kpi-sub">${tenants.length} total on record</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Unread Emails</div>
      <div class="kpi-value" style="color:${unreadEmail>0?'var(--amber)':'var(--emerald)'}">${unreadEmail}</div>
      <div class="kpi-sub">inbox</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Calendar Events</div>
      <div class="kpi-value" style="color:var(--violet)">${events.length}</div>
      <div class="kpi-sub">maintenance &amp; leases</div>
    </div>
  </div>`;

  // Property occupancy grid
  html += `<div class="section-label" style="margin-bottom:12px">Properties</div>
  <div class="grid-3" style="margin-bottom:24px">`;

  props.forEach(p => {
    const propUnits = unitsByProp[p.id] || [];
    const occ  = propUnits.filter(u => u.status === 'occupied').length;
    const vac  = propUnits.filter(u => u.status === 'vacant').length;
    const pct  = propUnits.length ? occ / propUnits.length * 100 : 0;
    const mRent = propUnits
      .filter(u => u.status === 'occupied')
      .reduce((s, u) => {
        const t = tenantByUnit[u.id];
        return s + (t ? t.rent_amount || 0 : 0);
      }, 0);

    html += `<div class="property-card">
      <div class="pc-name">${escHtml(p.name)}</div>
      <div class="pc-address">${escHtml(p.address)}, ${escHtml(p.city)}</div>
      <div class="pc-occ-bar"><div class="pc-occ-fill" style="width:${pct.toFixed(0)}%"></div></div>
      <div class="pc-stats">
        <span class="pc-stat"><strong>${occ}/${propUnits.length}</strong> occupied</span>
        ${vac > 0 ? `<span class="pc-stat" style="color:var(--rose)"><strong>${vac}</strong> vacant</span>` : ''}
        <span class="pc-stat"><strong>${fmtCurrency(mRent)}</strong>/mo</span>
      </div>
    </div>`;
  });

  html += '</div>';

  // Two-column: upcoming events + recent emails
  html += `<div class="grid-2">
    <div class="card">
      <h4>Upcoming Events</h4>`;

  if (upcoming.length) {
    upcoming.forEach(e => {
      const col = tagColor[e.tag] || 'var(--violet)';
      html += `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0;margin-top:4px"></div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500;color:var(--text)">${escHtml(e.title)}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">
            ${fmtTs(e.start_datetime)}
            ${e.location ? ' · ' + escHtml(e.location.split(',')[0]) : ''}
          </div>
        </div>
        <span class="badge ${e.tag==='Maintenance'?'badge-maint':'badge-lease'}">${escHtml(e.tag)}</span>
      </div>`;
    });
  } else {
    html += '<div class="empty-state">No upcoming events.</div>';
  }

  html += `</div>
    <div class="card">
      <h4>Recent Inbox</h4>`;

  if (recentEmails.length) {
    recentEmails.forEach(e => {
      html += `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="width:6px;height:6px;border-radius:50%;background:${e.is_read?'transparent':'var(--green)'};flex-shrink:0;margin-top:4px"></span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(e.sender)}</div>
          <div style="font-size:12px;font-weight:${e.is_read?'400':'600'};color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(e.subject)}</div>
        </div>
        <span style="font-size:10px;color:var(--text3);font-family:var(--mono);flex-shrink:0">${fmtTs(e.timestamp)}</span>
      </div>`;
    });
  } else {
    html += '<div class="empty-state">No emails.</div>';
  }

  html += '</div></div>';

  document.getElementById('overview-content').innerHTML = html;
}
