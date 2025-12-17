import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore"; // doc ve setDoc eklendi
import { getMessaging, getToken } from "firebase/messaging"; // Messaging eklendi

const firebaseConfig = {
  apiKey: "AIzaSyDpdcEZIaCzf4fvnrk9LD0D6WIuXWO30NA",
  authDomain: "burak-a9c07.firebaseapp.com",
  projectId: "burak-a9c07",
  storageBucket: "burak-a9c07.firebasestorage.app",
  messagingSenderId: "922162845642",
  appId: "1:922162845642:web:75b579cbe5f46983996133",
};

const app = initializeApp(firebaseConfig);

// Mevcut Servisler
export const auth = getAuth(app);
export const db = getFirestore(app);

// YENİ EKLENEN: Bildirim Servisi
export const messaging = getMessaging(app);

// MEVCUT AYARLARIN (BUNLAR DEĞİŞMEDİ, GÜVENDE)
export const appId = "burak-ingilizce-pro";
export const ADMIN_EMAILS = ["burakgul1994@outlook.com.tr"];

// --- YENİ EKLENEN: Bildirim İzni İsteme Fonksiyonu ---
export const requestNotificationPermission = async (userId) => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Senin VAPID Key'in ile token alıyoruz
      const token = await getToken(messaging, {
        vapidKey: "BAEv8tvoKaliQ-Dx3xxhUcPH-hDV_RylcMuPI4OtWMS3nYvHT_Gv7myuk_DsQ3kltls8moIe9WSdbLjBrE-Ui54"
      });

      if (token) {
        console.log("Bildirim Tokeni:", token);
        
        // Tokeni veritabanına kaydediyoruz
        if (userId) {
            // appId değişkenini kullandığımız için doğru yere kaydedecek
            const userRef = doc(db, "artifacts", appId, "users", userId); 
            await setDoc(userRef, { fcmToken: token }, { merge: true });
            
            alert("Bildirimler başarıyla açıldı! 🎉");
        }
      }
    } else {
      alert("Bildirim izni verilmedi.");
    }
  } catch (error) {
    console.error("Bildirim hatası:", error);
    alert("Bir hata oluştu.");
  }
};
