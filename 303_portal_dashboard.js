// ==========================================
// DASHBOARD & ORDERS
// ==========================================
function updateHeaderDisplays() {
  if (!activeUserSession) return;
  document.querySelectorAll('.disp-cust-name').forEach(el => el.innerText = activeUserSession.name || "");
  var parts = [];
  if (activeUserSession.phone) parts.push(activeUserSession.phone);
  if (activeUserSession.cpn) parts.push(activeUserSession.cpn);
  if (activeUserSession.block) parts.push(activeUserSession.block);
  if (activeUserSession.door) parts.push(activeUserSession.door);

  var separator = '<span class="text-indigo-300/50 mx-1.5 font-light">|</span>';
  document.querySelectorAll('.disp-cust-details').forEach(el => el.innerHTML = parts.join(separator));
}

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

async function refreshCustomerSessionData(cpn) {
  if (!activeUserSession.rowCache) activeUserSession.rowCache = { ord: null, out: null, db: null };

  try {
    const fastData = await callBackendAsync("getQuickOrderData", { cpn: cpn, cachedOrdRow: activeUserSession.rowCache.ord });
    
    activeUserSession.uniqueNo = fastData.existingOrder.uniqueNo; 
    activeUserSession.rowCache.ord = fastData.existingOrder.rowNo;
    activeUserSession.existingOrdD = fastData.existingOrder.ordD;
    activeUserSession.existingOrdE = fastData.existingOrder.ordE;
    activeUserSession.rate = fastData.existingOrder.rate;
    activeUserSession.ordDate = fastData.existingOrder.ordDate;
    activeUserSession.hasExistingOrder = fastData.existingOrder.isExisting;
    activeUserSession.supplyConfig = fastData.supplyConfig;
    activeUserSession.status = fastData.existingOrder.status;
    activeUserSession.pendingQty = fastData.existingOrder.pendingQty;
    activeUserSession.replaceQty = fastData.existingOrder.replaceQty;
    activeUserSession.replaceReason = fastData.existingOrder.replaceReason;

    var submitBtn = document.getElementById('btn-submit-order');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    submitBtn.innerHTML = "<span>Submit Request</span>";

    renderOrderWidget();
    await sleep(600);

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
    
    if (typeof checkEmailCollection === "function") checkEmailCollection();

  } catch (error) {
    console.error("Dashboard failed to load securely:", error);
    alert("Failed to load dashboard data. Please try refreshing the page.");
  }

  //setTimeout(function () { window.scrollTo(0, 1); window.scrollTo(0, 0); }, 300);
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

  var inputD = document.getElementById('input-ord-d');
  var inputE = document.getElementById('input-ord-e');
  if (parseInt(inputD.value) > window.currentMaxOrdD) inputD.value = window.currentMaxOrdD;
  if (parseInt(inputE.value) > window.currentMaxOrdE) inputE.value = window.currentMaxOrdE;

  var btn1 = document.getElementById('btn-quick-1');
  var btn2 = document.getElementById('btn-quick-2');
  var btn3 = document.getElementById('btn-quick-3');

  if (btn1 && btn2 && btn3) {
    btn1.disabled = window.currentMaxOrdE < 1;
    btn2.disabled = window.currentMaxOrdE < 2;
    btn3.disabled = window.currentMaxOrdE < 3;
  }
}

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
  var isConfirmed = CONFIRMATION_STYLE === 'toggle' ? document.getElementById('cancel-toggle').checked : document.getElementById('cancel-checkbox').checked;
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
  var finalQty = Math.min(qty, window.currentMaxOrdE);
  var fieldE = document.getElementById('input-ord-e');
  fieldE.value = finalQty;
  syncCans(finalQty);
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
      var btn = document.getElementById('btn-submit-order');
      btn.disabled = false;
      btn.style.opacity = '1.0';
      btn.innerHTML = 'Submit Request';
      btn.classList.remove('ring-2', 'ring-rose-400', 'ring-offset-2');
      
      window.pendingReplaceQty = null;
      window.pendingReplaceReason = null;

      msgEl.className = "text-center text-sm font-bold block mt-4 " + (res.success ? 'text-emerald-600' : 'text-red-500');
      msgEl.innerText = res.message;
      msgEl.classList.remove('hidden');

      if (res.success) {
        setTimeout(function () { msgEl.classList.add('hidden'); }, 4000);

        activeUserSession.hasExistingOrder = true;
        activeUserSession.existingOrdD = dVal;
        activeUserSession.existingOrdE = eVal;
        activeUserSession.replaceQty = rQty;
        activeUserSession.replaceReason = rReason;
        activeUserSession.ordDate = "Just now";
        
        localStorage.setItem('wowdrops_customer_session', JSON.stringify(activeUserSession));
        
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

        var poRepContainer = document.getElementById('po-rep-container');
        var poRepText = document.getElementById('po-rep-text');

        if (rQty > 0 && poRepContainer && poRepText) {
          poRepText.innerText = rQty + " Replacement(s) (" + rReason + ")";
          poRepContainer.classList.remove('hidden');
        } else if (poRepContainer) {
          poRepContainer.classList.add('hidden');
        }

        toggleOrderEditMode(false);
      }
    },
    function (err) {
      toggleButtonState('btn-submit-order', false, 'Submit Request');
      showError(msgEl, "Network error: Please check your connection and try again.");
    }
  );
}

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