/* ═══════════════════════════════════════════
   finances.js — Rent Roll (Buildium + Stripe)
   + Stripe Products & Pricing catalog
═══════════════════════════════════════════ */

function renderFinances(DATA) {
  _renderRentRoll(DATA);
  _renderProducts(DATA);
}

// ── RENT ROLL ────────────────────────────────
function _renderRentRoll(DATA) {
  const props   = (DATA.buildium || {}).properties || [];
  const units   = (DATA.buildium || {}).units      || [];
  const tenants = (DATA.buildium || {}).tenants    || [];
  const strCusts = (DATA.stripe  || {}).customers  || [];

  const unitMap  = Object.fromEntries(units.map(u => [u.id, u]));
  const propMap  = Object.fromEntries(props.map(p => [p.id, p]));
  const tenByUnit = Object.fromEntries(tenants.map(t => [t.unit_id, t]));
  const strByTen  = Object.fromEntries(strCusts.map(c => [c.metadata?.tenant_id, c]));

  const totalMRR  = tenants.filter(t => t.status === 'active').reduce((s, t) => s + (t.rent_amount || 0), 0);
  const occupied  = units.filter(u => u.status === 'occupied').length;
  const vacant    = units.filter(u => u.status === 'vacant').length;
  const avgRent   = occupied ? totalMRR / occupied : 0;

  let html = `<div class="kpi-row" style="margin-bottom:18px">
    <div class="kpi-tile">
      <div class="kpi-label">Monthly Rent</div>
      <div class="kpi-value" style="color:var(--emerald)">${fmtCurrency(totalMRR)}</div>
      <div class="kpi-sub">${occupied} active leases</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Avg Rent / Unit</div>
      <div class="kpi-value" style="color:var(--green)">${fmtCurrency(avgRent)}</div>
      <div class="kpi-sub">occupied units</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Annual Revenue</div>
      <div class="kpi-value" style="color:var(--teal)">${fmtCurrency(totalMRR * 12)}</div>
      <div class="kpi-sub">projected</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">Vacancy Loss</div>
      <div class="kpi-value" style="color:${vacant>0?'var(--rose)':'var(--emerald)'}">${vacant}</div>
      <div class="kpi-sub">vacant unit${vacant!==1?'s':''}</div>
    </div>
  </div>`;

  // Rent roll grouped by property
  props.forEach(p => {
    const propUnits = units
      .filter(u => u.property_id === p.id)
      .sort((a, b) => String(a.unit_number).localeCompare(String(b.unit_number), undefined, { numeric: true }));
    if (!propUnits.length) return;

    const propMRR = propUnits.reduce((s, u) => {
      const t = tenByUnit[u.id];
      return s + (u.status === 'occupied' && t ? t.rent_amount || 0 : 0);
    }, 0);

    html += `<div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="section-label">${escHtml(p.name)}</div>
        <div style="font-size:12px;color:var(--emerald);font-weight:600">${fmtCurrency(propMRR)}/mo</div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Unit</th><th>Bed/Bath</th><th>Sqft</th><th>Status</th>
          <th>Tenant</th><th>Lease End</th><th>Stripe ID</th><th style="text-align:right">Rent</th>
        </tr></thead>
        <tbody>`;

    propUnits.forEach(u => {
      const t   = tenByUnit[u.id];
      const str = t ? strByTen[String(t.id)] : null;
      const leaseEndDate = t ? new Date(t.lease_end + 'T00:00:00Z') : null;
      const daysLeft = leaseEndDate ? Math.round((leaseEndDate - Date.now()) / 86400000) : null;
      const expiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 90;

      html += `<tr>
        <td class="mono" style="color:var(--green)">${escHtml(u.unit_number)}</td>
        <td class="dim">${u.bedrooms}bd/${u.bathrooms}ba</td>
        <td class="dim">${u.sqft?.toLocaleString() || '—'}</td>
        <td><span class="badge ${u.status==='occupied'?'badge-occupied':'badge-vacant'}">${escHtml(u.status)}</span></td>
        <td>${t ? `${escHtml(t.first_name)} ${escHtml(t.last_name)}` : '<span style="color:var(--text4)">—</span>'}</td>
        <td class="mono dim ${expiring?'':''}">
          ${t ? fmtDate(t.lease_end) : '—'}
          ${expiring ? `<span style="font-size:9px;color:var(--amber);display:block">${daysLeft}d</span>` : ''}
        </td>
        <td class="mono dim" style="font-size:10px">${str ? escHtml(str.id) : '—'}</td>
        <td style="text-align:right;${u.status==='occupied'?'color:var(--emerald);font-weight:600':'color:var(--text4)'}">${u.status==='occupied'?fmtCurrency(u.rent_amount):'—'}</td>
      </tr>`;
    });

    html += '</tbody></table></div></div>';
  });

  document.getElementById('fin-rentroll').innerHTML = html;
}

// ── PRODUCTS & PRICING ───────────────────────
function _renderProducts(DATA) {
  const products = (DATA.stripe || {}).products || [];
  const prices   = (DATA.stripe || {}).prices   || [];

  const pricesByProd = {};
  prices.forEach(p => {
    if (!pricesByProd[p.product_id]) pricesByProd[p.product_id] = [];
    pricesByProd[p.product_id].push(p);
  });

  if (!products.length) {
    document.getElementById('fin-products').innerHTML = '<div class="empty-state">No Stripe product data.</div>';
    return;
  }

  let html = '<div class="grid-2">';

  products.forEach(prod => {
    const prodPrices = (pricesByProd[prod.id] || [])
      .filter(p => p.active)
      .sort((a, b) => a.unit_amount - b.unit_amount);

    html += `<div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text)">${escHtml(prod.name)}</div>
          ${prod.description ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">${escHtml(prod.description)}</div>` : ''}
        </div>
        <span class="badge ${prod.active?'badge-active':'badge-expired'}">${prod.active?'active':'inactive'}</span>
      </div>
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:6px">
        Prices (${prodPrices.length})
      </div>`;

    if (prodPrices.length) {
      prodPrices.forEach(pr => {
        const amt = fmtCurrency(pr.unit_amount / 100);
        const interval = pr.recurring_interval ? `/ ${pr.recurring_interval}` : '';
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
          <span class="mono" style="font-size:10px;color:var(--text3)">${escHtml(pr.id)}</span>
          <span style="color:var(--emerald);font-weight:600">${amt}<span style="color:var(--text3);font-weight:400"> ${interval}</span></span>
        </div>`;
      });
    } else {
      html += '<div style="font-size:12px;color:var(--text3)">No active prices.</div>';
    }

    html += '</div>';
  });

  html += '</div>';
  document.getElementById('fin-products').innerHTML = html;
}
