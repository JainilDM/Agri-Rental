/**
 * Unified Authentication Token Helper Functions
 * Shared helper for localStorage key management across Agri-Rental frontend.
 */

function getAuthToken() {
  return localStorage.getItem('agri_auth_token') ||
         localStorage.getItem('agri_owner_token') ||
         localStorage.getItem('agri_farmer_token') ||
         null;
}

function setAuthToken(token) {
  if (!token) return;
  localStorage.setItem('agri_auth_token', token);
  localStorage.setItem('agri_owner_token', token);
  localStorage.setItem('agri_farmer_token', token);
}

function clearAuthTokens() {
  localStorage.removeItem('agri_auth_token');
  localStorage.removeItem('agri_owner_token');
  localStorage.removeItem('agri_farmer_token');
}

function handleSharedLogout(redirectUrl = 'index.html') {
  clearAuthTokens();
  if (typeof window !== 'undefined' && window.location) {
    window.location.href = redirectUrl;
  }
}

// Attach to window object for global availability across classic and module scripts
if (typeof window !== 'undefined') {
  window.getAuthToken = window.getAuthToken || getAuthToken;
  window.setAuthToken = window.setAuthToken || setAuthToken;
  window.clearAuthTokens = window.clearAuthTokens || clearAuthTokens;
  window.handleSharedLogout = window.handleSharedLogout || handleSharedLogout;
}
