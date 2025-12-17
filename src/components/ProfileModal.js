import React, { useState } from "react";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { X, Save, User, Lock, Loader2, AlertCircle, CheckCircle2, Key } from "lucide-react";

export default function ProfileModal({ user, onClose }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  
  // Şifre Değiştirme State'leri
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. İsim Güncelleme (Her zaman çalışır)
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName: displayName });
      }

      // 2. Şifre Güncelleme (Sadece alanlar doluysa çalışır)
      if (currentPassword || newPassword || confirmPassword) {
        
        // A. Boş alan kontrolü
        if (!currentPassword || !newPassword || !confirmPassword) {
          throw new Error("Şifre değiştirmek için tüm şifre alanlarını doldurmalısın.");
        }

        // B. Yeni şifrelerin eşleşme kontrolü
        if (newPassword !== confirmPassword) {
          throw new Error("Yeni şifreler birbiriyle uyuşmuyor.");
        }

        // C. Yeni şifre uzunluk kontrolü
        if (newPassword.length < 6) {
          throw new Error("Yeni şifre en az 6 karakter olmalı.");
        }

        // D. ESKİ ŞİFREYİ DOĞRULAMA (Kritik Güvenlik Adımı)
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // E. Şifreyi Güncelle
        await updatePassword(user, newPassword);
      }

      setLoading(false);
      setMessage({ type: "success", text: "İşlem başarıyla tamamlandı!" });
      
      // 1.5 saniye sonra kapat ve yenile
      setTimeout(() => {
        onClose();
        window.location.reload(); 
      }, 1500);

    } catch (error) {
      setLoading(false);
      console.error(error);
      
      let errorMsg = error.message;

      // Hata kodlarını Türkçeleştirme
      if (error.code === 'auth/wrong-password') {
        errorMsg = "Mevcut şifrenizi yanlış girdiniz.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = "Çok fazla deneme yaptınız. Lütfen bekleyin.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMsg = "Güvenlik gereği yeniden giriş yapmalısın.";
      }

      setMessage({ type: "error", text: errorMsg });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        
        <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Profil Ayarları</h2>
          <p className="text-slate-500 text-sm">{user.email}</p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-xl text-sm font-medium mb-4 flex items-center gap-2 ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          
          {/* --- İSİM ALANI --- */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Görünen İsim</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                placeholder="Adınız Soyadınız"
              />
            </div>
          </div>

          {/* --- ŞİFRE DEĞİŞTİRME ALANI (Gri Kutu) --- */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
              <Lock className="w-4 h-4 text-indigo-500" /> Şifre Değiştir
            </h3>

            {/* Mevcut Şifre */}
            <div>
              <div className="relative">
                <Key className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Mevcut Şifreniz"
                />
              </div>
            </div>

            {/* Yeni Şifre */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Yeni Şifre"
                />
              </div>
            </div>

            {/* Yeni Şifre Tekrar */}
            <div>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Yeni Şifre (Tekrar)"
                />
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-tight">
              * Şifrenizi değiştirmek istemiyorsanız bu alanı boş bırakın.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Değişiklikleri Kaydet
          </button>

        </form>
      </div>
    </div>
  );
}
