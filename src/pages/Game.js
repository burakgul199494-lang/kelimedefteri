import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import WordCard from "../components/WordCard";
import { useNavigate } from "react-router-dom";
import { X, RotateCcw, Home, Target, Check, Trophy, BookOpen, Clock } from "lucide-react";

export default function Game() {
  const { getAllWords, knownWordIds, handleSmartLearn, learningQueue } = useData();
  const navigate = useNavigate();
  
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  
  // İstatistikler: Sadece bu oturumda yapılanlar
  const [stats, setStats] = useState({ learned: 0, review: 0 });

  useEffect(() => {
    startSession();
  }, []);

  const startSession = () => {
    const all = getAllWords();
    const now = new Date();

    // OYNANABİLİR KELİMELERİ SEÇME MANTIĞI:
    const playableWords = all.filter(w => {
        // 1. Zaten "tamamen öğrenilmiş" (known_ids içinde) ise gösterme
        if (knownWordIds.includes(w.id)) return false;

        // 2. Öğrenme kuyruğunda var mı bak
        const progress = learningQueue.find(q => q.wordId === w.id);

        if (!progress) {
            // Kuyrukta yoksa "Sıfırıncı Seviye"dir, oynanabilir.
            return true;
        }

        // 3. Kuyrukta varsa, zamanı gelmiş mi?
        const reviewDate = new Date(progress.nextReview);
        return reviewDate <= now;
    });
    
    if (playableWords.length === 0) {
      setSessionComplete(true);
      setSessionWords([]); 
    } else {
      // Rastgele karıştır ve ilk 20 tanesini al
      const shuffled = [...playableWords].sort(() => 0.5 - Math.random());
      setSessionWords(shuffled.slice(0, 20));
      setCurrentIndex(0);
      setSessionComplete(false);
      setStats({ learned: 0, review: 0 });
    }
  };

  const handleSwipe = async (dir) => {
    if (currentIndex >= sessionWords.length) return;
    setSwipeDirection(dir);
    
    const currentWord = sessionWords[currentIndex];

    // YENİ: Akıllı Öğrenme Fonksiyonunu Çağır
    setTimeout(async () => {
      if (dir === "right") {
        // "Biliyorum" -> Seviye Atlat (2 gün / 3 gün ertele)
        await handleSmartLearn(currentWord.id, "know");
        setStats(p => ({ ...p, learned: p.learned + 1 }));
      } else {
        // "Bilmiyorum" -> Seviye Sıfırla (Hemen tekrar sor)
        await handleSmartLearn(currentWord.id, "dont_know");
        setStats(p => ({ ...p, review: p.review + 1 }));
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

  if (sessionComplete) {
    const all = getAllWords();
    // Tamamen bilinenler
    const totalKnown = knownWordIds.length;
    
    // Beklemede olan (zamanı gelmemiş) kelimeleri hesapla
    const now = new Date();
    const waitingCount = learningQueue.filter(q => {
        const d = new Date(q.nextReview);
        return d > now && !knownWordIds.includes(q.wordId);
    }).length;

    // Hiç başlanmamış veya zamanı gelmiş ama oynanmamışlar
    const availableToPlay = all.length - totalKnown - waitingCount;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
           {availableToPlay === 0 ? <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4"/> : <BookOpen className="w-16 h-16 text-blue-500 mx-auto mb-4"/>}
           
           <h2 className="text-2xl font-bold text-slate-800 mb-2">
               {availableToPlay === 0 ? "Tüm Kelimeler Tamam!" : "Oturum Tamamlandı"}
           </h2>
           
           <div className="flex justify-center gap-6 my-6 border-b border-slate-100 pb-6">
                <div>
                    <div className="text-3xl font-bold text-green-600">{stats.learned}</div>
                    <div className="text-xs text-slate-500 font-bold uppercase">Başarılı</div>
                </div>
                <div>
                    <div className="text-3xl font-bold text-orange-500">{stats.review}</div>
                    <div className="text-xs text-slate-500 font-bold uppercase">Tekrar</div>
                </div>
           </div>

           <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    <span>Tamamen Öğrenilen:</span>
                    <span className="font-bold text-indigo-600">{totalKnown}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    <span>Dinlenmede (Gelecek):</span>
                    <span className="font-bold text-orange-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {waitingCount}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    <span>Çalışılabilir:</span>
                    <span className="font-bold text-green-600">{availableToPlay}</span>
                </div>
           </div>

           <button onClick={startSession} disabled={availableToPlay === 0} className="w-full bg-blue-600 disabled:bg-slate-300 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3">
               <RotateCcw className="w-5 h-5"/> {availableToPlay > 0 ? "Yeni Oturum" : "Kelimeler Tükendi"}
           </button>
           <button onClick={() => navigate("/")} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2">
               <Home className="w-5 h-5"/> Ana Sayfa
           </button>
        </div>
      </div>
    );
  }

  const currentCard = sessionWords[currentIndex];
  const progress = sessionWords.length > 0 ? (currentIndex / sessionWords.length) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 overflow-hidden">
      <div className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-slate-700"><X className="w-6 h-6"/></button>
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
          <button onClick={() => handleSwipe("left")} disabled={!!swipeDirection} className="flex-1 bg-white border-2 border-orange-100 hover:bg-orange-50 text-orange-500 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1">
              <X className="w-6 h-6"/><span>Bilmiyorum</span>
          </button>
          <button onClick={() => handleSwipe("right")} disabled={!!swipeDirection} className="flex-1 bg-white border-2 border-green-100 hover:bg-green-50 text-green-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1">
              <Check className="w-6 h-6"/><span>Biliyorum</span>
          </button>
        </div>
        <button onClick={() => setSessionComplete(true)} className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto">
            <Target className="w-4 h-4"/> Bitir
        </button>
      </div>
    </div>
  );
}
