/**
 * Agricultural Rental Machinery - Subpages & Forms Handler
 * Manages client-side validation, GPS location helper, tab toggles, and submission feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.AgriCart) window.AgriCart.init();
  initMobileNav();
  initAuthTabs();
  initRadioPills();
  initGpsHelpers();
  initPhotoUploadPreview();
  initFarmerForm();
  initOwnerForm();
  initOwnerDashboard();
  initMinDates();
  checkOwnerSession();
  checkRenterSession();
});

/**
 * Unified Authentication Token Helper Functions
 * Supports gradual transition from legacy role-specific storage keys
 * ('agri_owner_token', 'agri_farmer_token') to unified 'agri_auth_token'.
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

// Make helpers available globally
window.getAuthToken = getAuthToken;
window.setAuthToken = setAuthToken;
window.clearAuthTokens = clearAuthTokens;

/**
 * Check Owner Session on Page Load
 */
async function checkOwnerSession() {
  const ownerAuthBanner = document.getElementById('ownerAuthBanner');
  const ownerDashboardSection = document.getElementById('ownerDashboardSection');
  const ownerFormCard = document.getElementById('ownerFormCard');
  if (!ownerFormCard && !ownerDashboardSection) return; // Not on the owner page

  const token = getAuthToken();
  if (!token) {
    hideOwnerProtectedContent();
    return;
  }

  try {
    const res = await fetch('http://localhost:5000/api/auth/owner/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      showOwnerProtectedContent();
    } else {
      console.warn("Invalid owner session, clearing token.");
      clearAuthTokens();
      hideOwnerProtectedContent();
    }
  } catch (err) {
    console.error("Owner session verification network error:", err);
    hideOwnerProtectedContent();
    const feedback = document.getElementById('ownerLoginFeedback');
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#ef4444';
      feedback.textContent = 'Network error verifying session. Please refresh to retry, or check your connection.';
    }
  }
}

/**
 * Show Owner Dashboard and Protected Elements
 */
function showOwnerProtectedContent() {
  const authPanels = document.querySelectorAll('.auth-panel-card');
  authPanels.forEach(panel => {
    if (panel.id !== 'ownerAuthBanner') {
      panel.style.display = 'none';
    }
  });

  const authBanner = document.getElementById('ownerAuthBanner');
  if (authBanner) authBanner.style.display = 'block';

  // Default to Dashboard tab
  switchOwnerView('dashboard');

  // Fetch owner's listings & incoming requests count
  fetchOwnerListings();
  fetchOwnerRequests();
}

/**
 * Hide Owner Dashboard and Return to Logged-Out State
 */
function hideOwnerProtectedContent() {
  const authPanels = document.querySelectorAll('.auth-panel-card');
  authPanels.forEach(panel => {
    if (panel.id !== 'ownerAuthBanner') {
      panel.style.display = 'block';
    }
  });

  const authBanner = document.getElementById('ownerAuthBanner');
  if (authBanner) authBanner.style.display = 'none';

  const dashboardSection = document.getElementById('ownerDashboardSection');
  if (dashboardSection) dashboardSection.style.display = 'none';

  const requestsSection = document.getElementById('ownerRequestsSection');
  if (requestsSection) requestsSection.style.display = 'none';

  const formCard = document.getElementById('ownerFormCard');
  if (formCard) formCard.style.display = 'none';

  const successCard = document.getElementById('ownerSuccessCard');
  if (successCard) successCard.classList.remove('show');

  // Close modals if open
  closeOwnerModals();
}

/**
 * Switch Between Owner Views: "dashboard", "requests", or "create"
 */
function switchOwnerView(viewName) {
  const tabMyListings = document.getElementById('btnTabMyListings');
  const tabRequests = document.getElementById('btnTabRequests');
  const tabNewListing = document.getElementById('btnTabNewListing');
  const dashboardSection = document.getElementById('ownerDashboardSection');
  const requestsSection = document.getElementById('ownerRequestsSection');
  const formCard = document.getElementById('ownerFormCard');
  const successCard = document.getElementById('ownerSuccessCard');

  // Reset tab active states
  if (tabMyListings) { tabMyListings.classList.remove('active'); tabMyListings.setAttribute('aria-selected', 'false'); }
  if (tabRequests) { tabRequests.classList.remove('active'); tabRequests.setAttribute('aria-selected', 'false'); }
  if (tabNewListing) { tabNewListing.classList.remove('active'); tabNewListing.setAttribute('aria-selected', 'false'); }

  // Reset section displays
  if (dashboardSection) dashboardSection.style.display = 'none';
  if (requestsSection) requestsSection.style.display = 'none';
  if (formCard) formCard.style.display = 'none';
  if (successCard) successCard.classList.remove('show');

  if (viewName === 'create') {
    if (tabNewListing) { tabNewListing.classList.add('active'); tabNewListing.setAttribute('aria-selected', 'true'); }
    if (formCard) formCard.style.display = 'block';
  } else if (viewName === 'requests') {
    if (tabRequests) { tabRequests.classList.add('active'); tabRequests.setAttribute('aria-selected', 'true'); }
    if (requestsSection) requestsSection.style.display = 'block';
    fetchOwnerRequests();
  } else {
    // default: dashboard / my listings
    if (tabMyListings) { tabMyListings.classList.add('active'); tabMyListings.setAttribute('aria-selected', 'true'); }
    if (dashboardSection) dashboardSection.style.display = 'block';
  }
}


/**
 * Check Renter Session on Page Load
 */
async function checkRenterSession() {
  const farmerFormCard = document.getElementById('farmerFormCard');
  if (!farmerFormCard) return; // Not on the renter page

  const token = getAuthToken();
  if (!token) {
    return hideRenterProtectedContent();
  }

  try {
    const res = await fetch('http://localhost:5000/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      showRenterProtectedContent();
    } else {
      console.warn("Invalid renter session, clearing token.");
      clearAuthTokens();
      hideRenterProtectedContent();
    }
  } catch (err) {
    console.error("Session verification failed:", err);
    hideRenterProtectedContent();
  }
}

function showRenterProtectedContent() {
  const authPanels = document.querySelectorAll('.auth-panel-card');
  authPanels.forEach(panel => {
    if (panel.id !== 'renterAuthBanner') {
      panel.style.display = 'none';
    }
  });

  const authBanner = document.getElementById('renterAuthBanner');
  if (authBanner) authBanner.style.display = 'block';

  const listingsSection = document.getElementById('listingsSection');
  if (listingsSection) listingsSection.style.display = 'block';

  const farmerFormCard = document.getElementById('farmerFormCard');
  if (farmerFormCard) farmerFormCard.style.display = 'block';

  initListingsFetcher();
}

function hideRenterProtectedContent() {
  const authPanels = document.querySelectorAll('.auth-panel-card');
  authPanels.forEach(panel => {
    if (panel.id !== 'renterAuthBanner') {
      panel.style.display = 'block';
    }
  });

  const authBanner = document.getElementById('renterAuthBanner');
  if (authBanner) authBanner.style.display = 'none';

  const listingsSection = document.getElementById('listingsSection');
  if (listingsSection) listingsSection.style.display = 'none';

  const farmerFormCard = document.getElementById('farmerFormCard');
  if (farmerFormCard) farmerFormCard.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const btnLogoutRenter = document.getElementById('btnLogoutRenter');
  if (btnLogoutRenter) {
    btnLogoutRenter.addEventListener('click', () => {
      clearAuthTokens();
      hideRenterProtectedContent();
    });
  }

  const btnLogoutOwner = document.getElementById('btnLogoutOwner');
  if (btnLogoutOwner) {
    btnLogoutOwner.addEventListener('click', () => {
      clearAuthTokens();
      hideOwnerProtectedContent();
    });
  }
});

/**
 * Handle price unit radio pill selections
 */
function initRadioPills() {
  const radioInputs = document.querySelectorAll('.radio-pill-label input[type="radio"]');
  radioInputs.forEach(input => {
    input.addEventListener('change', () => {
      const groupName = input.name;
      const groupInputs = document.querySelectorAll(`input[name="${groupName}"]`);
      groupInputs.forEach(item => {
        const label = item.closest('.radio-pill-label');
        if (label) {
          if (item.checked) {
            label.classList.add('active');
          } else {
            label.classList.remove('active');
          }
        }
      });
    });
  });
}

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
 * Login / Register Tab Switcher
 */
