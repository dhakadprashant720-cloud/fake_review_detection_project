// content.js - Amazon Review Extractor with Full Pagination
// Strategy: Navigate through review pages using URL manipulation

let isExtracting = false;

// ─── Parse reviews on current page ──────────────────────────────────────────
function parseCurrentPageReviews() {
  const reviews = [];
  const reviewElements = document.querySelectorAll('[data-hook="review"]');

  reviewElements.forEach((el) => {
    try {
      const nameEl = el.querySelector('.a-profile-name');
      const name = nameEl ? nameEl.textContent.trim() : 'Unknown';

      const ratingEl = el.querySelector(
        '[data-hook="review-star-rating"] .a-icon-alt, [data-hook="cmps-review-star-rating"] .a-icon-alt'
      );
      let rating = '';
      if (ratingEl) {
        const match = ratingEl.textContent.match(/[\d.]+/);
        rating = match ? match[0] : '';
      }

      const titleEl = el.querySelector(
        '[data-hook="review-title"] span:not(.a-icon-alt):not(.a-letter-space)'
      );
      const title = titleEl ? titleEl.textContent.trim() : '';

      const dateEl = el.querySelector('[data-hook="review-date"]');
      const date = dateEl
        ? dateEl.textContent.trim().replace(/^Reviewed in .+ on /, '')
        : '';

      const bodyEl = el.querySelector('[data-hook="review-body"] span');
      const body = bodyEl ? bodyEl.innerText.trim() : '';

      const verifiedEl = el.querySelector('[data-hook="avp-badge-linkless"]');
      const verified = verifiedEl ? verifiedEl.textContent.trim() : '';

      const helpfulEl = el.querySelector('[data-hook="helpful-vote-statement"]');
      const helpful = helpfulEl ? helpfulEl.textContent.trim() : '';

      const styleEl = el.querySelector('[data-hook="format-strip-linkless"]');
      const style = styleEl ? styleEl.textContent.trim() : '';

      const linkEl = el.querySelector('[data-hook="review-title"]');
      const reviewUrl = linkEl ? linkEl.href : '';

      reviews.push({ name, rating, title, date, body, verified, helpful, style, reviewUrl });
    } catch (e) {
      // skip broken review
    }
  });

  return reviews;
}

// ─── Get product meta ────────────────────────────────────────────────────────
function getProductMeta() {
  const productTitleEl =
    document.querySelector('#productTitle') ||
    document.querySelector('[data-hook="product-link"]');
  const productTitle = productTitleEl ? productTitleEl.textContent.trim() : document.title;

  const totalCountEl = document.querySelector('[data-hook="total-review-count"]');
  const totalCount = totalCountEl ? totalCountEl.textContent.trim() : '';

  const overallRatingEl = document.querySelector('[data-hook="rating-out-of-text"]');
  const overallRating = overallRatingEl ? overallRatingEl.textContent.trim() : '';

  return { productTitle, totalCount, overallRating };
}

// ─── Extract ASIN from current URL ──────────────────────────────────────────
function getASIN() {
  // Try URL patterns: /dp/ASIN, /product-reviews/ASIN
  const url = window.location.href;
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/product-reviews\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /[?&]asin=([A-Z0-9]{10})/,
  ];
  for (const pat of patterns) {
    const m = url.match(pat);
    if (m) return m[1];
  }
  return null;
}

// ─── Get base domain ─────────────────────────────────────────────────────────
function getAmazonBase() {
  return window.location.origin; // e.g. https://www.amazon.in
}

// ─── Find next page link (multiple strategies) ───────────────────────────────
function getNextPageInfo() {
  // Strategy 1: Standard pagination "li.a-last a"
  const lastLi = document.querySelector('li.a-last:not(.a-disabled)');
  if (lastLi) {
    const a = lastLi.querySelector('a');
    if (a && a.href) return { type: 'link', href: a.href };
  }

  // Strategy 2: Any link with pageNumber in href
  const allLinks = Array.from(document.querySelectorAll('a[href*="pageNumber"]'));
  const currentPage = getCurrentPageNumber();
  const nextPageLink = allLinks.find(a => {
    const m = a.href.match(/pageNumber=(\d+)/);
    return m && parseInt(m[1]) === currentPage + 1;
  });
  if (nextPageLink) return { type: 'link', href: nextPageLink.href };

  // Strategy 3: "See more reviews" link
  const seeMoreLink = document.querySelector('[data-hook="see-all-reviews-link-foot"]');
  if (seeMoreLink && seeMoreLink.href && !seeMoreLink.href.includes('javascript')) {
    return { type: 'link', href: seeMoreLink.href };
  }

  // Strategy 4: Build URL manually if we're on product-reviews page
  if (window.location.href.includes('/product-reviews/')) {
    const asin = getASIN();
    if (asin) {
      const nextPage = currentPage + 1;
      const base = getAmazonBase();
      const url = `${base}/product-reviews/${asin}/ref=cm_cr_getr_d_paging_btm_next_${nextPage}?ie=UTF8&reviewerType=all_reviews&pageNumber=${nextPage}`;
      return { type: 'url', href: url };
    }
  }

  return null;
}

// ─── Get current page number from URL or pagination ──────────────────────────
function getCurrentPageNumber() {
  const urlMatch = window.location.href.match(/pageNumber=(\d+)/);
  if (urlMatch) return parseInt(urlMatch[1]);

  // Check active page in pagination
  const activePage = document.querySelector('.a-pagination .a-selected a, .a-pagination li.a-selected span');
  if (activePage) {
    const n = parseInt(activePage.textContent.trim());
    if (!isNaN(n)) return n;
  }

  // Check if we have the reviews list at all
  const hasReviews = document.querySelectorAll('[data-hook="review"]').length > 0;
  return hasReviews ? 1 : 0;
}

