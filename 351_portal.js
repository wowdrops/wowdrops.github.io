// ==========================================
// 1. BACKEND API CONNECTION
// ==========================================
// ⚠️ PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
const APPS_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbzhY0E8LaGEaGol7lqOjPdvss-cHeIhvejr6yB9D5EvUevSC4haUVbOFlwtgBht819ntg/exec";
var activeApiRequests = 0;



// ========================================== 
// FEATURE FLAGS & CONSTANTS
// ==========================================
const ALLOW_MANUAL_CAN_ENTRY = false;
const CURRENT_ENV = "Live";
const DEFAULTERS_DASHBOARD_COUNT = 10;
const CONFIRMATION_STYLE = 'toggle';

var activeUserSession = null;
var passwordSetupSource = 'login';
window.currentMaxOrd = null;
window.currentMaxOrdD = null;
window.currentMaxOrdE = null;
window.limitReasonD = "";
window.limitReasonE = "";

// APP VERSIONING & CACHE BUSTING
(function () {
  var APP_VERSION = "4.2";
  var savedVersion = localStorage.getItem('wowdrops_app_version');

  if (savedVersion !== APP_VERSION) {
    localStorage.setItem('wowdrops_app_version', APP_VERSION);
    var url = window.location.href;
    var separator = url.indexOf('?') !== -1 ? '&' : '?';
    var cacheBusterUrl = url + separator + 'refresh=' + new Date().getTime();
    window.open(cacheBusterUrl, '_top');
  }
})();

window.onload = function () {
  if (!ALLOW_MANUAL_CAN_ENTRY) {
    document.getElementById('input-ord-d').disabled = true;
    document.getElementById('btn-can-minus').classList.add('hidden');
    document.getElementById('btn-can-plus').classList.add('hidden');
    document.getElementById('can-input-wrapper').classList.add('opacity-70');
    document.getElementById('can-input-wrapper').classList.add('cursor-not-allowed');
    document.getElementById('can-policy-msg').classList.remove('hidden');
  } else {
    document.getElementById('input-ord-d').disabled = false;
    document.getElementById('btn-can-minus').classList.remove('hidden');
    document.getElementById('btn-can-plus').classList.remove('hidden');
    document.getElementById('can-input-wrapper').classList.remove('opacity-70');
    document.getElementById('can-input-wrapper').classList.remove('cursor-not-allowed');
  }

  

  var savedSession = localStorage.getItem('wowdrops_customer_session');
  if (savedSession) {
    activeUserSession = JSON.parse(savedSession);
    updateHeaderDisplays();
    showDashboardSkeletons();
    switchView('view-dashboard');
    refreshCustomerSessionData(activeUserSession.cpn);
  }

  //console.log("System running in: " + CURRENT_ENV);
  if (CURRENT_ENV === 'Live') {
    ENABLE_PHONEPE_GATEWAY = true;
  }
  else
  {
    ENABLE_PHONEPE_GATEWAY = false;
  }
  checkForPaymentRedirect();
};

function isServerBusy() {
  if (activeApiRequests > 0) {
    showBusyMessage();
    return true; 
  }
  return false; 
}

function showBusyMessage() {
  var msgEl = document.getElementById('global-busy-msg');
  if (!msgEl) {
    msgEl = document.createElement('div');
    msgEl.id = 'global-busy-msg';
    msgEl.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-lg z-50 transition-opacity duration-300';
    msgEl.innerText = '⏳ Processing... please wait a moment.';
    document.body.appendChild(msgEl);
  }
  
  msgEl.style.opacity = '1';
  msgEl.classList.remove('hidden');
  
  setTimeout(function() { 
      msgEl.style.opacity = '0'; 
      setTimeout(() => msgEl.classList.add('hidden'), 300); 
  }, 2000);
}



function formatCurrency(amount) {
  var num = parseFloat(amount) || 0;
  // Rounds to a maximum of 2 decimal places cleanly
  return (Math.round(num * 100) / 100).toString();
}

function getDefaultDateRange() {
  var end = new Date();
  var start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}


// Request Queue Management
var apiQueue = [];
var isProcessingQueue = false;

function callBackendAPI(actionName, payload, onSuccess, onFailure) {
  payload.action = actionName;

  // Add the request to the queue
  apiQueue.push({ payload, onSuccess, onFailure });

  // Process queue if not already running
  processApiQueue();
}

async function processApiQueue() {
  if (isProcessingQueue || apiQueue.length === 0) return;

  isProcessingQueue = true;
  activeApiRequests++;

  const currentRequest = apiQueue.shift();

  try {
    const response = await fetch(APPS_SCRIPT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(currentRequest.payload),
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Failed to parse JSON. Raw response from Google:", rawText);
      throw new Error("Server returned an invalid JSON response.");
    }

    if (currentRequest.onSuccess) currentRequest.onSuccess(data);

  } catch (error) {
    console.error("API Error in callBackendAPI:", error);
    if (currentRequest.onFailure) currentRequest.onFailure(error);
  } finally {
    activeApiRequests--;
    isProcessingQueue = false;

    // Small delay (300ms) to allow Google Apps Script execution context to clear
    setTimeout(processApiQueue, 300);
  }
}

function updateHeaderDisplays() {
  if (!activeUserSession) return;

  document.querySelectorAll('.disp-cust-name').forEach(function (el) {
    el.innerText = activeUserSession.name || "";
  });

  var parts = [];
  if (activeUserSession.phone) parts.push(activeUserSession.phone);
  if (activeUserSession.cpn) parts.push(activeUserSession.cpn);
  if (activeUserSession.block) parts.push(activeUserSession.block);
  if (activeUserSession.door) parts.push(activeUserSession.door);

  var separator = '<span class="text-indigo-300/50 mx-1.5 font-light">|</span>';
  document.querySelectorAll('.disp-cust-details').forEach(function (el) {
    el.innerHTML = parts.join(separator);
  });
}

// === ORDER WIDGET TOGGLES ===
function toggleOrderEditMode(isEditing) {
  var cancelBtn = document.getElementById('btn-cancel-edit');
  if (isEditing) {
    document.getElementById('order-edit-mode-msg').classList.add('hidden');
    document.getElementById('order-input-section').classList.remove('hidden');
    if (activeUserSession && activeUserSession.hasExistingOrder && cancelBtn) {
      cancelBtn.classList.remove('hidden');
    } else if (cancelBtn) {
      cancelBtn.classList.add('hidden');
    }
  } else {
    document.getElementById('order-edit-mode-msg').classList.remove('hidden');
    document.getElementById('order-input-section').classList.add('hidden');
  }
}

function cancelEditMode() {
  if (activeUserSession && activeUserSession.hasExistingOrder) {
    document.getElementById('input-ord-d').value = activeUserSession.existingOrdD || 1;
    document.getElementById('input-ord-e').value = activeUserSession.existingOrdE || 1;
  }
  
  window.pendingReplaceQty = null;
  window.pendingReplaceReason = null;
  
  toggleOrderEditMode(false);
  renderOrderWidget(); 
}

