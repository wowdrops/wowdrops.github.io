// ==========================================
// FIREBASE NOTIFICATIONS ENGINE
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyADBmoxl5J9anzwjJgpDQEuxvhfZvl9Dhk",
  authDomain: "wowdropspush.firebaseapp.com",
  projectId: "wowdropspush",
  storageBucket: "wowdropspush.firebasestorage.app",
  messagingSenderId: "907964211557",
  appId: "1:907964211557:web:d53857dc437c403ad8818c"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const VAPID_PUBLIC_KEY = "BKEhieRgAwDeodM7N8IVzeg9xlfmt06E4ynj9W-uWOs7Ad6RMNBykxAQ9TLY_Tz6NTc4flpHe8zsXaF_4cteLQs";

// --- NEW: Generate and store device ID ---
function getDeviceId() {
  var deviceId = localStorage.getItem('wowdrops_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : 'dev_' + Math.random().toString(36).substring(2) + '_' + Date.now();
    localStorage.setItem('wowdrops_device_id', deviceId);
  }
  return deviceId;
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
    // Show guide instantly if they already blocked it
    if (Notification.permission === 'denied') {
      showUnblockGuide();
      return;
    }

    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        subscribeUserToPush();
        checkPushBlockedBanner();
      } else if (permission === 'denied') {
        showUnblockGuide();
        checkPushBlockedBanner();
      }
    });
  }
}

async function subscribeUserToPush() {
  try {
    const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    
    const token = await messaging.getToken({
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      const deviceId = getDeviceId();
      
      const { error } = await window.supabase1
        .from('push_subscriptions')
        .upsert({ 
          cpn_no: activeUserSession.cpn, 
          device_id: deviceId,
          subscription_json: { token: token },
          last_active: new Date().toISOString()
        }, { onConflict: 'cpn_no, device_id' });

      if (error) {
        console.error("Database Error:", error);
        alert("Failed to save registration to database.");
        return;
      }

      alert("✅ Daily alerts successfully enabled on this device!");
    }

  } catch (error) {
    console.error('Failed to subscribe user: ', error);
  }
}

// --- UPDATED: Proactive Database Check ---
async function checkNotificationStatus() {
  if ('Notification' in window && Notification.permission === 'denied') {
      return; // Handled by the passive banner
  }
  
  if (!activeUserSession || !activeUserSession.cpn) return;
  const deviceId = getDeviceId();

  try {
    const { data, error } = await window.supabase1
      .from('push_subscriptions')
      .select('id')
      .eq('cpn_no', activeUserSession.cpn)
      .eq('device_id', deviceId)
      .maybeSingle();
      
    if (data) {
       // Device is registered, just update the last_active time silently
       await window.supabase1
         .from('push_subscriptions')
         .update({ last_active: new Date().toISOString() })
         .eq('id', data.id);
       return; 
    }
  } catch(err) {
    console.error("Push status check failed:", err);
  }

  // Fallback to local snooze logic if not registered
  var skippedTime = localStorage.getItem('notification_skipped_time');
  if (skippedTime) {
    var hoursElapsed = (new Date().getTime() - parseInt(skippedTime)) / (1000 * 60 * 60);
    if (hoursElapsed < 1) return; 
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

// --- NEW UI FUNCTIONS ---
function showUnblockGuide() {
  var unblockModal = document.getElementById('unblock-guide-modal');
  if (unblockModal) unblockModal.classList.remove('hidden');
}

function checkPushBlockedBanner() {
  var banner = document.getElementById('push-blocked-banner');
  if (!banner) return;
  if ('Notification' in window && Notification.permission === 'denied') {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}