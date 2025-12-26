import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, Trophy, Loader2, Home, Volume2, CheckCircle2, 
  Dumbbell, Layers, ArrowRight, Languages, Square, 
  Lightbulb, AlertTriangle, Star, Keyboard, MousePointer2, Flag, Check, LogOut, Sparkles
} from "lucide-react";

// --- SABİTLER ---
const FORM_TYPES = [
  { id: "plural", label: "Plural (Çoğul - Düzenli)", key: "plural" },
  { id: "v2", label: "V2 (Past - Düzenli)", key: "v2" },
  { id: "v3", label: "V3 (Participle - Düzenli)", key: "v3" },
  { id: "thirdPerson", label: "3. Tekil (He/She)", key: "thirdPerson" },
  { id: "advLy", label: "Zarf (-ly)", key: "advLy" },
  { id: "compEr", label: "Comp (-er)", key: "compEr" },
  { id: "superEst", label: "Super (-est)", key: "superEst" },
];

// --- ALT BİLEŞENLER (PERFORMANS İÇİN AYRILDI) ---

// 1. KELİME KARTI (Sadece soru değişince render olur)
const WordCard = React.memo(({ baseWordObj, currentWordPoints, activeAudio, speak, showWordTr, setShowWordTr, def, showDefTr, setShowDefTr, handleBlur }) => {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center relative overflow-hidden min-h-[400px] flex flex-col justify-between mb-4">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-cyan-400"></div>

            <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-bold border border-green-100 animate-in fade-in">
                <Star className="w-3 h-3 fill-current"/> Soru: {Math.max(0, currentWordPoints)}p
            </div>

            {baseWordObj.tags && baseWordObj.tags.length > 0 && (
                <div className="absolute top-0 left-4 mt-4 flex flex-col items-start gap-1 max-w-[80px]">
                    {baseWordObj.tags.map((tag, i) => (<span key={i} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-full">{tag}</span>))}
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4 mt-8"> 
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ANA KELİME (BASE)</div>
                <div className="bg-slate-50 px-6 py-8 rounded-3xl border-2 border-slate-100 w-full flex items-center justify-center">
                    <h2 className="text-3xl font-black text-slate-800 leading-tight break-words">{baseWordObj.word}</h2>
                </div>

                <div className="flex gap-2">
                    <button onClick={(e) => { handleBlur(e); speak(baseWordObj.word, 'base'); }} className={`p-3 rounded-full border flex items-center justify-center transition-all ${activeAudio === 'base' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}>
                        {activeAudio === 'base' ? <Square size={18} fill="currentColor"/> : <Volume2 size={18}/>}
                    </button>
                    {def.meaning && (
                        <button onClick={(e) => { handleBlur(e); setShowWordTr(!showWordTr); }} className={`p-3 rounded-full border flex items-center justify-center transition-all ${showWordTr ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                            <Languages size={18}/>
                        </button>
                    )}
                </div>
                
                {showWordTr && (<div className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg animate-in fade-in slide-in-from-top-1">{def.meaning}</div>)}
            </div>

            {/* Fonetik ve Tanım */}
            <div className="mt-2 space-y-2">
                {baseWordObj?.phonetic?.trim() && (
                    <div className="flex justify-center"><span className="text-indigo-400 font-serif italic text-lg tracking-wide px-3 py-0.5 bg-indigo-50/50 rounded-lg border border-indigo-100/50">/{String(baseWordObj.phonetic).replace(/\//g, "")}/</span></div>
                )}
                
                {def.engExplanation && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative text-left">
                         <p className="text-slate-600 text-sm italic pr-16 leading-relaxed">"{def.engExplanation}"</p>
                         <div className="absolute right-2 top-2 flex gap-1">
                             <button onClick={(e) => { handleBlur(e); speak(def.engExplanation, 'desc'); }} className={`p-1.5 rounded-lg border ${activeAudio === 'desc' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}>{activeAudio === 'desc' ? <Square size={12} fill="currentColor"/> : <Volume2 size={12}/>}</button>
                             {def.trExplanation && (<button onClick={(e) => { handleBlur(e); setShowDefTr(!showDefTr); }} className={`p-1.5 rounded-lg border ${showDefTr ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200'}`}><Languages size={12}/></button>)}
                         </div>
                         {showDefTr && def.trExplanation && <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-700 text-xs font-bold animate-in fade-in">TR: {def.trExplanation}</div>}
                    </div>
                )}
            </div>
        </div>
    );
});

// 2. KLAVYE ALANI (Hızlı tepki için izole edildi)
const KeyboardArea = React.memo(({ userInput, setUserInput, onSubmit, onHint, wrong, hintDisabled, mistakeCount, isWordComplete, targetWord }) => {
    return (
        <div className="w-full">
            {!isWordComplete ? (
                <form onSubmit={onSubmit} className="space-y-3 pb-2">
                    <input 
                        type="text" 
                        value={userInput} 
                        onChange={(e) => setUserInput(e.target.value)} 
                        placeholder="Cevabı yaz..." 
                        // 🔥 PERFORMANCE FIX: Animasyon yerine renk değişimi 🔥
                        className={`w-full text-center text-2xl font-bold p-3 border-b-4 rounded-xl outline-none transition-colors duration-200 ${wrong ? "border-red-500 bg-red-50 text-red-600" : "border-indigo-200 bg-indigo-50 text-indigo-700 focus:border-indigo-500"}`} 
                        autoComplete="off" 
                        autoCorrect="off" 
                        autoCapitalize="none"
                        spellCheck="false"
                    />
                    <div className="flex justify-between items-center px-2">
                        <div className="text-xs font-bold text-slate-400">Hata Hakkı: <span className="text-red-500">{3 - mistakeCount}</span></div>
                        <button type="button" onClick={onHint} disabled={hintDisabled} className="text-xs flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold active:scale-95 disabled:opacity-50"><Lightbulb className="w-3 h-3" /> İpucu (-2p)</button>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-md mt-4 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">Kontrol Et <Check className="w-5 h-5"/></button>
                </form>
            ) : (
                <div className="bg-green-50 border border-green-200 text-green-700 font-bold text-2xl py-4 rounded-xl animate-in zoom-in">{targetWord}</div>
            )}
        </div>
    );
});

// 3. BALON ALANI
const BubbleArea = React.memo(({ targetWord, completedLetters, shuffledLetters, handleLetterClick, wrongAnimationId, isWordComplete, handleHint, hintDisabled, mistakeCount }) => {
    return (
        <div className="w-full">
            <div className="flex flex-wrap justify-center gap-1 min-h-[60px] items-end content-center mb-4">
                {targetWord.split('').map((_, idx) => {
                    const char = completedLetters[idx];
                    const isFilled = char !== undefined;
                    return (<div key={idx} className={`w-8 h-11 text-xl flex items-center justify-center font-bold border-b-4 rounded-t-lg transition-all ${isFilled ? "border-blue-500 text-blue-700 bg-blue-50" : "border-slate-200 bg-slate-50 text-transparent"}`}>{char}</div>);
                })}
            </div>

            {!isWordComplete && (
                <div className="space-y-4">
                    <div className="flex flex-wrap justify-center gap-2 content-center pb-2">
                        {shuffledLetters.map((item) => (
                            <button key={item.id} onClick={(e) => handleLetterClick(item, e)} disabled={item.isUsed} className={`w-10 h-10 rounded-xl font-bold text-lg shadow-[0_3px_0_rgb(0,0,0,0.1)] transition-all active:translate-y-[2px] active:shadow-none outline-none focus:outline-none ${item.isUsed ? "opacity-0 pointer-events-none scale-0" : wrongAnimationId === item.id ? "bg-red-500 text-white animate-bounce" : "bg-white border-2 border-slate-200 text-slate-700 active:bg-blue-100"}`}>{item.char}</button>
                        ))}
                    </div>
                    <div className="flex justify-center border-t border-slate-100 pt-3">
                         <button onClick={handleHint} disabled={hintDisabled} className={`flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-700 rounded-2xl font-bold transition-colors active:scale-95 focus:outline-none ${hintDisabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-amber-200'}`}>
                            <Lightbulb className="w-5 h-5"/> 
                            <span>İpucu {targetWord.length <= 1 ? "(Yok)" : "(-5p)"}</span>
                            <span className="text-[10px] bg-white/50 px-1.5 rounded ml-1">Hata: {mistakeCount}/3</span>
                         </button>
                    </div>
                </div>
            )}
        </div>
    );
});


// --- ANA OYUN COMPONENTİ ---
export default function ExerciseGame() {
  const { getAllWords, addScore, updateGameStats, handleUpdateWord, registerMistake } = useData();
  const navigate = useNavigate();

  // State
  const [gameStatus, setGameStatus] = useState("selection"); 
  const [activeForm, setActiveForm] = useState(null); 
  const [inputMethod, setInputMethod] = useState("bubbles"); 
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Oyun İçi State
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [completedLetters, setCompletedLetters] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isWordComplete, setIsWordComplete] = useState(false);
  const [wrongAnimationId, setWrongAnimationId] = useState(null);
  const [mistakeCount, setMistakeCount] = useState(0); 
  const [hintCount, setHintCount] = useState(0);
  const [currentWordPoints, setCurrentWordPoints] = useState(10); 
  const [activeAudio, setActiveAudio] = useState(null);
  const [showWordTr, setShowWordTr] = useState(false);
  const [showDefTr, setShowDefTr] = useState(false);
  const [hasRecordedMistake, setHasRecordedMistake] = useState(false);

  // Helper
  const handleBlur = (e) => { if (e && e.currentTarget) e.currentTarget.blur(); };

  // Kelime Havuzu
  const allWords = useMemo(() => getAllWords() || [], [getAllWords]);

  // Kontrol Fonksiyonları (Render dışı)
  const isIrregularVerb = (w) => {
      if (!w || !w.v2) return false;
      const v2 = String(w.v2).trim().toLowerCase();
      return v2.length > 0 && !v2.endsWith("ed");
  };
  const isIrregularPlural = (w) => {
      if (!w || !w.plural) return false;
      const pl = String(w.plural).trim().toLowerCase();
      return pl.length > 0 && !pl.endsWith("s"); 
  };
  const getUniqueCount = (filterFn) => {
      const seen = new Set();
      let count = 0;
      allWords.forEach(w => {
          if (w && w.word && filterFn(w)) {
              const text = String(w.word).toLowerCase().trim();
              if (!seen.has(text)) { seen.add(text); count++; }
          }
      });
      return count;
  };
  const getRawCount = (filterFn) => allWords.filter(w => w && w.word && filterFn(w)).length;

  const getCount = (key) => {
      if (key === 'hard') return getRawCount(w => (w.mistakeCount || 0) >= 2);
      if (key === 'irregular_verbs') return getUniqueCount(isIrregularVerb);
      if (key === 'irregular_verbs_v3') return getUniqueCount(isIrregularVerb);
      if (key === 'irregular_plurals') return getUniqueCount(isIrregularPlural);
      return getUniqueCount(w => {
          const val = w[key];
          const hasVal = val && typeof val === 'string' && String(val).trim().length > 0;
          if (!hasVal) return false;
          if (key === 'v2' && isIrregularVerb(w)) return false;
          if (key === 'v3' && isIrregularVerb(w)) return false;
          if (key === 'plural' && isIrregularPlural(w)) return false;
          return true;
      });
  };

  // Reset Logic
  const resetQuestionState = useCallback(() => {
      setIsWordComplete(false);
      setMistakeCount(0);
      setHintCount(0);
      setCurrentWordPoints(10);
      setHasRecordedMistake(false);
      setCompletedLetters([]);
      setUserInput("");
      setShowWordTr(false);
      setShowDefTr(false);
      setWrongAnimationId(null);
  }, []);

  // Oyunu Başlatma
  const startSession = (modeKey, e) => {
    handleBlur(e);
    let rawValidWords = [];
    let isHardMode = false;

    if (modeKey === 'hard') {
        isHardMode = true;
        rawValidWords = allWords.filter(w => (w.mistakeCount || 0) >= 2);
    } else if (modeKey === 'irregular_verbs' || modeKey === 'irregular_verbs_v3') {
        rawValidWords = allWords.filter(isIrregularVerb);
    } else if (modeKey === 'irregular_plurals') {
        rawValidWords = allWords.filter(isIrregularPlural);
    } else {
        rawValidWords = allWords.filter(w => {
            const val = w[modeKey];
            const hasVal = val && typeof val === 'string' && String(val).trim().length > 0;
            if (!hasVal) return false;
            if (modeKey === 'v2' && isIrregularVerb(w)) return false;
            if (modeKey === 'v3' && isIrregularVerb(w)) return false;
            if (modeKey === 'plural' && isIrregularPlural(w)) return false;
            return true;
        });
    }

    if (rawValidWords.length === 0) {
      alert("Bu modda çalışılacak kelime bulunamadı.");
      return;
    }

    // Deduplication
    let poolToUse = [];
    if (isHardMode) {
        poolToUse = rawValidWords;
    } else {
        const seenTexts = new Set();
        rawValidWords.forEach(w => {
            if(w && w.word) {
                const text = String(w.word).toLowerCase().trim();
                if (!seenTexts.has(text)) { seenTexts.add(text); poolToUse.push(w); }
            }
        });
    }

    const selected = poolToUse.sort(() => 0.5 - Math.random()).slice(0, 10);

    const generatedQuestions = selected.map(w => {
        let target = "";
        let targetKey = "";
        let targetLabel = "";

        if (isHardMode) {
            const availableForms = FORM_TYPES.filter(ft => {
                const val = w[ft.key];
                return val && typeof val === 'string' && String(val).trim().length > 0;
            });
            if (availableForms.length > 0) {
                const randomForm = availableForms[Math.floor(Math.random() * availableForms.length)];
                target = String(w[randomForm.key] || "").trim();
                targetKey = randomForm.key;
                targetLabel = randomForm.label;
            } else {
                target = String(w.word || "").trim(); targetKey = "word"; targetLabel = "Kelime";
            }
        } else if (modeKey === 'irregular_verbs') {
            target = String(w.v2 || "").trim(); targetKey = 'v2'; targetLabel = 'V2 (Düzensiz)';
        } else if (modeKey === 'irregular_verbs_v3') {
            target = String(w.v3 || "").trim(); targetKey = 'v3'; targetLabel = 'V3 (Düzensiz)';
        } else if (modeKey === 'irregular_plurals') {
            target = String(w.plural || "").trim(); targetKey = 'plural'; targetLabel = 'Plural (Düzensiz)';
        } else {
            target = String(w[modeKey] || "").trim(); targetKey = modeKey;
            const fType = FORM_TYPES.find(f => f.key === modeKey); targetLabel = fType ? fType.label : modeKey;
        }

        return { baseWordObj: w, targetWord: target, formLabel: targetLabel, formKey: targetKey };
    });

    setQuestions(generatedQuestions);
    setActiveForm(isHardMode ? { label: "Karma (Zor)" } : { label: generatedQuestions[0]?.formLabel });
    setCurrentIndex(0);
    setScore(0);
    resetQuestionState();
    setGameStatus("playing");
  };

  // Soru Yükleme
  useEffect(() => {
    window.speechSynthesis.cancel();
    setActiveAudio(null);
    resetQuestionState();

    if (gameStatus === "playing" && questions[currentIndex]) {
      const rawTarget = questions[currentIndex].targetWord;
      const target = rawTarget ? String(rawTarget).trim() : "";
      
      if (inputMethod === "bubbles") {
          let lettersArray = target.split('').map((char, index) => ({ id: `${char}-${index}-${Math.random()}`, char, isUsed: false }));
          if (target.length > 1) {
              let isSame = true; let attempt = 0;
              while (isSame && attempt < 50) { 
                  lettersArray.sort(() => Math.random() - 0.5);
                  const currentOrder = lettersArray.map(l => l.char).join('');
                  if (currentOrder !== target) isSame = false;
                  attempt++;
              }
          }
          setShuffledLetters(lettersArray);
      }
    }
  }, [currentIndex, gameStatus, questions, inputMethod, resetQuestionState]);

  // Logic Handlers
  const getSmartDefinition = (wordObj, formKey) => {
      if (!wordObj || !wordObj.definitions) return { meaning: "", engExplanation: "", trExplanation: "" };
      const defs = wordObj.definitions;
      if (defs.length === 0) return { meaning: "", engExplanation: "", trExplanation: "" };
      let targetType = "";
      if (['v2', 'v3', 'thirdPerson', 'vIng'].includes(formKey)) targetType = "verb";
      else if (formKey === 'plural') targetType = "noun";
      else if (['compEr', 'superEst', 'advLy'].includes(formKey)) targetType = "adjective";
      const matchedDef = defs.find(d => d.type === targetType);
      return matchedDef || defs[0] || { meaning: "", engExplanation: "", trExplanation: "" };
  };

  const speak = useCallback((txt, id) => {
    if (!txt) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "en-US";
    u.onend = () => setActiveAudio(null);
    u.onerror = () => setActiveAudio(null);
    window.speechSynthesis.speak(u);
    setActiveAudio(id);
  }, []);

  const handleSuccess = useCallback((wordToSpeak) => {
      setIsWordComplete(true);
      speak(wordToSpeak, 'main'); 
      updateGameStats('exercise', 1);
      const currentQ = questions[currentIndex];
      const dateKey = `lastExercise_${currentQ.formKey}`;
      handleUpdateWord(currentQ.baseWordObj.id, { [dateKey]: new Date().toISOString() });
      addScore(currentWordPoints);
      setScore(s => s + currentWordPoints);
  }, [currentIndex, questions, currentWordPoints, addScore, handleUpdateWord, updateGameStats, speak]);

  const handleFail = useCallback((wordToSpeak) => {
      setCurrentWordPoints(0);
      setIsWordComplete(true);
      const target = String(questions[currentIndex].targetWord || "").trim();
      setCompletedLetters(target.split(''));
      setUserInput(target);
      speak(wordToSpeak, 'main');
      updateGameStats('exercise', 1);
      const currentQ = questions[currentIndex];
      if (!hasRecordedMistake) {
          registerMistake(currentQ.baseWordObj.id, 1);
          setHasRecordedMistake(true);
      }
      const dateKey = `lastExercise_${currentQ.formKey}`;
      handleUpdateWord(currentQ.baseWordObj.id, { [dateKey]: new Date().toISOString() });
  }, [currentIndex, questions, hasRecordedMistake, handleUpdateWord, registerMistake, updateGameStats, speak]);

  const handleNext = useCallback(() => {
      if (currentIndex + 1 < questions.length) {
          // KEYBOARD RESET: Key değişimi için currentIndex artıyor
          setCurrentIndex(p => p + 1);
      } else {
          setGameStatus("finished");
      }
  }, [currentIndex, questions.length]);

  // Input Handlers
  const handleLetterClick = useCallback((letterObj) => {
    if (isWordComplete || letterObj.isUsed) return;
    const targetWord = String(questions[currentIndex].targetWord || "").trim();
    const nextIndex = completedLetters.length;
    
    if (letterObj.char.toLowerCase() === targetWord[nextIndex].toLowerCase()) {
        setShuffledLetters(prev => prev.map(l => l.id === letterObj.id ? { ...l, isUsed: true } : l));
        setCompletedLetters(prev => {
            const updated = [...prev, letterObj.char];
            if (updated.length === targetWord.length) handleSuccess(targetWord);
            return updated;
        });
    } else {
        setMistakeCount(m => {
            const newVal = m + 1;
            if (newVal > 3) handleFail(targetWord);
            return newVal;
        });
        setCurrentWordPoints(p => Math.max(0, p - 2));
        setWrongAnimationId(letterObj.id);
        setTimeout(() => setWrongAnimationId(null), 500);
    }
  }, [completedLetters, questions, currentIndex, isWordComplete, handleSuccess, handleFail]);

  const handleKeyboardSubmit = useCallback((e) => {
      e.preventDefault();
      if (isWordComplete) return;
      const targetWord = String(questions[currentIndex].targetWord || "").trim();
      if (userInput.trim().toLowerCase() === targetWord.toLowerCase()) {
          handleSuccess(targetWord);
      } else {
          setMistakeCount(m => {
              const newVal = m + 1;
              if (newVal >= 3) handleFail(targetWord);
              return newVal;
          });
          setCurrentWordPoints(p => Math.max(0, p - 1));
          setWrongAnimationId("input");
          setTimeout(() => setWrongAnimationId(null), 500);
      }
  }, [isWordComplete, questions, currentIndex, userInput, handleSuccess, handleFail]);

  const handleBubbleHint = useCallback(() => {
      if (isWordComplete) return;
      const targetWord = String(questions[currentIndex].targetWord || "").trim();
      if (hintCount >= (targetWord.length <= 2 ? 1 : 2)) return;
      
      setHintCount(h => h + 1);
      setCurrentWordPoints(p => Math.max(0, p - 2));

      const nextIndex = completedLetters.length;
      const correctLetterObj = shuffledLetters.find(l => !l.isUsed && l.char.toLowerCase() === targetWord[nextIndex].toLowerCase());
      if (correctLetterObj) handleLetterClick(correctLetterObj);
  }, [isWordComplete, questions, currentIndex, hintCount, completedLetters, shuffledLetters, handleLetterClick]);

  const handleKeyboardHint = useCallback(() => {
      if (isWordComplete) return;
      const targetWord = String(questions[currentIndex].targetWord || "").trim();
      if (hintCount >= (targetWord.length <= 2 ? 1 : 2)) return;

      setHintCount(h => h + 1);
      setCurrentWordPoints(p => Math.max(0, p - 2));

      let correctPrefixLength = 0;
      const cleanInput = userInput.trim().toLowerCase();
      const cleanTarget = targetWord.toLowerCase();
      for (let i = 0; i < cleanInput.length; i++) {
          if (cleanInput[i] === cleanTarget[i]) correctPrefixLength++; else break; 
      }
      const newInputValue = targetWord.substring(0, correctPrefixLength + 1);
      setUserInput(newInputValue);
      if(newInputValue.length === targetWord.length) handleSuccess(targetWord);
  }, [isWordComplete, questions, currentIndex, hintCount, userInput, handleSuccess]);

  // Render Variables
  const currentQ = questions[currentIndex];
  const targetWord = currentQ?.targetWord ? String(currentQ.targetWord).trim() : "";
  const formLabel = currentQ?.formLabel ? String(currentQ.formLabel) : "Bilinmiyor";
  const def = getSmartDefinition(currentQ?.baseWordObj, currentQ?.formKey);

  // --- SEÇİM EKRANI ---
  if (gameStatus === "selection") {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
            <div className="w-full max-w-md space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100"><Home className="w-5 h-5 text-slate-600" /></button>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Dumbbell className="w-6 h-6 text-indigo-600"/> Gramer Egzersizi</h2>
                    <div className="w-9"></div>
                </div>

                <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex relative">
                    <button onClick={() => { setInputMethod("bubbles"); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all z-10 ${inputMethod === "bubbles" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}><MousePointer2 className="w-4 h-4" /> Harf Seç</button>
                    <button onClick={() => { setInputMethod("keyboard"); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all z-10 ${inputMethod === "keyboard" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}><Keyboard className="w-4 h-4" /> Klavye</button>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white text-center">
                    <h3 className="text-2xl font-bold mb-2">Form Çalışması</h3>
                    <p className="opacity-90 text-sm">Kelimenin istenen halini {inputMethod === "bubbles" ? "harfleri seçerek" : "klavye ile yazarak"} bul.</p>
                    <div className="mt-4 inline-block bg-white/20 px-4 py-1 rounded-full text-xs font-bold">Aktif Havuz: {allWords.length} Kelime</div>
                </div>

                <div className="space-y-3 pb-10">
                    {getCount('hard') > 0 && (
                        <button onClick={(e) => startSession('hard', e)} className="w-full bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-red-200 bg-red-50 text-red-800 active:scale-95 transition-transform"><div className="flex items-center gap-3"><div className="bg-red-200 p-2 rounded-lg text-red-700 animate-pulse"><AlertTriangle className="w-5 h-5"/></div><span className="font-bold">Zorlandıklarım</span></div><span className="text-xs font-bold px-3 py-1 rounded-full bg-red-200 text-red-900">{getCount('hard')}</span></button>
                    )}
                    <button onClick={(e) => startSession('irregular_verbs', e)} disabled={getCount('irregular_verbs') === 0} className="w-full bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-rose-100 bg-rose-50/50 active:scale-95 transition-transform disabled:opacity-50"><div className="flex items-center gap-3"><div className="bg-rose-100 p-2 rounded-lg text-rose-500"><Sparkles className="w-5 h-5"/></div><span className="font-bold text-rose-700">Düzensiz Fiiller (V2)</span></div><span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-200 text-rose-800">{getCount('irregular_verbs')}</span></button>
                    <button onClick={(e) => startSession('irregular_verbs_v3', e)} disabled={getCount('irregular_verbs_v3') === 0} className="w-full bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-purple-100 bg-purple-50/50 active:scale-95 transition-transform disabled:opacity-50"><div className="flex items-center gap-3"><div className="bg-purple-100 p-2 rounded-lg text-purple-500"><Sparkles className="w-5 h-5"/></div><span className="font-bold text-purple-700">Düzensiz Fiiller (V3)</span></div><span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-200 text-purple-800">{getCount('irregular_verbs_v3')}</span></button>
                    <button onClick={(e) => startSession('irregular_plurals', e)} disabled={getCount('irregular_plurals') === 0} className="w-full bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-orange-100 bg-orange-50/50 active:scale-95 transition-transform disabled:opacity-50"><div className="flex items-center gap-3"><div className="bg-orange-100 p-2 rounded-lg text-orange-500"><Sparkles className="w-5 h-5"/></div><span className="font-bold text-orange-700">Düzensiz Çoğullar</span></div><span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-200 text-orange-800">{getCount('irregular_plurals')}</span></button>
                    <div className="border-t border-slate-200 my-2"></div>
                    {FORM_TYPES.map(form => {
                        const count = getCount(form.key);
                        return (<button key={form.id} onClick={(e) => startSession(form.key, e)} disabled={count === 0} className="w-full bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-e2e8f0 active:scale-95 transition-transform disabled:opacity-50"><div className="flex items-center gap-3"><div className="bg-slate-100 p-2 rounded-lg text-slate-500"><Layers className="w-5 h-5"/></div><span className="font-bold text-slate-700">{form.label}</span></div><span className={`text-xs font-bold px-3 py-1 rounded-full ${count > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"}`}>{count}</span></button>)
                    })}
                </div>
            </div>
        </div>
      );
  }

  // --- OYUN EKRANI ---
  if (gameStatus === "finished") {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-green-600"/></div>
                <h2 className="text-2xl font-bold text-slate-800">Bitti</h2>
                <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-sm text-slate-400 font-bold uppercase">Kazanılan Puan</div>
                    <div className="text-5xl font-extrabold text-indigo-600 mt-2">{score}</div>
                    <div className="text-xs text-slate-400 font-bold">Maksimum: {questions.length * 10}</div>
                </div>
                <button onClick={() => setGameStatus("selection")} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform">Başka Test Çöz</button>
                <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl active:scale-95 transition-transform">Ana Sayfa</button>
            </div>
        </div>
      );
  }

  if (!questions[currentIndex]) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-600"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
        <div className="w-full max-w-md space-y-4 mt-2">
            <div className="flex justify-between items-center">
                <button onClick={(e) => { handleBlur(e); if(score > 0) addScore(score); setGameStatus("finished"); }} className="p-2 bg-white rounded-full shadow-sm active:bg-slate-100"><X className="w-5 h-5 text-slate-400"/></button>
                <div className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-xs truncate max-w-[150px]">{formLabel.split('(')[0]}: {currentIndex + 1} / {questions.length}</div>
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200"><Trophy className="w-4 h-4"/> {score}</div>
            </div>
            
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{width:`${((currentIndex + 1) / questions.length) * 100}%`}}></div></div>

            {/* İzole edilmiş WordCard */}
            <WordCard 
                baseWordObj={currentQ?.baseWordObj || {}} 
                currentWordPoints={currentWordPoints} 
                activeAudio={activeAudio}
                speak={speak}
                showWordTr={showWordTr}
                setShowWordTr={setShowWordTr}
                def={def}
                showDefTr={showDefTr}
                setShowDefTr={setShowDefTr}
                handleBlur={handleBlur}
            />

            <div className="space-y-3 pb-2">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-slate-50 inline-block px-2 py-1 rounded">İSTENEN FORM: {formLabel.split('(')[0]}</div>
                
                {inputMethod === 'bubbles' ? (
                    <BubbleArea 
                        targetWord={targetWord} 
                        completedLetters={completedLetters} 
                        shuffledLetters={shuffledLetters}
                        handleLetterClick={handleLetterClick}
                        wrongAnimationId={wrongAnimationId}
                        isWordComplete={isWordComplete}
                        handleHint={handleBubbleHint}
                        hintDisabled={hintCount >= (targetWord.length <= 2 ? 1 : 2)}
                        mistakeCount={mistakeCount}
                    />
                ) : (
                    /* İzole Edilmiş KeyboardArea */
                    <KeyboardArea 
                        key={currentIndex} // CRITICAL FIX: Sorular arası inputu tamamen yeniler
                        userInput={userInput}
                        setUserInput={setUserInput}
                        onSubmit={handleKeyboardSubmit}
                        onHint={handleKeyboardHint}
                        wrong={wrongAnimationId === "input"}
                        hintDisabled={hintCount >= (targetWord.length <= 2 ? 1 : 2)}
                        mistakeCount={mistakeCount}
                        isWordComplete={isWordComplete}
                        targetWord={targetWord}
                    />
                )}
            </div>

            {!isWordComplete && (
                <button onClick={() => handleFail(questions[currentIndex].targetWord)} className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-4 rounded-xl shadow-sm flex items-center justify-center gap-2 mt-2 active:scale-95 transition-all hover:bg-red-50 hover:border-red-200"><Flag className="w-5 h-5"/><span>Pas Geç (Cevabı Gör)</span></button>
            )}

            <button onClick={(e) => { handleBlur(e); if(score > 0) addScore(score); setGameStatus("finished"); }} className="w-full text-center text-slate-400 hover:text-red-500 text-sm font-medium transition-colors focus:outline-none p-2"><LogOut className="w-4 h-4 inline mr-1" /> Bitir (Puanı Al ve Çık)</button>
        </div>
    </div>
  );
}
