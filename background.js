// background.js - Service Worker
// Handles API calls to Flask backend (avoids CSP issues in injected scripts)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeReviews') {
    const reviews = request.reviews;

    if (!reviews || reviews.length === 0) {
      sendResponse({ success: false, error: 'No reviews found on this page.' });
      return true;
    }
    // fetch('https://amazon-fake-reviews-detection.onrender.com')
    fetch('https://amazon-fake-reviews-detection.onrender.com/analyze_reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });

    return true; // keep message channel open for async
  }
});