// ─── Wait for reviews to appear on page ──────────────────────────────────────
function waitForReviews(timeoutMs = 12000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const els = document.querySelectorAll('[data-hook="review"]');
      if (els.length > 0) { resolve(true); return; }
      if (Date.now() - start > timeoutMs) { resolve(false); return; }
      setTimeout(check, 400);
    };
    setTimeout(check, 500);
  });
}

// ─── Wait for page content to change after navigation ────────────────────────
function waitForPageChange(prevFirstReviewer, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const els = document.querySelectorAll('[data-hook="review"]');
      if (els.length > 0) {
        const firstReviewer = els[0].querySelector('.a-profile-name')?.textContent?.trim() || '';
        if (firstReviewer && firstReviewer !== prevFirstReviewer) {
          resolve(true);
          return;
        }
      }
      if (Date.now() - start > timeoutMs) { resolve(false); return; }
      setTimeout(check, 400);
    };
    setTimeout(check, 800);
  });
}

// ─── Navigate to reviews page if we're on product page ───────────────────────
function getReviewsPageURL() {
  const asin = getASIN();
  if (!asin) return null;
  const base = getAmazonBase();
  return `${base}/product-reviews/${asin}?ie=UTF8&reviewerType=all_reviews&pageNumber=1`;
}

// ─── Main extraction function ─────────────────────────────────────────────────
async function extractAllReviews(onProgress) {
  const meta = getProductMeta();
  const allReviews = [];
  const seenKeys = new Set();

  let pageNum = 1;
  const MAX_PAGES = 500;

  // If we're on a product page (not reviews page), we need to navigate to reviews
  const isOnReviewsPage = window.location.href.includes('/product-reviews/');
  const isOnProductPage = window.location.href.includes('/dp/') || 
                          window.location.href.includes('/gp/product/');

  if (isOnProductPage && !isOnReviewsPage) {
    // Navigate to the dedicated reviews page
    const reviewsUrl = getReviewsPageURL();
    if (reviewsUrl) {
      window.location.href = reviewsUrl;
      // Wait for page load
      await new Promise(r => setTimeout(r, 3000));
      await waitForReviews(15000);
    }
  }

  while (pageNum <= MAX_PAGES && isExtracting) {
    // Wait for reviews to be present
    const hasReviews = await waitForReviews(10000);
    if (!hasReviews) {
      console.log('No reviews found on page', pageNum);
      break;
    }

    // Scroll to make reviews visible
    const reviewSection = document.querySelector('#cm-cr-dp-review-list') ||
      document.querySelector('[data-hook="top-customer-reviews-widget"]') ||
      document.querySelector('[data-hook="review"]');
    if (reviewSection) {
      reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      await new Promise(r => setTimeout(r, 500));
    }

    const pageReviews = parseCurrentPageReviews();
    let added = 0;
    for (const r of pageReviews) {
      const key = r.reviewUrl || `${r.name}||${r.title}||${r.date}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allReviews.push(r);
        added++;
      }
    }

    onProgress({ page: pageNum, collected: allReviews.length, addedThisPage: added });

    // Find next page
    const nextInfo = getNextPageInfo();
    if (!nextInfo) {
      console.log('No next page found at page', pageNum);
      break;
    }

    // Record current reviewer to detect change
    const prevFirstReviewer =
      document.querySelector('[data-hook="review"] .a-profile-name')?.textContent?.trim() || '';

    // Scroll to next page button and click / navigate
    if (nextInfo.type === 'link') {
      // Find the actual element and click it, or navigate via href
      const nextEl = document.querySelector('li.a-last:not(.a-disabled) a');
      if (nextEl) {
        nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 600));
        nextEl.click();
      } else {
        window.location.href = nextInfo.href;
      }
    } else {
      window.location.href = nextInfo.href;
    }

    // Wait for new reviews to load
    const changed = await waitForPageChange(prevFirstReviewer, 15000);
    if (!changed) {
      // Try waiting longer
      await new Promise(r => setTimeout(r, 3000));
      const stillNoChange = document.querySelector('[data-hook="review"] .a-profile-name')?.textContent?.trim() === prevFirstReviewer;
      if (stillNoChange) {
        console.log('Page did not change after navigation, stopping');
        break;
      }
    }

    pageNum++;
    // Small delay between pages to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  return {
    ...meta,
    pageUrl: window.location.href,
    extractedAt: new Date().toISOString(),
    reviewCount: allReviews.length,
    reviews: allReviews,
  };
}

// ─── Message listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'extractReviews') {
    try {
      const meta = getProductMeta();
      const reviews = parseCurrentPageReviews();
      sendResponse({
        success: true,
        data: {
          ...meta,
          pageUrl: window.location.href,
          extractedAt: new Date().toISOString(),
          reviewCount: reviews.length,
          reviews,
        },
      });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }

  if (request.action === 'extractAllReviews') {
    if (isExtracting) {
      sendResponse({ success: false, error: 'Already extracting' });
      return true;
    }
    isExtracting = true;

    extractAllReviews((progress) => {
      try {
        chrome.runtime.sendMessage({ action: 'progress', ...progress });
      } catch (e) {}
    })
      .then((data) => {
        isExtracting = false;
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        isExtracting = false;
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  if (request.action === 'stopExtraction') {
    isExtracting = false;
    sendResponse({ success: true });
    return true;
  }
});
