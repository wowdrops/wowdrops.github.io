// ==========================================
// ADMIN FIREBASE NOTIFICATIONS ENGINE
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

function getAdminDeviceId() {
  var deviceId = localStorage.getItem('wowdrops_admin_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : 'admin_dev_' + Math.random().toString(36).substring(2) + '_' + Date.now();
    localStorage.setItem('wowdrops_admin_device_id', deviceId);
  }
  return deviceId;
}

function triggerAdminNotificationSetup() {
  if (!window.activeAdminSession) return alert("Please login first.");

  if ('serviceWorker' in navigator && 'PushManager' in window) {
    if (Notification.permission === 'denied') {
      showAdminUnblockGuide();
      return;
    }

    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        subscribeAdminToPush();
      } else if (permission === 'denied') {
        showAdminUnblockGuide();
      }
    });
  }
}

async function subscribeAdminToPush() {
  try {
    const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    
    const token = await messaging.getToken({
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      const deviceId = getAdminDeviceId();
      
      const { error } = await window.supabase1
        .from('push_subscriptions_admin')
        .upsert({ 
          username: window.activeAdminSession.username, 
          device_id: deviceId,
          subscription_json: { token: token },
          last_active: new Date().toISOString()
        }, { onConflict: 'username, device_id' });

      if (error) {
        console.error("Database Error:", error);
        if (window.showToast) window.showToast("Failed to save admin registration.", "error");
        return;
      }

      if (window.showToast) window.showToast("✅ Admin alerts enabled on this device!", "success");
    }
  } catch (error) {
    console.error('Failed to subscribe admin: ', error);
  }
}

async function checkAdminNotificationStatus() {
  if ('Notification' in window && Notification.permission === 'denied') return;
  if (!window.activeAdminSession || !window.activeAdminSession.username) return;

  const deviceId = getAdminDeviceId();

  try {
    const { data, error } = await window.supabase1
      .from('push_subscriptions_admin')
      .select('id')
      .eq('username', window.activeAdminSession.username)
      .eq('device_id', deviceId)
      .maybeSingle();
      
    if (data) {
       await window.supabase1
         .from('push_subscriptions_admin')
         .update({ last_active: new Date().toISOString() })
         .eq('id', data.id);
       return; 
    }
  } catch(err) {
    console.error("Admin Push status check failed:", err);
  }

  var skippedTime = localStorage.getItem('admin_notification_skipped');
  if (skippedTime) {
    var hoursElapsed = (new Date().getTime() - parseInt(skippedTime)) / (1000 * 60 * 60);
    if (hoursElapsed < 1) return; 
  }
  
  setTimeout(function () { 
      var notifModal = document.getElementById('admin-notification-modal');
      if (notifModal) notifModal.classList.remove('hidden'); 
  }, 1000);
}

function skipAdminNotificationCapture() {
  localStorage.setItem('admin_notification_skipped', new Date().getTime().toString());
  document.getElementById('admin-notification-modal').classList.add('hidden');
}

function acceptAdminNotificationCapture() {
  document.getElementById('admin-notification-modal').classList.add('hidden');
  triggerAdminNotificationSetup(); 
}

function showAdminUnblockGuide() {
  var modal = document.getElementById('unblock-guide-modal');
  if (modal) modal.classList.remove('hidden');
}