function initAuthTabs() {
  const tabButtons = document.querySelectorAll('.auth-tab-btn');
  const tabPanels = document.querySelectorAll('.auth-tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabPanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.style.display = 'block';
        } else {
          panel.style.display = 'none';
        }
      });
    });
  });

  // Handle Real Login
  const loginForm = document.getElementById('realLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const feedback = document.getElementById('loginFeedback');

      feedback.style.display = 'block';
      feedback.style.color = '#38BDF8';
      feedback.textContent = 'Logging in...';

      try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
          // Store token in shared and legacy keys
          setAuthToken(data.token);
          feedback.style.color = '#4ade80';
          feedback.textContent = `✓ Logged in successfully! Welcome ${data.farmer.name}.`;

          setTimeout(() => {
            showRenterProtectedContent();
          }, 1500);
        } else {
          feedback.style.color = '#ef4444';
          feedback.textContent = `Error: ${data.message}`;
        }
      } catch (err) {
        feedback.style.color = '#ef4444';
        feedback.textContent = 'Network error. Please ensure backend is running.';
      }
    });
  }

  // Handle Real Signup
  const signupForm = document.getElementById('realSignupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const feedback = document.getElementById('signupFeedback');

      feedback.style.display = 'block';
      feedback.style.color = '#38BDF8';
      feedback.textContent = 'Creating account...';

      try {
        const res = await fetch('http://localhost:5000/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (res.ok) {
          feedback.style.color = '#4ade80';
          feedback.textContent = `✓ Account created! Logging you in...`;

          try {
            const loginRes = await fetch('http://localhost:5000/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();

            if (loginRes.ok) {
              setAuthToken(loginData.token);
              setTimeout(() => {
                showRenterProtectedContent();
                signupForm.reset();
              }, 1000);
            } else {
              feedback.textContent = `✓ Account created! Please log in.`;
              signupForm.reset();
            }
          } catch (loginErr) {
            feedback.textContent = `✓ Account created! Please log in.`;
            signupForm.reset();
          }
        } else {
          feedback.style.color = '#ef4444';
          feedback.textContent = `Error: ${data.message}`;
        }
      } catch (err) {
        feedback.style.color = '#ef4444';
        feedback.textContent = 'Network error. Please ensure backend is running.';
      }
    });
  }

  // Handle Real Owner Login
  const ownerLoginForm = document.getElementById('realOwnerLoginForm');
  if (ownerLoginForm) {
    ownerLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('ownerLoginEmail').value.trim();
      const password = document.getElementById('ownerLoginPassword').value;
      const feedback = document.getElementById('ownerLoginFeedback');

      feedback.style.display = 'block';
      feedback.style.color = '#38BDF8';
      feedback.textContent = 'Logging in securely...';

      try {
        const res = await fetch('http://localhost:5000/api/auth/owner/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
          // Store token in shared and legacy keys
          setAuthToken(data.token);
          feedback.style.color = '#4ade80';
          feedback.textContent = `✓ Welcome back, ${data.owner.name}! Loading portal...`;

          setTimeout(() => {
            showOwnerProtectedContent();
          }, 1500);
        } else {
          feedback.style.color = '#ef4444';
          feedback.textContent = `Login Failed: ${data.message}`;
        }
      } catch (err) {
        feedback.style.color = '#ef4444';
        feedback.textContent = 'Network error. Please ensure the backend server is running.';
      }
    });
  }

  // Handle Real Owner Signup
  const ownerSignupForm = document.getElementById('realOwnerSignupForm');
  if (ownerSignupForm) {
    ownerSignupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('ownerSignupName').value.trim();
      const email = document.getElementById('ownerSignupEmail').value.trim();
      const password = document.getElementById('ownerSignupPassword').value;
      const feedback = document.getElementById('ownerSignupFeedback');

      feedback.style.display = 'block';
      feedback.style.color = '#38BDF8';
      feedback.textContent = 'Creating owner account...';

      try {
        const res = await fetch('http://localhost:5000/api/auth/owner/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (res.ok) {
          feedback.style.color = '#4ade80';
          feedback.textContent = `✓ Account successfully created! Redirecting to login...`;
          ownerSignupForm.reset();
          setTimeout(() => {
            const loginTabBtn = document.querySelector('.auth-tab-btn[data-tab="tabOwnerLogin"]');
            if (loginTabBtn) loginTabBtn.click();
            feedback.style.display = 'none';
          }, 1500);
        } else {
          feedback.style.color = '#ef4444';
          feedback.textContent = `Signup Failed: ${data.message}`;
        }
      } catch (err) {
        feedback.style.color = '#ef4444';
        feedback.textContent = 'Network error. Please ensure the backend server is running.';
      }
    });
  }
}

/**
 * Set Minimum Date for Date Pickers (Today or later)
 */
function initMinDates() {
  const today = new Date().toISOString().split('T')[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    if (!input.getAttribute('min')) {
      input.setAttribute('min', today);
    }
  });
}

/**
 * GPS Location Helper
 */
function initGpsHelpers() {
  const gpsButtons = document.querySelectorAll('.btn-gps-action');

  gpsButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetInputId = btn.getAttribute('data-target');
      const statusId = btn.getAttribute('data-status');
      const targetInput = document.getElementById(targetInputId);
      const statusEl = document.getElementById(statusId);

      if (!targetInput) return;

      if (statusEl) {
        statusEl.textContent = '📍 Querying device GPS coordinates...';
        statusEl.classList.add('show');
        statusEl.style.color = '#38BDF8';
      }

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude.toFixed(4);
            const lng = position.coords.longitude.toFixed(4);
            const detectedLocation = `GPS (${lat}° N, ${lng}° E) - Verified Device Location`;
            targetInput.value = detectedLocation;
            if (statusEl) {
              statusEl.textContent = `✓ Location detected: ${lat}° N, ${lng}° E (Device GPS)`;
              statusEl.style.color = '#4ade80';
            }
          },
          (error) => {
            // Fallback gracefully if permission denied or unavailable
            console.warn('Geolocation notice:', error.message);
            const fallbackLocation = 'Sion East, Mumbai (19.0458° N, 72.8888° E)';
            targetInput.value = fallbackLocation;
            if (statusEl) {
              statusEl.textContent = `📍 Device GPS unavailable/denied. Set to default: ${fallbackLocation}`;
              statusEl.style.color = '#FBBF24';
            }
          },
          { timeout: 7000 }
        );
      } else {
        const fallbackLocation = 'Sion East, Mumbai (19.0458° N, 72.8888° E)';
        targetInput.value = fallbackLocation;
        if (statusEl) {
          statusEl.textContent = `📍 Geolocation API not supported. Set to: ${fallbackLocation}`;
          statusEl.style.color = '#FBBF24';
        }
      }
    });
  });
}

/**
 * Photo Upload Preview Handler (Owner Page)
 */
function initPhotoUploadPreview() {
  const photoInput = document.getElementById('machinePhotos');
  const previewList = document.getElementById('photoPreviewList');

  if (!photoInput || !previewList) return;

  photoInput.addEventListener('change', () => {
    previewList.innerHTML = '';
    const files = Array.from(photoInput.files);

    if (files.length === 0) return;

    files.forEach(file => {
      const badge = document.createElement('span');
      badge.className = 'file-preview-badge';
      const sizeKb = (file.size / 1024).toFixed(1);
      badge.innerHTML = `📷 ${file.name} <small style="opacity: 0.75;">(${sizeKb} KB)</small>`;
      previewList.appendChild(badge);
    });
  });
}

/**
 * Farmer Form Validation & Submit Handler
 */
