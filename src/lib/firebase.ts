// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    // Initialize messaging only in browser
    if ('Notification' in window && 'serviceWorker' in navigator) {
        try {
            messaging = getMessaging(app);
        } catch (error) {
            console.error('Firebase messaging not supported:', error);
        }
    }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
    if (!messaging) {
        console.error('Messaging not initialized');
        return null;
    }

    try {
        // Request permission
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('Notification permission granted');

            // Get FCM token
            const token = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });

            console.log('FCM Token:', token);
            return token;
        } else {
            console.log('Notification permission denied');
            return null;
        }
    } catch (error) {
        console.error('Error getting notification permission:', error);
        return null;
    }
}

/**
 * Listen for foreground messages
 */
export function onMessageListener(callback: (payload: any) => void) {
    if (!messaging) {
        console.error('Messaging not initialized');
        return () => { };
    }

    return onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
    });
}

/**
 * Save FCM token to database
 */
export async function saveFCMToken(token: string, userId: string) {
    try {
        const response = await fetch('/api/notifications/register-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                userId,
                platform: 'web',
                deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Web' : 'Desktop Web',
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to save token');
        }

        console.log('FCM token saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving FCM token:', error);
        return false;
    }
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
    if (typeof window !== 'undefined' && 'Notification' in window) {
        return Notification.permission;
    }
    return null;
}

export { messaging };
