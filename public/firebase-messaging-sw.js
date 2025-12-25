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

// 🔥 BU BLOĞU GERİ GETİRDİK (iPHONE İÇİN ŞARTMIŞ) 🔥
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Bildirim alındı:', payload);
  
  // Başlık ve İçerik Kontrolü
  const notificationTitle = payload.notification?.title || payload.data?.title || "Kelime Defteri";
  const notificationBody = payload.notification?.body || payload.data?.body || "Yeni bir hedefin var!";
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/icon-192.png', // İkon dosyanın adı
    badge: '/icon-192.png',
    
    // 🔥 ÇİFT BİLDİRİMİ ÖNLEMEK İÇİN ETİKET 🔥
    // Aynı anda hem sistem hem biz göstermeye çalışırsak, 
    // bu etiket (tag) sayesinde telefon bunları "aynı mesaj" sayar ve tek gösterir.
    tag: 'daily-notification', 
    renotify: true
  };

  // Tarayıcıya "Bunu Kullanıcıya Göster!" emrini veriyoruz.
  self.registration.showNotification(notificationTitle, notificationOptions);
});
