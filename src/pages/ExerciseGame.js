import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, Trophy, Loader2, Home, Volume2, CheckCircle2, 
  Dumbbell, Layers, ArrowRight, Languages, Square, 
  Lightbulb, AlertTriangle
} from "lucide-react";

const FORM_TYPES = [
  { id: "plural", label: "Plural (Çoğul)", key: "plural" },
  { id: "v2", label: "V2 (Past)", key: "v2" },
  { id: "v3", label: "V3 (Participle)", key: "v3" },
  { id: "thirdPerson", label: "3. Tekil (He/She)", key: "thirdPerson" },
  { id: "advLy", label: "Zarf (-ly)", key: "advLy" },
  { id: "compEr", label: "Comp (-er)", key: "compEr" },
  { id: "superEst", label: "Super (-est)", key: "superEst" },
];

export default function ExerciseGame() {
  const { getAllWords, addScore, updateGameStats, handleUpdateWord } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameStatus, setGameStatus] = useState("selection"); 
  const [activeForm, setActiveForm] = useState(null);
  const [gameMode, setGameMode] = useState("learn");
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [completedLetters, setCompletedLetters] = useState([]);
  const [isWordComplete, setIsWordComplete] = useState(false);
  const [wrongAnimationId, setWrongAnimationId] = useState(null);
  
  const [showWordTr, setShowWordTr] = useState(false);
  const [showDefTr, setShowDefTr] = useState(false);

  const [mistakeCount, setMistakeCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [currentWordPoints, setCurrentWordPoints] = useState(10); 

  const [activeAudio, setActiveAudio] = useState(null);

  // --- IPHONE FIX ---
  const handleBlur = (e) => { if (e && e.currentTarget) e.currentTarget.blur(); };

  // --- 1. KELİME HAVUZU ---
  const allWords = useMemo(() => {
      const words = getAllWords();
      return words || [];
  }, [getAllWords]);

  const getCount = (key) => {
    return allWords.filter(w => {
        const val = w[key];
        return val && typeof val === 'string' && val.trim().length > 0;
    }).length;
  };

  // --- 2. OYUNU BAŞLATMA ---
  const startSession = (formTypeObj, e) => {
    handleBlur(e); // Mobile Fix
    const key = formTypeObj.key;
    const dateKey = `lastExercise_${key}`; 
    
    let validWords = allWords.filter(w => {
        const val = w[key];
        return val && typeof val === 'string' && val.trim().length > 0;
    });

    if (validWords.length === 0) {
      alert("Bu formda çalışılacak kelime bulunamadı.");
      return;
    }

    // --- AKILLI SIRALAMA ---
    const neverSeen = [];
    const seen = [];

    validWords.forEach(w => {
        if (!w[dateKey]) { neverSeen.push(w); } 
        else { seen.push(w); }
    });

    neverSeen.sort(() => 0.5 - Math.random());
    seen.sort((a, b) => new Date(a[dateKey]).getTime() - new Date(b[dateKey]).getTime());

    const smartPool = [...neverSeen, ...seen];
    const selectedCandidates = smartPool.slice(0, 10);
    const selected = selectedCandidates.sort(() => 0.5 - Math.random());

    const generatedQuestions = selected.map(w => ({
        baseWordObj: w,
        targetWord: w[key].trim(),
        formLabel: formTypeObj.label,
        formKey: key
    }));

    setQuestions(generatedQuestions);
    setActiveForm(formTypeObj);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

  // --- 3. SORU YÜKLEME ---
  useEffect(() => {
    window.speechSynthesis.cancel();
    setActiveAudio(null);
    setShowWordTr(false);
    setShowDefTr(false);

    if (gameStatus === "playing" && questions[currentIndex]) {
      const target = questions[currentIndex].targetWord;
      const letters = target.split('').map((char, index) => ({
        id: `${char}-${index}-${Math.random()}`,
        char: char,
        isUsed: false
      }));
      setShuffledLetters([...letters].sort(() => Math.random() - 0.5));
      setCompletedLetters([]);
      setIsWordComplete(false);
      setMistakeCount(0);
      setHintCount(0);
      setCurrentWordPoints(10);
    }
  }, [currentIndex, gameStatus, questions]);

  const getSmartDefinition = (wordObj, formKey) => {
      const defs = wordObj.definitions || [];
      if (defs.length === 0) return { meaning: "Tanım yok", engExplanation: "" };

      let targetType = "";
      if (['v2', 'v3', 'thirdPerson', 'vIng'].includes(formKey)) targetType = "verb";
      else if (formKey === 'plural') targetType = "noun";
      else if (['compEr', 'superEst', 'advLy'].includes(formKey)) targetType = "adjective";

      const matchedDef = defs.find(d => d.type === targetType);
      return matchedDef || defs[0];
  };

  const getDynamicStyle = (length) => {
    if (length <= 5) return { box: "w-11 h-14", text: "text-2xl" }; 
    if (length <= 8) return { box: "w-8 h-11", text: "text-xl" };    
    if (length <= 11) return { box: "w-6 h-9", text: "text-lg" };    
    return { box: "w-4 h-8", text: "text-sm" }; 
  };

  const speak = (txt, id) => {
    if (!txt) return;
    if (activeAudio === id) {
        window.speechSynthesis.cancel();
        setActiveAudio(null);
    } else {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(txt);
        u.lang = "en-US";
        u.onend = () => setActiveAudio(null);
        u.onerror = () => setActiveAudio(null);
        window.speechSynthesis.speak(u);
        setActiveAudio(id);
    }
  };

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
        if (newMistakes >= 3) handleFail(targetWord);
    }
  };

  const handleHint = (e) => {
      handleBlur(e);
      if (isWordComplete) return;

      const newHintCount = hintCount + 1;
      setHintCount(newHintCount);
      if (newHintCount === 1) setCurrentWordPoints(prev => Math.max(0, prev - 3));
      else setCurrentWordPoints(0);

      const targetWord = questions[currentIndex].targetWord;
      const nextIndex = completedLetters.length;
      const expectedChar = targetWord[nextIndex];
      const correctLetterObj = shuffledLetters.find(l => !l.isUsed && l.char.toLowerCase() === expectedChar.toLowerCase());

      if (correctLetterObj) {
          const newShuffled = shuffledLetters.map(l => l.id === correctLetterObj.id ? { ...l, isUsed: true } : l);
          setShuffledLetters(newShuffled);
          const newCompleted = [...completedLetters, correctLetterObj.char];
          setCompletedLetters(newCompleted);
          if (newCompleted.length === targetWord.length) handleSuccess(targetWord);
      }
  };

  const handleSuccess = (wordToSpeak) => {
      setIsWordComplete(true);
      speak(wordToSpeak, 'main'); 
      updateGameStats('exercise', 1);
      
      const currentQ = questions[currentIndex];
      const dateKey = `lastExercise_${currentQ.formKey}`;
      
      handleUpdateWord(currentQ.baseWordObj.id, { [dateKey]: new Date().toISOString() });

      if (currentWordPoints > 0) {
          addScore(currentWordPoints);
          setScore(s => s + currentWordPoints);
      }
  };

  const handleFail = (wordToSpeak) => {
      setCurrentWordPoints(0);
      const targetWord = questions[currentIndex].targetWord;
      setCompletedLetters(targetWord.split(''));
      setIsWordComplete(true);
      speak(wordToSpeak, 'main');
      updateGameStats('exercise', 1);

      const currentQ = questions[currentIndex];
      const dateKey = `lastExercise_${currentQ.formKey}`;
      handleUpdateWord(currentQ.baseWordObj.id, { [dateKey]: new Date().toISOString() });
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

  // ===================================
  // === 1. MOD SEÇİM EKRANI (FİXED) ===
  // ===================================
  if (gameStatus === "selection") {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
            
            {/* CSS FİX: SADECE MOUSE VARSA HOVER ET */}
            <style>{`
                * { -webkit-tap-highlight-color: transparent !important; }
                
                .menu-btn { 
                    background-color: white;
                    border: 1px solid #e2e8f0;
                    transition: all 0.2s ease;
                }
                .menu-btn:active {
                    transform: scale(0.96);
                    background-color: #f1f5f9;
                }
                .menu-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Sadece mouse ile hover (Telefonda yapışmayı engeller) */
                @media (hover: hover) {
                    .menu-btn:hover { 
                        border-color: #a5b4fc !important; /* indigo-300 */
                        background-color: #f8fafc !important; /* slate-50 */
                    }
                    /* İkon kutusu hover */
                    .menu-btn:hover .icon-box {
                        background-color: #eef2ff !important; /* indigo-50 */
                        color: #4f46e5 !important; /* indigo-600 */
                    }
                }
            `}</style>

            <div className="w-full max-w-md space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
                        <Home className="w-5 h-5 text-slate-600" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Dumbbell className="w-6 h-6 text-indigo-600"/> Gramer Egzersizi
                    </h2>
                    <div className="w-9"></div>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white text-center">
                    <h3 className="text-2xl font-bold mb-2">Form Çalışması</h3>
                    <p className="opacity-90 text-sm">Kelime havuzundaki kelimelerin farklı hallerini test et.</p>
                    <div className="mt-4 inline-block bg-white/20 px-4 py-1 rounded-full text-xs font-bold">
                        Aktif Havuz: {allWords.length} Kelime
                    </div>
                </div>

                <div className="space-y-3 pb-10">
                    {FORM_TYPES.map(form => {
                        const count = getCount(form.key);
                        return (
                            <button 
                                key={form.id}
                                onClick={(e) => startSession(form, e)}
                                disabled={count === 0}
                                style={{ outline: 'none' }}
                                className="menu-btn w-full p-4 rounded-xl shadow-sm flex justify-between items-center focus:outline-none focus:ring-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="icon-box bg-slate-100 p-2 rounded-lg text-slate-500 transition-colors">
                                        <Layers className="w-5 h-5"/>
                                    </div>
                                    <span className="font-bold text-slate-700">{form.label}</span>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${count > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"}`}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
      );
  }

  // --- BİTİŞ EKRANI ---
  if (gameStatus === "finished") {
      const maxScore = questions.length * 10;
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <Trophy className="w-10 h-10 text-green-600"/>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Bitti</h2>
                <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-sm text-slate-400 font-bold uppercase">Kazanılan Puan</div>
                    <div className="text-5xl font-extrabold text-indigo-600 mt-2">{score}</div>
                    <div className="text-xs text-slate-400 font-bold">Maksimum: {maxScore}</div>
                </div>
                <button onClick={() => setGameStatus("selection")} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-transform">Başka Test Çöz</button>
                <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 active:scale-95 transition-transform">Ana Sayfa</button>
            </div>
        </div>
      );
  }

  if (!questions[currentIndex]) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-600"/></div>;

  const currentQ = questions[currentIndex];
  const targetWord = currentQ.targetWord;
  const baseWordObj = currentQ.baseWordObj;
  const formKey = currentQ.formKey;

  const def = getSmartDefinition(baseWordObj, formKey);
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
            .mini-btn { transition: all 0.2s ease; }
            .mini-btn:active { transform: scale(0.9); }
            @media (hover: hover) { .mini-btn:hover { background-color: #f1f5f9; } }
        `}</style>

        <div className="w-full max-w-md space-y-4 mt-2">
            <div className="flex justify-between items-center">
                <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full shadow-sm"><X className="w-5 h-5 text-slate-400"/></button>
                <div className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 text-xs">
                    {activeForm?.label.split('(')[0]}: {currentIndex + 1} / {questions.length}
                </div>
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200">
                    <Trophy className="w-4 h-4"/> {score}
                </div>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-500" style={{width:`${((currentIndex + 1) / questions.length) * 100}%`}}></div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-xl border border-slate-100 text-center relative overflow-hidden min-h-[450px] flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400"></div>

                <div className="mt-2 flex flex-col items-center gap-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ANA KELİME (BASE)</div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black text-slate-800">{baseWordObj.word}</h2>
                        
                        <button 
                            onClick={(e) => { handleBlur(e); speak(baseWordObj.word, 'base'); }}
                            className={`mini-btn p-1.5 rounded-lg border ${activeAudio === 'base' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}
                        >
                            {activeAudio === 'base' ? <Square size={14} fill="currentColor"/> : <Volume2 size={14}/>}
                        </button>
                        <button 
                            onClick={(e) => { handleBlur(e); setShowWordTr(!showWordTr); }}
                            className={`mini-btn p-1.5 rounded-lg border ${showWordTr ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200'}`}
                        >
                            <Languages size={14}/>
                        </button>
                    </div>
                    {showWordTr && (
                        <div className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg animate-in fade-in slide-in-from-top-1 mt-1">
                            {def.meaning}
                        </div>
                    )}
                </div>


{/* ✅ FONETİK (BASE kelimenin altı) */}
{baseWordObj?.phonetic?.trim() ? (
  <div className="mt-1 flex justify-center animate-in fade-in slide-in-from-top-1">
    <span className="text-indigo-400 font-serif italic text-lg tracking-wide px-3 py-0.5 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
      /{String(baseWordObj.phonetic).replace(/\//g, "")}/
    </span>
  </div>
) : (
  <div className="h-7" />
)}

                
                {def.engExplanation && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative mt-2 text-left">
                         <p className="text-slate-600 text-sm italic pr-16 leading-relaxed">"{def.engExplanation}"</p>
                         <div className="absolute right-2 top-2 flex gap-1">
                             <button 
                                onClick={(e) => { handleBlur(e); speak(def.engExplanation, 'desc'); }}
                                className={`mini-btn p-1.5 rounded-lg border ${activeAudio === 'desc' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}
                             >
                                {activeAudio === 'desc' ? <Square size={12} fill="currentColor"/> : <Volume2 size={12}/>}
                             </button>
                             {def.trExplanation && (
                                 <button 
                                    onClick={(e) => { handleBlur(e); setShowDefTr(!showDefTr); }}
                                    className={`mini-btn p-1.5 rounded-lg border ${showDefTr ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200'}`}
                                 >
                                    <Languages size={12}/>
                                 </button>
                             )}
                         </div>
                         {showDefTr && def.trExplanation && (
                             <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-700 text-xs font-bold animate-in fade-in">
                                TR: {def.trExplanation}
                             </div>
                         )}
                    </div>
                )}

                <div className="space-y-3 mt-4">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-slate-50 inline-block px-2 py-1 rounded">
                        İSTENEN: {activeForm?.label.split('(')[0]}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1 min-h-[50px] items-end content-center">
                        {targetWord.split('').map((_, idx) => {
                            const char = completedLetters[idx];
                            const isFilled = char !== undefined;
                            return (
                                <div key={idx} className={`${styles.box} ${styles.text} flex items-center justify-center font-bold border-b-4 rounded-t-lg transition-all ${isFilled ? "border-indigo-500 text-indigo-700 bg-indigo-50" : "border-slate-200 bg-white text-transparent"}`}>
                                    {char}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {!isWordComplete ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-center gap-2 content-center min-h-[100px]">
                            {shuffledLetters.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={(e) => handleLetterClick(item, e)}
                                    disabled={item.isUsed}
                                    className={`w-10 h-10 rounded-xl font-bold text-lg shadow-[0_3px_0_rgb(0,0,0,0.1)] transition-all active:translate-y-[2px] active:shadow-none outline-none focus:outline-none
                                        ${item.isUsed 
                                            ? "opacity-0 pointer-events-none scale-0" 
                                            : wrongAnimationId === item.id 
                                                ? "bg-red-500 text-white animate-[shake_0.5s_ease-in-out]" 
                                                : "bg-white border-2 border-slate-200 text-slate-700 active:bg-indigo-100"
                                        }`}
                                >
                                    {item.char}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-center border-t border-slate-100 pt-3">
                             <button 
                                onClick={handleHint}
                                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm active:scale-95 transition-transform focus:outline-none"
                             >
                                <Lightbulb className="w-4 h-4"/> 
                                <span>İpucu ({hintCount === 0 ? "10p" : hintCount === 1 ? "7p" : "0p"})</span>
                                <span className="text-[10px] bg-white/50 px-1.5 rounded ml-1">Hata: {mistakeCount}/3</span>
                             </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in zoom-in duration-300 pb-2">
                        <div className="flex items-center justify-center gap-2 mb-4 text-green-600 font-bold bg-green-50 p-3 rounded-xl border border-green-100">
                            {mistakeCount >= 3 ? <><AlertTriangle className="w-5 h-5 text-orange-500"/> Doğrusu Bu</> : <><CheckCircle2 className="w-6 h-6"/> Harika!</>}
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
