/**
 * Agricultural Rental Machinery - Subpages & Forms Handler
 * Manages client-side validation, GPS location helper, tab toggles, and submission feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initAuthTabs();
  initRadioPills();
  initGpsHelpers();
  initPhotoUploadPreview();
  initFarmerForm();
  initOwnerForm();
  initMinDates();
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

  // Handle Quick Login Submit
  const quickLoginForm = document.getElementById('quickLoginForm');
  if (quickLoginForm) {
    quickLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const loginId = document.getElementById('quickLoginId');
      if (loginId && loginId.value.trim()) {
        const feedback = document.getElementById('quickLoginFeedback');
        if (feedback) {
          feedback.textContent = `✓ Logged in as ${loginId.value.trim()} (Demo Session Active)`;
          feedback.style.color = '#4ade80';
          feedback.style.display = 'block';
        }
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
      showError(nameInput, 'Farmer name is required.');
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
      showError(locationInput, 'Farmer location / address is required.');
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

    // Success Handling
    const refId = 'FMR-' + Math.floor(100000 + Math.random() * 900000);
    const summaryData = {
      'Farmer Name': nameInput.value.trim(),
      'Contact Phone': phoneInput.value.trim(),
      'Category': categoryInput.options[categoryInput.selectedIndex].text,
      'Machinery': specificMachineryInput.value.trim(),
      'Required Date': dateInput.value,
      'Duration': durationInput.value.trim(),
      'Max Budget': '₹ ' + Number(budgetInput.value).toLocaleString('en-IN'),
      'Search Radius': preferredLocationInput.options[preferredLocationInput.selectedIndex].text,
      'Farmer Location': locationInput.value.trim()
    };

    renderSummary('farmerSummaryContainer', summaryData);
    document.getElementById('farmerRefId').textContent = `Booking Request ID: #${refId}`;

    formCard.style.display = 'none';
    successCard.classList.add('show');
    successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      clearErrors(form);
    });
  }

  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener('click', () => {
      form.reset();
      clearErrors(form);
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

    // Success Handling
    const refId = 'OWN-' + Math.floor(100000 + Math.random() * 900000);
    const unitText = priceUnitInput ? priceUnitInput.value : 'Day';
    const summaryData = {
      'Owner Name': nameInput.value.trim(),
      'Machine Title': machineNameInput.value.trim(),
      'Category': categoryInput.options[categoryInput.selectedIndex].text,
      'Brand & Model': brandModelInput.value.trim(),
      'Year': mfgYearInput.value.trim(),
      'Rental Rate': `₹ ${Number(rentalPriceInput.value).toLocaleString('en-IN')} / ${unitText}`,
      'Availability': availabilityInput.options[availabilityInput.selectedIndex].text,
      'Schedule': `${availableFromInput.value} to ${availableUntilInput.value}`,
      'Location': machineLocationInput.value.trim()
    };

    renderSummary('ownerSummaryContainer', summaryData);
    document.getElementById('ownerRefId').textContent = `Listing Reference ID: #${refId}`;

    formCard.style.display = 'none';
    successCard.classList.add('show');
    successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  container.innerHTML = html;
}
