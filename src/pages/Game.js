import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import WordCard from "../components/WordCard";
import { useNavigate } from "react-router-dom";
import { X, RotateCcw, Home, Target, Check, Trophy, BookOpen, Tag, Clock } from "lucide-react";

export default function Game() {
  const { getAllWords, knownWordIds, learningProgress, handleSRSSwipe } = useData();
  const navigate = useNavigate();
  
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [stats, setStats] = useState({ known: 0, learning: 0 });
  
  const [isGameStarted, setIsGameStarted] = useState(false);
  
  // --- 1. GÖSTERİLECEK KELİMELERİ SEÇ (SRS MANTIĞI) ---
  const dueWords = useMemo(() => {
      const all = getAllWords();
      const now = new Date();

      return all.filter(w => {
          // 1. Zaten tamamen öğrenildiyse gösterme
          if (knownWordIds.includes(w.id)) return false;

          // 2. İlerleme durumuna bak
          const progress = learningProgress[w.id];
          
          if (!progress) return true; // Hiç başlanmamışsa göster (Level 0)

          // 3. Tarih kontrolü (Review zamanı geldi mi?)
          const reviewDate = new Date(progress.nextReview);
          return reviewDate <= now; // Zamanı gelmiş veya geçmişse göster
      });
  }, [getAllWords, knownWordIds, learningProgress]);

  const categories = useMemo(() => {
      const cats = dueWords.map(w => w.category).filter(Boolean);
      return ["Tümü", ...new Set(cats)].sort();
  }, [dueWords]);

  const startGameWithCategory = (category) => {
    let pool = category === "Tümü" ? dueWords : dueWords.filter(w => w.category === category);

    if (pool.length === 0) {
      alert("Bu kategoride şu an çalışılacak kelime yok! (Belki yarına kadar beklemen gerekiyordur)");
      return;
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setSessionWords(shuffled.slice(0, 20));
    setCurrentIndex(0);
    setStats({ known: 0, learning: 0 });
    setIsGameStarted(true);
    setSessionComplete(false);
  };

  // --- KAYDIRMA İŞLEMİ (SRS GÜNCELLEME) ---
  const handleSwipe = async (dir) => {
    if (currentIndex >= sessionWords.length) return;
    const currentWord = sessionWords[currentIndex];
    setSwipeDirection(dir);
    
    setTimeout(async () => {
      if (dir === "right") {
        // Sağa kaydırma (Biliyorum) -> SRS'i tetikle
        const result = await handleSRSSwipe(currentWord.id, true);
        if (result.graduated) {
            setStats(p => ({ ...p, known: p.known + 1 })); // Mezun oldu
        } else {
            // Hâlâ öğreniyor ama yarına atıldı
            setStats(p => ({ ...p, learning: p.learning + 1 })); 
        }
      } else {
        // Sola kaydırma (Bilmiyorum) -> Level 0'a düşür
        await handleSRSSwipe(currentWord.id, false);
        setStats(p => ({ ...p, learning: p.learning + 1 }));
      }

      if (currentIndex + 1 < sessionWords.length) {
        setCurrentIndex(p => p + 1);
        setSwipeDirection(null);
      } else {
        setSessionComplete(true);
        setSwipeDirection(null);
      }
    }, 300);
  };

  // --- EKRAN 1: KATEGORİ SEÇİM ---
  if (!isGameStarted) {
      return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm"><X className="w-6 h-6 text-slate-600"/></button>
                    <h2 className="text-2xl font-bold text-slate-800">Çalışma Zamanı</h2>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center mb-6">
                    <Clock className="w-12 h-12 text-indigo-500 mx-auto mb-3"/>
                    <p className="text-slate-600">Şu an çalışman gereken <span className="font-bold text-indigo-600">{dueWords.length}</span> kelime var.</p>
                    <p className="text-xs text-slate-400 mt-1">*Süreli tekrarlar dahil.</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {categories.map(cat => {
                        const count = cat === "Tümü" ? dueWords.length : dueWords.filter(w => w.category === cat).length;
                        return (
                            <button 
                                key={cat} 
                                onClick={() => startGameWithCategory(cat)}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><Tag className="w-5 h-5"/></div>
                                    <span className="font-bold text-slate-700 group-hover:text-indigo-700">{cat}</span>
                                </div>
                                <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{count}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
      )
  }

  // --- EKRAN 3: SONUÇ ---
  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
           <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4"/>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">Oturum Bitti</h2>
           <div className="flex justify-center gap-8 my-6">
             <div><div className="text-3xl font-bold text-green-600">{stats.known}</div><div className="text-xs text-slate-500">Tamamen<br/>Öğrenilen</div></div>
             <div><div className="text-3xl font-bold text-orange-500">{stats.learning}</div><div className="text-xs text-slate-500">Tekrar<br/>Edilecek</div></div>
           </div>
           <p className="text-sm text-slate-500 mb-4">"Biliyorum" dediklerin 1 veya 3 gün sonra tekrar karşına çıkacak.</p>
           <button onClick={() => setIsGameStarted(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3"><RotateCcw className="w-5 h-5"/> Devam Et</button>
           <button onClick={() => navigate("/")} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><Home className="w-5 h-5"/> Ana Sayfa</button>
        </div>
      </div>
    );
  }

  // --- EKRAN 2: OYUN ---
  const currentCard = sessionWords[currentIndex];
  const progress = sessionWords.length > 0 ? (currentIndex / sessionWords.length) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 overflow-hidden">
      <div className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setIsGameStarted(false)} className="text-slate-400 hover:text-slate-700"><X className="w-6 h-6"/></button>
            <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{currentIndex + 1} / {sessionWords.length}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {currentCard && (
          <div className={`relative w-full max-w-sm transition-all duration-300 transform ${swipeDirection === "left" ? "-translate-x-24 -rotate-6 opacity-0" : ""} ${swipeDirection === "right" ? "translate-x-24 rotate-6 opacity-0" : ""}`}>
             <WordCard wordObj={currentCard} />
          </div>
        )}
      </div>
      <div className="pb-10 px-6 max-w-md mx-auto w-full">
        <div className="flex gap-4 justify-center">
          <button onClick={() => handleSwipe("left")} disabled={!!swipeDirection} className="flex-1 bg-white border-2 border-orange-100 hover:bg-orange-50 text-orange-500 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1"><X className="w-6 h-6"/><span>Öğreniyorum</span></button>
          <button onClick={() => handleSwipe("right")} disabled={!!swipeDirection} className="flex-1 bg-white border-2 border-green-100 hover:bg-green-50 text-green-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1"><Check className="w-6 h-6"/><span>Biliyorum</span></button>
        </div>
        <button onClick={() => setSessionComplete(true)} className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto"><Target className="w-4 h-4"/> Bitir</button>
      </div>
    </div>
  );
}
