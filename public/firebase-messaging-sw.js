// public/firebase-messaging-sw.js
// Firebase Cloud Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
    apiKey: "AIzaSyDO88UCi8082ZXAy-L-wUNV4war2V0XMJY",
    authDomain: "ashram-wms.firebaseapp.com",
    projectId: "ashram-wms",
    storageBucket: "ashram-wms.firebasestorage.app",
    messagingSenderId: "831424387889",
    appId: "1:831424387889:web:83e0889a58979f3aa0ee10"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'AAKB Notification';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: payload.data?.tag || 'default',
        data: payload.data,
        requireInteraction: payload.data?.priority === 'urgent',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);
    event.notification.close();

    // Get the URL to open
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Open new window if none found
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
