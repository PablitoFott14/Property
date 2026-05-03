/* ═══════════════════════════════════════════
   calendar.js — Maintenance + Lease events
   UTC date keys verified vs Buildium lease_end
═══════════════════════════════════════════ */

let _calAll    = [];
let _calSearch = '';
let _calTag    = '';
let _calMonth  = '';
let _calSelKey = '';

const GL_CAL_TAG_COLOR = {
  'Maintenance': 'var(--sky)',
  'Lease':       'var(--green)',
};
function _calTagColor(tag) { return GL_CAL_TAG_COLOR[tag] || 'var(--violet)'; }

function _calDateKey(ts) {
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toISOString().slice(0, 10); // UTC YYYY-MM-DD
}
function _calMonthOf(ts) { return _calDateKey(ts).slice(0, 7); }

function _calShiftMonthStr(ms, delta) {
  const [y, m] = ms.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
function _calGridKeys(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  const firstUTC = new Date(Date.UTC(y, m - 1, 1));
  const dow = firstUTC.getUTCDay();
  const keys = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(y, m - 1, 1 - dow + i));
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}
function _calFmtMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function _calFmtKey(key) {
  if (!key) return '—';
  try { return new Date(key + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return key; }
}
function _calFmtTs(ts) {
  if (!ts) return '—';
  const ms = ts > 1e12 ? ts : ts * 1000;
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true });
}
function _calFmtMins(m) { const h = Math.floor(m/60), r = m%60; return h > 0 ? `${h}h ${r}m` : `${r}m`; }

function renderCalendar(DATA) {
  const events = (DATA.calendar || {}).events || [];
  _calAll = [...events]
    .map((e, i) => ({ ...e, _idx: i }))
    .sort((a, b) => a.start_datetime - b.start_datetime);

  const tags = [...new Set(_calAll.map(e => e.tag).filter(Boolean))].sort();
  const first = _calAll.find(e => e.start_datetime);
  _calMonth  = first ? _calMonthOf(first.start_datetime) : _calMonthOf(Date.now() / 1000);
  _calSelKey = first ? _calDateKey(first.start_datetime) : _calDateKey(Date.now() / 1000);

  document.getElementById('calendar-content').innerHTML = `
    <div class="cal-filter-bar">
      <input id="cal-search" class="ex-search" type="text" placeholder="Search events…" />
      <select id="cal-tag" class="ex-filter">
        <option value="">All Tags</option>
        ${tags.map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('')}
      </select>
      <span class="ex-count" id="cal-count"></span>
    </div>
    <div id="cal-body"></div>`;

  document.getElementById('cal-search').addEventListener('input', e => {
    _calSearch = e.target.value.toLowerCase(); _calMonth = ''; _calSelKey = ''; _drawCal();
  });
  document.getElementById('cal-tag').addEventListener('change', e => {
    _calTag = e.target.value; _calMonth = ''; _calSelKey = ''; _drawCal();
  });
  _drawCal();
}

