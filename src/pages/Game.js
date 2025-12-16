import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import WordCard from "../components/WordCard";
import { useNavigate } from "react-router-dom";
import {
  X,
  Home,
  Target,
  Check,
  CheckCheck,
  Trophy,
  RotateCcw,
  Brain,
  Hourglass,
  Layers,
  ArrowRight,
  AlertTriangle
} from "lucide-react";

export default function Game() {
  const { getAllWords, knownWordIds, handleSmartLearn, learningQueue, addScore } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameStage, setGameStage] = useState("selection");
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [stats, setStats] = useState({ learned: 0, review: 0, mastered: 0 });
  const [activeMode, setActiveMode] = useState(null);

  // Modallar
  const [showMasterConfirm, setShowMasterConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const POINTS_PER_CARD = 5;

  // --- KRİTİK FONKSİYON: ODAĞI HEMEN KALDIR ---
  // Bu fonksiyon, tıklama biter bitmez butonu "seçilmemiş" hale getirir.
  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  // --- KELİME HAVUZLARI ---
  const pools = useMemo(() => {
    const all = getAllWords();
    const now = new Date();
    const getQueueItem = (id) => learningQueue ? learningQueue.find(q => q.wordId === id) : null;

    const waitingPool = all.filter(w => {
        const q = getQueueItem(w.id);
        return q && new Date(q.nextReview) > now;
    });

    const reviewPool = all.filter(w => knownWordIds.includes(w.id));

    const learnPool = all.filter(w => {
        if (knownWordIds.includes(w.id)) return false;
        const q = getQueueItem(w.id);
        if (!q) return true;
        if (new Date(q.nextReview) <= now) return true;
        return false;
    });

    return { learnPool, reviewPool, waitingPool };
  }, [getAllWords, knownWordIds, learningQueue]);

  // --- OTURUM BAŞLATMA ---
  const startSession = (mode, e) => {
    handleBlur(e); // Mobile Fix
    setActiveMode(mode);
    let selectedPool = [];

    if (mode === "learn") selectedPool = pools.learnPool;
    else if (mode === "review") selectedPool = pools.reviewPool;
    else if (mode === "waiting") selectedPool = pools.waitingPool;

    if (selectedPool.length === 0) {
      alert("Bu modda şu an çalışılacak kelime yok!");
      return;
    }

    const shuffled = [...selectedPool].sort(() => 0.5 - Math.random());
    setSessionWords(shuffled.slice(0, 20));
    setCurrentIndex(0);
    setStats({ learned: 0, review: 0, mastered: 0 });
    setGameStage("playing");
  };

  // --- CEVAPLAMA ---
  const handleAnswerAction = async (dir, type, e) => {
    handleBlur(e); // Mobile Fix
    if (currentIndex >= sessionWords.length) return;

    if (activeMode === 'waiting' && type === 'dont_know') {
        setShowResetConfirm(true); 
        return;
    }

    setSwipeDirection(dir);
    const currentWord = sessionWords[currentIndex];

    setTimeout(async () => {
      if (activeMode === 'review') {
          setStats((p) => ({ ...p, review: p.review + 1 }));
      } else {
          await handleSmartLearn(currentWord.id, type);
          if (type === "know") setStats((p) => ({ ...p, learned: p.learned + 1 }));
          else if (type === "dont_know") setStats((p) => ({ ...p, review: p.review + 1 })); 
          else if (type === "master") setStats((p) => ({ ...p, mastered: p.mastered + 1, learned: p.learned + 1 }));
      }

      if (currentIndex + 1 < sessionWords.length) {
        setCurrentIndex((p) => p + 1);
        setSwipeDirection(null);
      } else {
        setGameStage("summary");
        setSwipeDirection(null);
        if (activeMode !== 'review') {
            const totalPoints = sessionWords.length * POINTS_PER_CARD; 
            if (totalPoints > 0) addScore(totalPoints);
        }
      }
    }, 300);
  };

  // --- MODAL İŞLEMLERİ ---
  const handleMasterClick = (e) => { handleBlur(e); setShowMasterConfirm(true); };
  const confirmMastery = (e) => { handleBlur(e); setShowMasterConfirm(false); handleAnswerAction("up", "master", e); };
  
  const confirmReset = (e) => {
      handleBlur(e);
      setShowResetConfirm(false);
      setSwipeDirection("left");
      const currentWord = sessionWords[currentIndex];
      setTimeout(async () => {
          await handleSmartLearn(currentWord.id, "dont_know");
          setStats((p) => ({ ...p, review: p.review + 1 }));
          if (currentIndex + 1 < sessionWords.length) {
              setCurrentIndex((p) => p + 1);
              setSwipeDirection(null);
          } else {
              setGameStage("summary");
              setSwipeDirection(null);
              if (sessionWords.length * POINTS_PER_CARD > 0) addScore(sessionWords.length * POINTS_PER_CARD);
          }
      }, 300);
  };

  const closeModal = (e) => { handleBlur(e); setShowMasterConfirm(false); setShowResetConfirm(false); };
  
  const handleQuitEarly = (e) => {
    handleBlur(e);
    if(activeMode !== 'review') {
        const pointsEarned = currentIndex * POINTS_PER_CARD;
        if (pointsEarned > 0) addScore(pointsEarned);
    }
    setGameStage("summary");
  };

  // ===========================
  // === SEÇİM EKRANI ===
  // ===========================
  if (gameStage === "selection") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
        
        {/* --- GLOBAL CSS: HOVER SADECE MOUSE İLE ÇALIŞIR --- */}
        <style>{`
            * { -webkit-tap-highlight-color: transparent !important; }
            
            /* Ortak Buton Geçişleri */
            .game-btn { transition: transform 0.1s ease, background-color 0.2s ease, border-color 0.2s ease; }

            /* Masaüstü Hover Efektleri (Telefonda ÇALIŞMAZ) */
            @media (hover: hover) {
                .btn-select:hover { border-color: #fb923c !important; background-color: #fff7ed !important; }
                .btn-learn:hover { border-color: #818cf8 !important; background-color: #eef2ff !important; }
                .btn-wait:hover { border-color: #cbd5e1 !important; background-color: #f8fafc !important; }
                .icon-btn:hover { background-color: #f1f5f9 !important; }
            }
        `}</style>

        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="icon-btn p-2 bg-white rounded-full shadow-sm active:bg-slate-100 transition-colors"><Home className="w-5 h-5 text-slate-600" /></button>
            <h2 className="text-xl font-bold text-slate-800">Flash Kartlar</h2>
            <div className="w-9"></div>
          </div>
          <div className="text-center py-6">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Nasıl Çalışalım?</h1>
            <p className="text-slate-500">Bugünkü hedefini seç ve kelimeleri çevirmeye başla.</p>
          </div>
          
          <div className="space-y-4">
            
            {/* 1. TEKRAR MODU */}
            <button 
              onClick={(e) => startSession("review", e)}
              disabled={pools.reviewPool.length === 0}
              className="game-btn btn-select w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RotateCcw className="w-8 h-8" /></div>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-800">Tekrar Modu</div>
                    <div className="text-sm text-slate-500">Öğrendiklerini (Mezunları) pekiştir</div>
                  </div>
                </div>
                <div className="text-2xl font-black text-orange-600">{pools.reviewPool.length}</div>
              </div>
            </button>

            {/* 2. ÖĞRENME MODU */}
            <button 
              onClick={(e) => startSession("learn", e)}
              disabled={pools.learnPool.length === 0}
              className="game-btn btn-learn w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><Brain className="w-8 h-8" /></div>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-800">Öğrenme Modu</div>
                    <div className="text-sm text-slate-500">Yeni ve zamanı gelen kelimeler</div>
                  </div>
                </div>
                <div className="text-2xl font-black text-indigo-600">{pools.learnPool.length}</div>
              </div>
            </button>

            {/* 3. BEKLEME LİSTESİ */}
            <button 
              onClick={(e) => startSession("waiting", e)}
              disabled={pools.waitingPool.length === 0}
              className="game-btn btn-wait w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-700">Bekleme Listesi</div>
                    <div className="text-sm text-slate-400">Henüz zamanı gelmeyenler</div>
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-500">{pools.waitingPool.length}</div>
              </div>
            </button>

          </div>
        </div>
      </div>
    );
  }

  // ===========================
  // === ÖZET EKRANI ============
  // ===========================
  if (gameStage === "summary") {
    let modeTitle = "Oturum Bitti!";
    if (activeMode === "learn") modeTitle = "Çalışma Tamamlandı";
    if (activeMode === "review") modeTitle = "Tekrar Tamamlandı";
    if (activeMode === "waiting") modeTitle = "Ekstra Çalışma Bitti";

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{modeTitle}</h2>
          <div className="flex justify-center gap-6 my-6 border-b border-slate-100 pb-6">
            <div><div className="text-3xl font-bold text-green-600">{stats.learned}</div><div className="text-xs text-slate-500 font-bold uppercase">Başarılı</div></div>
            {stats.mastered > 0 && <div><div className="text-3xl font-bold text-blue-500">{stats.mastered}</div><div className="text-xs text-slate-500 font-bold uppercase">Full Ezber</div></div>}
            <div><div className="text-3xl font-bold text-orange-500">{stats.review}</div><div className="text-xs text-slate-500 font-bold uppercase">Görülen</div></div>
          </div>
          <button onClick={() => setGameStage("selection")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3 active:scale-95 transition-transform"><Layers className="w-5 h-5" /> Başka Mod Seç</button>
          <button onClick={() => navigate("/")} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"><Home className="w-5 h-5" /> Ana Sayfa</button>
        </div>
      </div>
    );
  }

  // ===========================
  // === OYUN (KARTLAR) =========
  // ===========================
  const currentCard = sessionWords[currentIndex];
  const progress = sessionWords.length > 0 ? (currentIndex / sessionWords.length) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 overflow-hidden relative">
      
      {/* --- GLOBAL CSS FIX (KART EKRANI İÇİN) --- */}
      <style>{`
            * { -webkit-tap-highlight-color: transparent !important; }
            
            /* Sadece Mouse ile hover efekti */
            @media (hover: hover) {
                .btn-orange:hover { background-color: #fff7ed !important; border-color: #ffedd5 !important; }
                .btn-green:hover { background-color: #f0fdf4 !important; border-color: #dcfce7 !important; }
                .btn-blue:hover { background-color: #eff6ff !important; border-color: #dbeafe !important; }
                .btn-white:hover { background-color: #f8fafc !important; }
            }
            .game-btn { transition: all 0.2s ease; }
      `}</style>

      {/* --- EZBERLEDİM ONAY MODALI --- */}
      {showMasterConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCheck className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ezberledim!</h3>
            <p className="text-slate-500 mb-6">Bu kelimeyi tamamen öğrendiğin kelimeler listesine taşıyacağım. Emin misin?</p>
            <div className="flex gap-3">
              <button onClick={closeModal} style={{ WebkitTapHighlightColor: 'transparent' }} className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-50 focus:outline-none">İptal</button>
              <button onClick={confirmMastery} style={{ WebkitTapHighlightColor: 'transparent' }} className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold active:bg-blue-700 focus:outline-none">Evet, Ezberledim</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SIFIRLAMA (BİLMİYORUM) ONAY MODALI --- */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Dikkat!</h3>
            <p className="text-slate-500 mb-6">Bu kelimeyi "Bilmiyorum" olarak işaretlersen seviyesi sıfırlanacak ve "Öğreneceğim" listesine geri gönderilecek. Emin misin?</p>
            <div className="flex gap-3">
              <button onClick={closeModal} style={{ WebkitTapHighlightColor: 'transparent' }} className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-50 focus:outline-none">İptal</button>
              <button onClick={confirmReset} style={{ WebkitTapHighlightColor: 'transparent' }} className="flex-1 py-3 px-4 bg-orange-600 text-white rounded-xl font-bold active:bg-orange-700 focus:outline-none">Evet, Sıfırla</button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar + Üst Bar */}
      <div className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <button onClick={handleQuitEarly} className="text-slate-400 hover:text-slate-700"><X className="w-6 h-6" /></button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold border border-slate-200">
                 {activeMode === 'learn' ? 'Öğrenme' : activeMode === 'review' ? 'Tekrar' : 'Bekleme'} Modu
              </span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{currentIndex + 1} / {sessionWords.length}</span>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
        </div>
      </div>

      {/* KART */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {currentCard && (
          <div className={`relative w-full max-w-sm transition-all duration-300 transform 
              ${swipeDirection === "left" ? "-translate-x-24 -rotate-6 opacity-0" : ""}
              ${swipeDirection === "right" ? "translate-x-24 rotate-6 opacity-0" : ""}
              ${swipeDirection === "up" ? "-translate-y-24 scale-90 opacity-0" : ""}`}
          >
            <WordCard key={currentCard.id} wordObj={currentCard} />
          </div>
        )}
      </div>

      {/* BUTONLAR (DÜZENLENDİ) */}
      <div className="pb-10 px-6 max-w-md mx-auto w-full">
        {activeMode === 'review' ? (
            // --- TEKRAR MODU (Tek Buton) ---
            <button 
                onClick={(e) => {
                    handleBlur(e);
                    handleAnswerAction("right", "review_pass");
                }}
                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                className="game-btn btn-white w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 focus:outline-none"
            >
                <span>Sıradaki Kelime</span>
                <ArrowRight className="w-5 h-5" />
            </button>
        ) : activeMode === 'waiting' ? (
            // --- BEKLEME MODU (Sıradaki + Ezberledim) ---
            <div className="flex gap-3 justify-center">
              <button 
                onClick={(e) => {
                    handleBlur(e);
                    handleAnswerAction("right", "know", e); // Biliyorum ile aynı işlev (geçiş)
                }} 
                disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} 
                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                className="game-btn btn-white flex-1 bg-white border-2 border-slate-200 text-slate-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none"
              >
                <ArrowRight className="w-6 h-6" /><span className="text-sm">Sıradaki Kelime</span>
              </button>
              
              <button 
                onClick={(e) => handleMasterClick(e)} 
                disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} 
                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                className="game-btn btn-blue flex-1 bg-white border-2 border-blue-100 text-blue-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none"
              >
                <CheckCheck className="w-6 h-6" /><span className="text-sm">Ezberledim</span>
              </button>
            </div>
        ) : (
            // --- ÖĞRENME MODU (Bilmiyorum + Biliyorum + Ezberledim) ---
            <div className="flex gap-3 justify-center">
              <button 
                onClick={(e) => {
                    handleBlur(e);
                    handleAnswerAction("left", "dont_know", e);
                }} 
                disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} 
                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                className="game-btn btn-orange flex-1 bg-white border-2 border-orange-100 text-orange-500 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none"
              >
                <X className="w-6 h-6" /><span className="text-sm">Bilmiyorum</span>
              </button>
              
              <button 
                onClick={(e) => {
                    handleBlur(e);
                    handleAnswerAction("right", "know", e);
                }} 
                disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} 
                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                className="game-btn btn-green flex-1 bg-white border-2 border-green-100 text-green-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none"
              >
                <Check className="w-6 h-6" /><span className="text-sm">Biliyorum</span>
              </button>
              
              <button 
                onClick={(e) => handleMasterClick(e)} 
                disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} 
                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                className="game-btn btn-blue flex-1 bg-white border-2 border-blue-100 text-blue-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none"
              >
                <CheckCheck className="w-6 h-6" /><span className="text-sm">Ezberledim</span>
              </button>
            </div>
        )}

        <button onClick={handleQuitEarly} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto focus:outline-none focus:ring-0">
          <Target className="w-4 h-4" /> Bitir
        </button>
      </div>
    </div>
  );
}