// ==========================================
// CANCEL ORDER LOGIC
// ==========================================
function openCancelModal() {
  var modal = document.getElementById('cancel-order-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  document.getElementById('cancel-checkbox').checked = false;
  document.getElementById('cancel-toggle').checked = false;

  if (CONFIRMATION_STYLE === 'toggle') {
    document.getElementById('confirm-type-toggle').classList.remove('hidden');
    document.getElementById('confirm-type-toggle').classList.add('flex');
    document.getElementById('confirm-type-checkbox').classList.add('hidden');
    document.getElementById('confirm-type-checkbox').classList.remove('flex');
  } else {
    document.getElementById('confirm-type-checkbox').classList.remove('hidden');
    document.getElementById('confirm-type-checkbox').classList.add('flex');
    document.getElementById('confirm-type-toggle').classList.add('hidden');
    document.getElementById('confirm-type-toggle').classList.remove('flex');
  }
  validateCancelAction();
}

function closeCancelModal() {
  var modal = document.getElementById('cancel-order-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function validateCancelAction() {
  var isConfirmed = CONFIRMATION_STYLE === 'toggle' ?
    document.getElementById('cancel-toggle').checked :
    document.getElementById('cancel-checkbox').checked;

  var btn = document.getElementById('btn-execute-cancel');
  if (isConfirmed) {
    btn.disabled = false;
    btn.classList.remove('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
    btn.classList.add('bg-red-600', 'text-white', 'hover:bg-red-700', 'shadow-md');
  } else {
    btn.disabled = true;
    btn.classList.add('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
    btn.classList.remove('bg-red-600', 'text-white', 'hover:bg-red-700', 'shadow-md');
  }
}

function executeCancelOrder() {
  var btn = document.getElementById('btn-execute-cancel');
  btn.innerHTML = 'Cancelling...';
  btn.disabled = true;
  
  var payload = { 
    cpn: activeUserSession.cpn,
    uniqueNo: activeUserSession.uniqueNo,
    rowIdx: activeUserSession.rowCache ? activeUserSession.rowCache.ord : null
  };
  
  callBackendAPI("cancelCustomerOrder", payload, 
    function(response) {
      closeCancelModal();
      btn.innerHTML = 'Confirm & Cancel'; 
      btn.disabled = false;
      
      if (response.success) {
          var msgEl = document.getElementById('order-msg');
          if (msgEl) {
              msgEl.innerText = "Order Cancelled Successfully.";
              msgEl.className = "text-center text-sm font-black text-red-600 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg fade-in";
              msgEl.classList.remove('hidden');
              setTimeout(() => msgEl.classList.add('hidden'), 5000);
          }
          
          // ⚡ FULL MEMORY WIPE
          if (activeUserSession) {
            activeUserSession.hasExistingOrder = false;
            activeUserSession.replaceQty = 0;
            activeUserSession.replaceReason = "";
            localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));
          }

          window.pendingReplaceQty = null;
          window.pendingReplaceReason = null;
          var badge = document.getElementById('replacement-badge');
          if (badge) {
            badge.classList.add('hidden');
            badge.classList.remove('flex');
          }
          // ⚡ END FULL MEMORY WIPE
          
          var poDetails = document.getElementById('po-details');
          var poEmpty = document.getElementById('po-empty-msg');
          
          if (poDetails) poDetails.classList.add('hidden');
          if (poEmpty) poEmpty.classList.remove('hidden');
          
          var poDate = document.getElementById('po-date');
          if (poDate) poDate.innerText = "--";
          
          toggleOrderEditMode(true); 
      } else {
          alert("Failed to cancel: " + response.message);
      }
    },
    function(err) {
      closeCancelModal();
      btn.innerHTML = 'Confirm & Cancel';
      btn.disabled = false;
      alert("Network error. Please try again.");
    }
  );
}

function toggleMenu() { 
  if (isServerBusy()) return; // Protection added
  document.getElementById('dropdown-menu').classList.toggle('hidden'); 
}

function syncCans(val) {
  var numVal = parseInt(val) || 0;
  var fieldE = document.getElementById('input-ord-e');
  if (window.currentMaxOrdE !== null && numVal > window.currentMaxOrdE) {
    numVal = window.currentMaxOrdE;
    fieldE.value = numVal;
  }
  if (!ALLOW_MANUAL_CAN_ENTRY) {
    var fieldD = document.getElementById('input-ord-d');
    var finalD = numVal;
    if (window.currentMaxOrdD !== null && finalD > window.currentMaxOrdD) {
      finalD = window.currentMaxOrdD;
    }
    fieldD.value = finalD;
  }
}

function adjustValue(inputId, step) {
  var field = document.getElementById(inputId);
  var currentVal = parseInt(field.value) || 0;
  var newVal = Math.max(0, currentVal + step);
  var maxAllowed = inputId === 'input-ord-d' ? window.currentMaxOrdD : window.currentMaxOrdE;
  if (maxAllowed !== null && newVal > maxAllowed) newVal = maxAllowed;
  field.value = newVal;
  if (inputId === 'input-ord-e') syncCans(newVal);
}

function quickAddCans(qty) {
  if (window.currentMaxOrdE === null) return;
  
  // Safety check: Prevents overriding max limits
  var finalQty = Math.min(qty, window.currentMaxOrdE);
  
  var fieldE = document.getElementById('input-ord-e');
  fieldE.value = finalQty;
  syncCans(finalQty);
}

// ==========================================
// AUTHENTICATION & PROFILE
// ==========================================
function handleLogin() {
  var loginId = document.getElementById('login-id').value;
  var loginPass = document.getElementById('login-pass').value;
  var errorEl = document.getElementById('login-err');

  if (!loginId) return showError(errorEl, "Mobile/CPN field cannot be blank.");
  toggleButtonState('btn-login', true, 'Verifying...');

  callBackendAPI("authenticate", { loginId: loginId, password: loginPass },
    function (response) {
      toggleButtonState('btn-login', false, 'Secure Sign In');
      if (response.success) {
        document.getElementById('login-pass').blur();
        document.getElementById('login-id').blur();
        if (response.isNewUser) {
          passwordSetupSource = 'login';
          window.tempLoginId = loginId;
          switchView('view-new-password');
        } else {
          activeUserSession = response.customerData;
          localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));
          updateHeaderDisplays();
          showDashboardSkeletons();
          switchView('view-dashboard');
          refreshCustomerSessionData(activeUserSession.cpn);
        }
      } else { showError(errorEl, response.message); }
    },
    function (err) {
      toggleButtonState('btn-login', false, 'Secure Sign In');
      showError(errorEl, "Network error.");
    }
  );
}

function logoutCustomer() {
  localStorage.removeItem('wowdrops_customer_session');
  activeUserSession = null;
  document.getElementById('dropdown-menu').classList.add('hidden');
  switchView('view-login');
  var msgEl = document.getElementById('login-msg');
  msgEl.innerText = "You have been successfully logged out.";
  msgEl.classList.remove('hidden');
  setTimeout(function () { msgEl.classList.add('hidden'); }, 4000);
}

function openProfile() {
  document.getElementById('prof-phone').value = activeUserSession.phone || "";
  document.getElementById('prof-cpn').value = activeUserSession.cpn || "";
  document.getElementById('prof-rate').value = activeUserSession.defaultRate || 0;
  document.getElementById('prof-email').value = activeUserSession.email || "";
  document.getElementById('prof-wa').value = activeUserSession.whatsapp || "";
  document.getElementById('prof-msg').classList.add('hidden');
  switchView('view-profile');
}

