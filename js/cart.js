/**
 * Agricultural Rental Machinery - Cart Service
 * Manages cart persistence via localStorage, count badges, and cross-page synchronization.
 * Pure Vanilla JavaScript - No dependencies.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'agri_rental_cart';

  const AgriCart = {
    STORAGE_KEY: STORAGE_KEY,

    /**
     * Get all items currently stored in the cart
     * @returns {Array} Array of machinery cart items
     */
    getItems: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (err) {
        console.error('[AgriCart] Failed to read cart from localStorage:', err);
        return [];
      }
    },

    /**
     * Save items to localStorage, synchronize with backend if logged in, and notify UI components
     * @param {Array} items
     */
    saveItems: function (items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.error('[AgriCart] Failed to save cart to localStorage:', err);
      }
      this.updateBadges();
      window.dispatchEvent(new CustomEvent('agri-cart-changed', {
        detail: { items: items, count: this.getCount(), total: this.getTotal() }
      }));

      // Synchronize with MongoDB Atlas backend if user is authenticated
      this.syncToServer(items);
    },

    /**
     * Push current items to backend /api/cart
     */
    syncToServer: function (items) {
      const token = typeof window.getAuthToken === 'function' ? window.getAuthToken() : (localStorage.getItem('agri_auth_token') || null);
      if (!token) return;

      fetch('http://localhost:5000/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ items: items || this.getItems() })
      }).catch(function (err) {
        console.warn('[AgriCart] Background server sync error:', err);
      });
    },

    /**
     * Pull cart from backend /api/cart and update local storage/UI
     */
    syncFromServer: async function () {
      const token = typeof window.getAuthToken === 'function' ? window.getAuthToken() : (localStorage.getItem('agri_auth_token') || null);
      if (!token) return;

      try {
        const res = await fetch('http://localhost:5000/api/cart', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            // If server has items, or if local is empty, update local
            const localItems = this.getItems();
            if (data.items.length > 0) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.items));
              this.updateBadges();
              window.dispatchEvent(new CustomEvent('agri-cart-changed', {
                detail: { items: data.items, count: this.getCount(), total: this.getTotal() }
              }));
            } else if (localItems.length > 0) {
              // Local has items but server is empty, push local to server
              this.syncToServer(localItems);
            }
          }
        }
      } catch (err) {
        console.warn('[AgriCart] Server pull error:', err);
      }
    },

    /**
     * Add a machinery item to the rental cart
     * @param {Object} item - Machinery details
     * @returns {Array} Updated cart items
     */
    addItem: function (item) {
      const items = this.getItems();

      // Check if duplicate item (identical machinery name and date) already exists
      const existingIndex = items.findIndex(function (existing) {
        return (
          existing.name &&
          item.name &&
          existing.name.trim().toLowerCase() === item.name.trim().toLowerCase() &&
          existing.date === item.date
        );
      });

      if (existingIndex > -1) {
        const currentQty = parseInt(items[existingIndex].quantity, 10) || 1;
        const addQty = parseInt(item.quantity, 10) || 1;
        items[existingIndex].quantity = currentQty + addQty;
        if (!items[existingIndex].listingId && item.listingId) {
          items[existingIndex].listingId = item.listingId;
        }
      } else {
        if (!item.id) {
          item.id = 'cart_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        }
        item.quantity = parseInt(item.quantity, 10) || 1;
        item.price = Number(item.price) || 0;
        item.listingId = item.listingId || null;
        item.addedAt = item.addedAt || new Date().toISOString();
        items.push(item);
      }

      this.saveItems(items);
      return items;
    },

    /**
     * Remove an item from the cart by its unique ID
     * @param {string} itemId
     * @returns {Array} Updated items
     */
    removeItem: function (itemId) {
      let items = this.getItems();
      items = items.filter(function (item) {
        return String(item.id) !== String(itemId);
      });
      this.saveItems(items);
      return items;
    },

    /**
     * Update quantity for a specific item
     * @param {string} itemId
     * @param {number} newQuantity
     * @returns {Array} Updated items
     */
    updateQuantity: function (itemId, newQuantity) {
      const q = parseInt(newQuantity, 10);
      if (isNaN(q) || q <= 0) {
        return this.removeItem(itemId);
      }

      const items = this.getItems();
      const target = items.find(function (i) {
        return String(i.id) === String(itemId);
      });

      if (target) {
        target.quantity = q;
        this.saveItems(items);
      }
      return items;
    },

    /**
     * Clear all items in the cart
     */
    clearCart: function () {
      this.saveItems([]);
    },

    /**
     * Get total quantity of equipment items in the cart
     * @returns {number}
     */
    getCount: function () {
      const items = this.getItems();
      return items.reduce(function (sum, item) {
        return sum + (parseInt(item.quantity, 10) || 1);
      }, 0);
    },

    /**
     * Calculate subtotal amount in Indian Rupees (₹)
     * @returns {number}
     */
    getTotal: function () {
      const items = this.getItems();
      return items.reduce(function (sum, item) {
        const price = Number(item.price) || 0;
        const qty = parseInt(item.quantity, 10) || 1;
        return sum + (price * qty);
      }, 0);
    },

    /**
     * Update all cart buttons and count badges throughout the document
     */
    updateBadges: function () {
      const count = this.getCount();

      // Find all cart buttons in the header
      const cartBtns = document.querySelectorAll('.cart-btn, #cartBtn');
      cartBtns.forEach(function (btn) {
        btn.setAttribute('href', 'cart.html');
        btn.setAttribute('aria-label', 'View Cart (' + count + ' items)');
        const span = btn.querySelector('span');
        if (span) {
          span.textContent = count;
        }
      });

      // Mobile drawer badge counter
      const mobileBadges = document.querySelectorAll('.mobile-cart-count');
      mobileBadges.forEach(function (badge) {
        badge.textContent = count;
      });
    },

    /**
     * Show a standardized toast notification
     * @param {string} message - Text or HTML message
     * @param {number} duration - Milliseconds to show
     */
    showToast: function (message, duration) {
      if (typeof duration === 'undefined') duration = 4000;
      let container = document.getElementById('toastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML =
        '<svg style="width: 20px; height: 20px; fill: #FFBF00; flex-shrink: 0;" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>' +
        '</svg>' +
        '<span>' + message + '</span>';

      container.appendChild(toast);

      requestAnimationFrame(function () {
        toast.classList.add('show');
      });

      setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () {
          toast.remove();
        }, 300);
      }, duration);
    },

    /**
     * Initialize listeners and synchronize badge across browser tabs
     */
    init: function () {
      this.updateBadges();

      // If user is authenticated, synchronize with backend database
      this.syncFromServer();

      // Listen for changes from other tabs/windows
      window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY) {
          AgriCart.updateBadges();
        }
      });
    }
  };

  // Expose to window for global access across scripts
  window.AgriCart = AgriCart;

  // Auto-initialize when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      AgriCart.init();
    });
  } else {
    AgriCart.init();
  }

})(window);
