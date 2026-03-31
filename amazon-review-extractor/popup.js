// popup.js — Auto-paginate version

let extractedData = null;
let activeTabId = null;
let isRunning = false;
let chipMap = {};    // page number → chip element
let totalPages = 0;

const statusDot  = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const mainContent = document.getElementById('mainContent');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setStatus(type, text) {
  statusDot.className = 'dot ' + type;
  statusText.textContent = text;
}

function renderStars(rating) {
  const n = parseFloat(rating);
  if (isNaN(n)) return '—';
  return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n)) + ` ${n}`;
}

function escapeCSV(val) {
  const str = String(val ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

function safeName() {
  return (extractedData?.productTitle || 'reviews').slice(0, 40).replace(/[^a-z0-9]/gi, '_');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Export functions ─────────────────────────────────────────────────────────

function exportCSV() {
  if (!extractedData) return;
  const headers = ['Name','Rating','Title','Date','Body','Verified','Helpful','Style','Review URL'];
  const rows = extractedData.reviews.map(r =>
    [r.name,r.rating,r.title,r.date,r.body,r.verified,r.helpful,r.style,r.reviewUrl].map(escapeCSV).join(',')
  );
  downloadFile([headers.join(','), ...rows].join('\n'), `${safeName()}_reviews.csv`, 'text/csv');
}

function exportJSON() {
  if (!extractedData) return;
  downloadFile(JSON.stringify(extractedData, null, 2), `${safeName()}_reviews.json`, 'application/json');
}

function exportTXT() {
  if (!extractedData) return;
  const lines = [
    'AMAZON REVIEWS EXPORT',
    `Product: ${extractedData.productTitle}`,
    `Overall Rating: ${extractedData.overallRating}`,
    `Total Reviews on Page: ${extractedData.reviewCount}`,
    `Extracted At: ${extractedData.extractedAt}`,
    `URL: ${extractedData.pageUrl}`,
    '='.repeat(60), ''
  ];
  extractedData.reviews.forEach((r, i) => {
    lines.push(`[${i+1}] ${r.name} — ${'★'.repeat(Math.round(parseFloat(r.rating)||0))} (${r.rating}/5)`);
    lines.push(`Date: ${r.date}`);
    if (r.title) lines.push(`Title: ${r.title}`);
    if (r.style) lines.push(`Style: ${r.style}`);
    if (r.verified) lines.push(r.verified);
    if (r.helpful) lines.push(r.helpful);
    lines.push('', r.body || '(no review text)', '', '-'.repeat(60), '');
  });
  downloadFile(lines.join('\n'), `${safeName()}_reviews.txt`, 'text/plain');
}

// ─── Build initial UI ─────────────────────────────────────────────────────────

function buildInitialUI(productTitle) {
  mainContent.innerHTML = `
    ${productTitle ? `<div class="product-name show">📦 <span id="productNameSpan">${productTitle.slice(0,55)}</span></div>` : ''}
    <button class="btn-extract" id="btnExtract">⚡ Extract ALL Reviews</button>
    <button class="btn-stop" id="btnStop">■ Stop Extraction</button>

    <div class="progress-block" id="progressBlock">
      <div class="progress-top">
        <div>
          <div class="progress-label">Reviews collected</div>
          <div class="progress-count" id="progressCount">0</div>
          <div class="progress-sub" id="progressSub">Starting...</div>
        </div>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="progressFill"></div>
      </div>
      <div class="page-chips" id="pageChips"></div>
    </div>

    <div class="export-row" id="exportRow">
      <button class="btn-export" id="btnCSV"><span class="icon">📊</span><span>CSV</span></button>
      <button class="btn-export" id="btnJSON"><span class="icon">{ }</span><span>JSON</span></button>
      <button class="btn-export" id="btnTXT"><span class="icon">📄</span><span>TXT</span></button>
    </div>

    <div class="preview-section" id="previewSection">
      <div class="preview-header" id="previewHeader"></div>
      <div class="preview-scroll" id="previewList"></div>
    </div>
  `;

  document.getElementById('btnExtract').addEventListener('click', startExtraction);
  document.getElementById('btnStop').addEventListener('click', stopExtraction);
  document.getElementById('btnCSV').addEventListener('click', exportCSV);
  document.getElementById('btnJSON').addEventListener('click', exportJSON);
  document.getElementById('btnTXT').addEventListener('click', exportTXT);
}

// ─── Progress updates ─────────────────────────────────────────────────────────

function onProgress({ page, collected, addedThisPage }) {
  // Update count
  document.getElementById('progressCount').textContent = collected;
  document.getElementById('progressSub').textContent =
    `Page ${page} · +${addedThisPage} this page`;

  // Update progress bar (estimate based on pages if we don't know total)
  const fill = document.getElementById('progressFill');
  // Animate bar to show activity (cap at 95% until done)
  const pct = Math.min(95, (page / Math.max(page + 2, totalPages)) * 100);
  fill.style.width = pct + '%';

  // Update / add chip
  if (chipMap[page]) {
    chipMap[page].className = 'chip done';
    chipMap[page].textContent = `p${page} ✓`;
  }
  // Add next page chip as "active"
  if (!chipMap[page + 1]) {
    const chip = document.createElement('div');
    chip.className = 'chip active';
    chip.textContent = `p${page + 1}…`;
    chipMap[page + 1] = chip;
    document.getElementById('pageChips').appendChild(chip);
  }
}

// ─── Start extraction ─────────────────────────────────────────────────────────

function startExtraction() {
  isRunning = true;
  chipMap = {};

  const btn = document.getElementById('btnExtract');
  btn.disabled = true;
  btn.textContent = 'Extracting...';

  document.getElementById('btnStop').classList.add('show');
  document.getElementById('progressBlock').classList.add('show');
  document.getElementById('exportRow').classList.remove('show');
  document.getElementById('previewSection').classList.remove('show');

  // Add first page chip
  const chip = document.createElement('div');
  chip.className = 'chip active';
  chip.textContent = 'p1…';
  chipMap[1] = chip;
  document.getElementById('pageChips').appendChild(chip);

  setStatus('blue', 'Paginating through all reviews...');

  // Listen for progress messages from content script
  chrome.runtime.onMessage.addListener(handleProgressMessage);

  chrome.tabs.sendMessage(activeTabId, { action: 'extractAllReviews' }, (response) => {
    chrome.runtime.onMessage.removeListener(handleProgressMessage);
    isRunning = false;

    document.getElementById('btnStop').classList.remove('show');
    const btn2 = document.getElementById('btnExtract');
    btn2.disabled = false;
    btn2.textContent = '⚡ Extract ALL Reviews';

    if (chrome.runtime.lastError || !response?.success) {
      setStatus('err', 'Extraction failed — try reloading the page');
      document.getElementById('progressBlock').classList.remove('show');
      return;
    }

    const data = response.data;
    extractedData = data;

    // Fill progress bar to 100%
    document.getElementById('progressFill').style.width = '100%';
    document.getElementById('progressCount').textContent = data.reviewCount;
    document.getElementById('progressSub').textContent = `Done · all pages complete`;

    // Mark all chips done
    Object.values(chipMap).forEach(c => { c.className = 'chip done'; });

    setStatus('ok', `${data.reviewCount} reviews extracted`);

    // Show export
    document.getElementById('exportRow').classList.add('show');

    // Show preview (last 10)
    renderPreview(data);
  });
}

function handleProgressMessage(msg) {
  if (msg.action === 'progress') {
    onProgress(msg);
  }
}

// ─── Stop extraction ──────────────────────────────────────────────────────────

function stopExtraction() {
  isRunning = false;
  chrome.tabs.sendMessage(activeTabId, { action: 'stopExtraction' }, () => {});
  setStatus('err', 'Stopped by user');
  document.getElementById('btnStop').classList.remove('show');
  const btn = document.getElementById('btnExtract');
  btn.disabled = false;
  btn.textContent = '⚡ Extract ALL Reviews';
}

// ─── Render preview ───────────────────────────────────────────────────────────

function renderPreview(data) {
  const section  = document.getElementById('previewSection');
  const header   = document.getElementById('previewHeader');
  const list     = document.getElementById('previewList');

  header.textContent = `Preview — ${data.reviewCount} reviews extracted`;
  list.innerHTML = '';

  const preview = data.reviews.slice(0, 15);
  preview.forEach(r => {
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div class="review-top">
        <span class="reviewer">${r.name || 'Anonymous'}</span>
        <span class="stars">${renderStars(r.rating)}</span>
      </div>
      ${r.title ? `<div class="review-title-text">${r.title}</div>` : ''}
      ${r.body  ? `<div class="review-body-preview">${r.body}</div>` : ''}
      <div class="review-date">${r.date}${r.verified ? ' · ' + r.verified : ''}</div>
    `;
    list.appendChild(card);
  });

  if (data.reviews.length > 15) {
    const more = document.createElement('div');
    more.style.cssText = 'text-align:center;padding:8px;font-size:10px;color:var(--muted);font-family:DM Mono,monospace;';
    more.textContent = `+ ${data.reviews.length - 15} more — export to see all`;
    list.appendChild(more);
  }

  section.classList.add('show');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  activeTabId = tab?.id;
  const url = tab?.url || '';
  const isAmazon = /amazon\.(in|com|co\.uk|de|co\.jp|ca|com\.au)/.test(url);

  if (!isAmazon) {
    setStatus('err', 'Not an Amazon page');
    mainContent.innerHTML = `
      <div class="not-amazon">
        <div class="emoji">🛍️</div>
        <p>Open an <strong>Amazon product page</strong> with customer reviews, then click the extension.</p>
      </div>`;
    return;
  }

  setStatus('ok', 'Amazon page detected');

  // Quick peek at product name
  chrome.tabs.sendMessage(activeTabId, { action: 'extractReviews' }, (response) => {
    const productTitle = response?.data?.productTitle || '';
    buildInitialUI(productTitle);

    // Estimate total pages from total review count
    const totalStr = response?.data?.totalCount || '';
    const totalMatch = totalStr.replace(/,/g, '').match(/\d+/);
    if (totalMatch) {
      totalPages = Math.ceil(parseInt(totalMatch[0]) / 10);
    }
  });
});