function initFarmerForm() {
  const form = document.getElementById('farmerForm');
  const successCard = document.getElementById('farmerSuccessCard');
  const formCard = document.getElementById('farmerFormCard');
  const resetBtn = document.getElementById('resetFarmerForm');
  const submitAnotherBtn = document.getElementById('submitAnotherFarmer');

  if (!form) return;

  // Real-time error clearance
  form.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!getAuthToken()) {
      alert('Please log in or create a renter account to submit a machinery request.');
      const authCard = document.querySelector('.auth-panel-card');
      if (authCard) {
        authCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) loginEmail.focus();
      }
      return;
    }

    let isValid = true;

    // Required fields to validate
    const nameInput = document.getElementById('farmerName');
    const phoneInput = document.getElementById('farmerPhone');
    const emailInput = document.getElementById('farmerEmail');
    const locationInput = document.getElementById('farmerLocation');
    const categoryInput = document.getElementById('machineryCategory');
    const specificMachineryInput = document.getElementById('specificMachinery');
    const dateInput = document.getElementById('requiredDate');
    const durationInput = document.getElementById('rentalDuration');
    const preferredLocationInput = document.getElementById('preferredLocation');
    const budgetInput = document.getElementById('maxBudget');

    // Name Validation
    if (!nameInput.value.trim()) {
      showError(nameInput, 'Renter name is required.');
      isValid = false;
    }

    // Phone Validation
    const phoneVal = phoneInput.value.trim().replace(/\D/g, '');
    if (phoneVal.length < 10) {
      showError(phoneInput, 'Enter a valid 10-digit mobile number.');
      isValid = false;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
      showError(emailInput, 'Enter a valid email address.');
      isValid = false;
    }

    // Location Validation
    if (!locationInput.value.trim()) {
      showError(locationInput, 'Renter location / address is required.');
      isValid = false;
    }

    // Machinery Category Validation
    if (!categoryInput.value) {
      showError(categoryInput, 'Please select a machinery category.');
      isValid = false;
    }

    // Specific Machinery Validation
    if (!specificMachineryInput.value.trim()) {
      showError(specificMachineryInput, 'Specify the machinery or model needed.');
      isValid = false;
    }

    // Required Date Validation
    if (!dateInput.value) {
      showError(dateInput, 'Please select a required rental date.');
      isValid = false;
    }

    // Rental Duration Validation
    if (!durationInput.value.trim()) {
      showError(durationInput, 'Specify the rental duration.');
      isValid = false;
    }

    // Preferred Location Validation
    if (!preferredLocationInput.value) {
      showError(preferredLocationInput, 'Select preferred machinery distance.');
      isValid = false;
    }

    // Budget Validation
    if (!budgetInput.value || Number(budgetInput.value) <= 0) {
      showError(budgetInput, 'Enter a valid maximum rental budget.');
      isValid = false;
    }

    if (!isValid) {
      // Scroll to the first invalid field
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
      return;
    }

    // 4. Assemble payload and submit to authenticated backend endpoint
    const submitBtn = document.getElementById('submitFarmerBtn');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Submit';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting Request...';
    }

    const selectedListingId = document.getElementById('selectedListingId')?.value.trim() ||
      formCard.getAttribute('data-selected-listing-id') || null;

    const payload = {
      farmerName: nameInput.value.trim(),
      farmerPhone: phoneVal,
      farmerEmail: emailInput.value.trim(),
      farmerLocation: locationInput.value.trim(),
      machineryCategory: categoryInput.value,
      specificMachinery: specificMachineryInput.value.trim(),
      requiredDate: dateInput.value,
      rentalDuration: durationInput.value.trim(),
      preferredLocation: preferredLocationInput.value,
      maxBudget: Number(budgetInput.value),
      additionalRequirements: document.getElementById('additionalRequirements')?.value.trim() || '',
      listingId: selectedListingId || null
    };

    fetch('http://localhost:5000/api/rentals/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(payload)
    })
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) {
          // Display persisted booking reference and summary
          const refIdEl = document.getElementById('farmerRefId');
          if (refIdEl) {
            refIdEl.textContent = `Booking Request ID: #${data.bookingRef || data.requestId}`;
          }

          renderSummary('farmerSummaryContainer', {
            'Renter Name': payload.farmerName,
            'Contact Phone': payload.farmerPhone,
            'Email': payload.farmerEmail,
            'Required Location': payload.farmerLocation,
            'Category': categoryInput.options[categoryInput.selectedIndex]?.text || payload.machineryCategory,
            'Specific Machinery': payload.specificMachinery,
            'Required Date': payload.requiredDate,
            'Rental Duration': payload.rentalDuration,
            'Budget': `₹ ${payload.maxBudget}`,
            'Status': 'Pending (Persisted in Database)'
          });

          // Hide form and display celebratory success card
          formCard.style.display = 'none';
          if (successCard) {
            successCard.classList.add('show');
            successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          alert(`Failed to submit request: ${data.message || 'Server error'}`);
        }
      })
      .catch((err) => {
        console.error('Rental Request Submission Error:', err);
        alert('Network error. Please ensure the backend server is running and try again.');
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      });
  });

  // Dedicated "Add to Rental Cart" button
  const addToCartBtn = document.getElementById('btnAddToCart');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      if (!getAuthToken()) {
        alert('Please log in or create a renter account to add machinery requests to your cart.');
        const authCard = document.querySelector('.auth-panel-card');
        if (authCard) {
          authCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const loginEmail = document.getElementById('loginEmail');
          if (loginEmail) loginEmail.focus();
        }
        return;
      }

      const nameInput = document.getElementById('farmerName');
      const phoneInput = document.getElementById('farmerPhone');
      const locationInput = document.getElementById('farmerLocation');
      const categoryInput = document.getElementById('machineryCategory');
      const specificMachineryInput = document.getElementById('specificMachinery');
      const dateInput = document.getElementById('requiredDate');
      const durationInput = document.getElementById('rentalDuration');
      const budgetInput = document.getElementById('maxBudget');

      let isValid = true;

      if (!specificMachineryInput.value.trim()) {
        showError(specificMachineryInput, 'Specify the machinery or model needed to add to cart.');
        isValid = false;
      }
      if (!categoryInput.value) {
        showError(categoryInput, 'Please select a machinery category.');
        isValid = false;
      }
      if (!budgetInput.value || Number(budgetInput.value) <= 0) {
        showError(budgetInput, 'Enter your rental budget/price.');
        isValid = false;
      }
      if (!durationInput.value.trim()) {
        showError(durationInput, 'Specify rental duration.');
        isValid = false;
      }

      if (!isValid) {
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus();
        }
        return;
      }

      if (window.AgriCart) {
        const selectedListingId = document.getElementById('selectedListingId')?.value.trim() ||
          formCard.getAttribute('data-selected-listing-id') || null;

        const item = {
          listingId: selectedListingId || null,
          name: specificMachineryInput.value.trim(),
          category: categoryInput.options[categoryInput.selectedIndex].text,
          price: Number(budgetInput.value),
          duration: durationInput.value.trim(),
          date: dateInput.value || new Date().toISOString().split('T')[0],
          location: locationInput.value.trim() || 'Specified in Request',
          notes: document.getElementById('additionalRequirements')?.value.trim() || '',
          farmerName: nameInput.value.trim(),
          farmerPhone: phoneInput.value.trim(),
          quantity: 1
        };

        window.AgriCart.addItem(item);
        window.AgriCart.showToast(
          `✓ Added "${item.name}" to rental cart! <a href="cart.html" style="color: #FFBF00; text-decoration: underline; margin-left: 8px; font-weight: 700;">View Cart (${window.AgriCart.getCount()}) &rarr;</a>`
        );
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      clearErrors(form);
      const hiddenListingInput = document.getElementById('selectedListingId');
      if (hiddenListingInput) hiddenListingInput.value = '';
      if (formCard) formCard.removeAttribute('data-selected-listing-id');
    });
  }

  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener('click', () => {
      form.reset();
      clearErrors(form);
      const hiddenListingInput = document.getElementById('selectedListingId');
      if (hiddenListingInput) hiddenListingInput.value = '';
      if (formCard) formCard.removeAttribute('data-selected-listing-id');
      successCard.classList.remove('show');
      formCard.style.display = 'block';
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

/**
 * Owner Form Validation & Submit Handler
 */
function initOwnerForm() {
  const form = document.getElementById('ownerForm');
  const successCard = document.getElementById('ownerSuccessCard');
  const formCard = document.getElementById('ownerFormCard');
  const resetBtn = document.getElementById('resetOwnerForm');
  const submitAnotherBtn = document.getElementById('submitAnotherOwner');

  if (!form) return;

  // Real-time error clearance
  form.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;

    // Required fields to validate
    const nameInput = document.getElementById('ownerName');
    const phoneInput = document.getElementById('ownerPhone');
    const emailInput = document.getElementById('ownerEmail');
    const locationInput = document.getElementById('ownerLocation');
    const machineNameInput = document.getElementById('machineName');
    const categoryInput = document.getElementById('ownerMachineryCategory');
    const brandModelInput = document.getElementById('brandModel');
    const mfgYearInput = document.getElementById('manufacturingYear');
    const descriptionInput = document.getElementById('machineDescription');
    const rentalPriceInput = document.getElementById('rentalPrice');
    const priceUnitInput = form.querySelector('input[name="priceUnit"]:checked');
    const availabilityInput = document.getElementById('availabilityStatus');
    const minDurationInput = document.getElementById('minRentalDuration');
    const maxDurationInput = document.getElementById('maxRentalDuration');
    const machineLocationInput = document.getElementById('machineLocation');
    const availableFromInput = document.getElementById('availableFrom');
    const availableUntilInput = document.getElementById('availableUntil');

    // Owner Name Validation
    if (!nameInput.value.trim()) {
      showError(nameInput, 'Owner name is required.');
      isValid = false;
    }

    // Phone Validation
    const phoneVal = phoneInput.value.trim().replace(/\D/g, '');
    if (phoneVal.length < 10) {
      showError(phoneInput, 'Enter a valid 10-digit mobile number.');
      isValid = false;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
      showError(emailInput, 'Enter a valid email address.');
      isValid = false;
    }

    // Owner Location Validation
    if (!locationInput.value.trim()) {
      showError(locationInput, 'Owner base location is required.');
      isValid = false;
    }

    // Machine Name Validation
    if (!machineNameInput.value.trim()) {
      showError(machineNameInput, 'Machine name / title is required.');
      isValid = false;
    }

    // Machinery Category Validation
    if (!categoryInput.value) {
      showError(categoryInput, 'Please select a machinery category.');
      isValid = false;
    }

    // Brand / Model Validation
    if (!brandModelInput.value.trim()) {
      showError(brandModelInput, 'Brand and model is required.');
      isValid = false;
    }

    // Manufacturing Year Validation
    const currentYear = new Date().getFullYear();
    const yearVal = Number(mfgYearInput.value);
    if (!yearVal || yearVal < 1980 || yearVal > currentYear + 1) {
      showError(mfgYearInput, `Enter a valid year between 1980 and ${currentYear + 1}.`);
      isValid = false;
    }

    // Machine Description Validation
    if (!descriptionInput.value.trim() || descriptionInput.value.trim().length < 10) {
      showError(descriptionInput, 'Please enter a description (at least 10 characters).');
      isValid = false;
    }

    // Rental Price Validation
    if (!rentalPriceInput.value || Number(rentalPriceInput.value) <= 0) {
      showError(rentalPriceInput, 'Enter a valid rental price.');
      isValid = false;
    }

    // Availability Validation
    if (!availabilityInput.value) {
      showError(availabilityInput, 'Select availability status.');
      isValid = false;
    }

    // Minimum Rental Duration
    if (!minDurationInput.value.trim()) {
      showError(minDurationInput, 'Specify minimum rental duration.');
      isValid = false;
    }

    // Maximum Rental Duration
    if (!maxDurationInput.value.trim()) {
      showError(maxDurationInput, 'Specify maximum rental duration.');
      isValid = false;
    }

    // Machine Location Validation
    if (!machineLocationInput.value.trim()) {
      showError(machineLocationInput, 'Specify the machine physical location.');
      isValid = false;
    }

    // Available From Date
    if (!availableFromInput.value) {
      showError(availableFromInput, 'Specify Available From date.');
      isValid = false;
    }

    // Available Until Date
    if (!availableUntilInput.value) {
      showError(availableUntilInput, 'Specify Available Until date.');
      isValid = false;
    } else if (availableFromInput.value && availableUntilInput.value < availableFromInput.value) {
      showError(availableUntilInput, 'Available Until date cannot be before Available From date.');
      isValid = false;
    }

    if (!isValid) {
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
      return;
    }

    // 1. Photo upload unsupported check
    const photoInput = document.getElementById('machinePhotos');
    if (photoInput && photoInput.files && photoInput.files.length > 0) {
      alert('Photo upload is not yet supported. Please clear your photo selection before submitting.');
      return;
    }

    // 2. Token check
    const token = getAuthToken();
    if (!token) {
      alert('You must be logged in as an owner to create a listing. Please log in again.');
      // Optional: switch to login tab here if desired
      return;
    }

    // 3. UI state update
    const submitBtn = document.getElementById('submitOwnerBtn');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Submitting...';
    submitBtn.disabled = true;

    // 4. Payload assembly
    const payload = {
      ownerName: nameInput.value.trim(),
      ownerPhone: phoneInput.value.trim(),
      ownerEmail: emailInput.value.trim(),
      ownerLocation: locationInput.value.trim(),
      machineName: machineNameInput.value.trim(),
      ownerMachineryCategory: categoryInput.value,
      brandModel: brandModelInput.value.trim(),
      manufacturingYear: Number(mfgYearInput.value),
      machineDescription: descriptionInput.value.trim(),
      rentalPrice: Number(rentalPriceInput.value),
      priceUnit: priceUnitInput ? priceUnitInput.value : 'Day',
      minRentalDuration: minDurationInput.value.trim(),
      maxRentalDuration: maxDurationInput.value.trim(),
      machineLocation: machineLocationInput.value.trim(),
      availabilityStatus: availabilityInput.value,
      availableFrom: availableFromInput.value,
      availableUntil: availableUntilInput.value
    };

    // 5. Submit to backend
    const API_URL = 'http://localhost:5000/api/listings'; // Local dev API

    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) {
          // Reset creation form
          form.reset();
          clearErrors(form);
          const previewList = document.getElementById('photoPreviewList');
          if (previewList) previewList.innerHTML = '';

          // Switch to dashboard tab and refresh listings
          switchOwnerView('dashboard');
          fetchOwnerListings();

          // Show brief success alert in dashboard
          const dashboardFeedback = document.getElementById('ownerDashboardFeedback');
          if (dashboardFeedback) {
            dashboardFeedback.style.display = 'block';
            dashboardFeedback.style.color = '#4ade80';
            dashboardFeedback.textContent = `✓ Machine "${payload.machineName}" was registered successfully!`;
            setTimeout(() => {
              dashboardFeedback.style.display = 'none';
            }, 5000);
          }
        } else {
          // Handle 400, 401, 403, 500 etc.
          if (response.status === 401 || response.status === 403) {
            alert('Your session has expired or is invalid. Please log in again.');
            clearAuthTokens();
            hideOwnerProtectedContent();
            return;
          }
          alert(`Failed to save listing: ${data.message || 'Unknown error'}`);
        }
      })
      .catch((error) => {
        console.error("Listing Submission Error:", error);
        alert('Network error. Please ensure the backend server is running and try again.');
      })
      .finally(() => {
        // Restore button state
        submitBtn.innerHTML = originalBtnHtml;
        submitBtn.disabled = false;
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      clearErrors(form);
      const previewList = document.getElementById('photoPreviewList');
      if (previewList) previewList.innerHTML = '';
    });
  }

  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener('click', () => {
      form.reset();
      clearErrors(form);
      const previewList = document.getElementById('photoPreviewList');
      if (previewList) previewList.innerHTML = '';
      successCard.classList.remove('show');
      formCard.style.display = 'block';
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

/**
 * Utility: Show Validation Error
 */
function showError(inputElement, message) {
  inputElement.classList.add('is-invalid');
  const parent = inputElement.closest('.form-group') || inputElement.parentElement;
  let errorEl = parent.querySelector('.form-error');
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.className = 'form-error';
    parent.appendChild(errorEl);
  }
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

/**
 * Utility: Clear All Errors in Form
 */
function clearErrors(form) {
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  form.querySelectorAll('.form-error').forEach(el => {
    el.style.display = 'none';
  });
  const gpsStatuses = form.querySelectorAll('.gps-feedback-msg');
  gpsStatuses.forEach(st => {
    st.textContent = '';
    st.classList.remove('show');
  });
}

/**
 * Utility: Render Summary Table
 */
function renderSummary(containerId, dataObject) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = '';
  for (const [key, val] of Object.entries(dataObject)) {
    html += `
      <div class="summary-item">
        <span>${key}</span>
        <strong>${val}</strong>
      </div>
    `;
  }
}

/**
 * Handle dynamic listing fetching for farmer/renter portal
 */
function initListingsFetcher() {
  const listingsSection = document.getElementById('listingsSection');
  if (!listingsSection) return;

  if (window.listingsInitialized) return;
  window.listingsInitialized = true;

  const grid = document.getElementById('listingsGrid');
  const loading = document.getElementById('listingsLoading');
  const empty = document.getElementById('listingsEmpty');
  const errorBox = document.getElementById('listingsError');
  const errorMsg = document.getElementById('listingsErrorMessage');
  const retryBtn = document.getElementById('retryListingsBtn');
  const searchInput = document.getElementById('listingSearch');
  const categoryFilter = document.getElementById('listingCategoryFilter');

  let allListings = [];

  const escapeHtml = (unsafe) => {
    return (unsafe || '').toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const API_URL = 'http://localhost:5000/api/listings';

  const fetchListings = () => {
    loading.style.display = 'block';
    empty.style.display = 'none';
    errorBox.style.display = 'none';
    grid.innerHTML = '';

    fetch(API_URL)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch listings');
        return response.json();
      })
      .then(data => {
        allListings = data.listings || [];
        renderListings();
      })
      .catch(err => {
        errorMsg.textContent = 'Could not load machinery listings. The server might be down or unreachable.';
        errorBox.style.display = 'block';
        console.error("Listing Fetch Error:", err);
      })
      .finally(() => {
        loading.style.display = 'none';
      });
  };

  const renderListings = () => {
    const term = searchInput.value.toLowerCase().trim();
    const cat = categoryFilter.value.toLowerCase();

    const filtered = allListings.filter(item => {
      const matchSearch = term === '' ||
        (item.machineName || '').toLowerCase().includes(term) ||
        (item.brandModel || '').toLowerCase().includes(term) ||
        (item.machineLocation || '').toLowerCase().includes(term);
      const matchCat = cat === '' || (item.category || '').toLowerCase() === cat;
      return matchSearch && matchCat;
    });

    grid.innerHTML = '';

    if (filtered.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    filtered.forEach(listing => {
      const card = document.createElement('div');
      card.className = 'contact-card';
      card.style.cssText = 'height: 100%; display: flex; flex-direction: column; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;';

      card.innerHTML = `
        <div class="contact-card-header" style="background: var(--color-primary-yellow); padding: 1.5rem; text-align: center;">
          <h3 class="contact-card-title" style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #111827;">${escapeHtml(listing.machineName)}</h3>
          <p class="contact-card-desc" style="margin: 0.5rem 0 0; opacity: 0.95; color: #111827;">${escapeHtml(listing.category).toUpperCase()} | ${escapeHtml(listing.brandModel)} (${listing.manufacturingYear})</p>
        </div>
        <div class="contact-card-body" style="flex-grow: 1; padding: 1.5rem; font-size: 0.95rem; line-height: 1.6; color: #111827;">
          <div style="display:flex; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
            <span style="color: #4B5563;">Price</span>
            <strong style="color: #111827;">₹${listing.rentalPrice} / ${escapeHtml(listing.priceUnit)}</strong>
          </div>
          <div style="display:flex; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
            <span style="color: #4B5563;">Location</span>
            <strong style="color: #111827;">${escapeHtml(listing.machineLocation)}</strong>
          </div>
          <div style="display:flex; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
            <span style="color: #4B5563;">Duration</span>
            <strong style="color: #111827;">${escapeHtml(listing.minRentalDuration)} to ${escapeHtml(listing.maxRentalDuration)}</strong>
          </div>
          <div style="display:flex; justify-content: space-between; margin-bottom: 1rem;">
            <span style="color: #4B5563;">Availability</span>
            <strong style="text-transform: capitalize; color: #047857;">${escapeHtml(listing.availabilityStatus)}</strong>
          </div>
          <p style="margin: 0; color: #374151; background: #f3f4f6; padding: 1rem; border-radius: 8px;">${escapeHtml(listing.description)}</p>
        </div>
        <div class="contact-card-footer-cta" style="padding: 1.25rem 1.5rem; border-top: 1px solid #eee; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" class="btn-card-add-cart" data-listing-id="${listing.id}" style="flex: 1; min-width: 130px; padding: 0.65rem 0.85rem; border-radius: 6px; font-weight: 700; font-size: 0.85rem; color: #111827; background-color: var(--color-primary-yellow); border: 1px solid #d97706; cursor: pointer;">
            🛒 Add to Cart
          </button>
          <button type="button" class="btn-card-rent-now" data-listing-id="${listing.id}" style="flex: 1; min-width: 130px; padding: 0.65rem 0.85rem; border-radius: 6px; font-weight: 700; font-size: 0.85rem; color: #fff; background-color: #1e293b; border: 1px solid #0f172a; cursor: pointer;">
            🌾 Request to Rent
          </button>
        </div>
      `;

      // Button handlers
      const addCartBtn = card.querySelector('.btn-card-add-cart');
      if (addCartBtn) {
        addCartBtn.addEventListener('click', () => {
          if (window.AgriCart) {
            window.AgriCart.addItem({
              listingId: listing.id,
              name: listing.machineName,
              category: listing.category,
              price: listing.rentalPrice,
              priceUnit: listing.priceUnit,
              duration: `${listing.minRentalDuration} to ${listing.maxRentalDuration}`,
              date: listing.availableFrom ? new Date(listing.availableFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              location: listing.machineLocation,
              quantity: 1
            });
            window.AgriCart.showToast(
              `✓ Added "${listing.machineName}" to rental cart! <a href="cart.html" style="color: #FFBF00; text-decoration: underline; margin-left: 8px; font-weight: 700;">View Cart (${window.AgriCart.getCount()}) &rarr;</a>`
            );
          }
        });
      }

      const rentNowBtn = card.querySelector('.btn-card-rent-now');
      if (rentNowBtn) {
        rentNowBtn.addEventListener('click', () => {
          // Auto-fill the request form below with this machine's details
          const categoryInput = document.getElementById('machineryCategory');
          const specificInput = document.getElementById('specificMachinery');
          const budgetInput = document.getElementById('maxBudget');
          const locationInput = document.getElementById('farmerLocation');
          const formCard = document.getElementById('farmerFormCard');
          const hiddenListingInput = document.getElementById('selectedListingId');
          const actualListingId = listing.id || listing._id || '';

          if (categoryInput && listing.category) categoryInput.value = listing.category;
          if (specificInput) specificInput.value = `${listing.machineName} (${listing.brandModel || ''})`.trim();
          if (budgetInput) budgetInput.value = listing.rentalPrice;
          if (locationInput && listing.machineLocation) locationInput.value = listing.machineLocation;

          if (hiddenListingInput) {
            hiddenListingInput.value = actualListingId;
          }

          if (formCard) {
            formCard.setAttribute('data-selected-listing-id', actualListingId);
            formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (specificInput) specificInput.focus();
          }
        });
      }

      grid.appendChild(card);
    });
  };

  searchInput.addEventListener('input', renderListings);
  categoryFilter.addEventListener('change', renderListings);
  if (retryBtn) retryBtn.addEventListener('click', fetchListings);

  // Initial fetch
  fetchListings();
}

/**
 * ==========================================================================
 * OWNER DASHBOARD: LISTINGS MANAGEMENT (FETCH, RENDER, EDIT, DELETE)
 * ==========================================================================
 */

let cachedOwnerListings = [];

function escapeHtml(unsafe) {
  return (unsafe || '').toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateVal) {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateInput(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Initialize Owner Dashboard Controls & Event Handlers
 */
function initOwnerDashboard() {
  // 1. Navigation Tab switchers
  const btnTabMyListings = document.getElementById('btnTabMyListings');
  const btnTabRequests = document.getElementById('btnTabRequests');
  const btnTabNewListing = document.getElementById('btnTabNewListing');
  const btnEmptyAddEquipment = document.getElementById('btnEmptyAddEquipment');

  if (btnTabMyListings) {
    btnTabMyListings.addEventListener('click', () => switchOwnerView('dashboard'));
  }
  if (btnTabRequests) {
    btnTabRequests.addEventListener('click', () => switchOwnerView('requests'));
  }
  if (btnTabNewListing) {
    btnTabNewListing.addEventListener('click', () => switchOwnerView('create'));
  }
  if (btnEmptyAddEquipment) {
    btnEmptyAddEquipment.addEventListener('click', () => switchOwnerView('create'));
  }

  // 2. Owner Logout button
  const btnLogoutOwner = document.getElementById('btnLogoutOwner');
  if (btnLogoutOwner) {
    btnLogoutOwner.addEventListener('click', () => {
      clearAuthTokens();
      hideOwnerProtectedContent();
    });
  }

  // 3. Retry listings and requests buttons
  const btnRetry = document.getElementById('btnRetryOwnerListings');
  if (btnRetry) {
    btnRetry.addEventListener('click', fetchOwnerListings);
  }
  const btnRetryReqs = document.getElementById('btnRetryOwnerRequests');
  if (btnRetryReqs) {
    btnRetryReqs.addEventListener('click', fetchOwnerRequests);
  }

  // 4. Modal Close / Cancel buttons
  const btnEditClose = document.getElementById('btnEditModalClose');
  const btnEditCancel = document.getElementById('btnCancelEdit');
  const btnDeleteCancel = document.getElementById('btnCancelDelete');

  if (btnEditClose) btnEditClose.addEventListener('click', closeOwnerModals);
  if (btnEditCancel) btnEditCancel.addEventListener('click', closeOwnerModals);
  if (btnDeleteCancel) btnDeleteCancel.addEventListener('click', closeOwnerModals);

  // Close modals on overlay backdrop click
  const editModal = document.getElementById('ownerEditModal');
  const deleteModal = document.getElementById('ownerDeleteModal');
  [editModal, deleteModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeOwnerModals();
      });
    }
  });

  // 5. Edit Form Submission
  const editForm = document.getElementById('ownerEditForm');
  if (editForm) {
    editForm.addEventListener('submit', handleOwnerEditSubmit);
  }

  // 6. Delete Confirmation Execution
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', handleOwnerDeleteConfirm);
  }

  // 7. Event delegation for listing actions (Edit & Delete) on grid
  const ownerGrid = document.getElementById('ownerListingsGrid');
  if (ownerGrid) {
    ownerGrid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-owner-edit');
      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        const listing = cachedOwnerListings.find(l => String(l.id || l._id) === String(id));
        if (listing) {
          openEditModal(listing);
        }
        return;
      }

      const delBtn = e.target.closest('.btn-owner-delete');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        const listing = cachedOwnerListings.find(l => String(l.id || l._id) === String(id));
        if (listing) {
          openDeleteModal(listing);
        }
        return;
      }
    });
  }
}

