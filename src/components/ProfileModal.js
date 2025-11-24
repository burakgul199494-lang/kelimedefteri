import React, { useState } from "react";
import { updateProfile, updatePassword } from "firebase/auth";
import { X, Save, User, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ProfileModal({ user, onClose }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. İsim Güncelleme
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName: displayName });
      }

      // 2. Şifre Güncelleme (Eğer kutu doluysa)
      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      setLoading(false);
      setMessage({ type: "success", text: "Profil başarıyla güncellendi!" });
      
      // 1.5 saniye sonra kapat
      setTimeout(() => {
        onClose();
        // İsmin anında güncel görünmesi için sayfayı yenilemek garanti çözümdür
        window.location.reload(); 
      }, 1500);

    } catch (error) {
      setLoading(false);
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: "error", text: "Güvenlik gereği şifre değiştirmek için yeniden giriş yapmalısın." });
      } else if (error.code === 'auth/weak-password') {
        setMessage({ type: "error", text: "Şifre en az 6 karakter olmalı." });
      } else {
        setMessage({ type: "error", text: "Bir hata oluştu: " + error.message });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 relative">
        
        <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500">
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

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* İsim Alanı */}
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

          {/* Şifre Alanı */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Yeni Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                placeholder="Değiştirmek istemiyorsan boş bırak"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 ml-1">* Şifreyi değiştirmek istemiyorsanız bu alanı boş bırakın.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Kaydet
          </button>

        </form>
      </div>
    </div>
  );
}
