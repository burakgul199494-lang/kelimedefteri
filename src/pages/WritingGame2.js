import React, { useState, useEffect, useMemo, useRef } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, Trophy, Loader2, Home, Volume2, CheckCircle2, 
  RefreshCw, BrainCircuit, Hourglass, Lightbulb, 
  AlertTriangle, ArrowRight, Square, Star, Keyboard, MousePointer2, Flag, Check, Headphones, LogOut
} from "lucide-react";

export default function WritingGame2() {
  const { getAllWords, addScore, updateGameStats, handleUpdateWord, knownWordIds, learningQueue, registerMistake } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameMode, setGameMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("mode-selection"); 
  
  // 🔥 GİRİŞ TERCİHİ: 'bubbles' (Harf Seç) veya 'keyboard' (Yaz)
  const [inputMethod, setInputMethod] = useState("bubbles"); 

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Balon Modu State'leri
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [completedLetters, setCompletedLetters] = useState([]);
  
  // Klavye Modu State'leri
  const [userInput, setUserInput] = useState("");

  // Ortak State'ler
  const [isWordComplete, setIsWordComplete] = useState(false);
  const [wrongAnimationId, setWrongAnimationId] = useState(null); 
  const [mistakeCount, setMistakeCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [currentWordPoints, setCurrentWordPoints] = useState(10); 
  const [activeAudio, setActiveAudio] = useState(null);
  const [hasRecordedMistake, setHasRecordedMistake] = useState(false);

  // Ses Çalma Durumu (Buton animasyonu için)
  const [isPlaying, setIsPlaying] = useState(false);

  const inputRef = useRef(null);

  // --- IPHONE FIX ---
  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  // --- 1. KELİME HAVUZLARI ---
  const pools = useMemo(() => {
    const all = getAllWords();
    const now = new Date();
    
    // Dinleme oyunu olduğu için sadece kelimesi olanlar yeterli (Anlam şart değil ama olsa iyi olur)
    const validWords = all.filter(w => w.word && w.word.length > 0);
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

    // 🔥 ZOR KELİMELER HAVUZU
    const hardPool = validWords.filter(w => (w.mistakeCount || 0) >= 2);

    return { learnPool, reviewPool, waitingPool, hardPool };
  }, [getAllWords, knownWordIds, learningQueue]);

  // --- 2. OYUNU BAŞLATMA ---
  const startSession = (mode, e) => {
    handleBlur(e);
    setGameMode(mode);
    
    let selectedPool = [];
    if (mode === "learn") selectedPool = pools.learnPool;
    else if (mode === "review") selectedPool = pools.reviewPool;
    else if (mode === "waiting") selectedPool = pools.waitingPool;
    else if (mode === "hard") selectedPool = pools.hardPool;

    if (selectedPool.length === 0) {
      alert("Bu modda çalışılacak kelime bulunamadı.");
      return;
    }

    const neverSeen = [];
    const seen = [];

    selectedPool.forEach(w => {
        if (!w.lastSeen_listening) {
            neverSeen.push(w); 
        } else {
            seen.push(w); 
        }
    });

    neverSeen.sort(() => 0.5 - Math.random());
    seen.sort((a, b) => new Date(a.lastSeen_listening).getTime() - new Date(b.lastSeen_listening).getTime());

    const smartPool = [...neverSeen, ...seen];
    const selectedCandidates = smartPool.slice(0, 10);
    const selected = selectedCandidates.sort(() => 0.5 - Math.random());

    // Soruları hazırla
    const generatedQuestions = selected.map(w => ({
        wordObj: w,
        targetWord: w.word.trim()
    }));

    setQuestions(generatedQuestions);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

  // --- 3. SORU YÜKLEME ---
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveAudio(null);

    if (gameStatus === "playing" && questions.length > 0 && questions[currentIndex]) {
      const target = questions[currentIndex].targetWord;
      
      // SIFIRLAMALAR
      setIsWordComplete(false);
      setMistakeCount(0);
      setHintCount(0);
      setCurrentWordPoints(10);
      setHasRecordedMistake(false); 

      // Otomatik Ses Çal
      setTimeout(() => handleSpeak(target), 500);

      if (inputMethod === "bubbles") {
          let lettersArray = target.split('').map((char, index) => ({
            id: `${char}-${index}-${Math.random()}`,
            char: char,
            isUsed: false
          }));

          // Force Shuffle
          if (target.length > 1) {
              let isSame = true;
              while (isSame) {
                  lettersArray.sort(() => Math.random() - 0.5);
                  const currentOrder = lettersArray.map(l => l.char).join('');
                  if (currentOrder !== target) isSame = false;
              }
          }

          setShuffledLetters(lettersArray);
          setCompletedLetters([]);
      } else {
          setUserInput("");
      }
    }
    
    return () => window.speechSynthesis.cancel();
  }, [currentIndex, gameStatus, questions, inputMethod]);

  const getDynamicStyle = (length) => {
    if (length <= 5) return { box: "w-11 h-14", text: "text-2xl" }; 
    if (length <= 8) return { box: "w-8 h-11", text: "text-xl" };    
    if (length <= 11) return { box: "w-6 h-9", text: "text-lg" };    
    if (length <= 14) return { box: "w-4 h-8", text: "text-sm" };
    if (length <= 17) return { box: "w-3 h-6", text: "text-[10px]" };
    return { box: "w-2 h-5", text: "text-[8px]" }; 
  };

  const handleSpeak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.8;
    u.onend = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(u);
    setIsPlaying(true);
  };

  const recordMistakeOnce = () => {
      if (!hasRecordedMistake) {
          registerMistake(questions[currentIndex].wordObj.id, 1);
          setHasRecordedMistake(true); 
      }
  };

  // ==========================================
  // OYUN MANTIĞI: ORTAK FONKSİYONLAR
  // ==========================================

  const handleSuccess = (wordToSpeak) => {
      setIsWordComplete(true);
      handleSpeak(wordToSpeak); 
      
      updateGameStats('listening', 1); // İstatistik
      updateGameStats('writing2', 1);  // Görev Sayacı
      
      const currentQ = questions[currentIndex];
      handleUpdateWord(currentQ.wordObj.id, { lastSeen_listening: new Date().toISOString() });

      const finalPoints = Math.max(0, currentWordPoints);
      if (finalPoints > 0) {
          addScore(finalPoints);
          setScore(s => s + finalPoints);
      }
  };

  const handleFail = (wordToSpeak) => {
      setCurrentWordPoints(0);
      setIsWordComplete(true);
      
      const target = questions[currentIndex].targetWord;
      if (inputMethod === "bubbles") {
          setCompletedLetters(target.split(''));
      } else {
          setUserInput(target);
      }

      handleSpeak(wordToSpeak);
      
      updateGameStats('listening', 1);
      updateGameStats('writing2', 1);

      const currentQ = questions[currentIndex];
      
      // HATA KAYIT NOKTASI: Pas geçilince veya can bitince
      recordMistakeOnce();
      
      handleUpdateWord(currentQ.wordObj.id, { lastSeen_listening: new Date().toISOString() });
  };

  const handlePass = () => {
      handleFail(questions[currentIndex].targetWord);
  };

  const handleNext = (e) => {
      handleBlur(e);
      if (currentIndex + 1 < questions.length) setCurrentIndex(p => p + 1);
      else setGameStatus("finished");
  };

  // ==========================================
  // OYUN MANTIĞI: BUBBLES
  // ==========================================
  const handleLetterClick = (letterObj, e) => {
    handleBlur(e);
    if (isWordComplete || letterObj.isUsed) return;

    const targetWord = questions[currentIndex].targetWord;
    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    if (letterObj.char.toLowerCase() === expectedChar.toLowerCase()) {
        const newShuffled = shuffledLetters.map(l => l.id === letterObj.id ? { ...l, isUsed: true } : l);
        setShuffledLetters(newShuffled);
        const newCompleted = [...completedLetters, letterObj.char];
        setCompletedLetters(newCompleted);

        if (newCompleted.length === targetWord.length) handleSuccess(targetWord);
    } else {
        const newMistakes = mistakeCount + 1;
        setMistakeCount(newMistakes);
        
        setCurrentWordPoints(p => Math.max(0, p - 2));
        
        setWrongAnimationId(letterObj.id);
        setTimeout(() => setWrongAnimationId(null), 500);

        if (newMistakes > 3) handleFail(targetWord);
    }
  };

  // ==========================================
  // OYUN MANTIĞI: KEYBOARD
  // ==========================================
  const handleKeyboardSubmit = (e) => {
      if (e) e.preventDefault();
      if (isWordComplete) return;

      const targetWord = questions[currentIndex].targetWord;
      
      if (userInput.trim().toLowerCase() === targetWord.toLowerCase()) {
          handleSuccess(targetWord);
      } else {
          const newMistakes = mistakeCount + 1;
          setMistakeCount(newMistakes);

          setCurrentWordPoints(p => Math.max(0, p - 1));

          setWrongAnimationId("input");
          setTimeout(() => setWrongAnimationId(null), 500);

          if (newMistakes >= 3) handleFail(targetWord);
      }
  };

  const handleKeyboardHint = () => {
      if (isWordComplete) return;
      const targetWord = questions[currentIndex].targetWord;
      const len = targetWord.length;

      const maxHints = len <= 2 ? 1 : 2;
      if (hintCount >= maxHints) return;

      const newHintCount = hintCount + 1;
      setHintCount(newHintCount);
      setCurrentWordPoints(p => Math.max(0, p - 2));

      let correctPrefixLength = 0;
      const cleanInput = userInput.trim().toLowerCase();
      const cleanTarget = targetWord.toLowerCase();

      for (let i = 0; i < cleanInput.length; i++) {
          if (cleanInput[i] === cleanTarget[i]) {
              correctPrefixLength++;
          } else {
              break; 
          }
      }

      const newRevealLength = correctPrefixLength + 1;
      const newInputValue = targetWord.substring(0, newRevealLength);
      
      setUserInput(newInputValue);
      if(inputRef.current) inputRef.current.focus();
  };

  const handleQuitEarly = (e) => {
    handleBlur(e);
    if (score > 0) addScore(score);
    setGameStatus("finished");
  };

  // ===========================
  // EKRANLAR
  // ===========================
  if (gameStatus === "mode-selection") {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <style>{`
                * { -webkit-tap-highlight-color: transparent !important; }
                @media (hover: hover) {
                    .btn-select:hover { border-color: #fb923c !important; background-color: #fff7ed !important; }
                    .btn-learn:hover { border-color: #818cf8 !important; background-color: #eef2ff !important; }
                    .btn-wait:hover { border-color: #cbd5e1 !important; background-color: #f8fafc !important; }
                    .btn-hard:hover { border-color: #fecaca !important; background-color: #fef2f2 !important; }
                }
                .menu-btn { transition: all 0.2s ease; }
            `}</style>

            <div className="w-full max-w-sm space-y-6">
                
                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm active:bg-slate-100 transition-colors"><Home className="w-5 h-5 text-slate-600" /></button>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Headphones className="w-6 h-6 text-purple-600"/> Dinle & Yaz
                    </h2>
                    <div className="w-9"></div>
                </div>

                {/* --- INPUT SEÇİMİ TOGGLE --- */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex relative">
                    <button onClick={() => setInputMethod("bubbles")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all z-10 ${inputMethod === "bubbles" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}>
                        <MousePointer2 className="w-4 h-4" /> Harf Seç
                    </button>
                    <button onClick={() => setInputMethod("keyboard")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all z-10 ${inputMethod === "keyboard" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}>
                        <Keyboard className="w-4 h-4" /> Klavye
                    </button>
                </div>

                <div className="text-center py-2">
                    <p className="text-slate-500 text-sm">
                        Kelimeyi dinle ve {inputMethod === "bubbles" ? "harfleri seçerek" : "klavye ile yazarak"} bul.
                    </p>
                </div>

                <div className="space-y-4">
                    <button onClick={(e) => startSession('review', e)} disabled={pools.reviewPool.length === 0} className="menu-btn btn-select w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4"><div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div><div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Öğrendiklerini Pekiştir</div></div></div>
                            <div className="text-2xl font-black text-orange-600">{pools.reviewPool.length}</div>
                        </div>
                    </button>

                    <button onClick={(e) => startSession('learn', e)} disabled={pools.learnPool.length === 0} className="menu-btn btn-learn w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4"><div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><BrainCircuit className="w-8 h-8" /></div><div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni Kelimeler</div></div></div>
                            <div className="text-2xl font-black text-indigo-600">{pools.learnPool.length}</div>
                        </div>
                    </button>

                    <button onClick={(e) => startSession('waiting', e)} disabled={pools.waitingPool.length === 0} className="menu-btn btn-wait w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4"><div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div><div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Henüz Zamanı Gelmeyenler</div></div></div>
                            <div className="text-2xl font-black text-slate-500">{pools.waitingPool.length}</div>
                        </div>
                    </button>

                    {pools.hardPool.length > 0 && (
                        <button onClick={(e) => startSession('hard', e)} className="menu-btn btn-hard w-full p-5 rounded-2xl shadow-md border-red-100 bg-red-50 focus:outline-none">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4"><div className="bg-red-200 p-3 rounded-xl text-red-700 animate-pulse"><AlertTriangle className="w-8 h-8" /></div><div className="text-left"><div className="font-bold text-xl text-red-700">Hata Yaptıklarım</div><div className="text-sm text-red-500">Zorlandığın Kelimeler</div></div></div>
                                <div className="text-2xl font-black text-red-600">{pools.hardPool.length}</div>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
      );
  }

  if (gameStatus === "finished") {
      const maxScore = questions.length * 10;
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
                <div className="bg-pink-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-pink-600"/></div>
                <h2 className="text-2xl font-bold text-slate-800">Test Tamamlandı</h2>
                <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-sm text-slate-400 font-bold uppercase">Kazanılan Puan</div>
                    <div className="text-5xl font-extrabold text-indigo-600 mt-2">{score}</div>
                    <div className="text-xs text-slate-400 mt-1">Maksimum: {maxScore}</div>
                </div>
                <button onClick={() => setGameStatus("mode-selection")} className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-transform">Başka Test Çöz</button>
                <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 active:scale-95 transition-transform">Ana Sayfa</button>
            </div>
        </div>
      );
  }

  if (!questions[currentIndex]) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-purple-600"/></div>;

  const currentQ = questions[currentIndex];
  const targetWord = currentQ.targetWord;
  const styles = getDynamicStyle(targetWord.length);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
        <style>{`
            * { -webkit-tap-highlight-color: transparent !important; }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-5px); }
              75% { transform: translateX(5px); }
            }
            .letter-btn { transition: all 0.2s ease; }
            .letter-btn:active { transform: scale(0.95); }
        `}</style>

        <div className="w-full max-w-md space-y-4 mt-2">
            
            <div className="flex justify-between items-center">
                <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full shadow-sm active:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
                <div className="font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 text-xs">
                    {gameMode === 'hard' ? 'Hata Modu' : 'Dinle'}: {currentIndex + 1} / {questions.length}
                </div>
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200">
                    <Trophy className="w-4 h-4"/> {score}
                </div>
            </div>

            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full transition-all duration-500" style={{width:`${((currentIndex + 1) / questions.length) * 100}%`}}></div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center relative overflow-hidden min-h-[450px] flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-pink-400"></div>
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-bold border border-green-100 animate-in fade-in">
                    <Star className="w-3 h-3 fill-current"/> Soru: {Math.max(0, currentWordPoints)}p
                </div>

                {currentQ.wordObj.tags && currentQ.wordObj.tags.length > 0 && (
                    <div className="absolute top-0 left-4 mt-4 flex flex-col items-start gap-1 max-w-[80px]">
                        {currentQ.wordObj.tags.map((tag, i) => (
                            <span key={i} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-full">{tag}</span>
                        ))}
                    </div>
                )}

                {/* SES BUTONU (SORU) */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4 mt-8">
                    <button onClick={(e) => { handleBlur(e); handleSpeak(targetWord); }} className={`audio-btn w-28 h-28 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 focus:outline-none focus:ring-0 ${isPlaying ? "bg-red-100 text-red-500 animate-pulse" : "bg-purple-100 text-purple-600"}`}>
                        {isPlaying ? <Square className="w-12 h-12 fill-current"/> : <Volume2 className="w-14 h-14"/>}
                    </button>
                    <div className="text-slate-400 text-sm font-bold uppercase tracking-widest animate-pulse">Dinle ve Yaz</div>
                </div>

                {inputMethod === "bubbles" ? (
                    <>
                        <div className="flex flex-wrap justify-center gap-1 min-h-[60px] items-end content-center">
                            {targetWord.split('').map((_, idx) => {
                                const char = completedLetters[idx];
                                const isFilled = char !== undefined;
                                return (
                                    <div key={idx} className={`${styles.box} ${styles.text} flex items-center justify-center font-bold border-b-4 rounded-t-lg transition-all ${isFilled ? "border-purple-500 text-purple-700 bg-purple-50" : "border-slate-200 bg-slate-50 text-transparent"}`}>
                                        {char}
                                    </div>
                                );
                            })}
                        </div>

                        {!isWordComplete ? (
                            <div className="space-y-4">
                                <div className="flex flex-wrap justify-center gap-2 content-center pb-2">
                                    {shuffledLetters.map((item) => (
                                        <button key={item.id} onClick={(e) => handleLetterClick(item, e)} disabled={item.isUsed} className={`letter-btn w-10 h-10 md:w-11 md:h-11 rounded-xl font-bold text-lg shadow-[0_3px_0_rgb(0,0,0,0.1)] ${item.isUsed ? "opacity-0 pointer-events-none scale-0" : wrongAnimationId === item.id ? "bg-red-500 text-white shadow-none animate-[shake_0.5s_ease-in-out]" : "bg-white border-2 border-slate-200 text-slate-700 active:bg-purple-100 active:text-purple-600"}`}>
                                            {item.char}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-center text-xs text-red-400 font-bold">Hata Hakkı: {3 - mistakeCount}</div>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <>
                        {!isWordComplete ? (
                            <form onSubmit={handleKeyboardSubmit} className="space-y-3 pb-2">
                                <input ref={inputRef} type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Duyduğunu yaz..." className={`w-full text-center text-2xl font-bold p-3 border-b-4 rounded-xl outline-none transition-all ${wrongAnimationId === "input" ? "border-red-500 bg-red-50 text-red-600 animate-[shake_0.5s_ease-in-out]" : "border-purple-200 bg-purple-50 text-purple-700 focus:border-purple-500"}`} autoComplete="off" autoCorrect="off" autoCapitalize="none" />
                                <div className="flex justify-between items-center px-2">
                                    <div className="text-xs font-bold text-slate-400">Hata Hakkı: <span className="text-red-500">{3 - mistakeCount}</span></div>
                                    <button type="button" onClick={handleKeyboardHint} disabled={hintCount >= (targetWord.length <= 2 ? 1 : 2)} className="text-xs flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold active:scale-95 disabled:opacity-50">
                                        <Lightbulb className="w-3 h-3" /> İpucu (-2p)
                                    </button>
                                </div>
                                
                                <button type="submit" className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl shadow-md mt-4 flex items-center justify-center gap-2 hover:bg-purple-700 active:scale-95 transition-all">
                                    Kontrol Et <Check className="w-5 h-5"/>
                                </button>
                            </form>
                        ) : (
                            <div className="bg-green-50 border border-green-200 text-green-700 font-bold text-2xl py-4 rounded-xl animate-in zoom-in">{targetWord}</div>
                        )}
                    </>
                )}

                {isWordComplete && (
                    <div className="animate-in zoom-in duration-300 pb-2 w-full">
                        <div className="flex items-center justify-center gap-2 mb-4 text-green-600 font-bold bg-green-50 p-3 rounded-xl border border-green-100">
                            {mistakeCount > 0 ? <><AlertTriangle className="w-5 h-5 text-orange-500"/> Doğrusu Bu</> : <><CheckCircle2 className="w-6 h-6"/> Harika!</>}
                        </div>
                        <button onClick={handleNext} className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-purple-700 active:scale-95 transition-transform">
                            {currentIndex + 1 === questions.length ? "Sonuçları Gör" : "Sıradaki Kelime"} <ArrowRight className="w-5 h-5"/>
                        </button>
                    </div>
                )}
            </div>

            {/* PAS BUTONU */}
            {!isWordComplete && (
                <button onClick={handlePass} className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-4 rounded-xl shadow-sm flex items-center justify-center gap-2 mt-4 active:scale-95 transition-all hover:bg-red-50 hover:border-red-200">
                    <Flag className="w-5 h-5"/>
                    <span>Pas Geç (Cevabı Gör)</span>
                </button>
            )}

            {/* BİTİR VE ÇIK */}
            <button onClick={handleQuitEarly} className="w-full text-slate-400 hover:text-red-500 font-medium text-sm flex items-center justify-center gap-2 py-2 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" /> Bitir (Puanı Al ve Çık)
            </button>

        </div>
    </div>
  );
}
