/* ═══════════════════════════════════════════
   communications.js — Email inbox/sent
═══════════════════════════════════════════ */

let _emAll    = [];
let _emFolder = 'INBOX';
let _emSearch = '';

function renderCommunications(DATA) {
  const emails = (DATA.email || {}).emails || [];
  _emAll = [...emails].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const folders = [...new Set(_emAll.map(e => e.folder).filter(Boolean))].sort();
  const unread  = _emAll.filter(e => !e.is_read && e.folder === 'INBOX').length;

  document.getElementById('communications-content').innerHTML = `
    <div class="explorer-bar">
      <input id="em-search" class="ex-search" type="text" placeholder="Subject, sender, content…" />
      <select id="em-folder" class="ex-filter">
        ${folders.map(f => `<option value="${escHtml(f)}"${f==='INBOX'?' selected':''}>${escHtml(f)}${f==='INBOX'&&unread>0?' ('+unread+' unread)':''}</option>`).join('')}
      </select>
      <span class="ex-count" id="em-count"></span>
    </div>
    <div id="em-list"></div>`;

  document.getElementById('em-search').addEventListener('input', e => { _emSearch = e.target.value.toLowerCase(); _drawEmails(); });
  document.getElementById('em-folder').addEventListener('change', e => { _emFolder = e.target.value; _drawEmails(); });
  _drawEmails();
}

function _drawEmails() {
  const filtered = _emAll.filter(e => {
    if (_emFolder && e.folder !== _emFolder) return false;
    if (!_emSearch) return true;
    return (e.subject  || '').toLowerCase().includes(_emSearch)
      || (e.sender   || '').toLowerCase().includes(_emSearch)
      || (e.content  || '').toLowerCase().includes(_emSearch)
      || (e.recipients || []).some(r => r.toLowerCase().includes(_emSearch));
  });

  const countEl = document.getElementById('em-count');
  if (countEl) countEl.textContent = `${filtered.length} email${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    document.getElementById('em-list').innerHTML = '<div class="empty-state">No emails match.</div>';
    return;
  }

  let html = '';
  filtered.forEach(e => {
    const eid = 'em-' + escHtml(e.email_id);
    html += `<div class="email-item">
      <div class="email-header" onclick="glToggleEmail('${escHtml(e.email_id)}')">
        <span class="${e.is_read ? 'email-read-dot' : 'email-unread-dot'}"></span>
        <span class="email-from">${escHtml(e.folder === 'SENT' ? (e.recipients || []).join(', ') : e.sender)}</span>
        <span class="email-subject">${escHtml(e.subject || '(no subject)')}</span>
        <span class="email-date">${fmtTs(e.timestamp)}</span>
      </div>
      <div class="email-body" id="${eid}">
        <div style="font-size:10px;color:var(--text3);margin-bottom:8px">
          ${e.folder === 'SENT' ? 'To: ' : 'From: '}${escHtml(e.folder === 'SENT' ? (e.recipients||[]).join(', ') : e.sender)}
          ${(e.cc||[]).length ? ' · CC: ' + escHtml(e.cc.join(', ')) : ''}
        </div>
        ${escHtml(e.content || '')}
      </div>
    </div>`;
  });

  document.getElementById('em-list').innerHTML = html;
}

function glToggleEmail(id) {
  const el = document.getElementById('em-' + id);
  if (el) el.classList.toggle('open');
}
