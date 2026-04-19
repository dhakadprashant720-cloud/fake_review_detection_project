// content.js - Extracts review text from Amazon product pages

function extractReviews() {
  const reviews = [];

  // Primary selector - review body text
  document.querySelectorAll('[data-hook="review-body"]').forEach((el) => {
    const text = el.innerText.trim();
    if (text.length > 5) reviews.push(text);
  });

  // Fallback: span inside review-body
  if (reviews.length === 0) {
    document.querySelectorAll('[data-hook="review-body"] span').forEach((el) => {
      const text = el.innerText.trim();
      if (text.length > 5) reviews.push(text);
    });
  }

  return reviews;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getReviews') {
    const reviews = extractReviews();
    sendResponse({ reviews });
  }
  return true;
});
