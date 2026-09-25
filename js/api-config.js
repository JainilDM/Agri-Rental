/**
 * API Configuration & Future Backend Integration Endpoints
 * 
 * This file serves as the centralized configuration for future full-stack integration.
 * When the backend (Node.js/Express, Python/Django/FastAPI, Java/Spring Boot, etc.)
 * is created, update API_BASE_URL and connect the respective endpoints.
 */

export const API_CONFIG = {
  // Update this to your deployed backend URL or local dev server (e.g. http://localhost:5000/api)
  BASE_URL: 'http://localhost:5000/api',

  // Authentication & User Endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER_FARMER: '/auth/register/farmer',
    REGISTER_OWNER: '/auth/register/owner',
    ME: '/auth/me',
    LOGOUT: '/auth/logout'
  },

  // Machinery Management Endpoints
  MACHINERY: {
    LIST_ALL: '/machinery',               // GET: Browse & filter machines
    GET_DETAILS: (id) => `/machinery/${id}`, // GET: Machine specifications & photos
    CREATE_LISTING: '/machinery/new',     // POST: For machine owners to list equipment
    UPDATE_LISTING: (id) => `/machinery/${id}`, // PUT/PATCH: Update machine details
    DELETE_LISTING: (id) => `/machinery/${id}`, // DELETE: Remove machine
    SEARCH: '/machinery/search'           // GET: Query by category, location, date
  },

  // Rental & Booking Flow Endpoints
  RENTALS: {
    CREATE_REQUEST: '/rentals/request',   // POST: Farmer sends rental request
    GET_MY_REQUESTS: '/rentals/my-requests', // GET: Farmer's requested rentals
    GET_OWNER_REQUESTS: '/rentals/owner-requests', // GET: Equipment owner incoming requests
    UPDATE_STATUS: (id) => `/rentals/${id}/status`, // PATCH: Accept, reject, or complete
    CREATE_REVIEW: (id) => `/rentals/${id}/review`  // POST: Submit rating and review
  }
};

/**
 * Example helper function showing how frontend components can fetch data
 * once the backend is ready:
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`[Backend API Notice]: Request to ${url} failed. Backend is not yet connected.`, error);
    return null;
  }
}
