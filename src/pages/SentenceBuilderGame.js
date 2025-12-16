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
  Lightbulb, 
  Volume2, 
  ArrowRight
} from "lucide-react";

export default function SentenceBuilderGame() {
  const { getAllWords, knownWordIds, learningQueue, addScore, updateGameStats } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameMode, setGameMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("mode-selection"); 
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // --- CÜMLE KURMA MANTIĞI ---
  const [targetSentenceWords, setTargetSentenceWords] = useState([]); 
  const [shuffledPool, setShuffledPool] = useState([]); 
  const [userSelection, setUserSelection] = useState([]); 
  
  const [mistakeCount, setMistakeCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(10); 
  const [wrongAnimationId, setWrongAnimationId] = useState(null); 
  
  // YENİ: CÜMLE BİTTİ Mİ? (BEKLEME EKRANI İÇİN)
  const [isRoundFinished, setIsRoundFinished] = useState(false); 

  // --- IPHONE FIX: TIKLAMA ODAĞINI KALDIR ---
  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  // --- KELİME HAVUZLARI ---
  const pools = useMemo(() => {
    const all = getAllWords();
    const now = new Date();
    
    const validWords = all.filter(w => w.sentence && w.sentence.trim().length > 0);
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

  // --- BAŞLATMA ---
  const startSession = (mode, e) => {
    handleBlur(e); // Mobile Fix
    setGameMode(mode);
    let selectedPool = [];
    if (mode === "learn") selectedPool = pools.learnPool;
    else if (mode === "review") selectedPool = pools.reviewPool;
    else if (mode === "waiting") selectedPool = pools.waitingPool;

    if (selectedPool.length === 0) {
      alert("Bu modda, içinde örnek cümle olan kelime yok.");
      return;
    }

    const selected = selectedPool.sort(() => 0.5 - Math.random()).slice(0, 10);
    setQuestions(selected);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

  // --- SORU YÜKLEME ---
  useEffect(() => {
    if (gameStatus === "playing" && questions[currentIndex]) {
      const currentWordObj = questions[currentIndex];
      const cleanSentence = currentWordObj.sentence.replace(/[.,?!]/g, "").trim();
      const words = cleanSentence.split(/\s+/); 
      
      setTargetSentenceWords(words);
      setUserSelection([]);
      
      setMistakeCount(0);
      setHintCount(0);
      setCurrentPoints(10); 
      setIsRoundFinished(false);

      const pool = words.map((word, i) => ({
        id: `word-${i}-${Math.random()}`,
        text: word,
        originalIndex: i, 
        isUsed: false
      }));
      
      setShuffledPool([...pool].sort(() => 0.5 - Math.random()));
    }
  }, [currentIndex, gameStatus, questions]);

  const speak = (txt) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
  };

  // --- KELİME SEÇME ---
  const handleSelectWord = (wordObj, e) => {
    handleBlur(e); // Mobile Fix

    if (isRoundFinished || wordObj.isUsed) return;

    const nextExpectedIndex = userSelection.length;
    const expectedWord = targetSentenceWords[nextExpectedIndex];

    if (wordObj.text === expectedWord) {
        // DOĞRU
        const newSelection = [...userSelection, wordObj];
        setUserSelection(newSelection);
        setShuffledPool(prev => prev.map(w => w.id === wordObj.id ? { ...w, isUsed: true } : w));

        if (newSelection.length === targetSentenceWords.length) {
            finishRound(true);
        }
    } else {
        // YANLIŞ
        const newMistakes = mistakeCount + 1;
        setMistakeCount(newMistakes);
        setWrongAnimationId(wordObj.id);
        setTimeout(() => setWrongAnimationId(null), 500);

        if (newMistakes >= 2) {
            handleFailAndShowCorrect();
        }
    }
  };

  // --- İPUCU ---
  const handleHint = (e) => {
      handleBlur(e); // Mobile Fix
      if (isRoundFinished) return;

      const newHintCount = hintCount + 1;
      setHintCount(newHintCount);

      if (newHintCount === 1) setCurrentPoints(5);
      else if (newHintCount === 2) setCurrentPoints(2);
      else setCurrentPoints(0);

      const nextIndex = userSelection.length;
      const expectedWordText = targetSentenceWords[nextIndex];
      const correctObj = shuffledPool.find(w => !w.isUsed && w.text === expectedWordText);

      // İpucu için hayali bir event gönderiyoruz, handleSelectWord içindeki handleBlur hata vermesin
      if (correctObj) handleSelectWord(correctObj, { currentTarget: { blur: () => {} } });
  };

  // --- OTOMATİK TAMAMLAMA (2 HATA SONRASI) ---
  const handleFailAndShowCorrect = () => {
      setCurrentPoints(0); 
      
      const remainingWords = targetSentenceWords.slice(userSelection.length);
      const autoFilledObjects = remainingWords.map((txt, i) => ({
          id: `auto-${i}`, text: txt, isUsed: true, isAuto: true 
      }));
      
      setUserSelection(prev => [...prev, ...autoFilledObjects]);
      setShuffledPool(prev => prev.map(w => ({ ...w, isUsed: true }))); 
      
      finishRound(false); 
  };

  // --- TURU BİTİR (DURAKLAMA) ---
  const finishRound = (success) => {
      setIsRoundFinished(true); // "Devam Et" butonunu açar
      updateGameStats('sentence_builder', 1); // İstatistiği işle

      const sentenceStr = questions[currentIndex].sentence;
      speak(sentenceStr); 

      if (currentPoints > 0 && success) {
          addScore(currentPoints);
          setScore(s => s + currentPoints);
      }
  };

  // --- SONRAKİ SORUYA GEÇ ---
  const handleNextQuestion = (e) => {
      handleBlur(e); // Mobile Fix
      if (currentIndex + 1 < questions.length) {
          setCurrentIndex(p => p + 1);
      } else {
          setGameStatus("finished");
      }
  };

  const handleQuitEarly = (e) => {
      handleBlur(e);
      setGameStatus("finished");
  };

  // --- UI RENDER ---

  if (gameStatus === "mode-selection") {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            
            {/* --- GLOBAL CSS FIX (KÖKTEN ÇÖZÜM) --- */}
            <style>{`
                * { -webkit-tap-highlight-color: transparent !important; }
                @media (hover: hover) {
                    .btn-select:hover { border-color: #fb923c !important; background-color: #fff7ed !important; }
                    .btn-learn:hover { border-color: #818cf8 !important; background-color: #eef2ff !important; }
                    .btn-wait:hover { border-color: #cbd5e1 !important; background-color: #f8fafc !important; }
                    .icon-btn:hover { background-color: #f1f5f9 !important; }
                }
                .game-btn { transition: all 0.2s ease; }
            `}</style>

            <div className="w-full max-w-sm space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="icon-btn p-2 bg-white rounded-full shadow-sm active:bg-slate-100 transition-colors"><Home className="w-5 h-5 text-slate-600" /></button>
                    <h2 className="text-xl font-bold text-slate-800">Cümle Kurma</h2>
                    <div className="w-9"></div>
                </div>
                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Doğru Sıralayabilir Misin?</h1>
                    <p className="text-slate-500">Kelimeleri sırayla seçerek cümleyi oluştur.</p>
                </div>
                
                <div className="space-y-4">
                    <button onClick={(e) => startSession('review', e)} disabled={pools.reviewPool.length === 0} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="game-btn btn-select w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Öğrendiklerini Pekiştir</div></div>
                            </div>
                            <div className="text-2xl font-black text-orange-600">{pools.reviewPool.length}</div>
                        </div>
                    </button>
                    <button onClick={(e) => startSession('learn', e)} disabled={pools.learnPool.length === 0} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="game-btn btn-learn w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><BrainCircuit className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni Kelimeler</div></div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{pools.learnPool.length}</div>
                        </div>
                    </button>
                    <button onClick={(e) => startSession('waiting', e)} disabled={pools.waitingPool.length === 0} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="game-btn btn-wait w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Henüz Zamanı Gelmeyen Kelimeler</div></div>
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
    const maxScore = questions.length * 10;
    let modeTitle = "Bitti";
    if (gameMode === "learn") modeTitle = "Bitti";
    if (gameMode === "review") modeTitle = "Bitti";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-green-600"/></div>
           <h2 className="text-2xl font-bold text-slate-800">{modeTitle}</h2>
           
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

  if (gameStatus === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>;

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       
       {/* --- OYUN ALANI CSS FIX (KÖKTEN ÇÖZÜM) --- */}
       <style>{`
            * { -webkit-tap-highlight-color: transparent !important; }
            
            /* Sadece Mouse ile Hover (Mobilde yapışmayı engeller) */
            @media (hover: hover) {
                .word-btn:hover { border-color: #93c5fd !important; color: #2563eb !important; } /* blue-300 */
                .next-btn:hover { background-color: #4338ca !important; } /* indigo-700 */
                .hint-btn:hover { background-color: #fcd34d !important; } /* amber-300 */
            }
            .word-btn, .next-btn, .hint-btn { transition: all 0.2s ease; }
       `}</style>

       <div className="w-full max-w-md space-y-4 mt-2">
          
          {/* Header */}
          <div className="flex justify-between items-center">
             <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full active:bg-slate-100 shadow-sm transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
             <div className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                {gameMode === 'review' ? 'Tekrar' : gameMode === 'learn' ? 'Öğrenme' : 'Bekleme'}: {currentIndex+1} / {questions.length}
             </div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>

          {/* OYUN ALANI */}
          <div className="flex flex-col gap-6 mt-4">
              
              {/* 1. İPUCU KARTI */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
                  <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                      <Volume2 className="w-4 h-4"/>
                      <span>Çevirisi İstenen Cümle</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 leading-snug">
                      {currentQ.sentence_tr ? `"${currentQ.sentence_tr}"` : `İpucu: "${currentQ.definitions[0]?.meaning}" kelimesini içeren cümle.`}
                  </h3>
              </div>

              {/* 2. CEVAP ALANI */}
              <div className={`min-h-[80px] bg-slate-100 rounded-2xl p-4 flex flex-wrap gap-2 items-center justify-center border-2 border-dashed transition-colors ${isRoundFinished ? 'border-green-400 bg-green-50' : 'border-slate-300'}`}>
                  {userSelection.length === 0 && <span className="text-slate-400 text-sm italic">Kelimelere tıklayarak cümleyi oluştur...</span>}
                  
                  {userSelection.map((item) => (
                      <div 
                        key={item.id} 
                        className={`px-3 py-2 rounded-xl shadow-sm font-bold text-slate-700 border border-slate-200 animate-in zoom-in duration-200 ${item.isAuto ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white'}`}
                      >
                          {item.text}
                      </div>
                  ))}
              </div>

              {/* 3. KELİME HAVUZU (Tur Bitmemişse Göster) */}
              {!isRoundFinished && (
                  <div className="flex flex-wrap gap-2 justify-center">
                      {shuffledPool.map((item) => (
                          <button
                            key={item.id}
                            onClick={(e) => handleSelectWord(item, e)}
                            disabled={item.isUsed}
                            style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                            className={`word-btn px-4 py-3 rounded-xl font-bold text-lg transition-all shadow-sm active:scale-95 border-b-4 focus:outline-none focus:ring-0
                                ${item.isUsed 
                                    ? "opacity-0 pointer-events-none scale-0" 
                                    : wrongAnimationId === item.id
                                        ? "bg-red-500 text-white border-red-700 animate-[shake_0.5s_ease-in-out]"
                                        : "bg-white text-slate-700 border-slate-200"
                                }
                            `}
                          >
                              {item.text}
                          </button>
                      ))}
                  </div>
              )}

              {/* 4. DEVAM ET BUTONU (Tur Bitince Göster) */}
              {isRoundFinished && (
                  <button 
                    onClick={(e) => handleNextQuestion(e)}
                    style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                    className="next-btn w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4 focus:outline-none focus:ring-0"
                  >
                    <span>{currentIndex + 1 === questions.length ? "Sonucu Gör" : "Sıradaki Cümle"}</span>
                    <ArrowRight className="w-5 h-5"/>
                  </button>
              )}

          </div>

          {/* İPUCU BUTONU (Tur Bitmemişse) */}
          {!isRoundFinished && (
              <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100 mt-auto">
                    <button 
                      onClick={(e) => handleHint(e)} 
                      style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                      className="hint-btn w-full flex items-center justify-center gap-2 px-5 py-3 bg-amber-100 text-amber-700 rounded-2xl font-bold active:bg-amber-200 transition-colors active:scale-95 focus:outline-none focus:ring-0"
                    >
                      <Lightbulb className="w-5 h-5"/> 
                      <span className="text-xs ml-1 flex flex-col items-start leading-none">
                          <span>İpucu ({hintCount === 0 ? "5p" : hintCount === 1 ? "2p" : "0p"})</span>
                          <span className="text-[9px] text-amber-600/80">Hata: {mistakeCount}/2</span>
                      </span>
                    </button>
              </div>
          )}

          {/* BİTİR VE ÇIK */}
          {!isRoundFinished && (
              <button onClick={handleQuitEarly} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="w-full mt-6 text-center text-slate-400 hover:text-red-500 text-sm font-medium transition-colors focus:outline-none focus:ring-0">
                Bitir (Puanı Al ve Çık)
              </button>
          )}

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
