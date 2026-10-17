/**
 * Agricultural Rental Machinery - Main Client Controller
 */
import { API_CONFIG } from './api-config.js';

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initModals();
  initActionHandlers();
  console.log('Agricultural Rental Machinery frontend loaded successfully.');
  console.log('API endpoints prepared for backend integration:', API_CONFIG);
});

/**
 * Mobile Navigation Drawer Toggle
 */
function initMobileNav() {
  const toggleBtn = document.getElementById('menuToggleBtn');
  const drawer = document.getElementById('mobileNavDrawer');

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      drawer.classList.remove('open');
      toggleBtn.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    } else {
      drawer.classList.add('open');
      toggleBtn.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
  });

  // Close drawer on link click
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggleBtn.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Generic Modal Handler
 */
export function closeModal() {
  const modalOverlay = document.getElementById('appModal');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function initModals() {
  const modalOverlay = document.getElementById('appModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalOkBtn = document.getElementById('modalOkBtn');

  if (!modalOverlay) return;

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalOkBtn) modalOkBtn.addEventListener('click', closeModal);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
      closeModal();
    }
  });
}

export function openModal(title, contentHtml) {
  const modalOverlay = document.getElementById('appModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  if (!modalOverlay || !modalTitle || !modalBody) return;

  modalTitle.textContent = title;
  modalBody.innerHTML = contentHtml;
  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Server-verified Session Checker
 * Does not rely solely on localStorage; verifies token against backend.
 */
export async function verifyServerSession() {
  const token = typeof window.getAuthToken === 'function'
    ? window.getAuthToken()
    : (localStorage.getItem('agri_auth_token') || localStorage.getItem('agri_owner_token') || localStorage.getItem('agri_farmer_token'));

  if (!token) return false;

  try {
    const res = await fetch('http://localhost:5000/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      return true;
    } else {
      if (typeof window.clearAuthTokens === 'function') {
        window.clearAuthTokens();
      } else {
        localStorage.removeItem('agri_auth_token');
        localStorage.removeItem('agri_owner_token');
        localStorage.removeItem('agri_farmer_token');
      }
      return false;
    }
  } catch (err) {
    console.warn('Session verification server check failed:', err);
    return false;
  }
}

/**
 * Update Header and Mobile Button States Based on Authentication
 */
async function updateHeaderAuthState() {
  const headerBtn = document.getElementById('headerActionBtn');
  const mobileBtn = document.getElementById('mobileActionBtn');
  if (!headerBtn && !mobileBtn) return;

  const isAuthed = await verifyServerSession();
  const label = isAuthed ? 'LOGOUT' : 'LOGIN / SIGN UP';

  if (headerBtn) headerBtn.textContent = label;
  if (mobileBtn) mobileBtn.textContent = label;
}

/**
 * Open Authentication Modal (Sign In / Sign Up)
 * Supports destination routing to farmer.html or owner.html
 */
export function openLoginSignUpModal(eOrDestination, explicitDestination) {
  if (eOrDestination && typeof eOrDestination.preventDefault === 'function') {
    eOrDestination.preventDefault();
  }

  let currentDestination = 'farmer.html';
  if (typeof explicitDestination === 'string' && explicitDestination) {
    currentDestination = explicitDestination;
  } else if (typeof eOrDestination === 'string' && eOrDestination) {
    currentDestination = eOrDestination;
  } else if (eOrDestination && eOrDestination.currentTarget) {
    const targetEl = eOrDestination.currentTarget;
    const href = targetEl.getAttribute ? (targetEl.getAttribute('href') || '') : '';
    if (targetEl.id === 'listMachineBtn' || targetEl.id === 'navListMachine' || targetEl.id === 'btnListMachine' || href.includes('owner.html')) {
      currentDestination = 'owner.html';
    } else {
      currentDestination = 'farmer.html';
    }
  }

  const isOwnerDest = currentDestination.includes('owner.html');

  const contentHtml = `
    <div class="auth-modal-wrapper" style="font-family: inherit;">
      <!-- Destination Routing Indicator & Switcher -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.25rem; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em; display: block;">Destination Portal</span>
          <span style="font-size: 0.9rem; font-weight: 600; color: #0f172a;" id="modalDestDisplay">
            ${isOwnerDest ? '🚜 List Machine (Equipment Owner)' : '🌾 Find Machinery (Renter)'}
          </span>
        </div>
        <div style="display: flex; gap: 0.35rem;" role="group" aria-label="Selected Portal Destination">
          <button type="button" id="destToggleFarmer" class="btn-dest-toggle" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 4px; border: 1px solid ${!isOwnerDest ? '#FFBF00' : '#cbd5e1'}; background: ${!isOwnerDest ? '#FFBF00' : '#ffffff'}; color: #0f172a; font-weight: 600; cursor: pointer;">
            Renter
          </button>
          <button type="button" id="destToggleOwner" class="btn-dest-toggle" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-radius: 4px; border: 1px solid ${isOwnerDest ? '#FFBF00' : '#cbd5e1'}; background: ${isOwnerDest ? '#FFBF00' : '#ffffff'}; color: #0f172a; font-weight: 600; cursor: pointer;">
            Owner
          </button>
        </div>
      </div>

      <!-- Auth Mode Tabs (Sign In vs Sign Up) -->
      <div style="display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.25rem;" role="tablist">
        <button type="button" id="tabBtnModalLogin" class="modal-auth-tab active" role="tab" aria-selected="true" style="flex: 1; padding: 0.75rem; background: none; border: none; border-bottom: 3px solid #FFBF00; font-weight: 700; font-size: 0.95rem; color: #0f172a; cursor: pointer;">
          Sign In
        </button>
        <button type="button" id="tabBtnModalSignup" class="modal-auth-tab" role="tab" aria-selected="false" style="flex: 1; padding: 0.75rem; background: none; border: none; border-bottom: 3px solid transparent; font-weight: 600; font-size: 0.95rem; color: #64748b; cursor: pointer;">
          Create Account
        </button>
      </div>

      <!-- Sign In Form Panel -->
      <div id="modalLoginPanel" role="tabpanel" style="display: block;">
        <form id="modalAuthLoginForm" style="display: flex; flex-direction: column; gap: 0.9rem;">
          <div>
            <label for="modalLoginEmail" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">Email Address</label>
            <input type="email" id="modalLoginEmail" class="form-control" placeholder="user@example.com" required autocomplete="email" style="width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem;">
          </div>
          <div>
            <label for="modalLoginPassword" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">Password</label>
            <input type="password" id="modalLoginPassword" class="form-control" placeholder="••••••••" required autocomplete="current-password" style="width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem;">
          </div>
          <button type="submit" id="modalLoginSubmitBtn" class="btn-take-action" style="width: 100%; padding: 0.75rem; font-size: 0.95rem; font-weight: 700; border: none; border-radius: 6px; cursor: pointer; margin-top: 0.25rem;">
            Sign In &amp; Continue
          </button>
        </form>
        <div id="modalLoginFeedback" style="margin-top: 0.85rem; padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.88rem; display: none;" role="alert"></div>
      </div>

      <!-- Create Account Form Panel -->
      <div id="modalSignupPanel" role="tabpanel" style="display: none;">
        <form id="modalAuthSignupForm" style="display: flex; flex-direction: column; gap: 0.9rem;">
          <div>
            <label for="modalSignupName" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">Full Name</label>
            <input type="text" id="modalSignupName" class="form-control" placeholder="e.g. Ramesh Patel" required style="width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem;">
          </div>
          <div>
            <label for="modalSignupEmail" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">Email Address</label>
            <input type="email" id="modalSignupEmail" class="form-control" placeholder="user@example.com" required autocomplete="email" style="width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem;">
          </div>
          <div>
            <label for="modalSignupPassword" style="display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 0.35rem;">Password (Min 8 characters)</label>
            <input type="password" id="modalSignupPassword" class="form-control" placeholder="••••••••" minlength="8" required autocomplete="new-password" style="width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem;">
          </div>
          <button type="submit" id="modalSignupSubmitBtn" class="btn-take-action" style="width: 100%; padding: 0.75rem; font-size: 0.95rem; font-weight: 700; border: none; border-radius: 6px; cursor: pointer; margin-top: 0.25rem;">
            Create Account &amp; Continue
          </button>
        </form>
        <div id="modalSignupFeedback" style="margin-top: 0.85rem; padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.88rem; display: none;" role="alert"></div>
      </div>

      <p style="margin: 1.25rem 0 0; font-size: 0.82rem; color: #64748b; text-align: center; line-height: 1.4;">
        One account gives you access to both <strong>Renting</strong> and <strong>Listing</strong> agricultural machinery.
      </p>
    </div>
  `;

  openModal('Sign In or Register', contentHtml);

  // Bind interactive elements inside the opened modal
  const tabLogin = document.getElementById('tabBtnModalLogin');
  const tabSignup = document.getElementById('tabBtnModalSignup');
  const panelLogin = document.getElementById('modalLoginPanel');
  const panelSignup = document.getElementById('modalSignupPanel');
  const destDisplay = document.getElementById('modalDestDisplay');
  const toggleFarmer = document.getElementById('destToggleFarmer');
  const toggleOwner = document.getElementById('destToggleOwner');

  function updateDestUI(dest) {
    currentDestination = dest;
    const isOwner = dest.includes('owner.html');
    if (destDisplay) {
      destDisplay.textContent = isOwner
        ? '🚜 List Machine (Equipment Owner)'
        : '🌾 Find Machinery (Renter)';
    }
    if (toggleFarmer) {
      toggleFarmer.style.background = !isOwner ? '#FFBF00' : '#ffffff';
      toggleFarmer.style.borderColor = !isOwner ? '#FFBF00' : '#cbd5e1';
    }
    if (toggleOwner) {
      toggleOwner.style.background = isOwner ? '#FFBF00' : '#ffffff';
      toggleOwner.style.borderColor = isOwner ? '#FFBF00' : '#cbd5e1';
    }
  }

  if (toggleFarmer) {
    toggleFarmer.addEventListener('click', () => updateDestUI('farmer.html'));
  }
  if (toggleOwner) {
    toggleOwner.addEventListener('click', () => updateDestUI('owner.html'));
  }

  if (tabLogin && tabSignup && panelLogin && panelSignup) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabLogin.style.borderBottomColor = '#FFBF00';
      tabLogin.style.color = '#0f172a';
      tabLogin.setAttribute('aria-selected', 'true');

      tabSignup.classList.remove('active');
      tabSignup.style.borderBottomColor = 'transparent';
      tabSignup.style.color = '#64748b';
      tabSignup.setAttribute('aria-selected', 'false');

      panelLogin.style.display = 'block';
      panelSignup.style.display = 'none';
    });

    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabSignup.style.borderBottomColor = '#FFBF00';
      tabSignup.style.color = '#0f172a';
      tabSignup.setAttribute('aria-selected', 'true');

      tabLogin.classList.remove('active');
      tabLogin.style.borderBottomColor = 'transparent';
      tabLogin.style.color = '#64748b';
      tabLogin.setAttribute('aria-selected', 'false');

      panelSignup.style.display = 'block';
      panelLogin.style.display = 'none';
    });
  }

  // Handle Login Form Submit
  const loginForm = document.getElementById('modalAuthLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = document.getElementById('modalLoginEmail').value.trim();
      const password = document.getElementById('modalLoginPassword').value;
      const feedback = document.getElementById('modalLoginFeedback');
      const submitBtn = document.getElementById('modalLoginSubmitBtn');

      if (!email || !password) {
        feedback.style.display = 'block';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#b91c1c';
        feedback.textContent = 'Please enter both email and password.';
        return;
      }

      feedback.style.display = 'block';
      feedback.style.background = '#e0f2fe';
      feedback.style.color = '#0284c7';
      feedback.textContent = 'Signing in securely...';
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.token) {
          if (typeof window.setAuthToken === 'function') {
            window.setAuthToken(data.token);
          } else {
            localStorage.setItem('agri_auth_token', data.token);
            localStorage.setItem('agri_owner_token', data.token);
            localStorage.setItem('agri_farmer_token', data.token);
          }
          feedback.style.background = '#dcfce7';
          feedback.style.color = '#15803d';
          const userName = (data.user && data.user.name) || (data.farmer && data.farmer.name) || 'User';
          feedback.textContent = `✓ Welcome, ${userName}! Opening portal...`;

          updateHeaderAuthState();

          setTimeout(() => {
            window.location.href = currentDestination;
          }, 700);
        } else {
          feedback.style.background = '#fee2e2';
          feedback.style.color = '#b91c1c';
          feedback.textContent = data.message || 'Login failed. Please check your credentials.';
          if (submitBtn) submitBtn.disabled = false;
        }
      } catch (err) {
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#b91c1c';
        feedback.textContent = 'Network error. Please ensure the backend server is running.';
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Handle Signup Form Submit
  const signupForm = document.getElementById('modalAuthSignupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const name = document.getElementById('modalSignupName').value.trim();
      const email = document.getElementById('modalSignupEmail').value.trim();
      const password = document.getElementById('modalSignupPassword').value;
      const feedback = document.getElementById('modalSignupFeedback');
      const submitBtn = document.getElementById('modalSignupSubmitBtn');

      if (!name || !email || !password) {
        feedback.style.display = 'block';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#b91c1c';
        feedback.textContent = 'All fields are required.';
        return;
      }
      if (password.length < 8) {
        feedback.style.display = 'block';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#b91c1c';
        feedback.textContent = 'Password must be at least 8 characters long.';
        return;
      }

      feedback.style.display = 'block';
      feedback.style.background = '#e0f2fe';
      feedback.style.color = '#0284c7';
      feedback.textContent = 'Creating account...';
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch('http://localhost:5000/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (res.ok) {
          feedback.style.background = '#e0f2fe';
          feedback.style.color = '#0284c7';
          feedback.textContent = 'Account created! Authenticating...';

          try {
            const loginRes = await fetch('http://localhost:5000/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();

            if (loginRes.ok && loginData.token) {
              if (typeof window.setAuthToken === 'function') {
                window.setAuthToken(loginData.token);
              } else {
                localStorage.setItem('agri_auth_token', loginData.token);
                localStorage.setItem('agri_owner_token', loginData.token);
                localStorage.setItem('agri_farmer_token', loginData.token);
              }
              feedback.style.background = '#dcfce7';
              feedback.style.color = '#15803d';
              feedback.textContent = `✓ Account ready! Opening portal...`;

              updateHeaderAuthState();

              setTimeout(() => {
                window.location.href = currentDestination;
              }, 700);
            } else {
              feedback.style.background = '#dcfce7';
              feedback.style.color = '#15803d';
              feedback.textContent = '✓ Account created successfully! Please sign in.';
              if (tabLogin) tabLogin.click();
              if (submitBtn) submitBtn.disabled = false;
            }
          } catch (loginErr) {
            feedback.style.background = '#dcfce7';
            feedback.style.color = '#15803d';
            feedback.textContent = '✓ Account created successfully! Please sign in.';
            if (tabLogin) tabLogin.click();
            if (submitBtn) submitBtn.disabled = false;
          }
        } else {
          feedback.style.background = '#fee2e2';
          feedback.style.color = '#b91c1c';
          feedback.textContent = data.message || 'Signup failed. Please try again.';
          if (submitBtn) submitBtn.disabled = false;
        }
      } catch (err) {
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#b91c1c';
        feedback.textContent = 'Network error. Please ensure the backend server is running.';
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

// Make accessible on window object
if (typeof window !== 'undefined') {
  window.openLoginSignUpModal = openLoginSignUpModal;
  window.closeModal = closeModal;
  window.verifyServerSession = verifyServerSession;
}

/**
 * Interactive Action Handlers for Buttons & Demo Video Links
 */
function initActionHandlers() {
  // Update header buttons on load
  updateHeaderAuthState();

  // Demo Video 1 (Renting)
  const rentVideoBtn = document.getElementById('demoVideoRentBtn');
  if (rentVideoBtn) {
    rentVideoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(
        'Demo Video: Renting Machinery',
        `
        <div style="text-align: center; padding: 1.5rem 0;">
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 2.5rem 1rem; border: 2px dashed #cbd5e1; margin-bottom: 1.25rem;">
            <svg style="width: 48px; height: 48px; fill: #1D4ED8; margin-bottom: 0.75rem;" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <h4 style="color: #111827; margin-bottom: 0.5rem; font-weight: 700;">Demo Video Player Placeholder</h4>
            <p style="color: #64748b; font-size: 0.9rem; margin: 0;">
              Connect your YouTube embed, Vimeo link, or MP4 video player here.
            </p>
          </div>
          <p style="font-size: 0.95rem; color: #374151;">
            Demonstrates how renters register, browse local tractors & harvesters, and place booking requests.
          </p>
        </div>
        `
      );
    });
  }

  // Demo Video 2 (Registering / Listing)
  const registerVideoBtn = document.getElementById('demoVideoRegisterBtn');
  if (registerVideoBtn) {
    registerVideoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(
        'Demo Video: Registering Machinery',
        `
        <div style="text-align: center; padding: 1.5rem 0;">
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 2.5rem 1rem; border: 2px dashed #cbd5e1; margin-bottom: 1.25rem;">
            <svg style="width: 48px; height: 48px; fill: #1D4ED8; margin-bottom: 0.75rem;" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <h4 style="color: #111827; margin-bottom: 0.5rem; font-weight: 700;">Demo Video Player Placeholder</h4>
            <p style="color: #64748b; font-size: 0.9rem; margin: 0;">
              Connect your equipment owner walkthrough video here.
            </p>
          </div>
          <p style="font-size: 0.95rem; color: #374151;">
            Shows machinery owners how to photograph their equipment, set availability calendar, and manage rental requests.
          </p>
        </div>
        `
      );
    });
  }

  // Top-right and Mobile "LOGIN / SIGN UP" Action Buttons
  const loginActionBtns = [
    document.getElementById('headerActionBtn'),
    document.getElementById('mobileActionBtn')
  ].filter(Boolean);

  loginActionBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const isAuthed = await verifyServerSession();
      if (isAuthed) {
        // User is logged in: clicking LOGOUT logs out
        if (typeof window.clearAuthTokens === 'function') {
          window.clearAuthTokens();
        } else {
          localStorage.removeItem('agri_auth_token');
          localStorage.removeItem('agri_owner_token');
          localStorage.removeItem('agri_farmer_token');
        }
        loginActionBtns.forEach(b => { b.textContent = 'LOGIN / SIGN UP'; });
        showToast('You have logged out successfully.');
      } else {
        openLoginSignUpModal(e, 'farmer.html');
      }
    });
  });

  // Find Machinery buttons & nav links (Renter portal)
  const findMachineryElements = [
    document.getElementById('findMachineryBtn'),
    document.getElementById('navFindMachinery'),
    document.getElementById('btnFindMachinery')
  ].filter(Boolean);

  findMachineryElements.forEach(el => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      const isAuthed = await verifyServerSession();
      if (isAuthed) {
        window.location.href = 'farmer.html';
      } else {
        openLoginSignUpModal(e, 'farmer.html');
      }
    });
  });

  // List Machine buttons & nav links (Owner portal)
  const listMachineElements = [
    document.getElementById('listMachineBtn'),
    document.getElementById('navListMachine'),
    document.getElementById('btnListMachine')
  ].filter(Boolean);

  listMachineElements.forEach(el => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      const isAuthed = await verifyServerSession();
      if (isAuthed) {
        window.location.href = 'owner.html';
      } else {
        openLoginSignUpModal(e, 'owner.html');
      }
    });
  });

  // Mobile navigation drawer links to portals
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  mobileNavLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes('farmer.html') || href.includes('owner.html')) {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const drawer = document.getElementById('mobileNavDrawer');
        const toggleBtn = document.getElementById('menuToggleBtn');
        if (drawer) drawer.classList.remove('open');
        if (toggleBtn) {
          toggleBtn.classList.remove('open');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }

        const targetPortal = href.includes('owner.html') ? 'owner.html' : 'farmer.html';
        const isAuthed = await verifyServerSession();
        if (isAuthed) {
          window.location.href = targetPortal;
        } else {
          openLoginSignUpModal(e, targetPortal);
        }
      });
    }
  });

  // Cart Button initializes badge count via AgriCart
  if (window.AgriCart) {
    window.AgriCart.init();
  }
}

/**
 * Toast Notification Helper
 */
export function showToast(message, duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg style="width: 18px; height: 18px; fill: #FFBF00; flex-shrink: 0;" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
