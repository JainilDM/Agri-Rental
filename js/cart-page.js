/**
 * Agricultural Rental Machinery - Cart Page Controller
 * Manages rendering of cart items, empty state, quantity steppers, calculations,
 * and the final rental request booking confirmation dialog.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  renderCart();

  // Listen for cart changes across tabs or other events
  window.addEventListener('agri-cart-changed', () => {
    renderCart();
  });
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

  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggleBtn.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Format currency in Indian Rupees format (e.g. ₹ 3,500)
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₹ ' + num.toLocaleString('en-IN');
}

/**
 * Main render function for cart.html
 */
function renderCart() {
  const emptyStateEl = document.getElementById('cartEmptyState');
  const populatedLayoutEl = document.getElementById('cartLayout');
  const checkoutSuccessEl = document.getElementById('checkoutSuccessCard');
  const itemsContainer = document.getElementById('cartItemsContainer');
  const itemCountBadge = document.getElementById('cartItemCount');
  const subtotalEl = document.getElementById('cartSubtotal');
  const grandTotalEl = document.getElementById('cartGrandTotal');

  if (!emptyStateEl || !populatedLayoutEl || !itemsContainer) return;

  // If currently showing checkout success, do not override unless cart state changes
  if (checkoutSuccessEl && checkoutSuccessEl.style.display === 'block') {
    return;
  }

  const items = window.AgriCart ? window.AgriCart.getItems() : [];

  if (items.length === 0) {
    emptyStateEl.style.display = 'block';
    populatedLayoutEl.style.display = 'none';
    if (checkoutSuccessEl) checkoutSuccessEl.style.display = 'none';
    return;
  }

  emptyStateEl.style.display = 'none';
  populatedLayoutEl.style.display = 'grid';
  if (checkoutSuccessEl) checkoutSuccessEl.style.display = 'none';

  const totalCount = window.AgriCart.getCount();
  const subtotal = window.AgriCart.getTotal();

  if (itemCountBadge) itemCountBadge.textContent = totalCount;
  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (grandTotalEl) grandTotalEl.textContent = formatCurrency(subtotal);

  // Render Item Cards
  let itemsHtml = '';
  items.forEach(item => {
    const qty = parseInt(item.quantity, 10) || 1;
    const price = Number(item.price) || 0;
    const lineTotal = price * qty;

    itemsHtml += `
      <article class="cart-item-card" data-item-id="${item.id}">
        <div class="cart-item-top">
          <div class="cart-item-meta">
            <span class="cart-item-category">${escapeHtml(item.category || 'Agricultural Machinery')}</span>
            <h3 class="cart-item-name">${escapeHtml(item.name || 'Equipment')}</h3>
          </div>
          <button type="button" class="btn-remove-cart-item" data-remove-id="${item.id}" aria-label="Remove ${escapeHtml(item.name)} from cart">
            <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 15px; height: 15px; fill: currentColor;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Remove
          </button>
        </div>

        <!-- Machinery Details Grid -->
        <div class="cart-item-details-grid">
          ${item.duration ? `
            <div class="cart-detail-row">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <span>Duration: <strong>${escapeHtml(item.duration)}</strong></span>
            </div>
          ` : ''}

          ${item.date ? `
            <div class="cart-detail-row">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
              <span>Date: <strong>${escapeHtml(item.date)}</strong></span>
            </div>
          ` : ''}

          ${item.location ? `
            <div class="cart-detail-row">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>Location: <strong>${escapeHtml(item.location)}</strong></span>
            </div>
          ` : ''}

          ${item.farmerName ? `
            <div class="cart-detail-row">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <span>Farmer: <strong>${escapeHtml(item.farmerName)}</strong></span>
            </div>
          ` : ''}
        </div>

        ${item.notes ? `
          <div class="cart-item-notes">
            <strong>Notes / Requirements:</strong> ${escapeHtml(item.notes)}
          </div>
        ` : ''}

        <!-- Pricing & Quantity Row -->
        <div class="cart-item-bottom">
          <div class="cart-item-rate-wrap">
            <span class="cart-item-rate-label">Rental Price</span>
            <span class="cart-item-rate-val">${formatCurrency(price)} <small style="font-size: 0.75rem; color: #64748b; font-weight: 500;">/ period</small></span>
          </div>

          <!-- Quantity Stepper -->
          <div class="cart-qty-wrapper">
            <span class="cart-qty-label">Quantity:</span>
            <div class="cart-qty-stepper">
              <button type="button" class="btn-qty-step" data-step-action="decrease" data-item-id="${item.id}" aria-label="Decrease quantity for ${escapeHtml(item.name)}">−</button>
              <span class="cart-qty-value">${qty}</span>
              <button type="button" class="btn-qty-step" data-step-action="increase" data-item-id="${item.id}" aria-label="Increase quantity for ${escapeHtml(item.name)}">+</button>
            </div>
          </div>

          <!-- Line Item Total -->
          <div class="cart-item-total-wrap">
            <span class="cart-item-total-label">Subtotal</span>
            <span class="cart-item-total-val">${formatCurrency(lineTotal)}</span>
          </div>
        </div>
      </article>
    `;
  });

  itemsContainer.innerHTML = itemsHtml;
  bindCartEvents();
}

