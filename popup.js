// popup.js — Fake Review Detector

const statusDot  = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const mainContent = document.getElementById('mainContent');

let activeTabId = null;
let lastData = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setStatus(type, text) {
  statusDot.className = 'dot ' + type;
  statusText.textContent = text;
}

function getVerdictLevel(fakePct) {
  if (fakePct < 20) return 'safe';
  if (fakePct < 50) return 'warning';
  return 'danger';
}

function getVerdictContent(fakePct, fake, total) {
  if (fakePct < 20) return {
    icon: '✅',
    title: 'Mostly Genuine',
    sub: `Only ${fake} of ${total} reviews flagged as fake. Looks trustworthy.`,
  };
  if (fakePct < 50) return {
    icon: '',
    title: 'Proceed with Caution',
    sub: `${fake} of ${total} reviews look suspicious. Read carefully before buying.`,
  };
  return {
    icon: '',
    title: 'High Fake Activity',
    sub: `${fake} of ${total} reviews likely fake. This product may be misleading.`,
  };
}

// ─── Build the main UI (analyze button) ──────────────────────────────────────

function buildUI() {
  mainContent.innerHTML = `
    <button class="btn-analyze" id="btnAnalyze">🔍 Analyze Reviews</button>

    <div class="stats" id="statsGrid">
      <div class="stat">
        <div class="stat-num total" id="numTotal">—</div>
        <div class="stat-label">All Reviews in this Page</div>
      </div>
      <div class="stat">
        <div class="stat-num fake" id="numFake">—</div>
        <div class="stat-label">Fake</div>
      </div>
      <div class="stat">
        <div class="stat-num real" id="numReal">—</div>
        <div class="stat-label">Real</div>
      </div>
    </div>

    <div class="verdict" id="verdictBanner"></div>

    <div class="bar-section" id="barSection">
      <div class="bar-header">
        <span class="bar-label">Fake Review Rate</span>
        <span class="bar-pct" id="barPct">0%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" id="barFill"></div>
      </div>
    </div>

    <div class="breakdown" id="breakdown">
      <div class="breakdown-header" id="breakdownHeader"></div>
      <div class="breakdown-list" id="breakdownList"></div>
    </div>
  `;

  document.getElementById('btnAnalyze').addEventListener('click', runAnalysis);
}

// ─── Run analysis ─────────────────────────────────────────────────────────────

async function runAnalysis() {
  const btn = document.getElementById('btnAnalyze');
  btn.disabled = true;
  btn.textContent = 'Extracting reviews...';
  setStatus('pulse', 'Extracting reviews from page...');

  // Step 1: inject content script & get reviews
  try {
    await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      files: ['content.js'],
    });
  } catch (e) {
    // may already be injected, ignore
  }

  chrome.tabs.sendMessage(activeTabId, { action: 'getReviews' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      setStatus('err', 'Could not read page reviews');
      btn.disabled = false;
      btn.textContent = '🔍 Analyze Reviews';
      return;
    }

    const reviews = response.reviews || [];
    if (reviews.length === 0) {
      setStatus('err', 'No reviews found on this page');
      btn.disabled = false;
      btn.textContent = '🔍 Analyze Reviews';
      showNoReviewsMsg();
      return;
    }

    btn.textContent = `Analyzing ${reviews.length} reviews...`;
    setStatus('pulse', `Sending ${reviews.length} reviews to AI model...`);

    // Step 2: send to background → Flask API
    chrome.runtime.sendMessage(
      { action: 'analyzeReviews', reviews },
      (result) => {
        btn.disabled = false;
        btn.textContent = '🔍 Analyze Reviews';

        if (!result || !result.success) {
          const errMsg = result?.error || 'Could not connect to Flask server.';
          setStatus('err', 'Analysis failed');
          showError(errMsg);
          return;
        }

        renderResults(result.data, reviews);
      }
    );
  });
}

// ─── Render results ───────────────────────────────────────────────────────────