function submitProfileUpdate() {
  var email = document.getElementById('prof-email').value;
  var wa = document.getElementById('prof-wa').value;
  var msgEl = document.getElementById('prof-msg');

  toggleButtonState('btn-update-prof', true, 'Updating...');

  callBackendAPI("updateCustomerProfile", { cpn: activeUserSession.cpn, email: email, whatsapp: wa },
    function (res) {
      toggleButtonState('btn-update-prof', false, 'Update Profile');
      msgEl.innerText = res.message;
      msgEl.className = "text-sm font-bold text-center mt-2 block " + (res.success ? "text-emerald-600" : "text-red-500");
      if (res.success) {
        activeUserSession.email = email;
        activeUserSession.whatsapp = wa;
        localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));
        setTimeout(function () { msgEl.classList.add('hidden'); }, 4000);
      }
    }
  );
}

function openChangePassword() {
  passwordSetupSource = 'dashboard';
  document.getElementById('pass-setup-err').classList.add('hidden');
  document.getElementById('new-pass-1').value = '';
  document.getElementById('new-pass-2').value = '';
  switchView('view-new-password');
}

function cancelPasswordSetup() {
  if (passwordSetupSource === 'login') switchView('view-login'); else switchView('view-dashboard');
}

function submitPasswordSetup() {
  var targetId = passwordSetupSource === 'login' ? window.tempLoginId : activeUserSession.cpn;
  var p1 = document.getElementById('new-pass-1').value;
  var p2 = document.getElementById('new-pass-2').value;
  var errorEl = document.getElementById('pass-setup-err');
  if (!p1 || p1.length < 4) return showError(errorEl, "Password too short.");
  if (p1 !== p2) return showError(errorEl, "Passwords do not match.");

  callBackendAPI("setupNewPassword", { loginId: targetId, newPassword: p1 },
    function (res) {
      if (res.success) {
        alert(res.message);
        if (passwordSetupSource === 'login') switchView('view-login'); else switchView('view-dashboard');
      } else showError(errorEl, res.message);
    }
  );
}

// ==========================================
// FORGOT PASSWORD FLOW
// ==========================================
function openForgotPassword() {
  document.getElementById('fp-step-1').classList.remove('hidden');
  document.getElementById('fp-step-2').classList.add('hidden');
  document.getElementById('fp-err-1').classList.add('hidden');
  document.getElementById('fp-id').value = '';
  switchView('view-forgot-password');
}

function requestOTP() {
  var loginId = document.getElementById('fp-id').value;
  var err = document.getElementById('fp-err-1');
  if (!loginId) return showError(err, "Enter your Mobile or CPN.");

  toggleButtonState('btn-fp-otp', true, 'Sending...');

  callBackendAPI("requestPasswordReset", { loginId: loginId },
    function (res) {
      toggleButtonState('btn-fp-otp', false, 'Send Reset OTP to Email');
      if (res.success) {
        document.getElementById('fp-step-1').classList.add('hidden');
        document.getElementById('fp-step-2').classList.remove('hidden');
        window.tempRecoveryId = loginId;
      } else { showError(err, res.message); }
    }
  );
}

function verifyAndResetPassword() {
  var otp = document.getElementById('fp-otp-input').value;
  var np = document.getElementById('fp-new-pass').value;
  var err = document.getElementById('fp-err-2');

  if (!otp || otp.length < 6) return showError(err, "Enter valid 6-digit OTP.");
  if (!np || np.length < 4) return showError(err, "Password too short.");

  toggleButtonState('btn-fp-reset', true, 'Verifying...');

  callBackendAPI("verifyOTPAndReset", { loginId: window.tempRecoveryId, otp: otp, newPassword: np },
    function (res) {
      toggleButtonState('btn-fp-reset', false, 'Verify & Reset Password');
      if (res.success) {
        alert(res.message);
        switchView('view-login');
      } else { showError(err, res.message); }
    }
  );
}

// ==========================================
// EMAIL COLLECTION LOGIC
// ==========================================
function checkEmailCollection() {
  if (!activeUserSession.email && sessionStorage.getItem('email_skipped') !== 'true') {
    setTimeout(function () { document.getElementById('email-modal').classList.remove('hidden'); }, 1500);
  }
}
function skipEmailCapture() {
  sessionStorage.setItem('email_skipped', 'true');
  document.getElementById('email-modal').classList.add('hidden');
}
function saveCapturedEmail() {
  var email = document.getElementById('capture-email').value;
  if (!email || email.indexOf('@') === -1) return alert("Please enter a valid email address.");

  toggleButtonState('btn-save-email', true, 'Saving...');

  callBackendAPI("updateCustomerProfile", { cpn: activeUserSession.cpn, email: email, whatsapp: "" },
    function (res) {
      toggleButtonState('btn-save-email', false, 'Save Email');
      if (res.success) {
        activeUserSession.email = email;
        localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));
        document.getElementById('email-modal').classList.add('hidden');
      } else { alert(res.message); }
    }
  );
}

// ==========================================
// DASHBOARD & ACTIVITY WIDGETS
// ==========================================
function showDashboardSkeletons() {
  document.getElementById('dash-skel').classList.remove('hidden');
  document.getElementById('dash-outstanding').innerHTML = "<div class='h-6 bg-slate-700/50 rounded w-16 animate-pulse'></div>";
  document.getElementById('dash-previous-dues').innerHTML = "<div class='h-5 bg-slate-700/50 rounded w-12 animate-pulse'></div>";
  document.getElementById('dash-current-month').innerHTML = "<div class='h-5 bg-slate-700/50 rounded w-12 animate-pulse'></div>";
  document.getElementById('val-advance').innerHTML = "<div class='h-6 bg-slate-700/50 rounded w-12 animate-pulse'></div>";
  document.getElementById('val-cans').innerHTML = "<div class='h-6 bg-slate-700/50 rounded w-8 animate-pulse'></div>";

  var submitBtn = document.getElementById('btn-submit-order');
  submitBtn.disabled = true;
  submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
  submitBtn.innerHTML = "<span class='animate-pulse'>Fetching Live Status...</span>";
}



// 1. Helper to wrap your existing callback API into a modern Promise
const callBackendAsync = (action, payload) => {
  return new Promise((resolve, reject) => {
    callBackendAPI(action, payload, resolve, reject);
  });
};

