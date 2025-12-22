import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, Trophy, Loader2, Home, Volume2, CheckCircle2, 
  PenTool, RefreshCw, BrainCircuit, Hourglass, Lightbulb, AlertTriangle, ArrowRight, Square
} from "lucide-react";

export default function WritingGame() {
  const { getAllWords, addScore, updateGameStats, handleUpdateWord, knownWordIds, learningQueue } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameMode, setGameMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("mode-selection"); 
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [completedLetters, setCompletedLetters] = useState([]);
  const [isWordComplete, setIsWordComplete] = useState(false);
  const [wrongAnimationId, setWrongAnimationId] = useState(null);
  
  const [mistakeCount, setMistakeCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [currentWordPoints, setCurrentWordPoints] = useState(10); 

  const [activeAudio, setActiveAudio] = useState(null);

  // --- IPHONE FIX ---
  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  // --- 1. KELİME HAVUZLARI ---
  const pools = useMemo(() => {
    const all = getAllWords();
    const now = new Date();
    
    // Tanımı (Türkçesi) olan kelimeler geçerlidir
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

    return { learnPool, reviewPool, waitingPool };
  }, [getAllWords, knownWordIds, learningQueue]);

  // --- 2. OYUNU BAŞLATMA ---
  const startSession = (mode, e) => {
    handleBlur(e);
    setGameMode(mode);
    
    let selectedPool = [];
    if (mode === "learn") selectedPool = pools.learnPool;
    else if (mode === "review") selectedPool = pools.reviewPool;
    else if (mode === "waiting") selectedPool = pools.waitingPool;

    if (selectedPool.length === 0) {
      alert("Bu modda çalışılacak kelime bulunamadı.");
      return;
    }

    // --- AKILLI SIRALAMA (Writing için) ---
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
    
    // 10 Soruya Düşürüldü
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

    // CRASH FIX: questions dizisi dolu mu ve geçerli index var mı?
    if (gameStatus === "playing" && questions.length > 0 && questions[currentIndex]) {
      const target = questions[currentIndex].targetWord;
      const letters = target.split('').map((char, index) => ({
        id: `${char}-${index}-${Math.random()}`,
        char: char,
        isUsed: false
      }));
      
      // State sıfırlama (Temiz bir sayfa için)
      setShuffledLetters([...letters].sort(() => Math.random() - 0.5));
      setCompletedLetters([]);
      setIsWordComplete(false);
      setMistakeCount(0);
      setHintCount(0);
      setCurrentWordPoints(10);
    }
    
    return () => window.speechSynthesis.cancel();
  }, [currentIndex, gameStatus, questions]);

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

  // --- HARF TIKLAMA ---
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
        setWrongAnimationId(letterObj.id);
        setTimeout(() => setWrongAnimationId(null), 500);
        if (newMistakes >= 2) handleFail(targetWord);
    }
  };

  // --- İPUCU FONKSİYONU (YENİ PUANLAMA MANTIĞI) ---
  const handleHint = (e) => {
      handleBlur(e);
      if (isWordComplete) return;

      const targetWord = questions[currentIndex].targetWord;
      
      // KURAL 1: Tek harfli kelimelerde ipucu çalışmasın
      if (targetWord.length <= 1) return;

      const nextIndex = completedLetters.length;
      const expectedChar = targetWord[nextIndex];
      const correctLetterObj = shuffledLetters.find(l => !l.isUsed && l.char.toLowerCase() === expectedChar.toLowerCase());

      if (correctLetterObj) {
          // Puanlama Mantığı
          let nextPoints = currentWordPoints;
          const newHintCount = hintCount + 1;
          setHintCount(newHintCount);

          // KURAL 2: İlk ipucunda puan direkt 5'e düşer.
          if (newHintCount === 1) {
              nextPoints = 5;
          } 
          // İkinci ve sonraki ipuçlarında puan 0 olur.
          else {
              nextPoints = 0;
          }

          // KURAL 3: Eğer bu ipucu kelimeyi tamamlıyorsa, puan 0 olsun.
          const isLastLetter = (completedLetters.length + 1) === targetWord.length;
          if (isLastLetter) {
              nextPoints = 0;
          }

          setCurrentWordPoints(nextPoints);
          
          // Harfi Yerleştirme
          const newShuffled = shuffledLetters.map(l => l.id === correctLetterObj.id ? { ...l, isUsed: true } : l);
          setShuffledLetters(newShuffled);
          
          const newCompleted = [...completedLetters, correctLetterObj.char];
          setCompletedLetters(newCompleted);

          // Kelime bitti mi?
          if (newCompleted.length === targetWord.length) {
              // Puanı override et (state güncellenmesi gecikebilir)
              handleSuccess(targetWord, nextPoints); 
          }
      }
  };

  // --- BAŞARI FONKSİYONU (Puan Parametresi Eklendi) ---
  const handleSuccess = (wordToSpeak, pointsOverride = null) => {
      setIsWordComplete(true);
      handleSpeak(wordToSpeak, 'main'); 
      updateGameStats('writing', 1);
      
      const currentQ = questions[currentIndex];
      handleUpdateWord(currentQ.wordObj.id, { lastSeen_writing: new Date().toISOString() });

      // Eğer override varsa onu kullan, yoksa state'i kullan
      const finalPoints = pointsOverride !== null ? pointsOverride : currentWordPoints;

      if (finalPoints > 0) {
          addScore(finalPoints);
          setScore(s => s + finalPoints);
      }
  };

  const handleFail = (wordToSpeak) => {
      setCurrentWordPoints(0);
      const targetWord = questions[currentIndex].targetWord;
      setCompletedLetters(targetWord.split(''));
      setIsWordComplete(true);
      handleSpeak(wordToSpeak, 'main');
      updateGameStats('writing', 1);

      const currentQ = questions[currentIndex];
      handleUpdateWord(currentQ.wordObj.id, { lastSeen_writing: new Date().toISOString() });
  };

  const handleNext = (e) => {
      handleBlur(e);
      if (currentIndex + 1 < questions.length) setCurrentIndex(p => p + 1);
      else setGameStatus("finished");
  };

  const handleQuitEarly = (e) => {
      handleBlur(e);
      setGameStatus("finished");
  };

  // --- EKRANLAR ---
  
  if (gameStatus === "mode-selection") {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <style>{`
                * { -webkit-tap-highlight-color: transparent !important; }
                
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
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <PenTool className="w-6 h-6 text-indigo-600"/> Yazma Oyunu
                    </h2>
                    <div className="w-9"></div>
                </div>

                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Türkçesi Ne?</h1>
                    <p className="text-slate-500">Türkçe anlamı verilen kelimeyi İngilizce yaz.</p>
                </div>

                <div className="space-y-4">
                    {/* Tekrar Modu */}
                    <button onClick={(e) => startSession('review', e)} disabled={pools.reviewPool.length === 0} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="menu-btn btn-select w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Öğrendiklerini Pekiştir</div></div>
                            </div>
                            <div className="text-2xl font-black text-orange-600">{pools.reviewPool.length}</div>
                        </div>
                    </button>

                    {/* Öğrenme Modu */}
                    <button onClick={(e) => startSession('learn', e)} disabled={pools.learnPool.length === 0} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="menu-btn btn-learn w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><BrainCircuit className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni Kelimeler</div></div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{pools.learnPool.length}</div>
                        </div>
                    </button>

                    {/* Bekleme Modu */}
                    <button onClick={(e) => startSession('waiting', e)} disabled={pools.waitingPool.length === 0} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="menu-btn btn-wait w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0">
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
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <Trophy className="w-10 h-10 text-blue-600"/>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{modeTitle}</h2>
                <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-sm text-slate-400 font-bold uppercase">Kazanılan Puan</div>
                    <div className="text-5xl font-extrabold text-blue-600 mt-2">{score}</div>
                    <div className="text-xs text-slate-400 mt-1">Maksimum: {maxScore}</div>
                </div>
                <button onClick={() => setGameStatus("mode-selection")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3 shadow-lg active:scale-95 transition-transform">Başka Test Çöz</button>
                <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 active:scale-95 transition-transform">Ana Sayfa</button>
            </div>
        </div>
      );
  }

  // CRASH FIX: Soru yüklenmediyse Loader göster (currentIndex kontrolüyle)
  if (!questions[currentIndex]) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-blue-600"/></div>;

  const currentQ = questions[currentIndex];
  const targetWord = currentQ.targetWord;
  const styles = getDynamicStyle(targetWord.length);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
        
        {/* --- MOBİL CSS --- */}
        <style>{`
            * { -webkit-tap-highlight-color: transparent !important; }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-5px); }
              75% { transform: translateX(5px); }
            }
            @media (hover: hover) {
                .letter-btn:hover { border-color: #60a5fa !important; color: #2563eb !important; } /* blue-400 */
                .hint-btn:hover { background-color: #fcd34d !important; } /* amber-300 */
                .audio-btn:hover { background-color: #dbeafe !important; } /* blue-100 */
            }
            .game-btn { transition: all 0.2s ease; }
        `}</style>

        <div className="w-full max-w-md space-y-4 mt-2">
            <div className="flex justify-between items-center">
                <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full shadow-sm active:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
                <div className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-xs">
                    {gameMode === 'review' ? 'Tekrar' : gameMode === 'learn' ? 'Öğrenme' : 'Bekleme'}: {currentIndex + 1} / {questions.length}
                </div>
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200">
                    <Trophy className="w-4 h-4"/> {score}
                </div>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-500" style={{width:`${((currentIndex + 1) / questions.length) * 100}%`}}></div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center relative overflow-hidden min-h-[450px] flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-cyan-400"></div>

                {/* ORTA ALAN: TÜRKÇE KELİME + SES BUTONU */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4">
                    
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">TÜRKÇE ANLAMI</div>
                    
                    {/* TÜRKÇE KELİME KARTI */}
                    <div className="bg-slate-50 px-6 py-8 rounded-3xl border-2 border-slate-100 w-full flex items-center justify-center">
                        <h2 className="text-3xl font-black text-slate-800 leading-tight break-words">{currentQ.questionText}</h2>
                    </div>

                    {/* Ses butonu (Opsiyonel dinleme) */}
                    <button 
                        onClick={(e) => {
                            handleBlur(e);
                            handleSpeak(targetWord, 'main');
                        }}
                        style={{ outline: 'none' }}
                        className={`audio-btn p-3 rounded-full flex items-center justify-center transition-all active:scale-95 focus:outline-none focus:ring-0
                            ${activeAudio === 'main' ? "bg-indigo-100 text-indigo-600 animate-pulse" : "bg-slate-100 text-slate-400"}
                        `}
                    >
                        {activeAudio === 'main' ? <Square className="w-5 h-5 fill-current"/> : <Volume2 className="w-5 h-5"/>}
                    </button>
                </div>

                {/* YAZI ALANI */}
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

                {/* KARIŞIK HARFLER */}
                {!isWordComplete ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-center gap-2 content-center pb-2">
                            {shuffledLetters.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={(e) => handleLetterClick(item, e)}
                                    disabled={item.isUsed}
                                    style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                                    className={`letter-btn
                                        w-10 h-10 md:w-11 md:h-11 rounded-xl font-bold text-lg shadow-[0_3px_0_rgb(0,0,0,0.1)] 
                                        transition-all duration-75 select-none touch-manipulation focus:outline-none focus:ring-0
                                        ${item.isUsed 
                                            ? "opacity-0 pointer-events-none scale-0" 
                                            : wrongAnimationId === item.id 
                                                ? "bg-red-500 text-white shadow-none animate-[shake_0.5s_ease-in-out]" 
                                                : "bg-white border-2 border-slate-200 text-slate-700 active:bg-blue-100 active:border-blue-300 active:text-blue-600 active:shadow-none active:translate-y-[2px]"
                                        }
                                    `}
                                >
                                    {item.char}
                                </button>
                            ))}
                        </div>

                        {/* İPUCU BUTONU */}
                        <div className="flex justify-center border-t border-slate-100 pt-3">
                             <button 
                                onClick={handleHint}
                                // 👇 TEK HARFLİ İSE VEYA TAMAMLANDIYSA KAPALI 👇
                                disabled={isWordComplete || targetWord.length <= 1}
                                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                                className={`hint-btn flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-700 rounded-2xl font-bold transition-colors focus:outline-none focus:ring-0
                                    ${(isWordComplete || targetWord.length <= 1) ? 'opacity-50 cursor-not-allowed' : 'active:bg-amber-200 active:scale-95'}
                                `}
                             >
                                <Lightbulb className="w-5 h-5"/> 
                                <span>İpucu ({targetWord.length <= 1 ? "Yok" : (hintCount === 0 ? "5p" : "0p")})</span>
                                <span className="text-[10px] bg-white/50 px-1.5 rounded ml-1">Hata: {mistakeCount}/2</span>
                             </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in zoom-in duration-300 pb-2">
                        <div className="flex items-center justify-center gap-2 mb-4 text-green-600 font-bold bg-green-50 p-3 rounded-xl border border-green-100">
                            {mistakeCount >= 2 ? <><AlertTriangle className="w-5 h-5 text-orange-500"/> Doğrusu Bu</> : <><CheckCircle2 className="w-6 h-6"/> Harika!</>}
                        </div>
                        <button onClick={handleNext} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-transform">
                            {currentIndex + 1 === questions.length ? "Sonuçları Gör" : "Sıradaki Kelime"} 
                            <ArrowRight className="w-5 h-5"/>
                        </button>
                    </div>
                )}
            </div>

            {!isWordComplete && (
                <button onClick={handleQuitEarly} className="w-full text-center text-slate-400 hover:text-red-500 text-sm font-medium transition-colors focus:outline-none p-2">
                    Bitir (Puanı Al ve Çık)
                </button>
            )}
        </div>
    </div>
  );
}
