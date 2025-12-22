import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
// import { auth } from "../services/firebase"; // Kullanmıyorsan silebilirsin, aşağıda user context'ten geliyor
import { 
  Brain, Flame, Play, Book, 
  Edit, HelpCircle, 
  Settings, Trophy, 
  Star, Mic, Quote, Shield,
  Hourglass,
  Languages,
  Layout,
  Headphones, 
  Puzzle, 
  BarChart2,
  User,
  Dumbbell 
} from "lucide-react"; 
import ProfileModal from "../components/ProfileModal"; 
import LeaderboardModal from "../components/LeaderboardModal";
import StatisticsModal from "../components/StatisticsModal";
import SettingsModal from "../components/SettingsModal";

export default function Home() {
  const { user, knownWordIds, getAllWords, streak, isAdmin, leaderboardData } = useData();
  const navigate = useNavigate();
  
  const [showProfileModal, setShowProfileModal] = useState(false); 
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Tüm kelimeleri çek
  const allWords = getAllWords();
  const totalWords = allWords.length;

  // --- HESAPLAMALAR (SAYFALARLA BİREBİR EŞLEŞEN MANTIK) ---
  const now = new Date();

  // 1. BEKLEMEDE OLANLAR (SARI KUTU)
  // Mantık: Biliniyor (Level > 0) VE Tarihi Gelecekte.
  // Bu, "/list/waiting" sayfasındaki listeyle aynıdır.
  const waitingList = allWords.filter(w => {
      // Eğer kelime "Bilinmiyorsa" bekleme listesinde olamaz.
      if (!knownWordIds.includes(w.id)) return false; 
      
      // Firebase tarih kontrolü (toDate var mı?)
      const reviewDate = w.nextReviewDate && w.nextReviewDate.toDate 
        ? w.nextReviewDate.toDate() 
        : new Date(w.nextReviewDate);
      
      // Sadece gelecekteki kelimeler
      return reviewDate > now;
  });
  const waitingCount = waitingList.length;

  // 2. KALAN / ÇALIŞILACAKLAR (MAVİ KUTU)
  // Mantık: (Hiç Bilinmiyor) VEYA (Biliniyor AMA Süresi Dolmuş/Tekrar)
  // Bu, "/list/unknown" (veya ana çalışma listen) sayfasındaki listeyle aynıdır.
  const remainingList = allWords.filter(w => {
      const isKnown = knownWordIds.includes(w.id);
      
      // Durum A: Hiç bilinmiyor (Yeni Kelime) -> LİSTEYE AL
      if (!isKnown) return true; 

      // Durum B: Biliniyor ama süresi dolmuş (Tekrar Zamanı) -> LİSTEYE AL
      const reviewDate = w.nextReviewDate && w.nextReviewDate.toDate 
        ? w.nextReviewDate.toDate() 
        : new Date(w.nextReviewDate);
        
      return reviewDate <= now; 
  });
  const remainingCount = remainingList.length;

  // 3. ÖĞRENİLENLER (YEŞİL KUTU & İLERLEME ÇUBUĞU)
  // Mantık: Sadece biliniyor olması yeterli (Süresi dolsa da dolmasa da).
  // Bu, "/list/known" sayfasındaki listeyle aynıdır.
  const learnedList = allWords.filter(w => knownWordIds.includes(w.id));
  const learnedCount = learnedList.length;

  // Yüzdelik (Learned count'a göre hesaplanır)
  const progressPercentage = totalWords > 0 ? (learnedCount / totalWords) * 100 : 0;
  
  // Skor
  const myScore = leaderboardData.find(u => u.id === user?.uid)?.score || 0;
  // --- HESAPLAMALAR BİTİŞ ---

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 w-full overflow-x-hidden">
      
      {/* --- MODALLAR --- */}
      {showProfileModal && <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
      {showStats && <StatisticsModal onClose={() => setShowStats(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <div className="w-full max-w-md space-y-6 mt-2">
        
        {/* Üst Bar */}
        <div className="flex justify-between items-center w-full px-1">
           <div className="flex gap-2 w-full justify-between">
             
             <div className="flex gap-2">
                <button onClick={() => setShowProfileModal(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600 active:scale-95 transition-transform" title="Profil Düzenle">
                    <User size={18} />
                </button>
                <button onClick={() => setShowSettings(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform" title="Ayarlar">
                    <Settings size={18} />
                </button>
             </div>

             <div className="flex gap-2">
                <button onClick={() => setShowLeaderboard(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-yellow-500 active:scale-95 transition-transform" title="Liderlik">
                    <Trophy size={18} />
                </button>
                <button onClick={() => setShowStats(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-emerald-500 active:scale-95 transition-transform" title="Haftalık Rapor">
                    <BarChart2 size={18} />
                </button>
             </div>

           </div>
        </div>

        {/* Başlık & İstatistikler */}
        <div className="text-center relative mt-4">
          <div className="flex justify-center mb-4 relative">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg transform rotate-3"><Brain className="w-12 h-12 text-white" /></div>
            <div className="absolute -right-4 -top-4 flex flex-col items-end gap-2">
              <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded-full shadow-lg border-2 border-white min-w-[60px] justify-center">
                    <Flame className="w-3 h-3 fill-white" /><span className="font-bold text-xs">{streak}</span>
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 rounded mt-0.5">Seri</span>
              </div>
              <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full shadow-lg border-2 border-white min-w-[60px] justify-center">
                    <Star className="w-3 h-3 fill-yellow-900" /><span className="font-bold text-xs">{myScore}</span>
                  </div>
                  <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 px-1.5 rounded mt-0.5">Puan</span>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kelime Defteri</h1>
          <p className="text-slate-500 mt-2 text-sm">Merhaba, <span className="font-bold text-indigo-600">{user?.displayName || user?.email}</span></p>
        </div>

        {/* İlerleme Kartı */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-end mb-2">
             <span className="text-sm font-medium text-slate-500">Genel İlerleme</span>
             <span className="text-2xl font-bold text-indigo-600">%{progressPercentage.toFixed(1)}</span>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-3 mb-6">
             <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
           </div>
           
           <div className="flex justify-between text-sm divide-x divide-slate-100">
             <div onClick={() => navigate("/list/known")} className="text-center flex-1 px-1 cursor-pointer hover:bg-slate-50 rounded transition-colors group">
                <div className="font-bold text-slate-800 group-hover:text-green-600 transition-colors text-lg">{learnedCount}</div>
                <div className="text-slate-400 text-xs">Öğrenilen</div>
             </div>
             <div onClick={() => navigate("/list/waiting")} className="text-center flex-1 px-1 cursor-pointer hover:bg-slate-50 rounded transition-colors group">
                <div className="font-bold text-slate-800 group-hover:text-amber-500 transition-colors text-lg flex items-center justify-center gap-1">
                   {waitingCount} <Hourglass size={12} className="text-amber-400"/>
                </div>
                <div className="text-slate-400 text-xs">Beklemede</div>
             </div>
             <div onClick={() => navigate("/list/unknown")} className="text-center flex-1 px-1 cursor-pointer hover:bg-slate-50 rounded transition-colors group">
                <div className="font-bold text-slate-800 group-hover:text-blue-500 transition-colors text-lg">{remainingCount}</div>
                <div className="text-slate-400 text-xs">Kalan</div>
             </div>
           </div>
        </div>

        {/* --- MENÜ LİSTESİ --- */}
        <div className="space-y-3 pb-8">
          
          {/* Admin */}
          {isAdmin && (
            <button onClick={() => navigate("/admin")} className="w-full bg-slate-800 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center justify-between mb-3 group hover:bg-slate-900 transition-colors">
               <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-lg"><Shield className="w-5 h-5 text-yellow-400"/></div><div className="text-left"><div className="text-base">Admin Paneli</div></div></div>
            </button>
          )}

          {/* Sözlük */}
          <button onClick={() => navigate("/dictionary")} className="w-full bg-sky-500 text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-between group active:scale-95 transition-transform">
             <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-lg"><Book className="w-6 h-6"/></div><div className="text-left"><div className="text-lg">Sözlük</div><div className="text-xs text-sky-100 font-normal">Kelime ara ve öğren</div></div></div>
          </button>

          {/* Flash Kart */}
          <button onClick={() => navigate("/game")} className="w-full bg-indigo-600 text-white font-bold py-5 px-6 rounded-2xl shadow-lg flex items-center justify-between group active:scale-95 transition-transform mb-2">
             <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl"><Play className="w-8 h-8" fill="currentColor"/></div>
                <div className="text-left">
                   <div className="text-xl">Flash Kart</div>
                   <div className="text-xs text-indigo-200 font-normal">Klasik öğrenme modu</div>
                </div>
            </div>
             <Play className="w-6 h-6 opacity-60 group-hover:translate-x-1 transition-transform"/>
          </button>

          {/* Gramer Egzersizi */}
          <button onClick={() => navigate("/exercise")} className="w-full bg-slate-800 text-white font-bold py-5 px-6 rounded-2xl shadow-lg flex items-center justify-between group active:scale-95 transition-transform mb-3">
             <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-colors"><Dumbbell className="w-8 h-8"/></div>
                <div className="text-left">
                   <div className="text-xl">Gramer Egzersizi</div>
                   <div className="text-xs text-slate-400 font-normal">Tüm kelimelerle form çalışması</div>
                </div>
            </div>
             <Dumbbell className="w-6 h-6 opacity-60 group-hover:rotate-12 transition-transform"/>
          </button>

          {/* GRID MENÜ (Diğer Oyunlar) */}
          <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate("/quiz")} className="bg-amber-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><HelpCircle className="w-6 h-6"/></div>
                <span className="text-sm">Quiz</span>
              </button>

              <button onClick={() => navigate("/quiz2")} className="bg-emerald-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Languages className="w-6 h-6"/></div>
                <span className="text-sm">Ters Quiz</span>
              </button>

              <button onClick={() => navigate("/writing")} className="bg-purple-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Edit className="w-6 h-6"/></div>
                <span className="text-sm">Yazma</span>
              </button>

              <button onClick={() => navigate("/writing2")} className="bg-pink-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Headphones className="w-6 h-6"/></div>
                <span className="text-sm">Dinle & Yaz</span>
              </button>

              <button onClick={() => navigate("/gap-filling")} className="bg-cyan-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Quote className="w-6 h-6"/></div>
                <span className="text-sm">Boşluk Dol.</span>
              </button>

              <button onClick={() => navigate("/game/sentence-builder")} className="bg-teal-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Layout className="w-6 h-6"/></div>
                <span className="text-sm">Cümle Kurma</span>
              </button>

              <button onClick={() => navigate("/game/word-match")} className="bg-orange-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Puzzle className="w-6 h-6"/></div>
                <span className="text-sm">Eşleştirme</span>
              </button>

              <button onClick={() => navigate("/pronunciation")} className="bg-rose-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 text-center active:scale-95 transition-transform">
                <div className="bg-white/20 p-2 rounded-full"><Mic className="w-6 h-6"/></div>
                <span className="text-sm">Telaffuz</span>
              </button>
          </div>

          <div className="h-px bg-slate-200 my-2"></div>

        </div>
      </div>
    </div>
  );
}
