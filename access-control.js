/**
 * Access Control - Enforce Hub Access Only
 * Add this file to your project and include it in index.html
 */

(function() {
  const ALLOWED_ORIGINS = [
    'https://statelessplatform.com',
    'https://www.statelessplatform.com',
    'http://localhost:3000',
    'http://localhost:5500'
  ];

  const HUB_URL = 'https://statelessplatform.com';
  const MAX_REDIRECT_ATTEMPTS = 2; // Prevent infinite loops

  function getRedirectAttempts() {
    const attempts = sessionStorage.getItem('redirectAttempts') || '0';
    return parseInt(attempts);
  }

  function incrementRedirectAttempts() {
    const attempts = getRedirectAttempts() + 1;
    sessionStorage.setItem('redirectAttempts', attempts.toString());
  }

  function isAccessAllowed() {
    const currentOrigin = window.location.origin;
    const referrer = document.referrer;
    
    // Allow if same origin (localhost for dev)
    if (ALLOWED_ORIGINS.includes(currentOrigin)) {
      return true;
    }

    // Check referrer
    if (referrer && ALLOWED_ORIGINS.some(origin => referrer.includes(origin))) {
      sessionStorage.removeItem('redirectAttempts');
      return true;
    }

    // Check if opened from hub (sessionStorage flag)
    const isFromHub = sessionStorage.getItem('hubReferrer') === 'statelessplatform.com';
    if (isFromHub) {
      sessionStorage.removeItem('redirectAttempts');
      return true;
    }

    return false;
  }

  function enforceHubAccess() {
    if (!isAccessAllowed()) {
      const attempts = getRedirectAttempts();

      // Prevent infinite redirect loop
      if (attempts >= MAX_REDIRECT_ATTEMPTS) {
        console.error('Too many redirect attempts. Access denied.');
        return;
      }

      incrementRedirectAttempts();
      console.warn('Access denied. Redirecting to hub...');
      window.location.replace(HUB_URL);
    } else {
      // Access allowed, clear counter
      sessionStorage.removeItem('redirectAttempts');
    }
  }

  // Run immediately (don't wait for DOMContentLoaded)
  enforceHubAccess();
})();
