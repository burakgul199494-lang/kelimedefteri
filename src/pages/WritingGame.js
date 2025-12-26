import React, { useState, useEffect, useMemo, useRef } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, Trophy, Loader2, Home, Volume2, CheckCircle2, 
  PenTool, RefreshCw, BrainCircuit, Hourglass, Lightbulb, 
  AlertTriangle, ArrowRight, Square, Star, Keyboard, MousePointer2, Flag
} from "lucide-react";

export default function WritingGame() {
  const { getAllWords, addScore, updateGameStats, handleUpdateWord, knownWordIds, learningQueue, registerMistake } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameMode, setGameMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("mode-selection"); 
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
  const [mistakeCount, setMistakeCount] = useState(0); // O anki sorudaki yanlış deneme sayısı
  const [hintCount, setHintCount] = useState(0);
  const [currentWordPoints, setCurrentWordPoints] = useState(10); 
  const [activeAudio, setActiveAudio] = useState(null);

  // 🔥 YENİ STATE: Bu turda veritabanına hata işlendi mi?
  const [hasRecordedMistake, setHasRecordedMistake] = useState(false);

  const inputRef = useRef(null);

  // --- IPHONE FIX ---
  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  // --- 1. KELİME HAVUZLARI ---
  const pools = useMemo(() => {
    const all = getAllWords();
    const now = new Date();
    
    const validWords = all.filter(w => w.word && w.definitions && w.definitions[0]?.meaning);
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
        if (!w.lastSeen_writing) {
            neverSeen.push(w); 
        } else {
            seen.push(w); 
        }
    });

    neverSeen.sort(() => 0.5 - Math.random());
    seen.sort((a, b) => new Date(a.lastSeen_writing).getTime() - new Date(b.lastSeen_writing).getTime());

    const smartPool = [...neverSeen, ...seen];
    const selectedCandidates = smartPool.slice(0, 10);
    const selected = selectedCandidates.sort(() => 0.5 - Math.random());

    const generatedQuestions = selected.map(w => ({
        wordObj: w,
        targetWord: w.word.trim(),
        questionText: w.definitions[0].meaning 
    }));

    setQuestions(generatedQuestions);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

  // --- 3. SORU YÜKLEME ---
  useEffect(() => {
    window.speechSynthesis.cancel();
    setActiveAudio(null);

    if (gameStatus === "playing" && questions.length > 0 && questions[currentIndex]) {
      const target = questions[currentIndex].targetWord;
      
      // SIFIRLAMALAR
      setIsWordComplete(false);
      setMistakeCount(0);
      setHintCount(0);
      setCurrentWordPoints(10);
      setHasRecordedMistake(false); // 🔥 Her yeni soruda hata bayrağını indir.

      if (inputMethod === "bubbles") {
          const letters = target.split('').map((char, index) => ({
            id: `${char}-${index}-${Math.random()}`,
            char: char,
            isUsed: false
          }));
          setShuffledLetters([...letters].sort(() => Math.random() - 0.5));
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

  const handleSpeak = (text, id) => {
    if (!text) return;
    if (activeAudio === id) {
        window.speechSynthesis.cancel();
        setActiveAudio(null);
    } else {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.onend = () => setActiveAudio(null);
        u.onerror = () => setActiveAudio(null);
        window.speechSynthesis.speak(u);
        setActiveAudio(id);
    }
  };

  // 🔥 YARDIMCI FONKSİYON: HATA KAYDET (TEK SEFERLİK)
  const recordMistakeOnce = () => {
      if (!hasRecordedMistake) {
          registerMistake(questions[currentIndex].wordObj.id, 1);
          setHasRecordedMistake(true); // Bayrağı kaldır, bir daha kaydetme
      }
  };

  // ==========================================
  // OYUN MANTIĞI: ORTAK FONKSİYONLAR
  // ==========================================

  const handleSuccess = (wordToSpeak) => {
      setIsWordComplete(true);
      handleSpeak(wordToSpeak, 'main'); 
      updateGameStats('writing', 1);
      
      const currentQ = questions[currentIndex];
      handleUpdateWord(currentQ.wordObj.id, { lastSeen_writing: new Date().toISOString() });

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

      handleSpeak(wordToSpeak, 'main');
      updateGameStats('writing', 1);

      const currentQ = questions[currentIndex];
      
      // Kaybetme durumunda her türlü hata kaydedilmeli
      recordMistakeOnce();
      
      handleUpdateWord(currentQ.wordObj.id, { lastSeen_writing: new Date().toISOString() });
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
  // OYUN MANTIĞI: BUBBLES (HARF SEÇME)
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
        // YANLIŞ
        const newMistakes = mistakeCount + 1;
        setMistakeCount(newMistakes);
        
        setCurrentWordPoints(p => Math.max(0, p - 2));
        
        // 🔥 HATA KAYDI (SADECE İLK HATADA)
        recordMistakeOnce();

        setWrongAnimationId(letterObj.id);
        setTimeout(() => setWrongAnimationId(null), 500);

        if (newMistakes > 3) handleFail(targetWord);
    }
  };

  // ==========================================
  // OYUN MANTIĞI: KEYBOARD (KLAVYE)
  // ==========================================
  const handleKeyboardSubmit = (e) => {
      if (e) e.preventDefault();
      if (isWordComplete) return;

      const targetWord = questions[currentIndex].targetWord;
      
      if (userInput.trim().toLowerCase() === targetWord.toLowerCase()) {
          handleSuccess(targetWord);
      } else {
          // YANLIŞ
          const newMistakes = mistakeCount + 1;
          setMistakeCount(newMistakes);

          setCurrentWordPoints(p => Math.max(0, p - 1));

          // 🔥 HATA KAYDI (SADECE İLK HATADA)
          recordMistakeOnce();

          setWrongAnimationId("input");
          setTimeout(() => setWrongAnimationId(null), 500);

          if (newMistakes >= 3) handleFail(targetWord);
      }
  };

  const handleKeyboardHint = () => {
      if (isWordComplete) return;
      const targetWord = questions[currentIndex].targetWord;
      const len = targetWord.length;

      // İpucu Limiti
      const maxHints = len <= 2 ? 1 : 2;
      if (hintCount >= maxHints) return;

      const newHintCount = hintCount + 1;
      setHintCount(newHintCount);

      // Puan Cezası
      setCurrentWordPoints(p => Math.max(0, p - 2));

      // 🔥 AKILLI İPUCU ALGORİTMASI 🔥
      // Kullanıcının yazdığı ile doğrusunu karşılaştırıp, doğru gittiği yere kadar al,
      // sonraki harfi ekle.
      let correctPrefixLength = 0;
      const cleanInput = userInput.trim().toLowerCase();
      const cleanTarget = targetWord.toLowerCase();

      // Ne kadarı doğru yazılmış?
      for (let i = 0; i < cleanInput.length; i++) {
          if (cleanInput[i] === cleanTarget[i]) {
              correctPrefixLength++;
          } else {
              break; // Hata bulduğu an dur.
          }
      }

      // Mevcut doğru kısmın üzerine 1 harf daha ekle
      const newRevealLength = correctPrefixLength + 1;
      const newInputValue = targetWord.substring(0, newRevealLength);
      
      setUserInput(newInputValue);
      
      if(inputRef.current) inputRef.current.focus();
  };

  const handleQuitEarly = (e) => {
    handleBlur(e);
    setGameStatus("finished");
  };

  // ===========================
  // === 1. MOD SEÇİM EKRANI ===
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
                        <PenTool className="w-6 h-6 text-indigo-600"/> Yazma Oyunu
                    </h2>
                    <div className="w-9"></div>
                </div>

                {/* --- INPUT SEÇİMİ TOGGLE --- */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex relative">
                    <button 
                        onClick={() => setInputMethod("bubbles")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all z-10 
                        ${inputMethod === "bubbles" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                        <MousePointer2 className="w-4 h-4" /> Harf Seç
                    </button>
                    <button 
                        onClick={() => setInputMethod("keyboard")}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all z-10
                        ${inputMethod === "keyboard" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                        <Keyboard className="w-4 h-4" /> Klavye
                    </button>
                </div>

                <div className="text-center py-2">
                    <p className="text-slate-500 text-sm">
                        {inputMethod === "bubbles" 
                            ? "Karışık harflerden kelimeyi oluştur. İpucu yok, 3 hata hakkın var." 
                            : "Kelimeyi klavye ile yaz. İpucu var (-2p), yanlış yazım (-1p)."}
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

                    {/* 🔥 HATA YAPTIKLARIM BUTONU (Dinamik) 🔥 */}
                    {pools.hardPool.length > 0 && (
                        <button onClick={(e) => startSession('hard', e)} className="menu-btn btn-hard w-full p-5 rounded-2xl shadow-md border-red-100 bg-red-50 focus:outline-none">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-200 p-3 rounded-xl text-red-700 animate-pulse"><AlertTriangle className="w-8 h-8" /></div>
                                    <div className="text-left">
                                        <div className="font-bold text-xl text-red-700">Hata Yaptıklarım</div>
                                        <div className="text-sm text-red-500">Zorlandığın Kelimeler</div>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-red-600">{pools.hardPool.length}</div>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
      );
  }

  // ===========================
  // === 2. BİTİŞ EKRANI ===
  // ===========================
  if (gameStatus === "finished") {
      const maxScore = questions.length * 10;
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <Trophy className="w-10 h-10 text-blue-600"/>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Test Tamamlandı</h2>
                <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-sm text-slate-400 font-bold uppercase">Kazanılan Puan</div>
                    <div className="text-5xl font-extrabold text-blue-600 mt-2">{score}</div>
                    <div className="text-xs text-slate-400 mt-1">Maksimum: {maxScore}</div>
                </div>
                <button onClick={() => setGameStatus("mode-selection")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-transform">Başka Test Çöz</button>
                <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 active:scale-95 transition-transform">Ana Sayfa</button>
            </div>
        </div>
      );
  }

  if (!questions[currentIndex]) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-blue-600"/></div>;

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
            
            {/* ÜST BAR */}
            <div className="flex justify-between items-center">
                <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full shadow-sm active:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
                
                <div className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-xs">
                    {gameMode === 'hard' ? 'Hata Modu' : 'Yazma'}: {currentIndex + 1} / {questions.length}
                </div>

                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200">
                    <Trophy className="w-4 h-4"/> {score}
                </div>
            </div>

            {/* PROGRESS */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-500" style={{width:`${((currentIndex + 1) / questions.length) * 100}%`}}></div>
            </div>

            {/* --- KART ALANI --- */}
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center relative overflow-hidden min-h-[450px] flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-cyan-400"></div>

                <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-bold border border-green-100 animate-in fade-in">
                    <Star className="w-3 h-3 fill-current"/> Soru: {Math.max(0, currentWordPoints)}p
                </div>

                {/* ETİKETLER */}
                {currentQ.wordObj.tags && currentQ.wordObj.tags.length > 0 && (
                    <div className="absolute top-0 left-4 mt-4 flex flex-col items-start gap-1 max-w-[80px]">
                        {currentQ.wordObj.tags.map((tag, i) => (
                            <span key={i} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-full">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* TÜRKÇE SORU */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4 mt-8">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">TÜRKÇE ANLAMI</div>
                    <div className="bg-slate-50 px-6 py-8 rounded-3xl border-2 border-slate-100 w-full flex items-center justify-center">
                        <h2 className="text-3xl font-black text-slate-800 leading-tight break-words">{currentQ.questionText}</h2>
                    </div>
                    
                    {/* SES (Sadece Bittiğinde Çalar) */}
                    <button 
                        onClick={(e) => { handleBlur(e); handleSpeak(targetWord, 'main'); }}
                        disabled={!isWordComplete}
                        className={`p-3 rounded-full flex items-center justify-center transition-all 
                            ${isWordComplete 
                                ? "bg-indigo-100 text-indigo-600 animate-pulse" 
                                : "bg-slate-50 text-slate-300 cursor-not-allowed opacity-50"}`}
                    >
                        {activeAudio === 'main' ? <Square className="w-5 h-5 fill-current"/> : <Volume2 className="w-5 h-5"/>}
                    </button>
                </div>

                {/* --- INPUT ALANI (BUBBLES VEYA KLAVYE) --- */}
                
                {inputMethod === "bubbles" ? (
                    /* 🅰️ BUBBLES MODU GÖRÜNÜMÜ */
                    <>
                        <div className="flex flex-wrap justify-center gap-1 min-h-[60px] items-end content-center">
                            {targetWord.split('').map((_, idx) => {
                                const char = completedLetters[idx];
                                const isFilled = char !== undefined;
                                return (
                                    <div key={idx} className={`${styles.box} ${styles.text} flex items-center justify-center font-bold border-b-4 rounded-t-lg transition-all ${isFilled ? "border-blue-500 text-blue-700 bg-blue-50" : "border-slate-200 bg-slate-50 text-transparent"}`}>
                                        {char}
                                    </div>
                                );
                            })}
                        </div>

                        {!isWordComplete ? (
                            <div className="space-y-4">
                                <div className="flex flex-wrap justify-center gap-2 content-center pb-2">
                                    {shuffledLetters.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={(e) => handleLetterClick(item, e)}
                                            disabled={item.isUsed}
                                            className={`letter-btn w-10 h-10 md:w-11 md:h-11 rounded-xl font-bold text-lg shadow-[0_3px_0_rgb(0,0,0,0.1)] 
                                                ${item.isUsed ? "opacity-0 pointer-events-none scale-0" : 
                                                wrongAnimationId === item.id ? "bg-red-500 text-white shadow-none animate-[shake_0.5s_ease-in-out]" : 
                                                "bg-white border-2 border-slate-200 text-slate-700 active:bg-blue-100"}`}
                                        >
                                            {item.char}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-center text-xs text-red-400 font-bold">
                                    Hata Hakkı: {3 - mistakeCount}
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : (
                    /* ⌨️ KLAVYE MODU GÖRÜNÜMÜ */
                    <>
                        {!isWordComplete ? (
                            <form onSubmit={handleKeyboardSubmit} className="space-y-3 pb-2">
                                <input 
                                    ref={inputRef}
                                    type="text" 
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="Cevabı yaz..."
                                    className={`w-full text-center text-2xl font-bold p-3 border-b-4 rounded-xl outline-none transition-all
                                        ${wrongAnimationId === "input" ? "border-red-500 bg-red-50 text-red-600 animate-[shake_0.5s_ease-in-out]" : "border-indigo-200 bg-indigo-50 text-indigo-700 focus:border-indigo-500"}`}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="none"
                                />
                                <div className="flex justify-between items-center px-2">
                                    <div className="text-xs font-bold text-slate-400">
                                        Hata Hakkı: <span className="text-red-500">{3 - mistakeCount}</span>
                                    </div>
                                    
                                    {/* İPUCU BUTONU (SADECE KLAVYE MODUNDA) */}
                                    <button 
                                        type="button"
                                        onClick={handleKeyboardHint}
                                        disabled={hintCount >= (targetWord.length <= 2 ? 1 : 2)}
                                        className="text-xs flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold active:scale-95 disabled:opacity-50"
                                    >
                                        <Lightbulb className="w-3 h-3" /> İpucu (-2p)
                                    </button>
                                </div>
                                <button type="submit" className="hidden">Gönder</button>
                            </form>
                        ) : (
                            <div className="bg-green-50 border border-green-200 text-green-700 font-bold text-2xl py-4 rounded-xl animate-in zoom-in">
                                {targetWord}
                            </div>
                        )}
                    </>
                )}

                {/* BAŞARI / GEÇİŞ ALANI */}
                {isWordComplete && (
                    <div className="animate-in zoom-in duration-300 pb-2 w-full">
                        <div className="flex items-center justify-center gap-2 mb-4 text-green-600 font-bold bg-green-50 p-3 rounded-xl border border-green-100">
                            {mistakeCount > 0 ? <><AlertTriangle className="w-5 h-5 text-orange-500"/> Doğrusu Bu</> : <><CheckCircle2 className="w-6 h-6"/> Harika!</>}
                        </div>
                        <button onClick={handleNext} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-transform">
                            {currentIndex + 1 === questions.length ? "Sonuçları Gör" : "Sıradaki Kelime"} 
                            <ArrowRight className="w-5 h-5"/>
                        </button>
                    </div>
                )}
            </div>

            {/* PAS BUTONU */}
            {!isWordComplete && (
                <button onClick={handlePass} className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 text-sm font-medium transition-colors focus:outline-none p-3 mt-2 rounded-xl active:bg-slate-100">
                    <Flag className="w-4 h-4"/> Pas Geç (Cevabı Gör)
                </button>
            )}
        </div>
    </div>
  );
}
