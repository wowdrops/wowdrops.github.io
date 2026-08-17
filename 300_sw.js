self.addEventListener('push', function(event) {
    if (!event.data) return;

    var data = event.data.json();
    
    // Check inside the Firebase 'notification' folder first, otherwise fallback to standard
    var title = (data.notification && data.notification.title) ? data.notification.title : (data.title || "WOW DROPS");
    var body = (data.notification && data.notification.body) ? data.notification.body : (data.body || "New Update");
    
    var options = {
        body: body,
        icon: 'https://wowdrops.github.io/wowLogo.jpg', // Optional: Add your logo URL here
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Optional: Makes the notification open your app when the user taps it!
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('https://wowdrops.github.io/351_portal.html')
    );
});