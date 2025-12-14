import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Trophy, 
  Loader2, 
  RefreshCw, 
  BrainCircuit, 
  Hourglass, 
  Home, 
  Layers, 
  Puzzle, // Eşleştirme ikonu
  CheckCircle2,
  Target
} from "lucide-react";

export default function WordMatchGame() {
  const { getAllWords, knownWordIds, learningQueue, addScore } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameMode, setGameMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("mode-selection"); 
  const [cards, setCards] = useState([]); // Ekrandaki kartlar
  const [selectedCards, setSelectedCards] = useState([]); // Tıklanan kartlar (max 2)
  const [matchedPairs, setMatchedPairs] = useState(0); // Bulunan çift sayısı
  const [totalPairs, setTotalPairs] = useState(0);
  const [score, setScore] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false); // Yanlış bilince bekleme süresi

  // --- KELİME HAVUZLARI ---
  const pools = useMemo(() => {
    const all = getAllWords();
    const now = new Date();
    
    // Anlamı olan kelimeler
    const validWords = all.filter(w => w.definitions && w.definitions[0]?.meaning);

    const getQueueItem = (id) => learningQueue ? learningQueue.find(q => q.wordId === id) : null;

    const waitingPool = validWords.filter(w => {
        const q = getQueueItem(w.id);
        return q && new Date(q.nextReview) > now;
    });
    const reviewPool = validWords.filter(w => knownWordIds.includes(w.id));
    const learnPool = validWords.filter(w => {
        if (knownWordIds.includes(w.id)) return false;
        const q = getQueueItem(w.id);
        if (!q) return true; 
        if (new Date(q.nextReview) <= now) return true; 
        return false;
    });

    return { learnPool, reviewPool, waitingPool };
  }, [getAllWords, knownWordIds, learningQueue]);

  // --- OYUNU BAŞLATMA ---
  const startSession = (mode) => {
    setGameMode(mode);
    let selectedPool = [];

    if (mode === "learn") selectedPool = pools.learnPool;
    else if (mode === "review") selectedPool = pools.reviewPool;
    else if (mode === "waiting") selectedPool = pools.waitingPool;

    if (selectedPool.length < 6) {
      alert("Bu mod için en az 6 kelime gerekiyor.");
      return;
    }

    // 6 Kelime seç (6 Çift = 12 Kart)
    const selectedWords = selectedPool.sort(() => 0.5 - Math.random()).slice(0, 6);
    
    // Kartları oluştur (İngilizce ve Türkçe olarak ikiye ayır)
    let generatedCards = [];
    selectedWords.forEach(w => {
        // İngilizce Kart
        generatedCards.push({
            id: w.id + "-en",
            wordId: w.id,
            text: w.word,
            type: "en",
            isMatched: false,
            isWrong: false
        });
        // Türkçe Kart
        generatedCards.push({
            id: w.id + "-tr",
            wordId: w.id,
            text: w.definitions[0].meaning,
            type: "tr",
            isMatched: false,
            isWrong: false
        });
    });

    // Kartları karıştır
    generatedCards.sort(() => 0.5 - Math.random());

    setCards(generatedCards);
    setTotalPairs(selectedWords.length);
    setMatchedPairs(0);
    setScore(0);
    setSelectedCards([]);
    setGameStatus("playing");
  };

  // --- KART TIKLAMA ---
  const handleCardClick = (clickedCard) => {
      // Eğer işlem yapılıyorsa, kart zaten eşleşmişse veya zaten seçiliyse işlem yapma
      if (isProcessing || clickedCard.isMatched || selectedCards.find(c => c.id === clickedCard.id)) return;

      const newSelection = [...selectedCards, clickedCard];
      setSelectedCards(newSelection);

      // 2 Kart seçildiğinde kontrol et
      if (newSelection.length === 2) {
          setIsProcessing(true);
          checkForMatch(newSelection);
      }
  };

  // --- EŞLEŞME KONTROLÜ ---
  const checkForMatch = (selection) => {
      const [first, second] = selection;

      if (first.wordId === second.wordId) {
          // --- DOĞRU EŞLEŞME ---
          setCards(prev => prev.map(card => {
              if (card.id === first.id || card.id === second.id) {
                  return { ...card, isMatched: true };
              }
              return card;
          }));
          
          const newScore = 10; // Her çift 10 puan
          addScore(newScore); // Anlık veritabanına yaz
          setScore(s => s + newScore); // Ekrana yaz
          
          setMatchedPairs(p => {
              const newCount = p + 1;
              if (newCount === totalPairs) {
                  setTimeout(() => setGameStatus("finished"), 1000);
              }
              return newCount;
          });

          setSelectedCards([]);
          setIsProcessing(false);

      } else {
          // --- YANLIŞ EŞLEŞME ---
          // Kartları "yanlış" (kırmızı) olarak işaretle
          setCards(prev => prev.map(card => {
              if (card.id === first.id || card.id === second.id) {
                  return { ...card, isWrong: true };
              }
              return card;
          }));

          // 1 saniye bekle ve düzelt
          setTimeout(() => {
              setCards(prev => prev.map(card => {
                  if (card.id === first.id || card.id === second.id) {
                      return { ...card, isWrong: false };
                  }
                  return card;
              }));
              setSelectedCards([]);
              setIsProcessing(false);
          }, 800);
      }
  };

  const handleQuitEarly = () => {
      setGameStatus("finished");
  };

  // ===========================
  // === UI RENDER ===
  // ===========================

  // 1. MOD SEÇİM EKRANI
  if (gameStatus === "mode-selection") {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100"><Home className="w-5 h-5 text-slate-600" /></button>
                    <h2 className="text-xl font-bold text-slate-800">Eşleştirme</h2>
                    <div className="w-9"></div>
                </div>
                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Hafıza Kartları</h1>
                    <p className="text-slate-500">İngilizce kelimeyi Türkçe anlamıyla eşleştir.</p>
                </div>
                
                <div className="space-y-4">
                    <button onClick={() => startSession('review')} disabled={pools.reviewPool.length < 6} className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all group active:scale-95 disabled:opacity-60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Bilinen kelimeler</div></div>
                            </div>
                            <div className="text-2xl font-black text-orange-600">{pools.reviewPool.length}</div>
                        </div>
                    </button>
                    <button onClick={() => startSession('learn')} disabled={pools.learnPool.length < 6} className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group active:scale-95 disabled:opacity-60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><BrainCircuit className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni kelimeler</div></div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{pools.learnPool.length}</div>
                        </div>
                    </button>
                    <button onClick={() => startSession('waiting')} disabled={pools.waitingPool.length < 6} className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group active:scale-95 disabled:opacity-60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Zamanı gelmeyenler</div></div>
                            </div>
                            <div className="text-2xl font-black text-slate-500">{pools.waitingPool.length}</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // 2. BİTİŞ EKRANI
  if (gameStatus === "finished") {
    // Max puan = Çift sayısı * 10
    const maxScore = totalPairs * 10;
    
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-green-600"/></div>
           <h2 className="text-2xl font-bold text-slate-800">Tebrikler!</h2>
           
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="text-sm text-slate-400 font-bold uppercase">Toplam Puan</div>
             <div className="text-5xl font-extrabold text-blue-600 mt-2">{score}</div>
             <div className="text-xs text-slate-400 font-bold mt-1">Maksimum: {maxScore}</div>
           </div>
           
           <button onClick={() => setGameStatus("mode-selection")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3 shadow-lg"><Layers className="w-5 h-5" /> Başka Mod Seç</button>
           <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><Home className="w-5 h-5" /> Ana Sayfa</button>
        </div>
      </div>
    );
  }

  // 3. OYUN ALANI
  const progress = totalPairs > 0 ? (matchedPairs / totalPairs) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       <div className="w-full max-w-md space-y-4 mt-2 h-full flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-center">
             <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full active:bg-slate-100 shadow-sm transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
             <div className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                {matchedPairs} / {totalPairs} Çift
             </div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>

          {/* GRID ALANI */}
          <div className="grid grid-cols-3 gap-2 mt-4 flex-1 content-center">
              {cards.map((card) => {
                  const isSelected = selectedCards.find(c => c.id === card.id);
                  return (
                      <button 
                        key={card.id}
                        onClick={() => handleCardClick(card)}
                        disabled={card.isMatched}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        className={`
                            aspect-[3/4] p-2 rounded-xl flex items-center justify-center text-center font-bold text-sm shadow-sm border-b-4 transition-all duration-200
                            ${card.isMatched 
                                ? "opacity-0 pointer-events-none scale-0" // Eşleşenler yok olur
                                : card.isWrong
                                    ? "bg-red-500 text-white border-red-700 animate-[shake_0.5s]" // Yanlışsa kırmızı titre
                                    : isSelected
                                        ? "bg-blue-100 border-blue-400 text-blue-700 -translate-y-1 shadow-md" // Seçiliyse mavi
                                        : "bg-white border-slate-200 text-slate-700 hover:border-blue-200 active:scale-95" // Normal
                            }
                        `}
                      >
                          {card.text}
                      </button>
                  )
              })}
          </div>

          {/* BİTİR VE ÇIK */}
          <button onClick={handleQuitEarly} className="w-full mt-6 text-center text-slate-400 hover:text-red-500 text-sm font-medium transition-colors">
            <Target className="w-4 h-4 inline-block mr-1 mb-0.5"/> Bitir (Puanı Al ve Çık)
          </button>

          <style jsx>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-5px); }
              75% { transform: translateX(5px); }
            }
          `}</style>
       </div>
    </div>
  );
}
