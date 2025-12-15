import React, { useState, useEffect } from "react";
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
  Square, // Durdurma ikonu
  Headphones // Başlık ikonu
} from "lucide-react";

export default function WritingGame2() {
  const { getAllWords, knownWordIds, addScore, learningQueue } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameMode, setGameMode] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState("mode-selection");

  // Kelime Mantığı
  const [shuffledLetters, setShuffledLetters] = useState([]); 
  const [completedLetters, setCompletedLetters] = useState([]); 
  const [wrongAnimationId, setWrongAnimationId] = useState(null); 
  const [isWordComplete, setIsWordComplete] = useState(false); 

  // Puanlama ve Hata Takibi
  const [hintCount, setHintCount] = useState(0);
  const [currentWordPoints, setCurrentWordPoints] = useState(5); 
  const [mistakeCount, setMistakeCount] = useState(0); 

  // Ses Durumu
  const [isPlaying, setIsPlaying] = useState(false);

  // --- IPHONE FIX: FOCUS TEMİZLEME ---
  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  // --- KELİME HAVUZLARI ---
  const getWordPools = () => {
    const all = getAllWords();
    const validWords = all.filter(w => w.word && w.word.length > 0); 
    const now = new Date();

    const queueIds = learningQueue ? learningQueue.map(q => q.wordId) : [];

    // 1. ÖĞRENME MODU
    const learnPool = validWords.filter(w => 
        !knownWordIds.includes(w.id) && 
        !queueIds.includes(w.id)
    );

    // 2. TEKRAR MODU
    const reviewPool = validWords.filter(w => {
        const q = learningQueue.find(item => item.wordId === w.id);
        const isDue = q && new Date(q.nextReview) <= now;
        const isKnown = knownWordIds.includes(w.id);
        return isDue || isKnown;
    });

    // 3. BEKLEME LİSTESİ
    const waitingPool = validWords.filter(w => {
        const q = learningQueue.find(item => item.wordId === w.id);
        return q && new Date(q.nextReview) > now;
    });

    return { learnPool, reviewPool, waitingPool };
  };

  const { learnPool, reviewPool, waitingPool } = getWordPools();

  // --- OYUN BAŞLATMA ---
  const startSession = (mode, e) => {
    handleBlur(e); // Mobile Fix
    setGameMode(mode);
    let selectedPool = [];

    if (mode === "learn") selectedPool = learnPool;
    else if (mode === "review") selectedPool = reviewPool;
    else if (mode === "waiting") selectedPool = waitingPool;

    if (selectedPool.length === 0) {
      alert("Bu modda şu an çalışılacak kelime yok.");
      return;
    }

    const selected = selectedPool.sort(() => 0.5 - Math.random()).slice(0, 20);
    setQuestions(selected);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

  // --- DİNAMİK BOYUT HESAPLAMA ---
  const getDynamicStyle = (length) => {
    if (length <= 5) return { box: "w-11 h-14", text: "text-2xl" }; 
    if (length <= 8) return { box: "w-8 h-11", text: "text-xl" };   
    if (length <= 11) return { box: "w-6 h-9", text: "text-lg" };    
    if (length <= 14) return { box: "w-4 h-8", text: "text-sm" }; 
    if (length <= 17) return { box: "w-3 h-6", text: "text-[10px]" }; 
    return { box: "w-2 h-5", text: "text-[8px]" };                       
  };

  // --- SORU YÜKLEME ---
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);

    if (gameStatus === "playing" && questions[currentIndex]) {
      const word = questions[currentIndex].word.trim();
      const letters = word.split('').map((char, index) => ({
        id: `${char}-${index}-${Math.random()}`,
        char: char,
        isUsed: false
      }));
      const shuffled = [...letters].sort(() => Math.random() - 0.5);
      
      setShuffledLetters(shuffled);
      setCompletedLetters([]);
      setIsWordComplete(false);
      
      setHintCount(0);
      setMistakeCount(0); 
      setCurrentWordPoints(5); 
    }
    
    return () => window.speechSynthesis.cancel();
  }, [currentIndex, gameStatus]);

  const currentWordObj = questions[currentIndex];
  const targetWord = currentWordObj?.word.trim() || "";

  // --- SES FONKSİYONU ---
  const handleSpeak = (text) => {
    if (!text) return;

    if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
    } else {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 0.8;
        
        u.onend = () => setIsPlaying(false);
        u.onerror = () => setIsPlaying(false);

        window.speechSynthesis.speak(u);
        setIsPlaying(true);
    }
  };

  // --- HARF TIKLAMA VE HATA KONTROLÜ ---
  const handleLetterClick = (letterObj, e) => {
    handleBlur(e); // Mobile Fix: Focus temizle

    if (isWordComplete || letterObj.isUsed) return;

    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    if (letterObj.char.toLowerCase() === expectedChar.toLowerCase()) {
      // DOĞRU HARF
      const newShuffled = shuffledLetters.map(l => 
        l.id === letterObj.id ? { ...l, isUsed: true } : l
      );
      setShuffledLetters(newShuffled);
      const newCompleted = [...completedLetters, letterObj.char];
      setCompletedLetters(newCompleted);

      if (newCompleted.length === targetWord.length) {
        handleWordComplete(); 
      }
    } else {
      // YANLIŞ HARF
      const newMistakes = mistakeCount + 1;
      setMistakeCount(newMistakes);
      
      setWrongAnimationId(letterObj.id);
      setTimeout(() => setWrongAnimationId(null), 500);

      // LİMİT KONTROLÜ (2 HATA)
      if (newMistakes >= 2) {
          setCurrentWordPoints(0); 
          
          setTimeout(() => {
              setCompletedLetters(targetWord.split('')); 
              setIsWordComplete(true);
              handleSpeak(targetWord); // Doğrusunu oku
              
              setTimeout(() => {
                  if (currentIndex + 1 < questions.length) {
                      setCurrentIndex(p => p + 1);
                  } else {
                      setGameStatus("finished");
                  }
              }, 2000); 
          }, 600);
      }
    }
  };

  // --- İPUCU KULLANIMI ---
  const handleHint = (e) => {
    handleBlur(e); // Mobile Fix
    if (isWordComplete) return;

    const newHintCount = hintCount + 1;
    setHintCount(newHintCount);

    if (newHintCount === 1) setCurrentWordPoints(2); 
    else if (newHintCount >= 2) setCurrentWordPoints(0); 

    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    const correctLetterObj = shuffledLetters.find(l => 
      !l.isUsed && l.char.toLowerCase() === expectedChar.toLowerCase()
    );

    if (correctLetterObj) handleLetterClick(correctLetterObj, null);
  };

  // --- KELİME BİTİRME (BAŞARILI) ---
  const handleWordComplete = () => {
    setIsWordComplete(true);
    handleSpeak(targetWord);
    
    // ANLIK PUAN EKLEME
    if (currentWordPoints > 0) {
        addScore(currentWordPoints);
        setScore(s => s + currentWordPoints);
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(p => p + 1);
      } else {
        setGameStatus("finished");
      }
    }, 1200);
  };

  const handleQuitEarly = (e) => {
      handleBlur(e);
      setGameStatus("finished");
  };

  // ===========================
  // === MOD SEÇİM EKRANI ===
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
                    <h2 className="text-xl font-bold text-slate-800">Dinle & Yaz</h2>
                    <div className="w-9"></div>
                </div>

                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Ne duyuyorsun?</h1>
                    <p className="text-slate-500">Kelimeyi dinle ve doğru harflerle yaz.</p>
                </div>

                <div className="space-y-4">
                    {/* Tekrar Modu */}
                    <button onClick={(e) => startSession('review', e)} disabled={reviewPool.length === 0} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="menu-btn btn-select w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Öğrendiklerini Pekiştir</div></div>
                            </div>
                            <div className="text-2xl font-black text-orange-600">{reviewPool.length}</div>
                        </div>
                    </button>

                    {/* Öğrenme Modu */}
                    <button onClick={(e) => startSession('learn', e)} disabled={learnPool.length === 0} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="menu-btn btn-learn w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><BrainCircuit className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni Kelimeler</div></div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{learnPool.length}</div>
                        </div>
                    </button>

                    {/* Bekleme Modu */}
                    <button onClick={(e) => startSession('waiting', e)} disabled={waitingPool.length === 0} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="menu-btn btn-wait w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Henüz Zamanı Gelmeyen Kelimeler</div></div>
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
  // === 2. BİTİŞ EKRANI ===
  // ===========================
  if (gameStatus === "finished") {
    const max = questions.length * 5;
    let modeTitle = "Bitti";
    if (gameMode === "learn") modeTitle = "Bitti";
    if (gameMode === "review") modeTitle = "Bitti";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-pink-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-pink-600"/></div>
           <h2 className="text-2xl font-bold text-slate-800">{modeTitle}</h2>
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="text-sm text-slate-400 font-bold uppercase">TOPLAM PUAN</div>
             <div className="text-5xl font-extrabold text-indigo-600 mt-2">{score}</div>
             <div className="text-xs text-slate-400 font-bold">Maksimum: {max}</div>
           </div>
           <button onClick={() => setGameStatus("mode-selection")} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-transform">Başka Test Çöz</button>
           <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 active:scale-95 transition-transform">Ana Sayfa</button>
        </div>
      </div>
    );
  }

  if (gameStatus === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-purple-600 w-10 h-10"/></div>;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const styles = getDynamicStyle(targetWord.length);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       
       {/* --- MOBİL CSS --- */}
       <style>{`
         * {
           -webkit-tap-highlight-color: transparent !important;
         }
         
         @media (hover: hover) {
            .audio-btn:hover { background-color: #e9d5ff !important; } /* purple-200 */
            .hint-btn:hover { background-color: #fef3c7 !important; } /* amber-200 */
            .letter-btn:hover { border-color: #c084fc !important; color: #9333ea !important; }
         }

         .game-btn { transition: all 0.2s ease; }
       `}</style>

       <div className="w-full max-w-md space-y-4 mt-2">
          
          {/* Header */}
          <div className="flex justify-between items-center">
             <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full active:bg-slate-100 shadow-sm transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
             <div className="font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                {gameMode === 'review' ? 'Tekrar' : gameMode === 'learn' ? 'Öğrenme' : 'Bekleme'}: {currentIndex+1} / {questions.length}
             </div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-purple-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>
          
          {/* SORU ALANI (SADECE SES) */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6 relative overflow-hidden min-h-[450px] flex flex-col justify-between">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-pink-400"></div>
             
             {/* ORTA SES BUTONU */}
             <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4">
                <button 
                    onClick={(e) => {
                        handleBlur(e);
                        handleSpeak(targetWord);
                    }}
                    style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                    className={`audio-btn w-28 h-28 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 focus:outline-none focus:ring-0
                        ${isPlaying ? "bg-red-100 text-red-500 animate-pulse" : "bg-purple-100 text-purple-600"}
                    `}
                >
                    {isPlaying ? <Square className="w-12 h-12 fill-current"/> : <Volume2 className="w-14 h-14"/>}
                </button>
                <div className="text-slate-400 text-sm font-bold uppercase tracking-widest animate-pulse">Dinle ve Yaz</div>
             </div>

             {/* YAZI ALANI */}
             <div className="flex flex-wrap justify-center gap-1 min-h-[60px] items-end content-center">
                {targetWord.split('').map((_, idx) => {
                  const char = completedLetters[idx];
                  const isFilled = char !== undefined;
                  return (
                    <div 
                      key={idx} 
                      className={`
                        ${styles.box} ${styles.text} 
                        flex items-center justify-center font-bold border-b-4 rounded-t-lg transition-all
                        ${isFilled ? "border-purple-500 text-purple-700 bg-purple-50 translate-y-0" : "border-slate-200 bg-slate-50 text-transparent"}
                      `}
                    >
                      {char}
                    </div>
                  );
                })}
             </div>

             {/* KARIŞIK HARFLER (BUTONLAR) */}
             <div key={currentIndex} className="flex flex-wrap justify-center gap-2 content-center pb-2">
                {shuffledLetters.map((item) => (
                  <button
                    key={item.id}
                    onClick={(e) => handleLetterClick(item, e)}
                    disabled={item.isUsed || isWordComplete}
                    style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                    className={`letter-btn
                      w-10 h-10 md:w-11 md:h-11 rounded-xl font-bold text-lg shadow-[0_3px_0_rgb(0,0,0,0.1)] 
                      transition-all duration-75 select-none touch-manipulation focus:outline-none focus:ring-0
                      ${item.isUsed 
                          ? "opacity-0 pointer-events-none scale-0" 
                          : wrongAnimationId === item.id 
                              ? "bg-red-500 text-white shadow-none animate-[shake_0.5s_ease-in-out]" 
                              : "bg-white border-2 border-slate-200 text-slate-700 active:bg-purple-100 active:border-purple-300 active:text-purple-600 active:shadow-none active:translate-y-[2px]"
                      }
                    `}
                  >
                    {item.char}
                  </button>
                ))}
             </div>

             {/* İPUCU BUTONU (SADECE) */}
             <div className="flex items-center justify-center border-t border-slate-100 pt-4">
                <button 
                  onClick={handleHint} 
                  disabled={isWordComplete}
                  style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                  className="hint-btn flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-700 rounded-2xl font-bold active:bg-amber-200 transition-colors active:scale-95 disabled:opacity-50 focus:outline-none focus:ring-0 w-full justify-center"
                >
                  <Lightbulb className="w-5 h-5"/> 
                  <span className="text-xs ml-1 flex flex-col items-start leading-none">
                      <span>İpucu ({hintCount === 0 ? "5p" : hintCount === 1 ? "2p" : "0p"})</span>
                      <span className="text-[9px] text-amber-600/80">Hata: {mistakeCount}/2</span>
                  </span>
                </button>
             </div>

          </div>

          <button onClick={handleQuitEarly} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="w-full text-center text-slate-400 hover:text-red-500 text-sm font-medium transition-colors focus:outline-none focus:ring-0">
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