// 2. Helper to force a small pause for Google Apps Script redirects
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 3. The newly refactored Dashboard Loader
async function refreshCustomerSessionData(cpn) {
  if (!activeUserSession.rowCache) activeUserSession.rowCache = { ord: null, out: null, db: null };

  try {
    // A. Fetch Order Data FIRST and wait for it to fully complete
    const fastData = await callBackendAsync("getQuickOrderData", { cpn: cpn, cachedOrdRow: activeUserSession.rowCache.ord });
    
    activeUserSession.uniqueNo = fastData.existingOrder.uniqueNo; 
    activeUserSession.rowCache.ord = fastData.existingOrder.rowNo;
    activeUserSession.existingOrdD = fastData.existingOrder.ordD;
    activeUserSession.existingOrdE = fastData.existingOrder.ordE;
    activeUserSession.rate = fastData.existingOrder.rate;
    activeUserSession.ordDate = fastData.existingOrder.ordDate;
    activeUserSession.hasExistingOrder = fastData.existingOrder.isExisting;
    activeUserSession.supplyConfig = fastData.supplyConfig;
    // --- NEW DATA MEMORY ---
    activeUserSession.status = fastData.existingOrder.status;
    activeUserSession.pendingQty = fastData.existingOrder.pendingQty;
    activeUserSession.replaceQty = fastData.existingOrder.replaceQty;
    activeUserSession.replaceReason = fastData.existingOrder.replaceReason;

    var submitBtn = document.getElementById('btn-submit-order');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    submitBtn.innerHTML = "<span>Submit Request</span>";

    renderOrderWidget();

    // ⏱️ CRITICAL FIX: 600ms delay to clear the browser's redirect tunnel
    await sleep(600);

    // B. Fetch Ledger Data SECOND 
    const ledgerData = await callBackendAsync("getFinancialLedgerData", { cpn: cpn, cachedOutRow: activeUserSession.rowCache.out, cachedDbRow: activeUserSession.rowCache.db });
    
    if (ledgerData.status === 'INACTIVE') {
        localStorage.removeItem('wowdrops_customer_session');
        activeUserSession = null;
        switchView('view-login');
        var loginErr = document.getElementById('login-err');
        loginErr.innerText = "Your status is changed to inactive. Please contact wowdrops";
        loginErr.classList.remove('hidden');
        return; 
    }

    activeUserSession.rowCache.out = ledgerData.outRowNo;
    activeUserSession.rowCache.db = ledgerData.dbRowNo;
    activeUserSession.outstanding = ledgerData.outstanding;
    activeUserSession.currentMon = ledgerData.currentMon;
    activeUserSession.lastMon = ledgerData.lastMon;
    activeUserSession.older = ledgerData.older;
    activeUserSession.cansWithCustomer = ledgerData.cansWithCustomer;
    activeUserSession.advance = ledgerData.advance;
    activeUserSession.maxClientD = ledgerData.maxClientD;
    activeUserSession.maxClientE = ledgerData.maxClientE;
    activeUserSession.email = ledgerData.email;
    activeUserSession.whatsapp = ledgerData.whatsapp;
    activeUserSession.defaultRate = ledgerData.defaultRate;

    localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));

    document.getElementById('dash-skel').classList.add('hidden');
    renderFinancialWidget();

    checkEmailCollection();

  } catch (error) {
    console.error("Dashboard failed to load securely:", error);
    alert("Failed to load dashboard data. Please try refreshing the page.");
  }

  setTimeout(function () { window.scrollTo(0, 1); window.scrollTo(0, 0); }, 300);
}

function renderOrderWidget() {
  var poDetails = document.getElementById('po-details');
  var poEmpty = document.getElementById('po-empty-msg');
  var pendingBanner = document.getElementById('pending-alert-banner');
  
  if (activeUserSession.status === "PENDING") {
    pendingBanner.classList.remove('hidden');
  } else {
    pendingBanner.classList.add('hidden');
  }

  var badge = document.getElementById('replacement-badge');
  var badgeText = document.getElementById('replacement-badge-text');
  var rQty = (window.pendingReplaceQty != null) ? window.pendingReplaceQty : (activeUserSession.replaceQty || 0);
  var rReason = (window.pendingReplaceReason != null) ? window.pendingReplaceReason : (activeUserSession.replaceReason || "");
  
  if (rQty > 0) {
    badgeText.innerText = "📦 Includes " + rQty + " Free Replacement (" + rReason + ")";
    badge.classList.remove('hidden');
    badge.classList.add('flex');
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('flex');
  }

  if (activeUserSession.hasExistingOrder) {
    poDetails.classList.remove('hidden');
    poEmpty.classList.add('hidden');
    document.getElementById('po-date').innerText = activeUserSession.ordDate || "recently";
    document.getElementById('po-cans').innerText = activeUserSession.existingOrdD || 0;
    document.getElementById('po-empties').innerText = activeUserSession.existingOrdE || 0;

    // --- NEW: SHOW REPLACEMENT IN PENDING WIDGET ---
    var poRepContainer = document.getElementById('po-rep-container');
    var poRepText = document.getElementById('po-rep-text');
    var sReqQty = activeUserSession.replaceQty || 0;
    var sReqRsn = activeUserSession.replaceReason || "";

    if (sReqQty > 0 && poRepContainer && poRepText) {
      poRepText.innerText = sReqQty + " Replacement(s) (" + sReqRsn + ")";
      poRepContainer.classList.remove('hidden');
    } else if (poRepContainer) {
      poRepContainer.classList.add('hidden');
    }
    // -----------------------------------------------

    document.getElementById('input-ord-d').value = activeUserSession.existingOrdD || 1;
    document.getElementById('input-ord-e').value = activeUserSession.existingOrdE || 1;
    toggleOrderEditMode(false);
  } else {
    poDetails.classList.add('hidden');
    poEmpty.classList.remove('hidden');
    document.getElementById('po-date').innerText = "--";
    toggleOrderEditMode(true);
  }

  var conf = activeUserSession.supplyConfig;
  var supplyBanner = document.getElementById('supply-limit-banner');

  if (conf && conf.isOn && conf.isSoldOut) {
    supplyBanner.classList.remove('hidden');
    supplyBanner.innerHTML = "<div class='bg-red-50 text-red-800 p-3 rounded-xl text-xs font-bold border border-red-200 flex items-start space-x-2 shadow-sm'><svg class='w-5 h-5 text-red-500 shrink-0 mt-0.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'></path></svg><span>Sold Out: Daily supply limit has been reached. No new orders can be placed for today.</span></div>";
  } else if (conf && conf.isOn && conf.limitActive) {
    supplyBanner.classList.remove('hidden');
    supplyBanner.innerHTML = "<div class='bg-amber-50 text-amber-800 p-3 rounded-xl text-xs font-bold border border-amber-200 flex items-start space-x-2 shadow-sm'><svg class='w-5 h-5 text-amber-500 shrink-0 mt-0.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'></path></svg><span>High demand alert: Available stock is low today. New limits have been applied to fresh orders.</span></div>";
  } else {
    supplyBanner.classList.add('hidden');
  }
}

