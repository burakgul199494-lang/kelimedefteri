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

// 🔥 BURASI BİLEREK BOŞ BIRAKILDI 🔥
// iPhone zaten bildirimi otomatik gösteriyor.
// İkinci kez bizim göstermemize gerek yok.
// DataContext.js dosyasındaki "registration" ayarı bağlantıyı tutmaya yetiyor.