function _drawCal() {
  const filtered = _calAll.filter(e => {
    if (_calTag && e.tag !== _calTag) return false;
    if (!_calSearch) return true;
    return (e.title || '').toLowerCase().includes(_calSearch)
      || (e.description || '').toLowerCase().includes(_calSearch)
      || (e.location || '').toLowerCase().includes(_calSearch)
      || (e.attendees || []).some(a => a.toLowerCase().includes(_calSearch));
  });

  const countEl = document.getElementById('cal-count');
  if (countEl) countEl.textContent = `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    document.getElementById('cal-body').innerHTML = '<div class="empty-state">No events match.</div>';
    return;
  }

  if (!_calMonth) _calMonth = _calMonthOf(filtered[0].start_datetime);

  const grouped = {};
  filtered.forEach(e => {
    const k = _calDateKey(e.start_datetime);
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(e);
  });

  const gridKeys  = _calGridKeys(_calMonth);
  const withItems = gridKeys.filter(k => grouped[k]?.length);
  if (!_calSelKey || !gridKeys.includes(_calSelKey)) {
    _calSelKey = withItems[0] || (_calMonth + '-01');
  }

  const selectedItems = grouped[_calSelKey] || [];

  let html = `<div class="cal-shell">
    <div class="cal-nav">
      <button class="cal-nav-btn" onclick="_calShiftGL(-1)">‹</button>
      <div style="text-align:center">
        <div class="cal-month-title">📅 ${_calFmtMonth(_calMonth)}</div>
        <div class="cal-month-sub">${filtered.length} events</div>
      </div>
      <button class="cal-nav-btn" onclick="_calShiftGL(1)">›</button>
    </div>
    <div class="cal-weekdays">
      ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="cal-weekday">${d}</div>`).join('')}
    </div>
    <div class="cal-grid">`;

  gridKeys.forEach(key => {
    const items  = grouped[key] || [];
    const sameMo = key.slice(0, 7) === _calMonth;
    const isSel  = key === _calSelKey;
    const dayNum = Number(key.slice(8));

    html += `<button type="button" class="cal-cell${!sameMo?' other-month':''}${isSel?' selected':''}" onclick="_calSelectDay('${key}')">
      <div class="cal-cell-num">${dayNum}${items.length?`<span style="font-size:9px;color:var(--text3);font-weight:400;margin-left:3px">${items.length}</span>`:''}
      </div>
      <div style="overflow-y:auto;max-height:60px">
        ${items.map(e => {
          const col = _calTagColor(e.tag);
          return `<span class="cal-event-chip" style="background:${col}22;color:${col}"
            onclick="event.stopPropagation();showCalEventModal(${e._idx})">${escHtml(e.title||'Event')}</span>`;
        }).join('')}
      </div>
    </button>`;
  });

  html += `</div>
    <div class="cal-agenda">
      <div class="cal-agenda-title">${_calFmtKey(_calSelKey)} · ${selectedItems.length} event${selectedItems.length!==1?'s':''}</div>`;

  selectedItems.forEach(e => {
    const col = _calTagColor(e.tag);
    const dur = e.end_datetime && e.start_datetime ? Math.round((e.end_datetime - e.start_datetime) / 60) : null;
    html += `<div class="cal-agenda-item" onclick="showCalEventModal(${e._idx})">
      <div class="cal-agenda-dot" style="background:${col}"></div>
      <div style="flex:1">
        <div class="cal-agenda-item-title">${escHtml(e.title||'—')}</div>
        <div class="cal-agenda-meta">
          ${_calFmtTs(e.start_datetime)}${dur?' · '+_calFmtMins(dur):''}
          ${e.location?' · '+escHtml(e.location):''}
        </div>
        ${e.description?`<div class="cal-agenda-desc">${escHtml(e.description.slice(0,160))}${e.description.length>160?'…':''}</div>`:''}
      </div>
      ${e.tag?`<span class="badge" style="flex-shrink:0;background:${col}22;color:${col}">${escHtml(e.tag)}</span>`:''}
    </div>`;
  });

  if (!selectedItems.length) html += `<div style="font-size:12px;color:var(--text3)">No events on this day.</div>`;
  html += `</div></div>`;
  document.getElementById('cal-body').innerHTML = html;
}

function _calShiftGL(delta) { _calMonth = _calShiftMonthStr(_calMonth, delta); _calSelKey = ''; _drawCal(); }
function _calSelectDay(key) { _calSelKey = key; _drawCal(); }

function showCalEventModal(idx) {
  const e = _calAll.find(x => x._idx === idx);
  if (!e) return;
  const col = _calTagColor(e.tag);
  const dur = e.end_datetime && e.start_datetime ? Math.round((e.end_datetime - e.start_datetime) / 60) : null;
  const body = `<div class="mf-grid">
    <div class="mf-item"><label>Start</label><span class="val">${_calFmtTs(e.start_datetime)}</span></div>
    <div class="mf-item"><label>End</label><span class="val">${e.end_datetime?_calFmtTs(e.end_datetime):'—'}${dur?` (${_calFmtMins(dur)})`:''}</span></div>
    ${e.tag?`<div class="mf-item"><label>Tag</label><span class="val"><span class="badge" style="background:${col}22;color:${col}">${escHtml(e.tag)}</span></span></div>`:''}
    ${e.location?`<div class="mf-item"><label>Location</label><span class="val">${escHtml(e.location)}</span></div>`:''}
    ${e.description?`<div class="mf-item mf-full"><label>Description</label><span class="val" style="white-space:pre-wrap;line-height:1.6">${escHtml(e.description)}</span></div>`:''}
    ${(e.attendees||[]).length?`<div class="mf-item mf-full"><label>Attendees</label><span class="val">${e.attendees.map(a=>escHtml(a)).join(', ')}</span></div>`:''}
  </div>`;
  openModal(e.tag||'Event', e.title||'—', body);
}
