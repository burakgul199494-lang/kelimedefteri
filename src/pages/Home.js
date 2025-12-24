import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
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
  Dumbbell,
  RotateCcw,
  Calendar,
  Target // <--- YENİ: Hedef İkonu eklendi
} from "lucide-react"; 
import ProfileModal from "../components/ProfileModal"; 
import LeaderboardModal from "../components/LeaderboardModal";
import StatisticsModal from "../components/StatisticsModal";
import SettingsModal from "../components/SettingsModal";
import DailyQuests from "../components/DailyQuests";
import CalendarModal from "../components/CalendarModal";

export default function Home() {
  const { user, knownWordIds, getAllWords, streak, isAdmin, leaderboardData, learningQueue } = useData();
  const navigate = useNavigate();
  
  const [showProfileModal, setShowProfileModal] = useState(false); 
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  // 👇 YENİ: Günlük Görevler Modal State'i
  const [showDailyQuests, setShowDailyQuests] = useState(false);
  
  const stats = useMemo(() => {
    const all = getAllWords();
    const now = new Date();

    const getQueueItem = (id) =>
      learningQueue ? learningQueue.find(q => q.wordId === id) : null;

    const waitingPool = all.filter(w => {
      const q = getQueueItem(w.id);
      return q && new Date(q.nextReview) > now;
    });

    const reviewPool = all.filter(w =>
      knownWordIds.includes(w.id)
    );

    const learnPool = all.filter(w => {
      if (knownWordIds.includes(w.id)) return false;
      const q = getQueueItem(w.id);
      if (!q) return true;
      if (new Date(q.nextReview) <= now) return true;
      return false;
    });

    const totalLearned = reviewPool.length;

    return {
      waiting: waitingPool.length,
      review: reviewPool.length,
      new: learnPool.length,
      totalLearned,
      target: learnPool.length,
      progress: all.length > 0
        ? (totalLearned / all.length) * 100
        : 0
    };
  }, [getAllWords, knownWordIds, learningQueue]);


  const myScore = leaderboardData.find(u => u.id === user?.uid)?.score || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 w-full overflow-x-hidden">
      
      {/* --- MODALLAR (PENCERELER) --- */}
      {showProfileModal && <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
      {showStats && <StatisticsModal onClose={() => setShowStats(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} />}
      
      {/* 👇 YENİ: Günlük Görevler Penceresi */}
      {showDailyQuests && <DailyQuests onClose={() => setShowDailyQuests(false)} />}

      <div className="w-full max-w-md space-y-6 mt-2">
        
        {/* --- ÜST BUTON BAR --- */}
        <div className="flex justify-between items-center w-full px-1">
           <div className="flex gap-2 w-full justify-between">
             
             {/* Sol Grup */}
             <div className="flex gap-2">
                <button onClick={() => setShowProfileModal(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600 active:scale-95 transition-transform"><User size={18} /></button>
                <button onClick={() => setShowSettings(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform"><Settings size={18} /></button>
             </div>

             {/* Sağ Grup (Araçlar) */}
             <div className="flex gap-2">
                {/* 1. Takvim */}
                <button onClick={() => setShowCalendar(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600 active:scale-95 transition-transform">
                    <Calendar size={18} />
                </button>

                {/* 2. 👇 YENİ: Günlük Görevler Butonu */}
                <button onClick={() => setShowDailyQuests(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-red-500 active:scale-95 transition-transform">
                    <Target size={18} />
                </button>

                {/* 3. Liderlik */}
                <button onClick={() => setShowLeaderboard(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-yellow-500 active:scale-95 transition-transform"><Trophy size={18} /></button>
                
                {/* 4. İstatistik */}
                <button onClick={() => setShowStats(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-emerald-500 active:scale-95 transition-transform"><BarChart2 size={18} /></button>
             </div>
           </div>
        </div>

        {/* Başlık & Profil */}
        <div className="text-center relative mt-4">
          <div className="flex justify-center mb-4 relative">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg transform rotate-3"><Brain className="w-12 h-12 text-white" /></div>
            <div className="absolute -right-4 -top-4 flex flex-col items-end gap-2">
              <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded-full shadow-lg border-2 border-white min-w-[60px] justify-center">
                    <Flame className="w-3 h-3 fill-white" /><span className="font-bold text-xs">{streak}</span>
                  </div>
              </div>
              <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full shadow-lg border-2 border-white min-w-[60px] justify-center">
                    <Star className="w-3 h-3 fill-yellow-900" /><span className="font-bold text-xs">{myScore}</span>
                  </div>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kelime Defteri</h1>
          <p className="text-slate-500 mt-2 text-sm">Merhaba, <span className="font-bold text-indigo-600">{user?.displayName || user?.email}</span></p>
        </div>

        {/* --- İSTATİSTİK KARTI --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-end mb-2">
             <span className="text-sm font-medium text-slate-500">Genel İlerleme</span>
             <span className="text-2xl font-bold text-indigo-600">%{stats.progress.toFixed(0)}</span>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-3 mb-6">
             <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }}></div>
           </div>
           
           <div className="flex justify-between text-sm divide-x divide-slate-100">
             
             {/* 1. ÖĞRENİLEN */}
             <div onClick={() => navigate("/list/known")} className="text-center flex-1 px-1 cursor-pointer hover:bg-slate-50 rounded transition-colors group">
                <div className="font-bold text-slate-800 group-hover:text-green-600 transition-colors text-lg flex items-center justify-center gap-1">
                   {stats.review} <RotateCcw size={12} className="text-green-500"/>
                </div>
                <div className="text-slate-400 text-xs">Tekrar</div>
             </div>

             {/* 2. BEKLEME */}
             <div onClick={() => navigate("/list/waiting")} className="text-center flex-1 px-1 cursor-pointer hover:bg-slate-50 rounded transition-colors group">
                <div className="font-bold text-slate-800 group-hover:text-amber-500 transition-colors text-lg flex items-center justify-center gap-1">
                   {stats.waiting} <Hourglass size={12} className="text-amber-400"/>
                </div>
                <div className="text-slate-400 text-xs">Beklemede</div>
             </div>

             {/* 3. KALAN */}
             <div onClick={() => navigate("/list/unknown")} className="text-center flex-1 px-1 cursor-pointer hover:bg-slate-50 rounded transition-colors group">
                <div className="font-bold text-slate-800 group-hover:text-blue-500 transition-colors text-lg">{stats.new}</div>
                <div className="text-slate-400 text-xs">Öğrenilecek</div>
             </div>
           </div>
        </div>

        {/* --- AKSİYON BUTONLARI --- */}
        <div className="space-y-3 pb-8">
          
          {/* --- ADMIN PANELİ --- */}
          {isAdmin && (
            <button onClick={() => navigate("/admin")} className="w-full bg-slate-800 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-3">
                <Shield className="w-5 h-5 text-yellow-400"/> Admin Paneli
            </button>
          )}

          {/* SÖZLÜK */}
          <button onClick={() => navigate("/dictionary")} className="w-full bg-sky-500 text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-between group active:scale-95 transition-transform">
              <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-lg"><Book className="w-6 h-6"/></div><div className="text-left"><div className="text-lg">Sözlük</div><div className="text-xs text-sky-100 font-normal">Kelime ara ve öğren</div></div></div>
          </button>

          {/* FLASH KART (Ana Oyun) */}
          <button onClick={() => navigate("/game")} className="w-full bg-indigo-600 text-white font-bold py-5 px-6 rounded-2xl shadow-lg flex items-center justify-between group active:scale-95 transition-transform mb-2">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl"><Play className="w-8 h-8" fill="currentColor"/></div>
                <div className="text-left">
                   <div className="text-xl">Flash Kart</div>
                   <div className="text-xs text-indigo-200 font-normal">
                      {stats.target} kelime çalışılmayı bekliyor
                   </div>
                </div>
            </div>
             <Play className="w-6 h-6 opacity-60 group-hover:translate-x-1 transition-transform"/>
          </button>

          {/* GRAMER */}
          <button onClick={() => navigate("/exercise")} className="w-full bg-slate-800 text-white font-bold py-5 px-6 rounded-2xl shadow-lg flex items-center justify-between group active:scale-95 transition-transform mb-3">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl"><Dumbbell className="w-8 h-8"/></div>
                <div className="text-left"><div className="text-xl">Gramer Egzersizi</div><div className="text-xs text-slate-400 font-normal">Form çalışması</div></div>
            </div>
          </button>

          {/* MENÜLER */}
          <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate("/quiz")} className="bg-amber-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 active:scale-95"><HelpCircle className="w-6 h-6"/><span className="text-sm">Quiz</span></button>
              <button onClick={() => navigate("/quiz2")} className="bg-emerald-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 active:scale-95"><Languages className="w-6 h-6"/><span className="text-sm">Ters Quiz</span></button>
              <button onClick={() => navigate("/writing")} className="bg-purple-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 active:scale-95"><Edit className="w-6 h-6"/><span className="text-sm">Yazma</span></button>
              <button onClick={() => navigate("/writing2")} className="bg-pink-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 active:scale-95"><Headphones className="w-6 h-6"/><span className="text-sm">Dinle & Yaz</span></button>
              <button onClick={() => navigate("/gap-filling")} className="bg-cyan-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 active:scale-95"><Quote className="w-6 h-6"/><span className="text-sm">Boşluk</span></button>
              <button onClick={() => navigate("/game/sentence-builder")} className="bg-teal-600 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 active:scale-95"><Layout className="w-6 h-6"/><span className="text-sm">Cümle Kurma</span></button>
              <button onClick={() => navigate("/game/word-match")} className="bg-orange-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 active:scale-95"><Puzzle className="w-6 h-6"/><span className="text-sm">Eşleşme</span></button>
              <button onClick={() => navigate("/pronunciation")} className="bg-rose-500 text-white font-bold py-4 px-4 rounded-xl shadow-md flex flex-col items-center gap-2 active:scale-95"><Mic className="w-6 h-6"/><span className="text-sm">Telaffuz</span></button>
          </div>
          <div className="h-px bg-slate-200 my-2"></div>
        </div>
      </div>
    </div>
  );
}
