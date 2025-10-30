/**
 * Access Control - Enforce Hub Access Only
 * Add this file to your project and include it in index.html
 * 
 * Usage in index.html:
 * <script src="access-control.js"></script>
 */

(function() {
  const ALLOWED_ORIGINS = [
    'https://statelessplatform.com',
    'https://www.statelessplatform.com',
    'http://localhost:3000',
    'http://localhost:5500'
  ];

  const HUB_URL = 'https://statelessplatform.com';

  function isAccessAllowed() {
    const currentOrigin = window.location.origin;
    const referrer = document.referrer;

    // Check if accessed from allowed origin
    if (ALLOWED_ORIGINS.includes(currentOrigin)) {
      return true;
    }

    // Check if referred from hub
    if (referrer && ALLOWED_ORIGINS.some(origin => referrer.startsWith(origin))) {
      return true;
    }

    return false;
  }

  function enforceHubAccess() {
    if (!isAccessAllowed()) {
      console.warn('Direct access denied. Redirecting to hub...');
      window.location.replace(HUB_URL);
    }
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceHubAccess);
  } else {
    enforceHubAccess();
  }
})();