/**
 * Fetch Authenticated Owner's Listings from Backend
 */
async function fetchOwnerListings() {
  const loading = document.getElementById('ownerListingsLoading');
  const errorBox = document.getElementById('ownerListingsError');
  const errorMsg = document.getElementById('ownerListingsErrorMessage');
  const empty = document.getElementById('ownerListingsEmpty');
  const grid = document.getElementById('ownerListingsGrid');
  const countBadge = document.getElementById('ownerListingsCountBadge');

  if (!grid) return;

  const token = getAuthToken();
  if (!token) {
    hideOwnerProtectedContent();
    return;
  }

  if (loading) loading.style.display = 'block';
  if (errorBox) errorBox.style.display = 'none';
  if (empty) empty.style.display = 'none';
  grid.innerHTML = '';

  try {
    const res = await fetch('http://localhost:5000/api/listings/my-listings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      clearAuthTokens();
      hideOwnerProtectedContent();
      alert('Your owner session has expired or is invalid. Please log in again.');
      return;
    }

    if (!res.ok) {
      throw new Error(`Failed to load listings (${res.status})`);
    }

    const data = await res.json();
    cachedOwnerListings = data.listings || [];

    if (countBadge) {
      countBadge.textContent = `Total Equipment: ${cachedOwnerListings.length}`;
    }

    if (cachedOwnerListings.length === 0) {
      if (empty) empty.style.display = 'block';
    } else {
      renderOwnerListings(cachedOwnerListings);
    }
  } catch (err) {
    console.error("Error fetching owner listings:", err);
    if (errorBox && errorMsg) {
      errorMsg.textContent = 'Could not retrieve your listings. The server might be temporarily unreachable.';
      errorBox.style.display = 'block';
    }
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

/**
 * Render Owner Listings to the Grid with Escaped Data
 */
function renderOwnerListings(listings) {
  const grid = document.getElementById('ownerListingsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  listings.forEach(listing => {
    const card = document.createElement('div');
    card.className = 'owner-listing-card';

    const statusVal = (listing.availabilityStatus || 'custom').toLowerCase();
    let badgeClass = 'owner-status-other';
    if (statusVal === 'immediate') badgeClass = 'owner-status-immediate';
    else if (statusVal === 'seasonal') badgeClass = 'owner-status-seasonal';

    const safeId = escapeHtml(listing.id);
    const safeName = escapeHtml(listing.machineName);
    const safeCategory = escapeHtml(listing.category || 'Machinery');
    const safeBrand = escapeHtml(listing.brandModel || 'Standard');
    const safeYear = listing.manufacturingYear ? escapeHtml(listing.manufacturingYear) : 'N/A';
    const safePrice = listing.rentalPrice !== undefined ? escapeHtml(listing.rentalPrice) : '0';
    const safeUnit = escapeHtml(listing.priceUnit || 'Day');
    const safeLoc = escapeHtml(listing.machineLocation || 'Location specified');
    const safeMinDur = escapeHtml(listing.minRentalDuration || '1 Day');
    const safeMaxDur = escapeHtml(listing.maxRentalDuration || '30 Days');
    const safeFrom = formatDate(listing.availableFrom);
    const safeUntil = formatDate(listing.availableUntil);
    const safeDesc = escapeHtml(listing.description || 'No detailed specifications provided.');

    card.innerHTML = `
      <div class="owner-card-header">
        <h3 class="owner-card-title">${safeName}</h3>
        <p class="owner-card-sub">${safeCategory} &bull; ${safeBrand} (${safeYear})</p>
      </div>

      <div class="owner-card-body">
        <div class="owner-card-row">
          <span>Rental Rate:</span>
          <strong style="color: var(--color-primary-yellow); font-size: 1.05rem;">₹${safePrice} / ${safeUnit}</strong>
        </div>
        <div class="owner-card-row">
          <span>Location:</span>
          <strong>${safeLoc}</strong>
        </div>
        <div class="owner-card-row">
          <span>Rental Duration:</span>
          <strong>${safeMinDur} &ndash; ${safeMaxDur}</strong>
        </div>
        <div class="owner-card-row">
          <span>Availability:</span>
          <span class="owner-status-badge ${badgeClass}">${statusVal}</span>
        </div>
        <div class="owner-card-row">
          <span>Available Dates:</span>
          <strong>${safeFrom} &ndash; ${safeUntil}</strong>
        </div>
        <div style="margin-top: 0.5rem; background: rgba(0, 0, 0, 0.3); border-radius: 6px; padding: 0.65rem 0.85rem; font-size: 0.85rem; color: #cbd5e1; line-height: 1.45;">
          ${safeDesc}
        </div>
      </div>

      <div class="owner-card-actions">
        <button type="button" class="btn-owner-edit" data-id="${safeId}">
          ✏️ Edit Details
        </button>
        <button type="button" class="btn-owner-delete" data-id="${safeId}">
          🗑️ Delete
        </button>
      </div>
    `;

    // Attach click listeners
    const editBtn = card.querySelector('.btn-owner-edit');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(listing);
      });
    }

    const delBtn = card.querySelector('.btn-owner-delete');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteModal(listing);
      });
    }

    grid.appendChild(card);
  });
}