function renderFinancialWidget() {
  document.getElementById('val-cans').innerText = activeUserSession.cansWithCustomer || 0;
  document.getElementById('val-advance').innerText = "₹" + formatCurrency(activeUserSession.advance);
  document.getElementById('dash-outstanding').innerText = "₹" + formatCurrency(activeUserSession.outstanding);

  var prevSum = (activeUserSession.older || 0) + (activeUserSession.lastMon || 0);
  document.getElementById('dash-previous-dues').innerText = "₹" + formatCurrency(prevSum);
  document.getElementById('dash-current-month').innerText = "₹" + formatCurrency(activeUserSession.currentMon);

  var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  document.getElementById('current-month-name').innerText = monthNames[new Date().getMonth()];

  var pendingBonus = activeUserSession.pendingQty || 0;
  var baseMaxD = ((activeUserSession.maxClientD !== undefined && activeUserSession.maxClientD !== null) ? activeUserSession.maxClientD : 9999) + pendingBonus;
  var baseMaxE = ((activeUserSession.maxClientE !== undefined && activeUserSession.maxClientE !== null) ? activeUserSession.maxClientE : 9999) + pendingBonus;
  var conf = activeUserSession.supplyConfig;

  var isGlobalConstraining = conf && conf.isOn && (conf.limitActive || conf.isSoldOut);
  var globalLimit = isGlobalConstraining ? conf.globalMax : 9999;

  var activeLimitD = baseMaxD;
  window.limitReasonD = "You have exceeded your personal limit for Cans. Maximum allowed is";
  if (isGlobalConstraining && globalLimit < baseMaxD) {
    activeLimitD = globalLimit;
    window.limitReasonD = conf.isSoldOut ? "We are completely sold out of Cans for today. Maximum allowed is" : "Due to high demand, Cans are currently restricted to a maximum of";
  }
  window.currentMaxOrdD = Math.max(activeLimitD, activeUserSession.existingOrdD || 0);

  var activeLimitE = baseMaxE;
  window.limitReasonE = "You have exceeded your personal limit for Empties. Maximum allowed is";
  if (isGlobalConstraining && globalLimit < baseMaxE) {
    activeLimitE = globalLimit;
    window.limitReasonE = conf.isSoldOut ? "Daily capacity reached. Empties return is currently restricted to" : "Due to high demand, Empties are currently restricted to a maximum of";
  }
  window.currentMaxOrdE = Math.max(activeLimitE, activeUserSession.existingOrdE || 0);

  // Verify manual input bounds one final time
  var inputD = document.getElementById('input-ord-d');
  var inputE = document.getElementById('input-ord-e');
  if (parseInt(inputD.value) > window.currentMaxOrdD) inputD.value = window.currentMaxOrdD;
  if (parseInt(inputE.value) > window.currentMaxOrdE) inputE.value = window.currentMaxOrdE;

  // --- NEW: DYNAMICALLY DISABLE QUICK-ADD IMAGES BASED ON CAPACITY ---
  var btn1 = document.getElementById('btn-quick-1');
  var btn2 = document.getElementById('btn-quick-2');
  var btn3 = document.getElementById('btn-quick-3');

  if (btn1 && btn2 && btn3) {
    // Disable completely if sold out (Max = 0)
    btn1.disabled = window.currentMaxOrdE < 1;
    // Disable 2 cans if limit is 1
    btn2.disabled = window.currentMaxOrdE < 2;
    // Disable 3 cans if limit is 1 or 2
    btn3.disabled = window.currentMaxOrdE < 3;
  }
  // -------------------------------------------------------------------


}

function fetchDashboardActivity() {
  callBackendAPI("getLatestDashboardActivity", { cpn: activeUserSession.cpn },
    function (res) {
      try {
        var ldCard = document.getElementById('widget-latest-delivery');
        if (res.delivery) {
          if (!res.delivery.isOutForDelivery) {
            // 1. Order is complete
            if (ldCard) ldCard.classList.remove('hidden');
            var elDate = document.getElementById('ld-date'); if (elDate) elDate.innerText = res.delivery.date;
            var elActD = document.getElementById('ld-actd'); if (elActD) elActD.innerText = res.delivery.actD;
            var elActE = document.getElementById('ld-acte'); if (elActE) elActE.innerText = res.delivery.actE;
            var elAmt = document.getElementById('ld-amt'); if (elAmt) elAmt.innerText = "₹" + res.delivery.amt;

            var elThumb = document.getElementById('ld-thumb');
            if (elThumb) {
              var safeDelImg = getDriveDirectUrl(res.delivery.link);
              var thumbHtml = res.delivery.link ? "<a href='" + res.delivery.link + "' target='_blank'><img src='" + safeDelImg + "' class='w-full h-full object-cover' onerror=\"this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold p-1 text-center\\'>Image</div>'\"></a>" : "<div class='w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold p-1 text-center'>No Photo</div>";
              elThumb.innerHTML = thumbHtml;
            }
          } else {
            // 2. IN TRANSIT! Order is in DEL2 but not yet delivered
            if (ldCard) ldCard.classList.add('hidden');

            // Show the Pending Order Widget
            var poDetails = document.getElementById('po-details');
            var poEmpty = document.getElementById('po-empty-msg');
            var pendingBanner = document.getElementById('pending-alert-banner');

            if (poDetails) poDetails.classList.remove('hidden');
            if (poEmpty) poEmpty.classList.add('hidden');
            if (pendingBanner) pendingBanner.classList.add('hidden');

            // Update the Widget Text
            var elPoDate = document.getElementById('po-date'); if (elPoDate) elPoDate.innerText = "Today";
            var elPoCans = document.getElementById('po-cans'); if (elPoCans) elPoCans.innerText = res.delivery.ordD;
            var elPoEmpties = document.getElementById('po-empties'); if (elPoEmpties) elPoEmpties.innerText = res.delivery.ordE;

            // Set Badge to Out For Delivery
            var statusBadge = document.getElementById('po-status-badge');
            if (statusBadge) {
              statusBadge.innerText = "🚚 Out for Delivery";
              statusBadge.className = "mt-2 text-[10px] font-bold text-amber-800 bg-amber-100 p-1.5 rounded-md inline-block shadow-sm";
            }

            // Show Replacement Info if it exists
            var poRepContainer = document.getElementById('po-rep-container');
            var poRepText = document.getElementById('po-rep-text');
            if (res.delivery.replaceQty > 0 && poRepContainer && poRepText) {
              poRepText.innerText = res.delivery.replaceQty + " Replacement(s) (" + res.delivery.replaceReason + ")";
              poRepContainer.classList.remove('hidden');
            }
          }
        } else {
          if (ldCard) ldCard.classList.add('hidden');
        }
      } catch (err) {
        console.error("Delivery widget render error: " + err);
      }

      // --- GUARANTEED EXECUTION FOR BOTTOM WIDGETS ---
      try {
        var sHtml = "";
        if (res.sale) {
          sHtml = "<div class='flex justify-between items-end mt-1'>" +
            "<div>" +
            "<div class='text-sm'><span class='font-bold text-slate-800'>" + res.sale.date + "</span></div>" +
            "<div class='flex gap-3 text-xs mt-1 font-medium text-slate-600'>" +
            "<span>Dropped: <b class='text-indigo-600'>" + res.sale.actD + "</b></span>" +
            "<span>Empties: <b class='text-indigo-600'>" + res.sale.actE + "</b></span>" +
            "</div>" +
            "</div>" +
            "<div class='font-black text-indigo-700 text-lg'>₹" + res.sale.amt + "</div>" +
            "</div>";
        } else { sHtml = "<p class='text-xs text-slate-400 mt-2 font-medium'>No recent sales found.</p>"; }
        var elSales = document.getElementById('widget-sales');
        if (elSales) elSales.innerHTML = sHtml;
      } catch (e1) { console.error("Sales widget error: " + e1); }

      try {
        var pHtml = "";
        if (res.pay) {
          pHtml = "<div class='flex justify-between items-end mt-1'>" +
            "<div>" +
            "<div class='text-sm'><span class='font-bold text-slate-800'>" + res.pay.date + "</span></div>" +
            "<div class='text-xs mt-1 font-medium text-slate-500'>Payment successfully credited to ledger.</div>" +
            "</div>" +
            "<div class='font-black text-emerald-700 text-lg'>₹" + res.pay.amt + "</div>" +
            "</div>";
        } else { pHtml = "<p class='text-xs text-slate-400 mt-2 font-medium'>No recent payments found.</p>"; }
        var elPays = document.getElementById('widget-pays');
        if (elPays) elPays.innerHTML = pHtml;
      } catch (e2) { console.error("Pays widget error: " + e2); }

      try {
        var ssHtml = "";
        if (res.ss2) {
          var statusColor = String(res.ss2.bankStatus).toUpperCase() === 'CLEARED' ? 'text-emerald-600' : 'text-amber-600';
          ssHtml = "<div class='flex justify-between items-end mt-1'>" +
            "<div>" +
            "<div class='text-xs text-slate-500'>Submitted: <span class='font-bold text-slate-800'>" + res.ss2.updatedOn + "</span></div>" +
            "<div class='text-xs mt-1 font-bold " + statusColor + "'>Status: " + res.ss2.bankStatus + "</div>" +
            "</div>" +
            "<div class='font-black text-amber-700 text-lg'>₹" + res.ss2.amt + "</div>" +
            "</div>";
        } else { ssHtml = "<p class='text-xs text-slate-400 mt-2 font-medium'>No recent screenshots uploaded.</p>"; }
        var elSs2 = document.getElementById('widget-ss2');
        if (elSs2) elSs2.innerHTML = ssHtml;
      } catch (e3) { console.error("SS2 widget error: " + e3); }
    }
  );
}