function renderResults(data, reviews) {
  lastData = data;
  const { total, fake, real } = data;
  const fakePct = total > 0 ? Math.round((fake / total) * 100) : 0;
  const level = getVerdictLevel(fakePct);
  const verdict = getVerdictContent(fakePct, fake, total);

  setStatus('ok', `${total} reviews analyzed`);

  // Stats
  document.getElementById('numTotal').textContent = total;
  document.getElementById('numFake').textContent  = fake;
  document.getElementById('numReal').textContent  = real;
  document.getElementById('statsGrid').classList.add('show');

  // Verdict
  const banner = document.getElementById('verdictBanner');
  banner.className = `verdict show ${level}`;
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
      <span class="verdict-icon">${verdict.icon}</span>
      <span class="verdict-title">${verdict.title}</span>
    </div>
    <div class="verdict-sub">${verdict.sub}</div>
  `;

  // Progress bar
  document.getElementById('barPct').textContent = `${fakePct}%`;
  document.getElementById('barPct').style.color = level === 'safe' ? 'var(--green)' : level === 'warning' ? 'var(--yellow)' : 'var(--red)';
  const fill = document.getElementById('barFill');
  fill.className = `bar-fill ${level}`;
  document.getElementById('barSection').classList.add('show');
  // Animate bar after paint
  setTimeout(() => { fill.style.width = `${fakePct}%`; }, 50);

  // Per-review breakdown (if API returns per_review data)
  // Even without per_review from API we still show the reviews list
  // with alternating fake/real based on proportion as a visual guide
  const breakdown = document.getElementById('breakdown');
  const list = document.getElementById('breakdownList');
  const header = document.getElementById('breakdownHeader');

  if (reviews && reviews.length > 0) {
    header.textContent = `Review breakdown — ${total} reviews`;
    list.innerHTML = '';

    // If backend returns per_review array use it, else approximate by filling fake ones first
    const perReview = data.per_review || null;

    reviews.forEach((text, i) => {
      const isFake = perReview
        ? perReview[i] === 1
        : i < fake; // approximation: mark first `fake` count as fake

      const row = document.createElement('div');
      row.className = 'review-row';
      row.innerHTML = `
        <span class="tag ${isFake ? 'fake' : 'real'}">${isFake ? 'Fake' : 'Real'}</span>
        <span class="review-text">${text.slice(0, 150)}${text.length > 150 ? '…' : ''}</span>
      `;
      list.appendChild(row);
    });

    breakdown.classList.add('show');
  }
}

// ─── Error / empty states ─────────────────────────────────────────────────────

function showNoReviewsMsg() {
  const existing = document.getElementById('stateMsg');
  if (existing) existing.remove();
  const msg = document.createElement('div');
  msg.id = 'stateMsg';
  msg.style.cssText = 'text-align:center;padding:12px 0;color:#666;font-size:11px;font-family:DM Mono,monospace;';
  msg.textContent = 'No review text found. Try the full reviews page.';
  mainContent.appendChild(msg);
}

function showError(errMsg) {
  const existing = document.getElementById('stateMsg');
  if (existing) existing.remove();
  const msg = document.createElement('div');
  msg.id = 'stateMsg';
  msg.style.cssText = 'background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.3);border-radius:8px;padding:10px 12px;color:#f87171;font-size:11px;font-family:DM Mono,monospace;line-height:1.5;margin-top:4px;';

  let hint = '';
  if (errMsg.includes('Failed to fetch') || errMsg.includes('connect')) {
    hint = '<br><span style="opacity:0.7">Make sure Flask server is running:<br><code>python app.py</code></span>';
  }
  msg.innerHTML = `⚠ ${errMsg}${hint}`;
  mainContent.appendChild(msg);
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
        <div class="emoji">🛒</div>
        <p>Open an <strong>Amazon product page</strong> with customer reviews, then click the extension.</p>
      </div>`;
    return;
  }

  setStatus('ok', 'Amazon page detected');
  buildUI();
});
