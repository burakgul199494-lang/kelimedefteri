// public/firebase-messaging-sw.js

// Firebase kütüphanelerini "script" olarak yüklüyoruz (Service Worker içinde 'import' kullanılmaz)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Senin Proje Ayarların (Burak İngilizce Pro)
const firebaseConfig = {
  apiKey: "AIzaSyDpdcEZIaCzf4fvnrk9LD0D6WIuXWO30NA",
  authDomain: "burak-a9c07.firebaseapp.com",
  projectId: "burak-a9c07",
  storageBucket: "burak-a9c07.firebasestorage.app",
  messagingSenderId: "922162845642",
  appId: "1:922162845642:web:75b579cbe5f46983996133",
};

// Firebase'i arka planda başlat
firebase.initializeApp(firebaseConfig);

// Messaging servisini al
const messaging = firebase.messaging();

// Arka planda mesaj gelirse ne olacağını ayarla
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Arka plan mesajı alındı:', payload);
  
  // Bildirim başlığı ve içeriği
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // Uygulamanın ikonu (public klasöründe varsa)
  };

  // Bildirimi göster
  self.registration.showNotification(notificationTitle, notificationOptions);
});