function processOrderSubmission() {
  var dVal = parseInt(document.getElementById('input-ord-d').value) || 0;
  var eVal = parseInt(document.getElementById('input-ord-e').value) || 0;
  
  var rQty = (window.pendingReplaceQty != null) ? window.pendingReplaceQty : ((activeUserSession.hasExistingOrder) ? (activeUserSession.replaceQty || 0) : 0);
  var rReason = (window.pendingReplaceReason != null) ? window.pendingReplaceReason : ((activeUserSession.hasExistingOrder) ? (activeUserSession.replaceReason || "") : "");
  
  var msgEl = document.getElementById('order-msg');

  if (window.currentMaxOrdD !== null && dVal > window.currentMaxOrdD) { return showError(msgEl, window.limitReasonD + " " + window.currentMaxOrdD + " Can(s)."); }
  if (window.currentMaxOrdE !== null && eVal > window.currentMaxOrdE) { return showError(msgEl, window.limitReasonE + " " + window.currentMaxOrdE + " Empties."); }

  toggleButtonState('btn-submit-order', true, 'Processing...');

  // ⚡ UPDATED PAYLOAD
  var payload = { 
    cpnno: activeUserSession.cpn, 
    ordD: dVal, 
    ordE: eVal, 
    replaceQty: rQty,
    replaceReason: rReason,
    olderDues: activeUserSession.older,
    uniqueNo: activeUserSession.uniqueNo,
    rowIdx: activeUserSession.rowCache ? activeUserSession.rowCache.ord : null
  };

  callBackendAPI("submitCustomerOrder", { orderData: payload },
    function (res) {
      // START OF UPDATE
      var btn = document.getElementById('btn-submit-order');
      btn.disabled = false;
      btn.style.opacity = '1.0';
      btn.innerHTML = 'Submit Request';
      btn.classList.remove('ring-2', 'ring-rose-400', 'ring-offset-2'); // Clear flair
      // END OF UPDATE
      
      window.pendingReplaceQty = null;
      window.pendingReplaceReason = null;

      msgEl.className = "text-center text-sm font-bold block mt-4 " + (res.success ? 'text-emerald-600' : 'text-red-500');
      msgEl.innerText = res.message;
      msgEl.classList.remove('hidden');

      if (res.success) {
        setTimeout(function () { msgEl.classList.add('hidden'); }, 4000);

        // ⚡ INSTANT UI UPDATE
        activeUserSession.hasExistingOrder = true;
        activeUserSession.existingOrdD = dVal;
        activeUserSession.existingOrdE = eVal;
        activeUserSession.replaceQty = rQty;
        activeUserSession.replaceReason = rReason;
        activeUserSession.ordDate = "Just now";
        
        localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));
        
        // ⚡ SAVE THE NEW IDS RETURNED BY THE BACKEND
        if (res.uniqueNo) activeUserSession.uniqueNo = res.uniqueNo;
        if (res.rowIdx) {
          if (!activeUserSession.rowCache) activeUserSession.rowCache = {};
          activeUserSession.rowCache.ord = res.rowIdx;
        }
        
        // Ensure UI transitions back to Read-Only correctly
        var poDetails = document.getElementById('po-details');
        var poEmpty = document.getElementById('po-empty-msg');

        if (poDetails) poDetails.classList.remove('hidden');
        if (poEmpty) poEmpty.classList.add('hidden');

        document.getElementById('po-date').innerText = "Just now";
        document.getElementById('po-cans').innerText = dVal;
        document.getElementById('po-empties').innerText = eVal;

        toggleOrderEditMode(false);
      }
    },
    function (err) {
      toggleButtonState('btn-submit-order', false, 'Submit Request');
      showError(msgEl, "Network error: Please check your connection and try again.");
    }
  );
}

// ==========================================
// MODULE: SALES & PAYMENT HISTORY
// ==========================================
function openSalesHistory() {
  switchView('view-sales-history');
  var dates = getDefaultDateRange();
  document.getElementById('sales-start').value = dates.start;
  document.getElementById('sales-end').value = dates.end;
  loadSalesData();
}

function loadSalesData() {
  var start = document.getElementById('sales-start').value;
  var end = document.getElementById('sales-end').value;
  var listEl = document.getElementById('sales-list');
  listEl.innerHTML = "<div class='flex justify-center py-10'><p class='text-sm text-indigo-600 font-bold animate-pulse'>Fetching sales records...</p></div>";

  callBackendAPI("fetchSalesHistory", { cpn: activeUserSession.cpn, startDate: start, endDate: end },
    function (res) {
      if (!res.success) { listEl.innerHTML = "<p class='text-center text-sm text-red-500 py-10 font-bold'>" + res.message + "</p>"; return; }
      if (res.data.length === 0) { listEl.innerHTML = "<p class='text-center text-sm text-slate-500 py-10 font-bold'>No sales records found.</p>"; return; }

      var html = '';
      res.data.forEach(function (r) {
        var safeImg = getDriveDirectUrl(r.link);
        var imgHtml = r.link ? "<a href='" + r.link + "' target='_blank' class='shrink-0'><img src='" + safeImg + "' class='w-14 h-16 object-cover rounded border shadow-sm' onerror=\"this.parentElement.innerHTML='<div class=\\'w-14 h-16 bg-slate-100 flex items-center justify-center rounded border text-[8px] text-center text-slate-400 font-bold p-1\\'>Image</div>'\"></a>" : "";
        html += "<div class='bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex gap-3'>" + imgHtml +
          "<div class='flex-1 flex justify-between items-center'>" +
          "<div><p class='text-[11px] text-slate-500 font-black mb-1.5 uppercase tracking-wide'>" + r.dateStr + "</p>" +
          "<div class='flex space-x-2 text-[10px] font-bold'><span class='bg-indigo-50 text-indigo-700 px-2 py-1 rounded'>Delivered: " + r.actD + "</span>" +
          "<span class='bg-emerald-50 text-emerald-700 px-2 py-1 rounded'>Empties: " + r.actE + "</span></div></div>" +
          "<div class='text-right'><p class='text-[9px] text-slate-400 font-bold uppercase mb-0.5'>Amount</p>" +
          "<span class='text-lg font-black text-slate-800'>₹" + r.amount + "</span></div>" +
          "</div></div>";
      });
      listEl.innerHTML = html;
    }
  );
}

