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
  const [gameStage, setGameStage] = useState("selection"); // selection, playing, summary
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [stats, setStats] = useState({ learned: 0, review: 0, mastered: 0 });
  const [activeMode, setActiveMode] = useState(null); // 'learn', 'review', 'waiting'

  // Modallar için State'ler
  const [showMasterConfirm, setShowMasterConfirm] = useState(false); // Ezberledim onayı
  const [showResetConfirm, setShowResetConfirm] = useState(false);   // Sıfırlama (Bilmiyorum) onayı

  const POINTS_PER_CARD = 5;

  // --------------------------
  // --- KELİME HAVUZLARI ---
  // --------------------------
  const pools = useMemo(() => {
    const all = getAllWords();
    const now = new Date();

    const getQueueItem = (id) => learningQueue ? learningQueue.find(q => q.wordId === id) : null;

    // 1. BEKLEME LİSTESİ (Waiting Pool)
    const waitingPool = all.filter(w => {
        const q = getQueueItem(w.id);
        return q && new Date(q.nextReview) > now;
    });

    // 2. TEKRAR MODU (Review Pool - Sadece Mezunlar)
    const reviewPool = all.filter(w => knownWordIds.includes(w.id));

    // 3. ÖĞRENME MODU (Learn Pool - Yeni + Süresi Gelenler)
    const learnPool = all.filter(w => {
        if (knownWordIds.includes(w.id)) return false;
        const q = getQueueItem(w.id);
        if (!q) return true; // Level 0
        if (new Date(q.nextReview) <= now) return true; // Süresi dolmuş
        return false;
    });

    return { learnPool, reviewPool, waitingPool };
  }, [getAllWords, knownWordIds, learningQueue]);

  // --------------------------
  // --- OTURUMU BAŞLAT ---
  // --------------------------
  const startSession = (mode) => {
    setActiveMode(mode);
    let selectedPool = [];

    if (mode === "learn") selectedPool = pools.learnPool;
    else if (mode === "review") selectedPool = pools.reviewPool;
    else if (mode === "waiting") selectedPool = pools.waitingPool;

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

    // --- BEKLEME MODU İÇİN GÜVENLİK KONTROLÜ ---
    if (activeMode === 'waiting' && type === 'dont_know') {
        setShowResetConfirm(true); // Onay penceresini aç ve dur
        return;
    }

    setSwipeDirection(dir);
    const currentWord = sessionWords[currentIndex];

    setTimeout(async () => {
      // --- TEKRAR MODU İÇİN ÖZEL DURUM (PASİF GEÇİŞ) ---
      if (activeMode === 'review') {
          // Hiçbir veritabanı işlemi yapma, sadece istatistiği güncelle
          setStats((p) => ({ ...p, review: p.review + 1 }));
      } else {
          // --- DİĞER MODLARDA SRS ÇALIŞTIR ---
          await handleSmartLearn(currentWord.id, type);

          if (type === "know") {
            setStats((p) => ({ ...p, learned: p.learned + 1 }));
          } else if (type === "dont_know") {
            setStats((p) => ({ ...p, review: p.review + 1 })); // Aslında resetlendi
          } else if (type === "master") {
            setStats((p) => ({ ...p, mastered: p.mastered + 1, learned: p.learned + 1 }));
          }
      }

      // Sonraki Soru
      if (currentIndex + 1 < sessionWords.length) {
        setCurrentIndex((p) => p + 1);
        setSwipeDirection(null);
      } else {
        setGameStage("summary");
        setSwipeDirection(null);
        // Sadece öğrenme modunda puan ver (Tekrar modu pasif olduğu için puan yok veya az olabilir, burada veriyoruz)
        if (activeMode !== 'review') {
            const totalPoints = sessionWords.length * POINTS_PER_CARD; 
            if (totalPoints > 0) addScore(totalPoints);
        }
      }
    }, 300);
  };

  // ----------------------------
  // --- MODAL İŞLEMLERİ ---
  // ----------------------------
  
  // 1. Ezberledim Onayı
  const handleMasterClick = () => setShowMasterConfirm(true);
  const confirmMastery = () => {
    setShowMasterConfirm(false);
    handleAnswerAction("up", "master");
  };

  // 2. Sıfırlama (Bilmiyorum) Onayı
  const confirmReset = () => {
      setShowResetConfirm(false);
      // Onaylandıktan sonra normal dont_know akışını manuel çağırıyoruz
      // Ancak recursive olmaması için activeMode kontrolünü bypass edecek şekilde değil,
      // doğrudan logic'i buraya kopyalayarak değil, handleAnswerAction'a 'force' parametresi eklemek yerine
      // basitçe o anki kelimeyi işle:
      
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
              // Puan ekleme mantığı
              if (sessionWords.length * POINTS_PER_CARD > 0) addScore(sessionWords.length * POINTS_PER_CARD);
          }
      }, 300);
  };

  const closeModal = () => {
      setShowMasterConfirm(false);
      setShowResetConfirm(false);
  };

  const handleQuitEarly = () => {
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
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100"><Home className="w-5 h-5 text-slate-600" /></button>
            <h2 className="text-xl font-bold text-slate-800">Flash Kartlar</h2>
            <div className="w-9"></div>
          </div>
          <div className="text-center py-6">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Nasıl Çalışalım?</h1>
            <p className="text-slate-500">Bugünkü hedefini seç ve kelimeleri çevirmeye başla.</p>
          </div>
          <div className="space-y-4">
            
            <button onClick={() => startSession("learn")} disabled={pools.learnPool.length === 0} className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group active:scale-95 disabled:opacity-60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><Brain className="w-8 h-8" /></div>
                  <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni ve zamanı gelenler</div></div>
                </div>
                <div className="text-2xl font-black text-indigo-600">{pools.learnPool.length}</div>
              </div>
            </button>

            <button onClick={() => startSession("waiting")} disabled={pools.waitingPool.length === 0} className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group active:scale-95 disabled:opacity-60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div>
                  <div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Henüz zamanı gelmeyenler</div></div>
                </div>
                <div className="text-2xl font-black text-slate-500">{pools.waitingPool.length}</div>
              </div>
            </button>

            <button onClick={() => startSession("review")} disabled={pools.reviewPool.length === 0} className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all group active:scale-95 disabled:opacity-60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RotateCcw className="w-8 h-8" /></div>
                  <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Öğrendiklerini pekiştir</div></div>
                </div>
                <div className="text-2xl font-black text-orange-600">{pools.reviewPool.length}</div>
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
          <button onClick={() => setGameStage("selection")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3"><Layers className="w-5 h-5" /> Başka Mod Seç</button>
          <button onClick={() => navigate("/")} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><Home className="w-5 h-5" /> Ana Sayfa</button>
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
      
      {/* --- EZBERLEDİM ONAY MODALI --- */}
      {showMasterConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCheck className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ezberledim!</h3>
            <p className="text-slate-500 mb-6">Bu kelimeyi tamamen öğrendiğin kelimeler listesine taşıyacağım. Emin misin?</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={confirmMastery} className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Evet, Ezberledim</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SIFIRLAMA (BİLMİYORUM) ONAY MODALI (YENİ) --- */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Dikkat!</h3>
            <p className="text-slate-500 mb-6">Bu kelimeyi "Bilmiyorum" olarak işaretlersen seviyesi sıfırlanacak ve "Öğreneceğim" listesine geri gönderilecek. Emin misin?</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">İptal</button>
              <button onClick={confirmReset} className="flex-1 py-3 px-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700">Evet, Sıfırla</button>
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

      {/* BUTONLAR */}
      <div className="pb-10 px-6 max-w-md mx-auto w-full">
        {activeMode === 'review' ? (
            // --- TEKRAR MODU İÇİN TEK BUTON ---
            <button 
                onClick={() => handleAnswerAction("right", "review_pass")}
                className="w-full bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
                <span>Sıradaki Kelime</span>
                <ArrowRight className="w-5 h-5" />
            </button>
        ) : (
            // --- DİĞER MODLAR İÇİN 3 BUTON ---
            <div className="flex gap-3 justify-center">
              <button onClick={() => handleAnswerAction("left", "dont_know")} disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} className="flex-1 bg-white border-2 border-orange-100 hover:bg-orange-50 text-orange-500 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <X className="w-6 h-6" /><span className="text-sm">Bilmiyorum</span>
              </button>
              <button onClick={() => handleAnswerAction("right", "know")} disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} className="flex-1 bg-white border-2 border-green-100 hover:bg-green-50 text-green-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <Check className="w-6 h-6" /><span className="text-sm">Biliyorum</span>
              </button>
              <button onClick={handleMasterClick} disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} className="flex-1 bg-white border-2 border-blue-100 hover:bg-blue-50 text-blue-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <CheckCheck className="w-6 h-6" /><span className="text-sm">Ezberledim</span>
              </button>
            </div>
        )}

        <button onClick={handleQuitEarly} className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto">
          <Target className="w-4 h-4" /> Bitir
        </button>
      </div>
    </div>
  );
}
