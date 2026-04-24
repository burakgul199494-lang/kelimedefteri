import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore"; 
import { getMessaging, getToken } from "firebase/messaging"; 

// 1. SABİTLERİ EN ÜSTE ALIYORUZ
export const appId = "burak-ingilizce-pro";
export const ADMIN_EMAILS = ["burakgul1994@outlook.com.tr"];

const firebaseConfig = {
  apiKey: "AIzaSyDpdcEZIaCzf4fvnrk9LD0D6WIuXWO30NA",
  authDomain: "burak-a9c07.firebaseapp.com",
  projectId: "burak-a9c07",
  storageBucket: "burak-a9c07.firebasestorage.app",
  messagingSenderId: "922162845642",
  appId: "1:922162845642:web:75b579cbe5f46983996133",
};

// Uygulamayı başlat
const app = initializeApp(firebaseConfig);

// 2. KRİTİK SERVİSLER
export const auth = getAuth(app);
export const db = getFirestore(app);

// 3. BİLDİRİM SERVİSİ
export const messaging = getMessaging(app);

// --- BİLDİRİM İZNİ FONKSİYONU ---
export const requestNotificationPermission = async (userId) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: "BAEv8tvoKaliQ-Dx3xxhUcPH-hDV_RylcMuPI4OtWMS3nYvHT_Gv7myuk_DsQ3kltls8moIe9WSdbLjBrE-Ui54"
      });

      if (token) {
        console.log("Token:", token);
        if (userId) {
            const userRef = doc(db, "artifacts", appId, "users", userId); 
            await setDoc(userRef, { fcmToken: token }, { merge: true });
            alert("Bildirimler başarıyla açıldı! 🎉");
        }
      }
    } else {
      alert("İzin verilmedi.");
    }
  } catch (error) {
    console.error("Hata:", error);
    alert("Bir hata oluştu.");
  }
};
