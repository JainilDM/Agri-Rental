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

  // Take Action Buttons
  document.querySelectorAll('.btn-take-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Take Action clicked. Connect to registration or featured campaigns.');
    });
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