/**
 * Open Pre-Filled Edit Modal
 */
function openEditModal(listing) {
  const modal = document.getElementById('ownerEditModal');
  const feedback = document.getElementById('editModalFeedback');
  if (feedback) feedback.style.display = 'none';

  document.getElementById('editListingId').value = listing.id;
  document.getElementById('editMachineName').value = listing.machineName || '';
  document.getElementById('editCategory').value = listing.category || 'tractors';
  document.getElementById('editBrandModel').value = listing.brandModel || '';
  document.getElementById('editMfgYear').value = listing.manufacturingYear || new Date().getFullYear();
  document.getElementById('editRentalPrice').value = listing.rentalPrice || 0;
  document.getElementById('editPriceUnit').value = listing.priceUnit || 'Day';
  document.getElementById('editAvailabilityStatus').value = listing.availabilityStatus || 'immediate';
  document.getElementById('editMinDuration').value = listing.minRentalDuration || '1 Day';
  document.getElementById('editMaxDuration').value = listing.maxRentalDuration || '30 Days';
  document.getElementById('editMachineLocation').value = listing.machineLocation || '';
  document.getElementById('editAvailableFrom').value = formatDateInput(listing.availableFrom);
  document.getElementById('editAvailableUntil').value = formatDateInput(listing.availableUntil);
  document.getElementById('editDescription').value = listing.description || '';

  // Clear any existing errors
  const editForm = document.getElementById('ownerEditForm');
  if (editForm) clearErrors(editForm);

  if (modal) modal.style.display = 'flex';
}

