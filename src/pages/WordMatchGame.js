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
  Puzzle, 
  CheckCircle2, 
  Target, 
  ArrowRight
} from "lucide-react";

export default function WordMatchGame() {
  // 1. handleUpdateWord EKLENDİ
  const { getAllWords, knownWordIds, learningQueue, addScore, updateGameStats, handleUpdateWord } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameMode, setGameMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("mode-selection"); 
  
  // Oyun Verileri
  const [allSessionWords, setAllSessionWords] = useState([]); // Seçilen 10 kelime
  const [round, setRound] = useState(1); // 1 veya 2
  
  const [cards, setCards] = useState([]); // Ekrandaki kartlar
  const [selectedCards, setSelectedCards] = useState([]); 
  const [matchedPairsInRound, setMatchedPairsInRound] = useState(0); // O turdaki eşleşme
  const [score, setScore] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false); 

  // --- IPHONE FIX: TIKLAYINCA ODAĞI KALDIR (BLUR) ---
  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  // --- KELİME HAVUZLARI ---
  const pools = useMemo(() => {
    const all = getAllWords();
    const now = new Date();
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

  // --- OYUNU BAŞLATMA (AKILLI SIRALAMA) ---
  const startSession = (mode, e) => {
    handleBlur(e);
    setGameMode(mode);
    let selectedPool = [];

    if (mode === "learn") selectedPool = pools.learnPool;
    else if (mode === "review") selectedPool = pools.reviewPool;
    else if (mode === "waiting") selectedPool = pools.waitingPool;

    // En az 10 kelime lazım (5+5)
    if (selectedPool.length < 10) {
      alert(`Bu mod için en az 10 kelime gerekiyor. (Mevcut: ${selectedPool.length})`);
      return;
    }

    // --- YENİ ALGORİTMA: TARİHE GÖRE SIRALA ---
    // Word Match oyunu için özel tarih anahtarı: 'lastSeen_word_match'
    
    const neverSeen = [];
    const seen = [];

    selectedPool.forEach(w => {
        if (!w.lastSeen_word_match) {
            neverSeen.push(w);
        } else {
            seen.push(w);
        }
    });

    // 1. Hiç görülmeyenleri karıştır
    neverSeen.sort(() => 0.5 - Math.random());

    // 2. Görülenleri Eskiden -> Yeniye sırala
    seen.sort((a, b) => new Date(a.lastSeen_word_match).getTime() - new Date(b.lastSeen_word_match).getTime());

    // 3. Birleştir
    const smartSortedPool = [...neverSeen, ...seen];

    // 4. İlk 10 taneyi al
    const selected10 = smartSortedPool.slice(0, 10);

    // 5. Karıştır (Roundlara dağıtmadan önce)
    const shuffled10 = selected10.sort(() => 0.5 - Math.random());
    
    setAllSessionWords(shuffled10);
    setScore(0);
    setRound(1);
    
    // İlk turu başlat
    setupRound(1, shuffled10);
    setGameStatus("playing");
  };

  // --- TUR HAZIRLAMA ---
  const setupRound = (roundNum, wordsList) => {
      const startIdx = (roundNum - 1) * 5;
      const roundWords = wordsList.slice(startIdx, startIdx + 5);

      let generatedCards = [];
      roundWords.forEach(w => {
          // İngilizce
          generatedCards.push({
              id: w.id + "-en",
              wordId: w.id,
              text: w.word,
              type: "en",
              isMatched: false,
              isWrong: false
          });
          // Türkçe
          generatedCards.push({
              id: w.id + "-tr",
              wordId: w.id,
              text: w.definitions[0].meaning,
              type: "tr",
              isMatched: false,
              isWrong: false
          });
      });

      // Karıştır
      generatedCards.sort(() => 0.5 - Math.random());

      setCards(generatedCards);
      setMatchedPairsInRound(0);
      setSelectedCards([]);
      setIsProcessing(false);
  };

  // --- KART TIKLAMA ---
  const handleCardClick = (clickedCard, e) => {
      handleBlur(e); 

      if (isProcessing || clickedCard.isMatched || selectedCards.find(c => c.id === clickedCard.id)) return;

      const newSelection = [...selectedCards, clickedCard];
      setSelectedCards(newSelection);

      if (newSelection.length === 2) {
          setIsProcessing(true);
          checkForMatch(newSelection);
      }
  };

  // --- EŞLEŞME KONTROLÜ ---
  const checkForMatch = (selection) => {
      const [first, second] = selection;

      if (first.wordId === second.wordId) {
          // --- DOĞRU ---
          updateGameStats('word_match', 1);
          
          // --- GÜVENLİ KAYIT ---
          // Word Match tarihinde bu kelimeyi işaretle (Sona at)
          handleUpdateWord(first.wordId, { lastSeen_word_match: new Date().toISOString() });
       
          setCards(prev => prev.map(card => {
              if (card.id === first.id || card.id === second.id) {
                  return { ...card, isMatched: true };
              }
              return card;
          }));
          
          const newScore = 10;
          addScore(newScore); 
          setScore(s => s + newScore);
          
          setMatchedPairsInRound(prevCount => {
              const currentCount = prevCount + 1;
              
              // TUR BİTTİ Mİ? (5 Çift Bulunduysa)
              if (currentCount === 5) {
                  setTimeout(() => {
                      if (round === 1) {
                          // 2. Tura Geç
                          setRound(2);
                          setupRound(2, allSessionWords);
                      } else {
                          // Oyun Bitti
                          setGameStatus("finished");
                      }
                  }, 800); 
              }
              return currentCount;
          });

          setSelectedCards([]);
          setIsProcessing(false);

      } else {
          // --- YANLIŞ ---
          setCards(prev => prev.map(card => {
              if (card.id === first.id || card.id === second.id) {
                  return { ...card, isWrong: true };
              }
              return card;
          }));

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

  const handleQuitEarly = (e) => {
      handleBlur(e);
      setGameStatus("finished");
  };

  // ===========================
  // === UI RENDER ===
  // ===========================

  if (gameStatus === "mode-selection") {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            
            {/* --- GLOBAL CSS FIX --- */}
            <style>{`
                * { -webkit-tap-highlight-color: transparent !important; }
                
                /* Sadece Mouse ile hover */
                @media (hover: hover) {
                    .btn-select:hover { border-color: #fb923c !important; background-color: #fff7ed !important; }
                    .btn-learn:hover { border-color: #818cf8 !important; background-color: #eef2ff !important; }
                    .btn-wait:hover { border-color: #cbd5e1 !important; background-color: #f8fafc !important; }
                    .icon-btn:hover { background-color: #f1f5f9 !important; }
                }
                .menu-btn { transition: all 0.2s ease; }
            `}</style>

            <div className="w-full max-w-sm space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="icon-btn p-2 bg-white rounded-full shadow-sm active:bg-slate-100 transition-colors"><Home className="w-5 h-5 text-slate-600" /></button>
                    <h2 className="text-xl font-bold text-slate-800">Eşleştirme</h2>
                    <div className="w-9"></div>
                </div>
                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Doğru Eşleştirebilir Misin?</h1>
                    <p className="text-slate-500">Çiftleri eşleştir puanları topla.</p>
                </div>
                
                <div className="space-y-4">
                    <button onClick={(e) => startSession('review', e)} disabled={pools.reviewPool.length < 10} style={{ outline: 'none' }} className="menu-btn btn-select w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Öğrendiklerini Pekiştir</div></div>
                            </div>
                            <div className="text-2xl font-black text-orange-600">{pools.reviewPool.length}</div>
                        </div>
                    </button>
                    <button onClick={(e) => startSession('learn', e)} disabled={pools.learnPool.length < 10} style={{ outline: 'none' }} className="menu-btn btn-learn w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><BrainCircuit className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni Kelimeler</div></div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{pools.learnPool.length}</div>
                        </div>
                    </button>
                    <button onClick={(e) => startSession('waiting', e)} disabled={pools.waitingPool.length < 10} style={{ outline: 'none' }} className="menu-btn btn-wait w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Hünüz Zamanı Gelmeyen Kelimeler</div></div>
                            </div>
                            <div className="text-2xl font-black text-slate-500">{pools.waitingPool.length}</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
  }

  if (gameStatus === "finished") {
    const maxScore = 100; // 10 çift * 10 puan
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-green-600"/></div>
           <h2 className="text-2xl font-bold text-slate-800">Bitti</h2>
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="text-sm text-slate-400 font-bold uppercase">Toplam Puan</div>
             <div className="text-5xl font-extrabold text-blue-600 mt-2">{score}</div>
             <div className="text-xs text-slate-400 font-bold mt-1">Maksimum: {maxScore}</div>
           </div>
           <button onClick={() => setGameStatus("mode-selection")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3 shadow-lg active:scale-95 transition-transform">Başka Test Çöz</button>
           <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"><Home className="w-5 h-5" /> Ana Sayfa</button>
        </div>
      </div>
    );
  }

  // Progress sadece o tur için hesaplanır (0-5 arası)
  const progress = (matchedPairsInRound / 5) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       
       {/* --- EŞLEŞTİRME OYUNU İÇİN MOBİL CSS --- */}
       <style>{`
            * { -webkit-tap-highlight-color: transparent !important; }
            
            /* Sadece Mouse ile hover */
            @media (hover: hover) {
                .match-card:hover { border-color: #93c5fd !important; } /* blue-300 */
                .icon-btn:hover { background-color: #f1f5f9 !important; }
            }
            .match-card { transition: all 0.2s ease; }
       `}</style>

       <div className="w-full max-w-md space-y-4 mt-2 h-full flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-center">
             <button onClick={handleQuitEarly} className="icon-btn p-2 bg-white rounded-full active:bg-slate-100 shadow-sm transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
             <div className="flex items-center gap-2">
                 {/* Tur Göstergesi */}
                 <span className={`text-xs font-bold px-2 py-1 rounded-lg ${round===1 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>Tur 1</span>
                 <ArrowRight className="w-4 h-4 text-slate-300"/>
                 <span className={`text-xs font-bold px-2 py-1 rounded-lg ${round===2 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>Tur 2</span>
             </div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>

          {/* GRID ALANI */}
          <div className="grid grid-cols-2 gap-3 mt-4 flex-1 content-center">
              {cards.map((card) => {
                  const isSelected = selectedCards.find(c => c.id === card.id);
                  return (
                      <button 
                        key={card.id}
                        onClick={(e) => handleCardClick(card, e)}
                        disabled={card.isMatched}
                        style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                        className={`
                            match-card h-20 w-full rounded-xl flex items-center justify-center text-center font-bold text-sm shadow-sm border-2 px-2 focus:outline-none focus:ring-0 select-none touch-manipulation
                            ${card.isMatched 
                                ? "opacity-0 pointer-events-none scale-0" 
                                : card.isWrong
                                    ? "bg-red-500 text-white border-red-700 animate-[shake_0.5s]" 
                                    : isSelected
                                        ? "bg-blue-100 border-blue-500 text-blue-700 -translate-y-1 shadow-md scale-105" 
                                        : "bg-white border-slate-200 text-slate-700 active:scale-95" 
                            }
                        `}
                      >
                          {card.text}
                      </button>
                  )
              })}
          </div>

          <button onClick={handleQuitEarly} style={{ outline: 'none' }} className="w-full mt-6 text-center text-slate-400 hover:text-red-500 text-sm font-medium transition-colors focus:outline-none focus:ring-0">
            Bitir (Puanı Al ve Çık)
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
