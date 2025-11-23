import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import WordCard from "../components/WordCard";
import { useNavigate } from "react-router-dom";
import { X, RotateCcw, Home, Target, Check, Trophy, BookOpen, Tag, Play } from "lucide-react";

export default function Game() {
  const { getAllWords, knownWordIds, addToKnown } = useData();
  const navigate = useNavigate();
  
  // STATE'LER
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [stats, setStats] = useState({ known: 0, learning: 0 });
  
  // KATEGORİ SEÇİM STATE'LERİ
  const [isGameStarted, setIsGameStarted] = useState(false);
  
  // 1. Tüm "Bilinmeyen" Kelimeleri Çek
  const allUnknownWords = useMemo(() => {
      return getAllWords().filter(w => !knownWordIds.includes(w.id));
  }, [getAllWords, knownWordIds]);

  // 2. Mevcut Kategorileri Listele
  const categories = useMemo(() => {
      const cats = allUnknownWords.map(w => w.category).filter(Boolean);
      return ["Tümü", ...new Set(cats)].sort();
  }, [allUnknownWords]);

  // KATEGORİ SEÇİP OYUNU BAŞLATMA
  const startGameWithCategory = (category) => {
    let pool = [];
    if (category === "Tümü") {
        pool = allUnknownWords;
    } else {
        pool = allUnknownWords.filter(w => w.category === category);
    }

    if (pool.length === 0) {
      alert("Bu kategoride öğrenilecek kelime kalmadı!");
      return;
    }

    // Karıştır ve ilk 20 tanesini al
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setSessionWords(shuffled.slice(0, 20));
    setCurrentIndex(0);
    setStats({ known: 0, learning: 0 });
    setIsGameStarted(true);
    setSessionComplete(false);
  };

  // Kart Kaydırma Mantığı
  const handleSwipe = async (dir) => {
    if (currentIndex >= sessionWords.length) return;
    setSwipeDirection(dir);
    
    setTimeout(async () => {
      if (dir === "right") {
        await addToKnown(sessionWords[currentIndex].id);
        setStats(p => ({ ...p, known: p.known + 1 }));
      } else {
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

  // --- EKRAN 1: KATEGORİ SEÇİM EKRANI ---
  if (!isGameStarted) {
      return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm"><X className="w-6 h-6 text-slate-600"/></button>
                    <h2 className="text-2xl font-bold text-slate-800">Çalışma Konusu Seç</h2>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center mb-6">
                    <BookOpen className="w-12 h-12 text-indigo-500 mx-auto mb-3"/>
                    <p className="text-slate-600">Öğrenilecek toplam <span className="font-bold text-indigo-600">{allUnknownWords.length}</span> kelime var.</p>
                    <p className="text-sm text-slate-400 mt-1">Hangi kategoriden başlamak istersin?</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {categories.map(cat => {
                        // O kategoride kaç kelime var hesapla
                        const count = cat === "Tümü" ? allUnknownWords.length : allUnknownWords.filter(w => w.category === cat).length;
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
                                <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{count} kelime</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
      )
  }

  // --- EKRAN 3: OTURUM SONUCU ---
  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
           <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4"/>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">Oturum Tamamlandı</h2>
           <div className="flex justify-center gap-8 my-6">
             <div><div className="text-3xl font-bold text-green-600">{stats.known}</div><div className="text-sm text-slate-500">Öğrendim</div></div>
             <div><div className="text-3xl font-bold text-orange-500">{stats.learning}</div><div className="text-sm text-slate-500">Çalışmalıyım</div></div>
           </div>
           <button onClick={() => setIsGameStarted(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3"><RotateCcw className="w-5 h-5"/> Başka Kategori Seç</button>
           <button onClick={() => navigate("/")} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><Home className="w-5 h-5"/> Ana Sayfa</button>
        </div>
      </div>
    );
  }

  // --- EKRAN 2: OYUN EKRANI ---
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