/**
 * Event bindings for populated cart items
 */
function bindCartEvents() {
  // Quantity Stepper buttons
  const qtyBtns = document.querySelectorAll('.btn-qty-step');
  qtyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.getAttribute('data-item-id');
      const action = btn.getAttribute('data-step-action');
      const items = window.AgriCart.getItems();
      const currentItem = items.find(i => String(i.id) === String(itemId));

      if (currentItem) {
        let currentQty = parseInt(currentItem.quantity, 10) || 1;
        if (action === 'increase') {
          currentQty += 1;
        } else if (action === 'decrease') {
          currentQty -= 1;
        }
        window.AgriCart.updateQuantity(itemId, currentQty);
        renderCart();
      }
    });
  });

  // Remove buttons
  const removeBtns = document.querySelectorAll('.btn-remove-cart-item');
  removeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.getAttribute('data-remove-id');
      const items = window.AgriCart.getItems();
      const target = items.find(i => String(i.id) === String(itemId));
      const targetName = target ? target.name : 'Machinery item';

      window.AgriCart.removeItem(itemId);
      window.AgriCart.showToast(`Removed "${targetName}" from cart.`);
      renderCart();
    });
  });

  // Clear Cart button
  const clearCartBtn = document.getElementById('btnClearCart');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to remove all equipment from your rental cart?')) {
        window.AgriCart.clearCart();
        window.AgriCart.showToast('Rental cart cleared.');
        renderCart();
      }
    });
  }

  // Checkout Button
  const checkoutBtn = document.getElementById('btnCheckout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      openCheckoutModal();
    });
  }
}


/**
 * Open Checkout / Rental Request Confirmation Dialog
 */
function openCheckoutModal() {
  const modalOverlay = document.getElementById('checkoutModal');
  const summaryBox = document.getElementById('checkoutItemsSummary');
  const totalAmountEl = document.getElementById('checkoutTotalAmount');

  if (!modalOverlay) return;

  const items = window.AgriCart.getItems();
  const subtotal = window.AgriCart.getTotal();

  if (summaryBox) {
    let summaryHtml = '<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.65rem;">';
    items.forEach(i => {
      const q = parseInt(i.quantity, 10) || 1;
      summaryHtml += `
        <li style="display: flex; justify-content: space-between; font-size: 0.9rem; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.4rem;">
          <span><strong>${escapeHtml(i.name)}</strong> × ${q} (${escapeHtml(i.duration || '1 Day')})</span>
          <strong style="color: #b45309;">${formatCurrency(Number(i.price) * q)}</strong>
        </li>
      `;
    });
    summaryHtml += '</ul>';
    summaryBox.innerHTML = summaryHtml;
  }

  if (totalAmountEl) {
    totalAmountEl.textContent = formatCurrency(subtotal);
  }

  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Modal Close buttons
  const closeBtn = document.getElementById('closeCheckoutModal');
  const cancelBtn = document.getElementById('cancelCheckoutModal');

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;

  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) closeModal();
  };

  // Confirm Booking Form Submit
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.onsubmit = (e) => {
      e.preventDefault();

      const farmerName = document.getElementById('checkoutFarmerName')?.value.trim() || 'Farmer Guest';
      const farmerPhone = document.getElementById('checkoutFarmerPhone')?.value.trim() || 'Not specified';
      const bookingRef = 'RNT-' + Math.floor(100000 + Math.random() * 900000);

      // Close modal
      closeModal();

      // Show in-page success confirmation
      showCheckoutSuccess(bookingRef, farmerName, farmerPhone, items, subtotal);

      // Clear the cart
      window.AgriCart.clearCart();
    };
  }
}

/**
 * Display celebratory success card after confirming rental request
 */
function showCheckoutSuccess(refId, name, phone, items, total) {
  const emptyStateEl = document.getElementById('cartEmptyState');
  const populatedLayoutEl = document.getElementById('cartLayout');
  const successCard = document.getElementById('checkoutSuccessCard');
  const refIdEl = document.getElementById('successBookingRef');
  const detailsEl = document.getElementById('successOrderDetails');

  if (emptyStateEl) emptyStateEl.style.display = 'none';
  if (populatedLayoutEl) populatedLayoutEl.style.display = 'none';

  if (refIdEl) refIdEl.textContent = `Booking Request ID: #${refId}`;

  if (detailsEl) {
    let html = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; margin: 1.5rem 0; text-align: left;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.95rem;">
          <span style="color: #64748b;">Farmer Name:</span>
          <strong>${escapeHtml(name)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.95rem;">
          <span style="color: #64748b;">Contact Mobile:</span>
          <strong>${escapeHtml(phone)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 0.95rem;">
          <span style="color: #64748b;">Equipment Count:</span>
          <strong>${items.length} machinery item(s)</strong>
        </div>
        <div style="border-top: 1px solid #cbd5e1; padding-top: 0.75rem; display: flex; justify-content: space-between; font-size: 1.1rem;">
          <span>Total Rental Budget:</span>
          <strong style="color: #b45309;">${formatCurrency(total)}</strong>
        </div>
      </div>
    `;
    detailsEl.innerHTML = html;
  }

  if (successCard) {
    successCard.style.display = 'block';
    successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Basic HTML escaping helper to prevent XSS
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