function openPaymentHistory() {
  switchView('view-payment-history');
  var dates = getDefaultDateRange();
  document.getElementById('pays-start').value = dates.start;
  document.getElementById('pays-end').value = dates.end;
  loadPaymentData();
}

function loadPaymentData() {
  var start = document.getElementById('pays-start').value;
  var end = document.getElementById('pays-end').value;
  var listEl = document.getElementById('payment-list');
  listEl.innerHTML = "<div class='flex justify-center py-10'><p class='text-sm text-indigo-600 font-bold animate-pulse'>Fetching payment records...</p></div>";

  callBackendAPI("fetchPaymentHistory", { cpn: activeUserSession.cpn, startDate: start, endDate: end },
    function (res) {
      if (!res.success) { listEl.innerHTML = "<p class='text-center text-sm text-red-500 py-10 font-bold'>" + res.message + "</p>"; return; }
      if (res.data.length === 0) { listEl.innerHTML = "<p class='text-center text-sm text-slate-500 py-10 font-bold'>No payments found.</p>"; return; }

      var html = '';
      res.data.forEach(function (r) {
        var commentUI = r.comment ? "<p class='text-[11px] text-slate-600 mt-1 font-medium bg-slate-50 p-1.5 rounded inline-block'>" + r.comment + "</p>" : "";
        html += "<div class='bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center'>" +
          "<div><p class='text-[11px] text-slate-500 font-black mb-0.5 uppercase tracking-wide'>" + r.dateStr + "</p>" + commentUI + "</div>" +
          "<div class='text-right'><p class='text-[9px] text-slate-400 font-bold uppercase mb-0.5'>Paid</p>" +
          "<span class='text-lg font-black text-emerald-600'>₹" + r.amount + "</span></div></div>";
      });
      listEl.innerHTML = html;
    }
  );
}

// ==========================================
// MODULE: SCREENSHOTS & UPLOADS
// ==========================================
function getDriveDirectUrl(url) {
  if (!url) return '';
  var fileId = '';
  var matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) { fileId = matchD[1]; } else {
    var matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) fileId = matchId[1];
  }
  if (fileId) return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w200';
  return url;
}

function compressImage(file) {
  return new Promise(function (resolve, reject) {
    if (!file) { resolve(null); return; }
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
      var img = new Image();
      img.src = event.target.result;
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = 800; canvas.height = img.height * (800 / img.width);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
    reader.onerror = function (e) { reject(e); };
  });
}

function openScreenshots() {
  switchView('view-screenshots');
  document.getElementById('ss-date').value = new Date().toISOString().split('T')[0];
  var dates = getDefaultDateRange();
  document.getElementById('ss-start').value = dates.start;
  document.getElementById('ss-end').value = dates.end;
  loadScreenshotData();
}

async function uploadPaymentScreenshot() {
  var dStr = document.getElementById('ss-date').value;
  var amt = document.getElementById('ss-amt').value;
  var rmk = document.getElementById('ss-remark').value;
  var fileIn = document.getElementById('ss-file');

  if (!dStr || !amt || !fileIn.files || fileIn.files.length === 0) {
    alert("Payment Date, Amount, and Image File are mandatory.");
    return;
  }

  toggleButtonState('btn-ss-upload', true, 'Compressing Image...');
  var b64 = await compressImage(fileIn.files[0]);

  toggleButtonState('btn-ss-upload', true, 'Uploading...');

  callBackendAPI("submitCustomerScreenshot", { cpn: activeUserSession.cpn, payDate: dStr, amount: amt, remark: rmk, base64Image: b64 },
    function (res) {
      toggleButtonState('btn-ss-upload', false, 'Upload Screenshot');
      if (res.success) {
        alert(res.message);
        document.getElementById('ss-amt').value = '';
        document.getElementById('ss-remark').value = '';
        document.getElementById('ss-file').value = '';
        loadScreenshotData();
        //fetchDashboardActivity();
      } else { alert(res.message); }
    }
  );
}

function loadScreenshotData() {
  var start = document.getElementById('ss-start').value;
  var end = document.getElementById('ss-end').value;
  var listEl = document.getElementById('screenshot-list');

  listEl.innerHTML = "<div class='flex justify-center py-10'><p class='text-sm text-slate-500 font-bold animate-pulse'>Fetching uploaded screenshots...</p></div>";

  callBackendAPI("fetchScreenshotHistory", { cpn: activeUserSession.cpn, startDate: start, endDate: end },
    function (res) {
      if (!res.success) { listEl.innerHTML = "<p class='text-center text-sm text-red-500 py-10 font-bold'>" + res.message + "</p>"; return; }

      var html = '';
      html += "<h6 class='font-extrabold text-amber-600 text-xs uppercase tracking-wider mt-4 mb-2 px-1 flex items-center gap-1'>⏳ Pending Review (" + res.pending.length + ")</h6>";
      if (res.pending.length === 0) {
        html += "<p class='text-[11px] text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-4 text-center font-medium shadow-sm'>No pending screenshots tracking at this time.</p>";
      } else {
        res.pending.forEach(function (r) {
          var safeImg = getDriveDirectUrl(r.link);
          var displayStatus = r.bankComment || "Awaiting Verification";
          var safeLinkParam = encodeURIComponent(r.link);
          html += "<div class='bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 border-l-4 border-l-amber-400 relative group'>" +
            "<a href='" + r.link + "' target='_blank' class='shrink-0'><img src='" + safeImg + "' class='w-16 h-20 object-cover rounded-lg border shadow-sm' onerror=\"this.parentElement.innerHTML='<div class=\\'w-16 h-20 bg-slate-100 flex items-center justify-center rounded-lg border text-[8px] text-center text-slate-400 font-bold p-1\\'>View Link</div>'\"></a>" +
            "<div class='flex-1 flex flex-col justify-between'><div><div class='flex justify-between items-start pr-6'><span class='text-[10px] font-black text-slate-400 uppercase'>" + r.payDate + "</span><span class='text-sm font-black text-slate-800'>₹" + r.amount + "</span></div><p class='text-[11px] text-slate-600 mt-1 line-clamp-2'>" + (r.remark ? '<b>Note:</b> ' + r.remark : '') + "</p></div><div class='text-[10px] font-bold p-1.5 rounded-md mt-2 w-max border text-amber-600 bg-amber-50 border-amber-100'>" + displayStatus + "</div></div>" +
            "<button onclick=\"confirmScreenshotDeletion('" + safeLinkParam + "')\" class='absolute top-3 right-3 text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition' title='Delete Upload'><svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'></path></svg></button></div>";
        });
      }

      html += "<h6 class='font-extrabold text-emerald-600 text-xs uppercase tracking-wider mt-6 mb-2 px-1 flex items-center gap-1'>✅ Processed Payments (" + res.processed.length + ")</h6>";
      if (res.processed.length === 0) {
        html += "<p class='text-[11px] text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-4 text-center font-medium shadow-sm'>No historical data matches this date window.</p>";
      } else {
        res.processed.forEach(function (r) {
          var safeImg = getDriveDirectUrl(r.link);
          var stColor = String(r.bankComment).toUpperCase() === 'CLEARED' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-600 bg-slate-50 border-slate-200';
          var displayStatus = r.bankComment || "Processed";
          html += "<div class='bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4 border-l-4 border-l-emerald-400'>" +
            "<a href='" + r.link + "' target='_blank' class='shrink-0'><img src='" + safeImg + "' class='w-16 h-20 object-cover rounded-lg border shadow-sm' onerror=\"this.parentElement.innerHTML='<div class=\\'w-16 h-20 bg-slate-100 flex items-center justify-center rounded-lg border text-[8px] text-center text-slate-400 font-bold p-1\\'>View Link</div>'\"></a>" +
            "<div class='flex-1 flex flex-col justify-between'><div><div class='flex justify-between items-start'><span class='text-[10px] font-black text-slate-400 uppercase'>" + r.payDate + "</span><span class='text-sm font-black text-slate-800'>₹" + r.amount + "</span></div><p class='text-[11px] text-slate-600 mt-1 line-clamp-2'>" + (r.remark ? '<b>Note:</b> ' + r.remark : '') + "</p></div><div class='text-[10px] font-bold p-1.5 rounded-md mt-2 w-max border " + stColor + "'>" + displayStatus + "</div></div></div>";
        });
      }
      listEl.innerHTML = html;
    }
  );
}

