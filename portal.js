// ==========================================
// 1. BACKEND API CONNECTION
// ==========================================
// ⚠️ PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
const APPS_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbzhY0E8LaGEaGol7lqOjPdvss-cHeIhvejr6yB9D5EvUevSC4haUVbOFlwtgBht819ntg/exec";

// Universal Fetch Wrapper to communicate with Google Apps Script
function callBackendAPI(actionName, payload, onSuccess, onFailure) {
  payload.action = actionName;

  fetch(APPS_SCRIPT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => { if (onSuccess) onSuccess(data); })
    .catch(error => {
      console.error("API Error:", error);
      if (onFailure) onFailure(error);
    });
}

// ==========================================
// FEATURE FLAGS & CONSTANTS
// ==========================================
const ALLOW_MANUAL_CAN_ENTRY = false;
const CURRENT_ENV = "Live";
var ENABLE_PHONEPE_GATEWAY = false; // "True" only for dev testing
const PAYMENT_GATEWAY_UPIID = "cpnawin-5@okaxis";
const PAYMENT_GATEWAY_PAYEENAME = "WOW DROPS FOOD AND BEVERAGES";
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
  var APP_VERSION = "2.1";
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

function getDefaultDateRange() {
  var end = new Date();
  var start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
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
  toggleOrderEditMode(false);
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
  
  // ⚡ UPDATED PAYLOAD
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
          
          if (activeUserSession) activeUserSession.hasExistingOrder = false;
          
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

function toggleMenu() { document.getElementById('dropdown-menu').classList.toggle('hidden'); }

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

function refreshCustomerSessionData(cpn) {
  if (!activeUserSession.rowCache) activeUserSession.rowCache = { ord: null, out: null, db: null };

  callBackendAPI("getQuickOrderData", { cpn: cpn, cachedOrdRow: activeUserSession.rowCache.ord },
    function (fastData) {
      activeUserSession.uniqueNo = fastData.existingOrder.uniqueNo; // <-- NEW
      activeUserSession.rowCache.ord = fastData.existingOrder.rowNo;
      activeUserSession.existingOrdD = fastData.existingOrder.ordD;
      activeUserSession.existingOrdE = fastData.existingOrder.ordE;
      activeUserSession.rate = fastData.existingOrder.rate;
      activeUserSession.ordDate = fastData.existingOrder.ordDate;
      activeUserSession.hasExistingOrder = fastData.existingOrder.isExisting;
      activeUserSession.supplyConfig = fastData.supplyConfig;

      var submitBtn = document.getElementById('btn-submit-order');
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      submitBtn.innerHTML = "<span>Submit Request</span>";

      renderOrderWidget();
    }
  );

  callBackendAPI("getFinancialLedgerData", { cpn: cpn, cachedOutRow: activeUserSession.rowCache.out, cachedDbRow: activeUserSession.rowCache.db },
      function(ledgerData) {
          // 🛑 NEW: INSTANT INACTIVE KICK-OUT 🛑
          if (ledgerData.status === 'INACTIVE') {
              localStorage.removeItem('wowdrops_customer_session');
              activeUserSession = null;
              switchView('view-login');
              var loginErr = document.getElementById('login-err');
              loginErr.innerText = "Your status is changed to inactive. please contact wowdrops";
              loginErr.classList.remove('hidden');
              return; // Halt execution instantly
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
      fetchDashboardActivity();
    }
  );

  setTimeout(function () { window.scrollTo(0, 1); window.scrollTo(0, 0); }, 300);
}

function renderOrderWidget() {
  var poDetails = document.getElementById('po-details');
  var poEmpty = document.getElementById('po-empty-msg');

  if (activeUserSession.hasExistingOrder) {
    poDetails.classList.remove('hidden');
    poEmpty.classList.add('hidden');
    document.getElementById('po-date').innerText = activeUserSession.ordDate || "recently";
    document.getElementById('po-cans').innerText = activeUserSession.existingOrdD || 0;
    document.getElementById('po-empties').innerText = activeUserSession.existingOrdE || 0;
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
  document.getElementById('val-advance').innerText = "₹" + (activeUserSession.advance || 0);
  document.getElementById('dash-outstanding').innerText = "₹" + (activeUserSession.outstanding || 0);

  var prevSum = (activeUserSession.older || 0) + (activeUserSession.lastMon || 0);
  document.getElementById('dash-previous-dues').innerText = "₹" + prevSum;
  document.getElementById('dash-current-month').innerText = "₹" + (activeUserSession.currentMon || 0);

  var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  document.getElementById('current-month-name').innerText = monthNames[new Date().getMonth()];

  var baseMaxD = (activeUserSession.maxClientD !== undefined && activeUserSession.maxClientD !== null) ? activeUserSession.maxClientD : 9999;
  var baseMaxE = (activeUserSession.maxClientE !== undefined && activeUserSession.maxClientE !== null) ? activeUserSession.maxClientE : 9999;
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

  var inputD = document.getElementById('input-ord-d');
  var inputE = document.getElementById('input-ord-e');
  if (parseInt(inputD.value) > window.currentMaxOrdD) inputD.value = window.currentMaxOrdD;
  if (parseInt(inputE.value) > window.currentMaxOrdE) inputE.value = window.currentMaxOrdE;
}

function fetchDashboardActivity() {
  callBackendAPI("getLatestDashboardActivity", { cpn: activeUserSession.cpn },
    function (res) {
      var ldCard = document.getElementById('widget-latest-delivery');
      if (res.delivery) {
        if (res.delivery.actD > 0 || res.delivery.actE > 0) {
          ldCard.classList.remove('hidden');
          document.getElementById('ld-date').innerText = res.delivery.date;
          document.getElementById('ld-actd').innerText = res.delivery.actD;
          document.getElementById('ld-acte').innerText = res.delivery.actE;
          document.getElementById('ld-amt').innerText = "₹" + res.delivery.amt;
          var safeDelImg = getDriveDirectUrl(res.delivery.link);
          var thumbHtml = res.delivery.link ? "<a href='" + res.delivery.link + "' target='_blank'><img src='" + safeDelImg + "' class='w-full h-full object-cover' onerror=\"this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold p-1 text-center\\'>Image</div>'\"></a>" : "<div class='w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold p-1 text-center'>No Photo</div>";
          document.getElementById('ld-thumb').innerHTML = thumbHtml;
        } else {
          ldCard.classList.add('hidden');
          var orderText = "Your order for " + res.delivery.ordD + " cans and " + res.delivery.ordE + " empties are processed and will arrive soon.";
          document.getElementById('po-empty-msg-p').innerText = orderText;
          document.getElementById('po-empty-msg').classList.remove('hidden');
        }
      } else { ldCard.classList.add('hidden'); }

      var sHtml = "";
      if (res.sale) {
        sHtml = "<div class='flex justify-between items-end mt-1'><div><div class='text-sm'><span class='font-bold text-slate-800'>" + res.sale.date + "</span></div><div class='flex gap-3 text-xs mt-1 font-medium text-slate-600'><span>Dropped: <b class='text-indigo-600'>" + res.sale.actD + "</b></span><span>Empties: <b class='text-indigo-600'>" + res.sale.actE + "</b></span></div></div><div class='font-black text-indigo-700 text-lg'>₹" + res.sale.amt + "</div></div>";
      } else { sHtml = "<p class='text-xs text-slate-400 mt-2 font-medium'>No recent sales found.</p>"; }
      document.getElementById('widget-sales').innerHTML = sHtml;

      var pHtml = "";
      if (res.pay) {
        pHtml = "<div class='flex justify-between items-end mt-1'><div><div class='text-sm'><span class='font-bold text-slate-800'>" + res.pay.date + "</span></div><div class='text-xs mt-1 font-medium text-slate-500'>Payment successfully credited to ledger.</div></div><div class='font-black text-emerald-700 text-lg'>₹" + res.pay.amt + "</div></div>";
      } else { pHtml = "<p class='text-xs text-slate-400 mt-2 font-medium'>No recent payments found.</p>"; }
      document.getElementById('widget-pays').innerHTML = pHtml;

      var ssHtml = "";
      if (res.ss2) {
        var statusColor = String(res.ss2.bankStatus).toUpperCase() === 'CLEARED' ? 'text-emerald-600' : 'text-amber-600';
        ssHtml = "<div class='flex justify-between items-end mt-1'><div><div class='text-xs text-slate-500'>Submitted: <span class='font-bold text-slate-800'>" + res.ss2.updatedOn + "</span></div><div class='text-xs mt-1 font-bold " + statusColor + "'>Status: " + res.ss2.bankStatus + "</div></div><div class='font-black text-amber-700 text-lg'>₹" + res.ss2.amt + "</div></div>";
      } else { ssHtml = "<p class='text-xs text-slate-400 mt-2 font-medium'>No recent screenshots uploaded.</p>"; }
      document.getElementById('widget-ss2').innerHTML = ssHtml;
    }
  );
}

function processOrderSubmission() {
  var dVal = parseInt(document.getElementById('input-ord-d').value) || 0;
  var eVal = parseInt(document.getElementById('input-ord-e').value) || 0;
  var msgEl = document.getElementById('order-msg');

  if (window.currentMaxOrdD !== null && dVal > window.currentMaxOrdD) { return showError(msgEl, window.limitReasonD + " " + window.currentMaxOrdD + " Can(s)."); }
  if (window.currentMaxOrdE !== null && eVal > window.currentMaxOrdE) { return showError(msgEl, window.limitReasonE + " " + window.currentMaxOrdE + " Empties."); }

  toggleButtonState('btn-submit-order', true, 'Processing...');

  // ⚡ UPDATED PAYLOAD
  var payload = { 
    cpnno: activeUserSession.cpn, 
    ordD: dVal, 
    ordE: eVal, 
    olderDues: activeUserSession.older,
    uniqueNo: activeUserSession.uniqueNo,
    rowIdx: activeUserSession.rowCache ? activeUserSession.rowCache.ord : null
  };

  callBackendAPI("submitCustomerOrder", { orderData: payload },
    function (res) {
      toggleButtonState('btn-submit-order', false, 'Submit Request');
      msgEl.className = "text-center text-sm font-bold block mt-4 " + (res.success ? 'text-emerald-600' : 'text-red-500');
      msgEl.innerText = res.message;
      msgEl.classList.remove('hidden');

      if (res.success) {
        setTimeout(function () { msgEl.classList.add('hidden'); }, 4000);

        // ⚡ INSTANT UI UPDATE
        activeUserSession.hasExistingOrder = true;
        activeUserSession.existingOrdD = dVal;
        activeUserSession.existingOrdE = eVal;
        activeUserSession.ordDate = "Just now";
        
        // ⚡ SAVE THE NEW IDS RETURNED BY THE BACKEND
        if (res.uniqueNo) activeUserSession.uniqueNo = res.uniqueNo;
        if (res.rowIdx) {
          if (!activeUserSession.rowCache) activeUserSession.rowCache = {};
          activeUserSession.rowCache.ord = res.rowIdx;
        }
        
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
        fetchDashboardActivity();
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
          fetchDashboardActivity();
        }
      },
      function (err) {
        listEl.style.opacity = "1.0";
        alert("Network timeout. Please try again.");
      }
    );
  }
}

// ==========================================
// UPI MODAL & UTILS
// ==========================================
function openPaymentPopup(type = 'total') {
  if (!activeUserSession) return;

  var prevSum = (activeUserSession.older || 0) + (activeUserSession.lastMon || 0);
  document.getElementById('split-older').innerText = "₹" + (activeUserSession.older || 0);
  document.getElementById('split-last').innerText = "₹" + (activeUserSession.lastMon || 0);
  document.getElementById('split-previous').innerText = "₹" + prevSum;
  document.getElementById('split-curr').innerText = "₹" + (activeUserSession.currentMon || 0);
  document.getElementById('split-total').innerText = "₹" + (activeUserSession.outstanding || 0);

  var radioToSelect = document.querySelector('input[value="' + type + '"]');
  if (radioToSelect) {
    radioToSelect.checked = true;
    updatePayInput(radioToSelect);
  } else {
    document.querySelector('input[value="total"]').checked = true;
    document.getElementById('pay-custom-amt').value = activeUserSession.outstanding || 0;
  }

  document.getElementById('payment-modal').classList.remove('hidden');
}

function updatePayInput(radio) {
  var val = 0;
  switch (radio.value) {
    case 'older': val = activeUserSession.older || 0; break;
    case 'lastMon': val = activeUserSession.lastMon || 0; break;
    case 'previous': val = (activeUserSession.older || 0) + (activeUserSession.lastMon || 0); break;
    case 'currentMon': val = activeUserSession.currentMon || 0; break;
    case 'total': val = activeUserSession.outstanding || 0; break;
  }
  document.getElementById('pay-custom-amt').value = val;
}

function closePaymentPopup() {
  document.getElementById('payment-modal').classList.add('hidden');
  if (window.originalPaymentHtml) {
    setTimeout(function () { document.querySelector('#payment-modal .p-6').innerHTML = window.originalPaymentHtml; }, 300);
  }
}

// ==========================================
// PAYMENT GATEWAY ROUTING
// ==========================================
function triggerUPIPayment() {
  if (ENABLE_PHONEPE_GATEWAY) {
    executePhonePeFlow();
  } else {
    executeStandardUPIFlow();
  }
}

function executePhonePeFlow() {
  var amt = parseFloat(document.getElementById('pay-custom-amt').value);
  if (isNaN(amt) || amt <= 0) return alert("Please enter a valid amount greater than 0.");

  var btn = document.querySelector('#payment-modal button.bg-emerald-500');
  var originalText = btn.innerHTML;

  btn.innerHTML = "<span class='animate-pulse'>Generating Secure Link...</span>";
  btn.disabled = true;
  btn.classList.replace("bg-emerald-500", "bg-slate-400");

  callBackendAPI("initiatePhonePePayment", { cpn: activeUserSession.cpn, amount: amt },
    function (res) {
      if (res.success) {
        btn.innerHTML = "Redirecting to PhonePe...";
        window.open(res.checkoutUrl, '_top');
      } else {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.replace("bg-slate-400", "bg-emerald-500");
        alert("Payment Gateway Failed: " + res.message);
      }
    },
    function (err) {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.classList.replace("bg-slate-400", "bg-emerald-500");
      alert("Network Error: Could not connect to gateway.");
    }
  );
}

function executeStandardUPIFlow() {
  var amt = parseFloat(document.getElementById('pay-custom-amt').value);
  if (isNaN(amt) || amt <= 0) return alert("Please enter a valid amount greater than 0.");

  var tempInput = document.createElement("input");
  tempInput.value = PAYMENT_GATEWAY_UPIID;
  document.body.appendChild(tempInput);
  tempInput.select();
  try { document.execCommand("copy"); } catch (e) { }
  document.body.removeChild(tempInput);

  var btn = document.querySelector('#payment-modal button.bg-emerald-500');
  var originalText = "";
  if (btn) {
    originalText = btn.innerHTML;
    btn.innerHTML = "UPI ID Copied! Select your App...";
    btn.classList.replace("bg-emerald-500", "bg-indigo-600");
  }

  window.location.href = "upi://pay";

  setTimeout(function () {
    if (btn) {
      btn.innerHTML = originalText;
      btn.classList.replace("bg-indigo-600", "bg-emerald-500");
    }
    closePaymentPopup();
  }, 2500);
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