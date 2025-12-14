import React, { useState } from "react";
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
  Layers
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
  const [activeMode, setActiveMode] = useState(null); // 'learn', 'review', 'waiting'

  // Ezberledim onayı için state
  const [showMasterConfirm, setShowMasterConfirm] = useState(false);

  const POINTS_PER_CARD = 5;

  // --------------------------
  // --- KELİME HAVUZLARI (DÜZELTİLDİ - SRS MANTIĞI) ---
  // --------------------------
  const getWordPools = () => {
    const all = getAllWords();
    const now = new Date();

    // Kuyruktaki kelimelerin ID'lerini al (Performans için)
    // learningQueue undefined gelirse boş dizi ata
    const queueIds = learningQueue ? learningQueue.map(q => q.wordId) : [];

    // 1. ÖĞRENME MODU (Kalanlar): 
    // Kural: Bilinenlerde YOK --VE-- Kuyrukta (Süreçte) YOK
    const learnPool = all.filter(w => 
        !knownWordIds.includes(w.id) && 
        !queueIds.includes(w.id)
    );

    // 2. TEKRAR MODU (Sırası Gelenler + MEZUNLAR):
    // Kural: (Kuyrukta VAR ve Zamanı Gelmiş) --VEYA-- (Zaten Öğrenilmiş/Mezun)
    const reviewPool = all.filter(w => {
        const qItem = learningQueue ? learningQueue.find(item => item.wordId === w.id) : null;
        
        // A) Kuyrukta ve zamanı gelmiş (SRS Tekrarı)
        const isDue = qItem && new Date(qItem.nextReview) <= now;
        
        // B) Zaten tamamen öğrenilmiş (Mezun Tekrarı)
        const isKnown = knownWordIds.includes(w.id);

        return isDue || isKnown;
    });

    // 3. BEKLEME LİSTESİ (Gelecekteki Tekrarlar):
    // Kural: Kuyrukta VAR --VE-- Zamanı GELECEKTE
    const waitingPool = all.filter(w => {
        const qItem = learningQueue ? learningQueue.find(item => item.wordId === w.id) : null;
        return qItem && new Date(qItem.nextReview) > now;
    });

    return { learnPool, reviewPool, waitingPool };
  };

  const { learnPool, reviewPool, waitingPool } = getWordPools();

  // --------------------------
  // --- OTURUMU BAŞLAT ---
  // --------------------------
  const startSession = (mode) => {
    setActiveMode(mode);
    let selectedPool = [];

    if (mode === "learn") selectedPool = learnPool;
    else if (mode === "review") selectedPool = reviewPool;
    else if (mode === "waiting") selectedPool = waitingPool;

    if (selectedPool.length === 0) {
      alert("Bu modda şu an çalışılacak kelime yok!");
      return;
    }

    // Karıştır ve ilk 20'yi al
    const shuffled = [...selectedPool].sort(() => 0.5 - Math.random());
    setSessionWords(shuffled.slice(0, 20));
    setCurrentIndex(0);
    setStats({ learned: 0, review: 0, mastered: 0 });
    setGameStage("playing");
  };

  // --------------------------
  // --- CEVAPLAMA FONKSİYONU ---
  // --------------------------
  const handleAnswerAction = async (dir, type) => {
    if (currentIndex >= sessionWords.length) return;

    setSwipeDirection(dir);
    const currentWord = sessionWords[currentIndex];

    setTimeout(async () => {
      // Backend işlemi
      await handleSmartLearn(currentWord.id, type);

      // İstatistik
      if (type === "know") {
        setStats((p) => ({ ...p, learned: p.learned + 1 }));
      } else if (type === "dont_know") {
        setStats((p) => ({ ...p, review: p.review + 1 }));
      } else if (type === "master") {
        setStats((p) => ({ ...p, mastered: p.mastered + 1, learned: p.learned + 1 }));
      }

      // Sonraki Soru
      if (currentIndex + 1 < sessionWords.length) {
        setCurrentIndex((p) => p + 1);
        setSwipeDirection(null);
      } else {
        setGameStage("summary");
        setSwipeDirection(null);
        const totalPoints = sessionWords.length * POINTS_PER_CARD; 
        if (totalPoints > 0) addScore(totalPoints);
      }
    }, 300);
  };

  // ----------------------------
  // --- EZBERLEDİM ONAYI ---
  // ----------------------------
  const handleMasterClick = () => setShowMasterConfirm(true);
  const confirmMastery = () => {
    setShowMasterConfirm(false);
    handleAnswerAction("up", "master");
  };
  const cancelMastery = () => setShowMasterConfirm(false);

  // ----------------------------
  // --- ERKEN BİTİR ---
  // ----------------------------
  const handleQuitEarly = () => {
    const pointsEarned = currentIndex * POINTS_PER_CARD;
    if (pointsEarned > 0) addScore(pointsEarned);
    setGameStage("summary");
  };

  // ===========================
  // === SEÇİM EKRANI (YENİ) ===
  // ===========================
  if (gameStage === "selection") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
        <div className="w-full max-w-md space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
              <Home className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">Flash Kartlar</h2>
            <div className="w-9"></div>
          </div>

          <div className="text-center py-6">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Nasıl Çalışalım?</h1>
            <p className="text-slate-500">Bugünkü hedefini seç ve kelimeleri çevirmeye başla.</p>
          </div>

          {/* --- 3 MOD BUTONU --- */}
          <div className="space-y-4">
            
            {/* 1. TEKRAR MODU (Öğrendiklerim -> Değişti: Artık Sırası Gelenler + Mezunlar) */}
            <button 
              onClick={() => startSession("review")}
              disabled={reviewPool.length === 0}
              className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all group active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-xl text-orange-600 group-hover:bg-orange-200 transition-colors">
                    <RotateCcw className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-800">Tekrar Modu</div>
                    <div className="text-sm text-slate-500">Unutmadan tekrar et</div>
                  </div>
                </div>
                <div className="text-2xl font-black text-orange-600">{reviewPool.length}</div>
              </div>
            </button>

            {/* 2. ÖĞRENME MODU (Öğreneceklerim) */}
            <button 
              onClick={() => startSession("learn")}
              disabled={learnPool.length === 0}
              className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                    <Brain className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-800">Öğrenme Modu</div>
                    <div className="text-sm text-slate-500">Yeni kelimeler keşfet</div>
                  </div>
                </div>
                <div className="text-2xl font-black text-indigo-600">{learnPool.length}</div>
              </div>
            </button>

            {/* 3. BEKLEME LİSTESİ */}
            <button 
              onClick={() => startSession("waiting")}
              disabled={waitingPool.length === 0}
              className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-500 group-hover:bg-slate-200 transition-colors">
                    <Hourglass className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-700">Bekleme Listesi</div>
                    <div className="text-sm text-slate-400">Gelecekte sorulacaklar</div>
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-500">{waitingPool.length}</div>
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
    if (activeMode === "learn") modeTitle = "Yeni Kelimeler Çalışıldı";
    if (activeMode === "review") modeTitle = "Tekrar Tamamlandı";
    if (activeMode === "waiting") modeTitle = "Ekstra Çalışma Bitti";

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{modeTitle}</h2>

          <div className="flex justify-center gap-6 my-6 border-b border-slate-100 pb-6">
            <div>
              <div className="text-3xl font-bold text-green-600">{stats.learned}</div>
              <div className="text-xs text-slate-500 font-bold uppercase">Başarılı</div>
            </div>
            {stats.mastered > 0 && (
               <div>
               <div className="text-3xl font-bold text-blue-500">{stats.mastered}</div>
               <div className="text-xs text-slate-500 font-bold uppercase">Full Ezber</div>
             </div>
            )}
            <div>
              <div className="text-3xl font-bold text-orange-500">{stats.review}</div>
              <div className="text-xs text-slate-500 font-bold uppercase">Tekrar</div>
            </div>
          </div>

          <button onClick={() => setGameStage("selection")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3">
            <Layers className="w-5 h-5" /> Başka Mod Seç
          </button>
          <button onClick={() => navigate("/")} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2">
            <Home className="w-5 h-5" /> Ana Sayfa
          </button>
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
      
      {/* EZBERLEDİM ONAY MODALI */}
      {showMasterConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ezberledim!</h3>
            <p className="text-slate-500 mb-6">
              Bu kelimeyi tamamen öğrendiğin kelimeler listesine taşıyacağım ve bir daha karşına çıkarmayacağım. Emin misin?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={cancelMastery}
                className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                İptal
              </button>
              <button 
                onClick={confirmMastery}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
              >
                Evet, Ezberledim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar + Üst Bar */}
      <div className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <button onClick={handleQuitEarly} className="text-slate-400 hover:text-slate-700">
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold border border-slate-200">
                 {activeMode === 'learn' ? 'Öğrenme' : activeMode === 'review' ? 'Tekrar' : 'Bekleme'} Modu
              </span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {currentIndex + 1} / {sessionWords.length}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      {/* KART */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {currentCard && (
          <div
            className={`relative w-full max-w-sm transition-all duration-300 transform 
              ${swipeDirection === "left" ? "-translate-x-24 -rotate-6 opacity-0" : ""}
              ${swipeDirection === "right" ? "translate-x-24 rotate-6 opacity-0" : ""}
              ${swipeDirection === "up" ? "-translate-y-24 scale-90 opacity-0" : ""}`}
          >
            <WordCard key={currentCard.id} wordObj={currentCard} />
          </div>
        )}
      </div>

      {/* BUTONLAR */}
      <div className="pb-10 px-6 max-w-md mx-auto w-full">
        <div className="flex gap-3 justify-center">
          
          {/* 1. BİLMİYORUM */}
          <button
            onClick={() => handleAnswerAction("left", "dont_know")}
            disabled={!!swipeDirection || showMasterConfirm}
            className="flex-1 bg-white border-2 border-orange-100 hover:bg-orange-50 text-orange-500 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-transform"
          >
            <X className="w-6 h-6" />
            <span className="text-sm">Bilmiyorum</span>
          </button>

          {/* 2. BİLİYORUM */}
          <button
            onClick={() => handleAnswerAction("right", "know")}
            disabled={!!swipeDirection || showMasterConfirm}
            className="flex-1 bg-white border-2 border-green-100 hover:bg-green-50 text-green-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-transform"
          >
            <Check className="w-6 h-6" />
            <span className="text-sm">Biliyorum</span>
          </button>
          
          {/* 3. EZBERLEDİM */}
          <button
            onClick={handleMasterClick}
            disabled={!!swipeDirection || showMasterConfirm}
            className="flex-1 bg-white border-2 border-blue-100 hover:bg-blue-50 text-blue-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-transform"
          >
            <CheckCheck className="w-6 h-6" />
            <span className="text-sm">Ezberledim</span>
          </button>

        </div>

        <button onClick={handleQuitEarly} className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto">
          <Target className="w-4 h-4" /> Bitir
        </button>
      </div>
    </div>
  );
}
