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
function initModals() {
  const modalOverlay = document.getElementById('appModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalOkBtn = document.getElementById('modalOkBtn');

  if (!modalOverlay) return;

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

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
 * Interactive Action Handlers for Buttons & Demo Video Links
 */
function initActionHandlers() {
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
            Demonstrates how farmers register, browse local tractors & harvesters, and place booking requests.
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

  // Find Machinery & List Machine Buttons - let normal link navigation proceed to farmer.html and owner.html
  // (Listeners removed so browser navigates smoothly to the target pages)

  // Login / Sign Up Action Buttons (Desktop & Mobile)
  const loginActionBtns = [
    document.getElementById('headerActionBtn'),
    document.getElementById('mobileActionBtn')
  ].filter(Boolean);

  function openLoginSignUpModal(e) {
    if (e) e.preventDefault();
    openModal(
      'Login / Sign Up to Agri-Rental',
      `
      <div style="padding: 0.5rem 0;">
        <p style="color: #4b5563; font-size: 0.95rem; margin-bottom: 1.5rem; text-align: center;">
          Choose your account portal to sign in or create an account for agricultural machinery rentals.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <!-- Farmer Portal Card -->
          <a href="farmer.html" style="display: flex; flex-direction: column; align-items: center; padding: 1.25rem; border: 2px solid #e5e7eb; border-radius: 8px; text-decoration: none; text-align: center; background: #fafafa; transition: border-color 0.2s, transform 0.2s;">
            <span style="font-size: 2.25rem; margin-bottom: 0.5rem;">🌾</span>
            <strong style="color: #111827; font-size: 1.05rem; margin-bottom: 0.25rem;">Farmer Portal</strong>
            <span style="color: #6b7280; font-size: 0.85rem; margin-bottom: 1rem; line-height: 1.3;">Rent tractors, tillers, and harvesters for your farm</span>
            <span style="margin-top: auto; font-size: 0.85rem; font-weight: 700; color: #b45309; text-transform: uppercase;">Go to Farmer Portal &rarr;</span>
          </a>

          <!-- Owner Portal Card -->
          <a href="owner.html" style="display: flex; flex-direction: column; align-items: center; padding: 1.25rem; border: 2px solid #e5e7eb; border-radius: 8px; text-decoration: none; text-align: center; background: #fafafa; transition: border-color 0.2s, transform 0.2s;">
            <span style="font-size: 2.25rem; margin-bottom: 0.5rem;">🚜</span>
            <strong style="color: #111827; font-size: 1.05rem; margin-bottom: 0.25rem;">Machine Owner</strong>
            <span style="color: #6b7280; font-size: 0.85rem; margin-bottom: 1rem; line-height: 1.3;">List your equipment and manage rental requests</span>
            <span style="margin-top: auto; font-size: 0.85rem; font-weight: 700; color: #b45309; text-transform: uppercase;">Go to Owner Portal &rarr;</span>
          </a>
        </div>

        <!-- Quick Sign In Helper -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 1rem 1.25rem; border: 1px solid #e5e7eb;">
          <h4 style="color: #1f2937; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600;">Quick Sign In (Demo)</h4>
          <form id="modalQuickLoginForm" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <input type="text" id="modalLoginId" placeholder="Mobile number or Email" required style="flex: 1; min-width: 180px; padding: 0.6rem 0.85rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
            <button type="submit" class="btn-take-action" style="padding: 0.6rem 1.25rem; font-size: 0.8rem; cursor: pointer;">SIGN IN</button>
          </form>
          <div id="modalLoginFeedback" style="display: none; margin-top: 0.5rem; font-size: 0.85rem; color: #16a34a; font-weight: 600;"></div>
        </div>
      </div>
      `
    );

    const modalForm = document.getElementById('modalQuickLoginForm');
    if (modalForm) {
      modalForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const idInput = document.getElementById('modalLoginId');
        const feedback = document.getElementById('modalLoginFeedback');
        if (idInput && feedback && idInput.value.trim()) {
          const userVal = idInput.value.trim();
          feedback.textContent = `✓ Signed in as ${userVal} (Active Demo Session)`;
          feedback.style.display = 'block';
          showToast(`Signed in successfully as ${userVal}`);
        }
      });
    }
  }

  loginActionBtns.forEach(btn => {
    btn.addEventListener('click', openLoginSignUpModal);
  });

  // Cart Button
  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Your equipment rental cart is currently empty (0 items).');
    });
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
