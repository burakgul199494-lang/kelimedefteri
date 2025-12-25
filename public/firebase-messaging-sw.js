importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDpdcEZIaCzf4fvnrk9LD0D6WIuXWO30NA",
  authDomain: "burak-a9c07.firebaseapp.com",
  projectId: "burak-a9c07",
  storageBucket: "burak-a9c07.firebasestorage.app",
  messagingSenderId: "922162845642",
  appId: "1:922162845642:web:75b579cbe5f46983996133",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Bildirim alındı:', payload);
  
  const notificationTitle = payload.notification?.title || "Kelime Defteri";
  
  const notificationOptions = {
    body: payload.notification?.body || "Yeni bir bildirimin var!",
    icon: '/icon-192.png',
    
    // 🔥 ÇİFT BİLDİRİM ENGELLEYİCİ SİHİRLİ KOD 🔥
    // Eğer Firebase de gösterirse, bu etiket sayesinde ikisi birleşir.
    tag: 'unique-app-notification', 
    renotify: true // Eski bildirim varsa onu titretip günceller
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