/**
 * Handle Owner Edit Form Submit (PUT /api/listings/:id)
 */
async function handleOwnerEditSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const listingId = document.getElementById('editListingId').value;
  const feedback = document.getElementById('editModalFeedback');
  const submitBtn = document.getElementById('btnSaveEdit');

  if (!listingId) {
    alert('Listing ID missing.');
    return;
  }

  // Basic Validation
  let isValid = true;
  const nameInput = document.getElementById('editMachineName');
  const brandInput = document.getElementById('editBrandModel');
  const yearInput = document.getElementById('editMfgYear');
  const priceInput = document.getElementById('editRentalPrice');
  const minDurInput = document.getElementById('editMinDuration');
  const maxDurInput = document.getElementById('editMaxDuration');
  const locInput = document.getElementById('editMachineLocation');
  const fromInput = document.getElementById('editAvailableFrom');
  const untilInput = document.getElementById('editAvailableUntil');
  const descInput = document.getElementById('editDescription');

  if (!nameInput.value.trim()) { showError(nameInput, 'Machine name is required.'); isValid = false; }
  if (!brandInput.value.trim()) { showError(brandInput, 'Brand/model is required.'); isValid = false; }

  const yearVal = Number(yearInput.value);
  if (!yearVal || yearVal < 1900 || yearVal > new Date().getFullYear() + 1) {
    showError(yearInput, 'Valid manufacturing year required.');
    isValid = false;
  }

  const priceVal = Number(priceInput.value);
  if (isNaN(priceVal) || priceVal < 0 || priceVal > 1000000) {
    showError(priceInput, 'Rental price must be between ₹0 and ₹1,000,000.');
    isValid = false;
  }

  if (!minDurInput.value.trim()) { showError(minDurInput, 'Minimum duration is required.'); isValid = false; }
  if (!maxDurInput.value.trim()) { showError(maxDurInput, 'Maximum duration is required.'); isValid = false; }
  if (!locInput.value.trim()) { showError(locInput, 'Machine location is required.'); isValid = false; }

  if (!fromInput.value) { showError(fromInput, 'Start date is required.'); isValid = false; }
  if (!untilInput.value) { showError(untilInput, 'End date is required.'); isValid = false; }
  else if (fromInput.value && untilInput.value < fromInput.value) {
    showError(untilInput, 'Available until date cannot be before available from date.');
    isValid = false;
  }

  if (!descInput.value.trim() || descInput.value.trim().length < 10) {
    showError(descInput, 'Description must be at least 10 characters.');
    isValid = false;
  }

  if (!isValid) return;

  const token = getAuthToken();
  if (!token) {
    alert('Session expired. Please log in again.');
    hideOwnerProtectedContent();
    return;
  }

  const payload = {
    machineName: nameInput.value.trim(),
    ownerMachineryCategory: document.getElementById('editCategory').value,
    brandModel: brandInput.value.trim(),
    manufacturingYear: yearVal,
    rentalPrice: priceVal,
    priceUnit: document.getElementById('editPriceUnit').value,
    availabilityStatus: document.getElementById('editAvailabilityStatus').value,
    minRentalDuration: minDurInput.value.trim(),
    maxRentalDuration: maxDurInput.value.trim(),
    machineLocation: locInput.value.trim(),
    availableFrom: fromInput.value,
    availableUntil: untilInput.value,
    machineDescription: descInput.value.trim()
  };

  const origBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Saving...';
  submitBtn.disabled = true;

  try {
    const res = await fetch(`http://localhost:5000/api/listings/${encodeURIComponent(listingId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
      clearAuthTokens();
      hideOwnerProtectedContent();
      alert('Your owner session has expired or is invalid. Please log in again.');
      return;
    }

    if (res.ok) {
      closeOwnerModals();
      fetchOwnerListings();
      const dashboardFeedback = document.getElementById('ownerDashboardFeedback');
      if (dashboardFeedback) {
        dashboardFeedback.style.display = 'block';
        dashboardFeedback.style.color = '#4ade80';
        dashboardFeedback.textContent = `✓ Listing updated successfully!`;
        setTimeout(() => { dashboardFeedback.style.display = 'none'; }, 4000);
      }
    } else {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#ef4444';
        feedback.textContent = `Update Failed: ${data.message || 'Unknown error'}`;
      }
    }
  } catch (err) {
    console.error("Listing update network error:", err);
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.color = '#ef4444';
      feedback.textContent = 'Network error while saving changes. Please check server.';
    }
  } finally {
    submitBtn.innerHTML = origBtnText;
    submitBtn.disabled = false;
  }
}

/**
 * Open Delete Confirmation Modal
 */
function openDeleteModal(listing) {
  const modal = document.getElementById('ownerDeleteModal');
  const targetIdInput = document.getElementById('deleteTargetListingId');
  const modalText = document.getElementById('deleteModalText');

  if (targetIdInput) targetIdInput.value = listing.id;
  if (modalText) {
    modalText.textContent = `Are you sure you want to permanently delete your listing "${listing.machineName}"? Farmers will no longer be able to find or request this machine.`;
  }
  if (modal) modal.style.display = 'flex';
}

/**
 * Handle Owner Delete Confirmation (DELETE /api/listings/:id)
 */
async function handleOwnerDeleteConfirm() {
  const targetIdInput = document.getElementById('deleteTargetListingId');
  const listingId = targetIdInput ? targetIdInput.value : null;
  const confirmBtn = document.getElementById('btnConfirmDelete');

  if (!listingId) return;

  const token = getAuthToken();
  if (!token) {
    alert('Session expired. Please log in again.');
    hideOwnerProtectedContent();
    return;
  }

  const origBtnText = confirmBtn.innerHTML;
  confirmBtn.innerHTML = 'Deleting...';
  confirmBtn.disabled = true;

  try {
    const res = await fetch(`http://localhost:5000/api/listings/${encodeURIComponent(listingId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
      clearAuthTokens();
      hideOwnerProtectedContent();
      alert('Your owner session has expired or is invalid. Please log in again.');
      return;
    }

    if (res.ok) {
      closeOwnerModals();
      fetchOwnerListings();
      const dashboardFeedback = document.getElementById('ownerDashboardFeedback');
      if (dashboardFeedback) {
        dashboardFeedback.style.display = 'block';
        dashboardFeedback.style.color = '#4ade80';
        dashboardFeedback.textContent = `✓ Listing deleted successfully.`;
        setTimeout(() => { dashboardFeedback.style.display = 'none'; }, 4000);
      }
    } else {
      alert(`Deletion Failed: ${data.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error("Listing deletion error:", err);
    alert('Network error while attempting to delete listing.');
  } finally {
    confirmBtn.innerHTML = origBtnText;
    confirmBtn.disabled = false;
  }
}

/**
 * Close All Owner Modals
 */
function closeOwnerModals() {
  const editModal = document.getElementById('ownerEditModal');
  const deleteModal = document.getElementById('ownerDeleteModal');
  if (editModal) editModal.style.display = 'none';
  if (deleteModal) deleteModal.style.display = 'none';
}

/**
 * ==========================================================================
 * OWNER DASHBOARD: INCOMING RENTAL REQUESTS MANAGEMENT
 * ==========================================================================
 */

let cachedOwnerRequests = [];

/**
 * Fetch incoming rental requests for the authenticated owner
 */
async function fetchOwnerRequests() {
  const loading = document.getElementById('ownerRequestsLoading');
  const errorBox = document.getElementById('ownerRequestsError');
  const errorMsg = document.getElementById('ownerRequestsErrorMessage');
  const empty = document.getElementById('ownerRequestsEmpty');
  const grid = document.getElementById('ownerRequestsGrid');
  const countBadge = document.getElementById('ownerRequestsCountBadge');
  const tabBadge = document.getElementById('ownerRequestsBadge');

  const token = getAuthToken();
  if (!token) return;

  if (loading) loading.style.display = 'block';
  if (errorBox) errorBox.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (grid) grid.innerHTML = '';

  try {
    const res = await fetch('http://localhost:5000/api/rentals/owner-requests', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      clearAuthTokens();
      hideOwnerProtectedContent();
      return;
    }

    if (!res.ok) {
      throw new Error(`Failed to load requests (${res.status})`);
    }

    const data = await res.json();
    cachedOwnerRequests = data.requests || [];

    // Update count badges
    const totalCount = cachedOwnerRequests.length;
    const pendingCount = cachedOwnerRequests.filter(r => r.status === 'pending').length;

    if (countBadge) countBadge.textContent = `Total Inquiries: ${totalCount}`;
    if (tabBadge) {
      if (pendingCount > 0) {
        tabBadge.textContent = pendingCount;
        tabBadge.style.display = 'inline-block';
      } else {
        tabBadge.style.display = 'none';
      }
    }

    // Render requests if grid element exists
    if (grid) {
      renderOwnerRequests();
    }

  } catch (err) {
    console.error("Owner requests fetch error:", err);
    if (errorBox && errorMsg) {
      errorMsg.textContent = 'Could not load incoming rental requests. Please check connection and retry.';
      errorBox.style.display = 'block';
    }
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

/**
 * Render incoming requests into ownerRequestsGrid
 */
function renderOwnerRequests() {
  const grid = document.getElementById('ownerRequestsGrid');
  const empty = document.getElementById('ownerRequestsEmpty');
  if (!grid) return;

  grid.innerHTML = '';

  if (cachedOwnerRequests.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  cachedOwnerRequests.forEach(req => {
    const card = document.createElement('div');
    card.className = 'owner-request-card';
    card.setAttribute('data-id', req.id);

    // Status styling
    let statusBg = '#fef3c7';
    let statusColor = '#92400e';
    let statusText = 'PENDING REVIEW';
    if (req.status === 'approved') {
      statusBg = '#d1fae5';
      statusColor = '#065f46';
      statusText = 'APPROVED';
    } else if (req.status === 'rejected') {
      statusBg = '#fee2e2';
      statusColor = '#991b1b';
      statusText = 'REJECTED';
    }

    const itemsSummaryHtml = (req.items || []).map(item => `
      <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 0.85rem; margin-bottom: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <strong style="color: #FFFFFF; font-size: 1rem;">🚜 ${escapeHtml(item.name)}</strong>
          <span style="color: var(--color-primary-yellow); font-weight: 700;">₹${Number(item.price).toLocaleString('en-IN')} (Estimated Budget)</span>
        </div>
        <div style="display: flex; gap: 1.5rem; margin-top: 0.4rem; font-size: 0.85rem; color: #9ca3af; flex-wrap: wrap;">
          <span>Category: <strong style="color:#d1d5db; text-transform: capitalize;">${escapeHtml(item.category)}</strong></span>
          <span>Duration: <strong style="color:#d1d5db;">${escapeHtml(item.duration)}</strong></span>
          <span>Required Date: <strong style="color:#d1d5db;">${escapeHtml(item.date)}</strong></span>
          <span>Delivery / Farm Location: <strong style="color:#d1d5db;">${escapeHtml(item.location)}</strong></span>
        </div>
      </div>
    `).join('');

    card.innerHTML = `
      <div style="background: rgba(25, 25, 25, 0.85); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 1rem; margin-bottom: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
              <span style="font-family: monospace; font-size: 1.05rem; font-weight: 700; color: var(--color-primary-yellow);">${escapeHtml(req.bookingRef)}</span>
              <span style="background: ${statusBg}; color: ${statusColor}; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 9999px; letter-spacing: 0.05em;">${statusText}</span>
            </div>
            <p style="margin: 0.35rem 0 0; font-size: 0.82rem; color: #9ca3af;">
              Received: ${formatDate(req.createdAt)}
            </p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.82rem; color: #9ca3af;">Total Inquired Budget</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: #ffffff;">₹${Number(req.totalBudget || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <h4 style="margin: 0 0 0.5rem; font-size: 0.9rem; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Requested Machinery</h4>
          ${itemsSummaryHtml || '<p style="color:#9ca3af; font-size:0.9rem;">Equipment details included in booking.</p>'}
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; background: rgba(0,0,0,0.25); padding: 1rem; border-radius: 8px; margin-bottom: 1.25rem;">
          <div>
            <span style="display: block; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase;">Farmer / Renter Name</span>
            <strong style="color: #ffffff; font-size: 0.95rem;">👤 ${escapeHtml(req.renterName)}</strong>
          </div>
          <div>
            <span style="display: block; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase;">Direct Contact Phone</span>
            <a href="tel:${escapeHtml(req.renterPhone)}" style="color: var(--color-primary-yellow); font-weight: 600; text-decoration: none; font-size: 0.95rem;">📞 ${escapeHtml(req.renterPhone)}</a>
          </div>
          <div>
            <span style="display: block; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase;">Renter Location / Hub</span>
            <span style="color: #ffffff; font-size: 0.95rem;">📍 ${escapeHtml(req.location || 'Local')}</span>
          </div>
        </div>

        ${req.additionalRequirements ? `
          <div style="margin-bottom: 1.25rem; background: rgba(255, 191, 0, 0.05); border-left: 3px solid var(--color-primary-yellow); padding: 0.75rem 1rem; border-radius: 0 6px 6px 0;">
            <span style="font-size: 0.75rem; color: var(--color-primary-yellow); font-weight: 700; text-transform: uppercase;">Renter Notes / Special Instructions</span>
            <p style="margin: 0.25rem 0 0; font-size: 0.88rem; color: #e5e7eb;">${escapeHtml(req.additionalRequirements)}</p>
          </div>
        ` : ''}

        <div class="owner-request-actions" style="display: flex; gap: 0.75rem; justify-content: flex-end; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1rem; flex-wrap: wrap;">
          ${req.status === 'pending' ? `
            <span style="font-size: 0.82rem; color: #9ca3af; margin-right: auto;">
              ℹ️ Decision will notify renter. Approval does not process payment.
            </span>
            <button type="button" class="btn-request-reject" data-id="${req.id}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #f87171; font-weight: 600; padding: 0.55rem 1.25rem; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
              ✕ Reject Request
            </button>
            <button type="button" class="btn-request-approve" data-id="${req.id}" style="background: #059669; border: 1px solid #047857; color: #ffffff; font-weight: 700; padding: 0.55rem 1.5rem; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
              ✓ Approve Request
            </button>
          ` : `
            <span style="font-size: 0.88rem; color: #9ca3af;">
              Decision recorded on ${formatDate(req.updatedAt || req.createdAt)}. Status is final.
            </span>
          `}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  // Attach event handlers for Approve and Reject buttons
  grid.querySelectorAll('.btn-request-approve').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleRequestDecision(id, 'approved', btn);
    });
  });

  grid.querySelectorAll('.btn-request-reject').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleRequestDecision(id, 'rejected', btn);
    });
  });
}

