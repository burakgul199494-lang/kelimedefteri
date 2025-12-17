import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore"; // doc ve setDoc eklendi
import { getMessaging, getToken } from "firebase/messaging"; // Messaging importları eklendi

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

// Servisleri dışarı aktar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app); // Messaging servisi başlatıldı

// Sabitler
export const appId = "burak-ingilizce-pro";
export const ADMIN_EMAILS = ["burakgul1994@outlook.com.tr"];

// --- BİLDİRİM İZNİ İSTEME VE KAYDETME FONKSİYONU ---
export const requestNotificationPermission = async (userId) => {
  try {
    // 1. Tarayıcıdan izin iste
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // 2. İzin verildiyse Token al (VAPID Key burada kullanılıyor)
      const token = await getToken(messaging, {
        vapidKey: "BAEv8tvoKaliQ-Dx3xxhUcPH-hDV_RylcMuPI4OtWMS3nYvHT_Gv7myuk_DsQ3kltls8moIe9WSdbLjBrE-Ui54"
      });

      if (token) {
        console.log("Bildirim Tokeni Alındı:", token);
        
        // 3. Tokeni Veritabanına (Kullanıcının altına) Kaydet
        if (userId) {
            const userRef = doc(db, "artifacts", appId, "users", userId); 
            // merge: true sayesinde diğer verileri silmeden sadece tokeni ekler/günceller
            await setDoc(userRef, { fcmToken: token }, { merge: true });
            
            alert("Bildirimler başarıyla açıldı! 🎉");
        }
      }
    } else {
      alert("Bildirim izni verilmedi. Ayarlardan açabilirsiniz.");
    }
  } catch (error) {
    console.error("Bildirim hatası:", error);
    alert("Bildirim servisine bağlanırken bir hata oluştu.");
  }
};
