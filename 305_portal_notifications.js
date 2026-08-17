// ==========================================
// NOTIFICATIONS ENGINE
// ==========================================
const VAPID_PUBLIC_KEY = "BKEhieRgAwDeodM7N8IVzeg9xlfmt06E4ynj9W-uWOs7Ad6RMNBykxAQ9TLY_Tz6NTc4flpHe8zsXaF_4cteLQs"; 

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function triggerNotificationSetup() {
  if (!activeUserSession) return alert("Please login first to enable notifications.");

  const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

  if (isIos() && !isInStandaloneMode()) {
    document.getElementById('ios-install-prompt').classList.remove('hidden');
    return;
  }

  if ('serviceWorker' in navigator && 'PushManager' in window) {
    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        subscribeUserToPush();
      } else {
        alert('Notification permission denied. You can enable it in your browser settings.');
      }
    });
  } else {
    alert('Push notifications are not supported in this browser. Please use Chrome or Safari.');
  }
}

async function subscribeUserToPush() {
  try {
    const registration = await navigator.serviceWorker.register('300_sw.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    callBackendAPI("savePushSubscription", { 
      cpn: activeUserSession.cpn, 
      subscriptionObj: JSON.stringify(subscription) 
    }, 
    function(res) {
      if (res.success) alert("✅ Daily alerts successfully enabled on this device!");
      else alert("Failed to save configuration: " + res.message);
    }, 
    function(err) {
      alert("Network error while saving notification settings.");
    });

  } catch (error) {
    console.error('Failed to subscribe user: ', error);
    alert('Could not enable notifications. Check console for details.');
  }
}

// --- PROACTIVE NOTIFICATION LOGIC ---
function checkNotificationStatus() {
  if ('Notification' in window && Notification.permission === 'denied') {
      return; 
  }

  var skippedTime = localStorage.getItem('notification_skipped_time');
  if (skippedTime) {
    var daysElapsed = (new Date().getTime() - parseInt(skippedTime)) / (1000 * 60 * 60 * 24);
    if (daysElapsed < 5) {
      return; 
    }
  }
  
  setTimeout(function () { 
      var notifModal = document.getElementById('notification-modal');
      if (notifModal) notifModal.classList.remove('hidden'); 
  }, 500);
}

function skipNotificationCapture() {
  localStorage.setItem('notification_skipped_time', new Date().getTime().toString());
  document.getElementById('notification-modal').classList.add('hidden');
}

function acceptNotificationCapture() {
  document.getElementById('notification-modal').classList.add('hidden');
  triggerNotificationSetup(); 
}