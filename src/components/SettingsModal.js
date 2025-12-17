import React from "react";
import { X, Bell, RotateCcw, LogOut } from "lucide-react";
import { auth, requestNotificationPermission } from "../services/firebase"; 
import { useData } from "../context/DataContext";

export default function SettingsModal({ onClose }) {
  const { user, resetProfile } = useData();

  // Bildirim İzni İste
  const handleNotificationClick = () => {
    if (user?.uid) {
      requestNotificationPermission(user.uid);
    }
  };

  // Çıkış Yap
  const handleLogout = () => {
    if (window.confirm("Çıkış yapmak istiyor musun?")) {
      auth.signOut();
      onClose();
    }
  };

  // Sıfırla
  const handleReset = async () => {
    if (window.confirm("İlerlemen ve puanların sıfırlanacak (Kelimelerin SİLİNMEZ). Emin misin?")) {
      await resetProfile();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        
        {/* Başlık */}
        <div className="bg-slate-100 p-4 flex justify-between items-center border-b border-slate-200">
          <h2 className="font-bold text-slate-700 text-lg">Ayarlar</h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* İçerik */}
        <div className="p-6 space-y-4">
          
          {/* 1. BİLDİRİM BUTONU */}
          <button 
            onClick={handleNotificationClick}
            className="w-full flex items-center gap-4 p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl transition-colors font-bold text-left group"
          >
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
                <div className="text-sm opacity-80">Bildirimler</div>
                <div className="text-lg">İzin Ver / Aç</div>
            </div>
          </button>

          {/* 2. SIFIRLAMA BUTONU */}
          <button 
            onClick={handleReset}
            className="w-full flex items-center gap-4 p-4 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-2xl transition-colors font-bold text-left group"
          >
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <RotateCcw className="w-6 h-6 text-orange-600" />
            </div>
            <div>
                <div className="text-sm opacity-80">Tehlikeli Bölge</div>
                <div className="text-lg">Profili Sıfırla</div>
            </div>
          </button>

          {/* 3. ÇIKIŞ BUTONU */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl transition-colors font-bold text-left group"
          >
            <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <LogOut className="w-6 h-6 text-slate-600" />
            </div>
            <div>
                <div className="text-sm opacity-80">Oturum</div>
                <div className="text-lg">Çıkış Yap</div>
            </div>
          </button>

        </div>
        
        <div className="bg-slate-50 p-3 text-center text-xs text-slate-400 font-medium">
            v1.1.0 • Bildirim Özellikli
        </div>
      </div>
    </div>
  );
}