/**
 * Handle Owner Decision (Approve or Reject)
 */
async function handleRequestDecision(requestId, decisionStatus, btnEl) {
  if (!confirm(`Are you sure you want to ${decisionStatus.toUpperCase()} this rental request?`)) {
    return;
  }

  const token = getAuthToken();
  if (!token) {
    alert('Your session has expired. Please log in again.');
    hideOwnerProtectedContent();
    return;
  }

  const origText = btnEl.innerHTML;
  btnEl.innerHTML = 'Updating...';
  btnEl.disabled = true;

  const feedback = document.getElementById('ownerRequestsFeedback');

  try {
    const res = await fetch(`http://localhost:5000/api/rentals/requests/${encodeURIComponent(requestId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: decisionStatus })
    });

    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
      alert(`Action not permitted: ${data.message || 'Unauthorized'}`);
      return;
    }

    if (res.ok) {
      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = decisionStatus === 'approved' ? '#4ade80' : '#f87171';
        feedback.textContent = `✓ Request has been ${decisionStatus} successfully!`;
        setTimeout(() => { feedback.style.display = 'none'; }, 4000);
      }
      // Refresh requests list
      await fetchOwnerRequests();
    } else {
      alert(`Decision Update Failed: ${data.message || 'Unknown error'}`);
    }

  } catch (err) {
    console.error("Decision submission error:", err);
    alert('Network error while updating rental request status.');
  } finally {
    btnEl.innerHTML = origText;
    btnEl.disabled = false;
  }
}