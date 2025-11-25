import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { auth } from "../services/firebase";
import { 
  RotateCcw, LogOut, Brain, Flame, Play, Book, 
  Microscope, Plus, BookOpen, Check, Trash2, 
  Shield, Edit, HelpCircle, Settings, Trophy, Star, Mic 
} from "lucide-react";
import ProfileModal from "../components/ProfileModal"; 
import LeaderboardModal from "../components/LeaderboardModal";

export default function Home() {
  // Verileri context'ten çekiyoruz
  const { user, knownWordIds, getAllWords, streak, resetProfile, isAdmin, leaderboardData } = useData();
  const navigate = useNavigate();
  
  // Modal kontrol state'leri
  const [showProfileModal, setShowProfileModal] = useState(false); 
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // İstatistik Hesaplamaları
  const allWords = getAllWords();
  const progressPercentage = allWords.length > 0 ? (knownWordIds.length / allWords.length) * 100 : 0;
  const remainingCount = allWords.length - knownWordIds.length;

  // Kullanıcının güncel puanını bul
  const myScore = leaderboardData.find(u => u.id === user?.uid)?.score || 0;

  // Çıkış ve Sıfırlama İşlemleri
  const handleLogout = async () => { await auth.signOut(); navigate("/login"); };
  const handleReset = async () => { if(window.confirm("Emin misin? Tüm ilerleme silinecek.")) await resetProfile(); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
      
      {/* --- MODALLAR --- */}
      {showProfileModal && <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

      <div className="w-full max-w-md space-y-6 mt-2">
        
        {/* Üst Bar (Ayarlar, Liderlik, Reset, Çıkış) */}
        <div className="flex justify-between items-center w-full px-1">
          <div className="flex gap-2">
             {/* Profil Ayarları */}
             <button onClick={() => setShowProfileModal(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600">
                <Settings size={18} />
             </button>
             
             {/* Liderlik Tablosu */}
             <button onClick={() => setShowLeaderboard(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-yellow-500">
                <Trophy size={18} />
             </button>

             {/* Sıfırlama */}
             <button onClick={handleReset} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 hover:text-red-500" title="Sıfırla">
                <RotateCcw size={18} />
             </button>
          </div>
          {/* Çıkış */}
          <button onClick={handleLogout} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 hover:text-red-500" title="Çıkış">
             <LogOut size={18} />
          </button>
        </div>

        {/* Başlık & İstatistikler (Puan ve Seri) */}
        <div className="text-center relative mt-4">
          <div className="flex justify-center mb-4 relative">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg transform rotate-3"><Brain className="w-12 h-12 text-white" /></div>
            
            {/* SAĞ ÜST: SERİ VE PUAN GÖSTERGESİ */}
            <div className="absolute -right-4 -top-4 flex flex-col items-end gap-2">
              
              {/* Seri (Streak) */}
              <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded-full shadow-lg border-2 border-white min-w-[60px] justify-center">
                    <Flame className="w-3 h-3 fill-white" /><span className="font-bold text-xs">{streak}</span>
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 rounded mt-0.5">Seri</span>
              </div>

              {/* Puan (Score) */}
              <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full shadow-lg border-2 border-white min-w-[60px] justify-center">
                    <Star className="w-3 h-3 fill-yellow-900" /><span className="font-bold text-xs">{myScore}</span>
                  </div>
                  <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 px-1.5 rounded mt-0.5">Puan</span>
              </div>

            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kelime Defteri 23</h1>
          <p className="text-slate-500 mt-2 text-sm">Merhaba, <span className="font-bold text-indigo-600">{user?.displayName || user?.email}</span></p>
        </div>

        {/* İlerleme Kartı */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-end mb-2">
             <span className="text-sm font-medium text-slate-500">Genel İlerleme</span>
             <span className="text-2xl font-bold text-indigo-600">%{progressPercentage.toFixed(1)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 mb-4"><div className="bg-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div></div>
          <div className="flex justify-between text-sm">
             <div className="text-center flex-1 border-r"><div className="font-bold text-slate-800">{knownWordIds.length}</div><div className="text-slate-400">Öğrenilen</div></div>
             <div className="text-center flex-1"><div className="font-bold text-slate-800">{remainingCount}</div><div className="text-slate-400">Kalan</div></div>
          </div>
        </div>

        {/* --- MENÜ LİSTESİ --- */}
        <div className="space-y-3 pb-8">
          
          {/* Admin Butonu (Sadece yetkiliye görünür) */}
          {isAdmin && (
             <button onClick={() => navigate("/admin")} className="w-full bg-slate-800 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center justify-between mb-3">
               <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-lg"><Shield className="w-5 h-5 text-yellow-400"/></div><div className="text-left"><div className="text-base">Admin Paneli</div></div></div>
             </button>
          )}

          {/* 1. Sözlük (En Üstte) */}
          <button onClick={() => navigate("/dictionary")} className="w-full bg-sky-500 text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-between group active:scale-95 transition-transform">
             <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-lg"><Book className="w-6 h-6"/></div><div className="text-left"><div className="text-lg">Sözlük</div><div className="text-xs text-sky-100 font-normal">Kelime ara ve öğren</div></div></div>
          </button>

          {/* 2. AI Cümle Analizi */}
          <button onClick={() => navigate("/analysis")} className="w-full bg-teal-600 text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-between group active:scale-95 transition-transform">
             <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-lg"><Microscope className="w-6 h-6"/></div><div className="text-left"><div className="text-lg">AI Cümle Analizi</div><div className="text-xs text-teal-100 font-normal">Gramer ve hata kontrolü</div></div></div>
          </button>

          {/* OYUNLAR GRUBU (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-3">
             {/* 3. Flash Kart */}
             <button onClick={() => navigate("/game")} className="bg-indigo-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Play className="w-6 h-6" fill="currentColor"/></div>
                <span className="text-sm">Flash Kart</span>
             </button>
             
             {/* 4. Yazma Testi */}
             <button onClick={() => navigate("/writing")} className="bg-purple-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Edit className="w-6 h-6"/></div>
                <span className="text-sm">Yazma Testi</span>
             </button>

             {/* 5. Quiz */}
             <button onClick={() => navigate("/quiz")} className="bg-amber-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><HelpCircle className="w-6 h-6"/></div>
                <span className="text-sm">Quiz</span>
             </button>

             {/* 6. Telaffuz */}
             <button onClick={() => navigate("/pronunciation")} className="bg-rose-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Mic className="w-6 h-6"/></div>
                <span className="text-sm">Telaffuz</span>
             </button>
          </div>

          {/* --- AYIRAÇ --- */}
          <div className="h-px bg-slate-200 my-2"></div>

          {/* Kelime Ekle */}
          <button onClick={() => navigate("/add-word")} className="w-full bg-white text-slate-700 border-2 border-dashed border-slate-300 font-bold py-4 px-6 rounded-xl flex items-center justify-between group hover:bg-slate-50 active:scale-95 transition-transform">
             <div className="flex items-center gap-3"><div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Plus className="w-6 h-6"/></div><div className="text-left"><div className="text-base">Yeni Kelime Ekle</div></div></div><Plus className="w-5 h-5 opacity-40"/>
          </button>

          {/* Listeler */}
          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => navigate("/list/unknown")} className="bg-white border-2 border-slate-200 font-bold py-4 px-4 rounded-xl flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-orange-100 p-2 rounded-full text-orange-500"><BookOpen className="w-5 h-5"/></div><span className="text-sm">Öğreneceğim<br/>Kelimeler</span>
             </button>
             <button onClick={() => navigate("/list/known")} className="bg-white border-2 border-slate-200 font-bold py-4 px-4 rounded-xl flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-green-100 p-2 rounded-full text-green-600"><Check className="w-5 h-5"/></div><span className="text-sm">Öğrendiğim<br/>Kelimeler</span>
             </button>
          </div>

          {/* Çöp Kutusu */}
          <button onClick={() => navigate("/list/trash")} className="w-full bg-white text-slate-700 border-2 border-slate-200 font-bold py-3 px-4 rounded-xl flex items-center justify-between active:scale-95 transition-transform">
             <div className="flex items-center gap-3"><div className="bg-red-100 p-2 rounded-full text-red-500"><Trash2 className="w-5 h-5"/></div><div className="text-sm">Silinen Kelimeler</div></div>
          </button>
        </div>
      </div>
    </div>
  );
}