function confirmScreenshotDeletion(encodedUrl) {
  var clearUrl = decodeURIComponent(encodedUrl);
  if (confirm("Are you sure you want to remove this screenshot submission? This action cannot be undone.")) {
    var listEl = document.getElementById('screenshot-list');
    listEl.style.opacity = "0.5";

    callBackendAPI("deleteCustomerScreenshot", { cpn: activeUserSession.cpn, fileUrl: clearUrl },
      function (res) {
        listEl.style.opacity = "1.0";
        alert(res.message);
        if (res.success) {
          loadScreenshotData();
          //fetchDashboardActivity();
        }
      },
      function (err) {
        listEl.style.opacity = "1.0";
        alert("Network timeout. Please try again.");
      }
    );
  }
}

function switchView(viewId) {
  ['view-login', 'view-new-password', 'view-forgot-password', 'view-profile', 'view-dashboard', 'view-sales-history', 'view-payment-history', 'view-screenshots'].forEach(function (id) {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
  window.scrollTo(0, 0);
}

function showError(element, text) { element.innerText = text; element.classList.remove('hidden'); }
function toggleButtonState(id, isLoading, text) {
  var btn = document.getElementById(id); btn.disabled = isLoading; btn.innerText = text; btn.style.opacity = isLoading ? '0.7' : '1.0';
}

window.addEventListener('click', function (event) {
  var menu = document.getElementById('dropdown-menu');
  if (menu && !menu.classList.contains('hidden')) {
    var menuButton = event.target.closest('button[onclick="toggleMenu()"]');
    if (!menu.contains(event.target) && !menuButton) menu.classList.add('hidden');
  }
});

function loadActivityLogLazy() {
  if (isServerBusy()) return; 
  
  var activityContainer = document.getElementById('recent-activity-container');
  var toggleIcon = document.getElementById('icon-toggle-activity');
  var toggleText = document.getElementById('text-toggle-activity');
  
  // Guaranteed check: is the container hidden?
  if (activityContainer.classList.contains('hidden')) {
      
      toggleIcon.classList.add('rotate-180');
      toggleText.innerText = "FETCHING DATA...";
      
      // 1. Remove display: none so the container exists on screen
      activityContainer.classList.remove('hidden');
      
      // 2. Trigger the fade-in a split second later
      setTimeout(() => {
          activityContainer.classList.remove('opacity-0');
          activityContainer.classList.add('opacity-100');
      }, 50);
      
      fetchDashboardActivity();
      
      setTimeout(() => {
          toggleText.innerText = "RECENT ACTIVITY LOG";
      }, 800);

  } else {
      // Fade out
      activityContainer.classList.remove('opacity-100');
      activityContainer.classList.add('opacity-0');
      toggleIcon.classList.remove('rotate-180');
      
      // Wait for fade to finish before hiding completely
      setTimeout(() => {
          activityContainer.classList.add('hidden');
      }, 300);
  }
}

// --- REPLACEMENT MODAL LOGIC ---
function openReplacementModal() {
  var sessionQty = (activeUserSession && activeUserSession.replaceQty) ? activeUserSession.replaceQty : 0;
  var sessionReason = (activeUserSession && activeUserSession.replaceReason) ? activeUserSession.replaceReason : "";
  
  var rQty = (window.pendingReplaceQty != null) ? window.pendingReplaceQty : sessionQty;
  var rReason = (window.pendingReplaceReason != null) ? window.pendingReplaceReason : sessionReason;
  
  document.getElementById('input-replace-qty').value = rQty;
  document.getElementById('input-replace-reason').value = rReason;
  
  var modal = document.getElementById('replacement-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeReplacementModal() {
  var modal = document.getElementById('replacement-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function adjustReplacementValue(step) {
  var field = document.getElementById('input-replace-qty');
  var currentVal = parseInt(field.value) || 0;
  var newVal = Math.max(0, currentVal + step);
  
  var maxAllowed = (activeUserSession && activeUserSession.maxClientD !== undefined && activeUserSession.maxClientD !== null) ? activeUserSession.maxClientD : 9999;
  if (newVal > maxAllowed) newVal = maxAllowed;
  
  field.value = newVal;
}

function saveReplacementToOrder() {
  var rQty = parseInt(document.getElementById('input-replace-qty').value) || 0;
  var rReason = document.getElementById('input-replace-reason').value;
  
  if (rQty > 0 && rReason === "") {
    alert("Please select a reason for the replacement.");
    return;
  }

  var maxAllowed = (activeUserSession && activeUserSession.maxClientD !== undefined && activeUserSession.maxClientD !== null) ? activeUserSession.maxClientD : 9999;
  if (rQty > maxAllowed) {
     alert("You cannot replace more than your allowed personal limit of " + maxAllowed + " cans.");
     return;
  }
  
  window.pendingReplaceQty = rQty;
  window.pendingReplaceReason = rReason;
  
  closeReplacementModal();
  
  // ⚡ FIX: Update the UI Badge dynamically without resetting the whole widget
  var badge = document.getElementById('replacement-badge');
  var badgeText = document.getElementById('replacement-badge-text');

  if (rQty > 0) {
    badgeText.innerText = "📦 Includes " + rQty + " Free Replacement (" + rReason + ")";
    badge.classList.remove('hidden');
    badge.classList.add('flex');
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('flex');
  }
}