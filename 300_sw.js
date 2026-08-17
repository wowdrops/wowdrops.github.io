self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: 'wowLogo.jpg',
            badge: 'wowLogo.jpg',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || 'https://wowdrops.github.io/351_portal.html'
            }
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// When the user clicks the notification, open the portal
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});