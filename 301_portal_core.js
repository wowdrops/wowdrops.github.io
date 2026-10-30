// ==========================================
// CORE ENGINE & API
// ==========================================
const APPS_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbzhY0E8LaGEaGol7lqOjPdvss-cHeIhvejr6yB9D5EvUevSC4haUVbOFlwtgBht819ntg/exec";
//const APPS_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbzkQm5qstqVrPiq6z0DKjJEWYOrajwa_8D4FS5rOqkV/dev";

var activeApiRequests = 0;

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

(function () {
  var APP_VERSION = "4.2";
  var savedVersion = localStorage.getItem('wowdrops_app_version');
  if (savedVersion !== APP_VERSION) {
    localStorage.setItem('wowdrops_app_version', APP_VERSION);
    var url = window.location.href;
    var separator = url.indexOf('?') !== -1 ? '&' : '?';
    window.open(url + separator + 'refresh=' + new Date().getTime(), '_top');
  }
})();

window.onload = function () {
  if (!ALLOW_MANUAL_CAN_ENTRY) {
    document.getElementById('input-ord-d').disabled = true;
    document.getElementById('btn-can-minus').classList.add('hidden');
    document.getElementById('btn-can-plus').classList.add('hidden');
    document.getElementById('can-input-wrapper').classList.add('opacity-70', 'cursor-not-allowed');
    document.getElementById('can-policy-msg').classList.remove('hidden');
  } else {
    document.getElementById('input-ord-d').disabled = false;
    document.getElementById('btn-can-minus').classList.remove('hidden');
    document.getElementById('btn-can-plus').classList.remove('hidden');
    document.getElementById('can-input-wrapper').classList.remove('opacity-70', 'cursor-not-allowed');
  }

  var savedSession = localStorage.getItem('wowdrops_customer_session');
  if (savedSession) {
    activeUserSession = JSON.parse(savedSession);
    updateHeaderDisplays();
    showDashboardSkeletons();
    switchView('view-dashboard');
    refreshCustomerSessionData(activeUserSession.cpn);
  }

  if (CURRENT_ENV === 'Live') {
    ENABLE_PHONEPE_GATEWAY = true;
  } else {
    ENABLE_PHONEPE_GATEWAY = false;
  }

  if (typeof checkForPaymentRedirect === "function") checkForPaymentRedirect();

  checkDeviceCapabilities();
  
};//END ONLOAD 

function isServerBusy() {
  if (activeApiRequests > 0) { showBusyMessage(); return true; }
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
  return (Math.round(num * 100) / 100).toString();
}

function getDefaultDateRange() {
  var end = new Date();
  var start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

function checkDeviceCapabilities() {
  // 1. Detect if the device is an iPhone, iPad, or iPod
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // 2. Detect if the user has already Added to Home Screen (Standalone mode)
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // 3. The Logic
  if (isIOS && !isStandalone) {
    // It's an iPhone, but running in standard Safari. Apple blocks push notifications here.
    // Hide the subscribe button and show the instructions!
    var subBtn = document.getElementById('btn-subscribe-alerts'); // Change this ID to match your actual button!
    if (subBtn) subBtn.style.display = 'none';
    
    document.getElementById('ios-pwa-warning').classList.remove('hidden');
  }
}

var apiQueue = [];
var isProcessingQueue = false;

function callBackendAPI(actionName, payload, onSuccess, onFailure) {
  payload.action = actionName;
  apiQueue.push({ payload, onSuccess, onFailure });
  processApiQueue();
}

async function processApiQueue() {
  if (isProcessingQueue || apiQueue.length === 0) return;
  isProcessingQueue = true;
  activeApiRequests++;
  const currentRequest = apiQueue.shift();

  let attempts = 0;
  const maxAttempts = 3; // The app will silently try 3 times before giving up
  let success = false;

  while (attempts < maxAttempts && !success) {
    try {
      const response = await fetch(APPS_SCRIPT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(currentRequest.payload),
        redirect: 'follow'
      });
      
      // If Google rejects the request because it is busy, force an error to trigger the retry loop
      if (!response.ok) {
         throw new Error(`Google Server Rejected (HTTP ${response.status})`);
      }
      
      const rawText = await response.text();
      let data;
      try { 
        data = JSON.parse(rawText); 

      } catch (e) { 
        throw new Error("Server returned invalid data format."); 
      }

      // --- ADD THIS MAINTENANCE INTERCEPTOR ---
      if (data.maintenance) {
        document.body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:sans-serif;text-align:center;padding:20px;color:#0f172a;">
            <div style="background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.1);max-width:400px;width:100%;">
              <svg style="width:48px;height:48px;margin:0 auto 16px;color:#6366f1;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <h2 style="margin:0 0 10px;font-size:20px;font-weight:800;">Under Scheduled Maintenance</h2>
              <p style="color:#64748b;line-height:1.5;margin:0;font-size:14px;">${data.message}</p>
            </div>
          </div>`;
        activeApiRequests--;
        isProcessingQueue = false;
        return; // Stops further execution
      }
      // ----------------------------------------
      
      // If successful, pass the data and break the loop
      if (currentRequest.onSuccess) currentRequest.onSuccess(data);
      success = true; 
      
    } catch (error) {
      attempts++;
      console.warn(`API Attempt ${attempts} failed. Google is busy.`, error);
      
      if (attempts >= maxAttempts) {
        // Only show the error to the user if it fails 3 times in a row
        console.error("All auto-retry attempts failed.");
        if (currentRequest.onFailure) currentRequest.onFailure(error);
      } else {
        // Wait 2 seconds on the first fail, 4 seconds on the second fail, then try again silently
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }
  }
  
  activeApiRequests--;
  isProcessingQueue = false;
  
  // Wait a fraction of a second before processing the next item in the queue
  setTimeout(processApiQueue, 300);
}

const callBackendAsync = (action, payload) => {
  return new Promise((resolve, reject) => callBackendAPI(action, payload, resolve, reject));
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function switchView(viewId) {
  ['view-login', 'view-new-password', 'view-forgot-password', 'view-profile', 'view-dashboard', 'view-sales-history', 'view-payment-history', 'view-screenshots'].forEach(id => {
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

function toggleMenu() { 
  if (isServerBusy()) return; 
  document.getElementById('dropdown-menu').classList.toggle('hidden'); 
}