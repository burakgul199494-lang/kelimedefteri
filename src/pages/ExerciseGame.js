import React, { useState, useEffect, useMemo, useRef } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, Trophy, Loader2, Home, Volume2, CheckCircle2, 
  Dumbbell, Layers, ArrowRight, Languages, Square, 
  Lightbulb, AlertTriangle, Star, Tag, Keyboard, MousePointer2, Flag, Check, LogOut, Sparkles
} from "lucide-react";

const FORM_TYPES = [
  // Standart Modlar
  { id: "plural", label: "Plural (Çoğul)", key: "plural" },
  { id: "v2", label: "V2 (Past)", key: "v2" },
  { id: "v3", label: "V3 (Participle)", key: "v3" },
  { id: "thirdPerson", label: "3. Tekil (He/She)", key: "thirdPerson" },
  { id: "advLy", label: "Zarf (-ly)", key: "advLy" },
  { id: "compEr", label: "Comp (-er)", key: "compEr" },
  { id: "superEst", label: "Super (-est)", key: "superEst" },
];

export default function ExerciseGame() {
  const { getAllWords, addScore, updateGameStats, handleUpdateWord, registerMistake } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameStatus, setGameStatus] = useState("selection"); 
  const [activeForm, setActiveForm] = useState(null); // Seçilen form tipi
  const [inputMethod, setInputMethod] = useState("bubbles"); 

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Balon Modu
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [completedLetters, setCompletedLetters] = useState([]);
  
  // Klavye Modu
  const [userInput, setUserInput] = useState("");

  // Ortak
  const [isWordComplete, setIsWordComplete] = useState(false);
  const [wrongAnimationId, setWrongAnimationId] = useState(null);
  const [mistakeCount, setMistakeCount] = useState(0); 
  const [hintCount, setHintCount] = useState(0);
  const [currentWordPoints, setCurrentWordPoints] = useState(10); 
  const [activeAudio, setActiveAudio] = useState(null);
  const [showWordTr, setShowWordTr] = useState(false);
  const [showDefTr, setShowDefTr] = useState(false);
  const [hasRecordedMistake, setHasRecordedMistake] = useState(false);

  const inputRef = useRef(null);

  // --- IPHONE FIX ---
  const handleBlur = (e) => { if (e && e.currentTarget) e.currentTarget.blur(); };

  // --- 1. KELİME HAVUZU VE ÖZEL FİLTRELER ---
  const allWords = useMemo(() => {
      return getAllWords() || [];
  }, [getAllWords]);

  // 🔥 YARDIMCI: Düzensiz Kontrolü 🔥
  const isIrregularVerb = (w) => {
      // V2 veya V3 var mı? Varsa ve "-ed" ile bitmiyorsa düzensizdir.
      // (Basit bir kural, istisnalar olabilir ama genel kullanım için yeterli)
      const v2 = w.v2?.trim().toLowerCase();
      return v2 && !v2.endsWith("ed");
  };

  const isIrregularPlural = (w) => {
      // Çoğul hali var mı? Varsa ve "-s" veya "-es" ile bitmiyorsa düzensizdir.
      const pl = w.plural?.trim().toLowerCase();
      return pl && !pl.endsWith("s"); 
  };

  const getCount = (key) => {
      if (key === 'irregular_verbs') {
          return allWords.filter(isIrregularVerb).length;
      }
      if (key === 'irregular_plurals') {
          return allWords.filter(isIrregularPlural).length;
      }
      return allWords.filter(w => {
          const val = w[key];
          return val && typeof val === 'string' && val.trim().length > 0;
      }).length;
  };

  // --- 2. OYUNU BAŞLATMA ---
  const startSession = (formTypeObj, e) => {
    handleBlur(e);
    const key = formTypeObj.key;
    const dateKey = `lastExercise_${key}`; 
    
    let validWords = [];

    // 🔥 MODA GÖRE KELİME SEÇİMİ 🔥
    if (key === 'irregular_verbs') {
        // Düzensiz Fiiller (V2 sorulur)
        validWords = allWords.filter(isIrregularVerb);
        // Bu modda hedef kelime V2 halidir
    } else if (key === 'irregular_plurals') {
        // Düzensiz Çoğullar (Plural sorulur)
        validWords = allWords.filter(isIrregularPlural);
    } else {
        // Standart Modlar
        validWords = allWords.filter(w => {
            const val = w[key];
            return val && typeof val === 'string' && val.trim().length > 0;
        });
    }

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

    const generatedQuestions = selected.map(w => {
        let target = "";
        let targetKey = key;

        if (key === 'irregular_verbs') {
            target = w.v2.trim(); // Düzensiz fiillerde V2 sor
            targetKey = 'v2';
        } else if (key === 'irregular_plurals') {
            target = w.plural.trim(); // Düzensiz çoğullarda Plural sor
            targetKey = 'plural';
        } else {
            target = w[key].trim();
        }

        return {
            baseWordObj: w,
            targetWord: target,
            formLabel: formTypeObj.label,
            formKey: targetKey // İstatistik için asıl key
        };
    });

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
      
      // SIFIRLAMALAR
      setIsWordComplete(false);
      setMistakeCount(0);
      setHintCount(0);
      setCurrentWordPoints(10);
      setHasRecordedMistake(false);

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
    if (length <= 14) return { box: "w-4 h-8", text: "text-sm" };
    if (length <= 17) return { box: "w-3 h-6", text: "text-[10px]" };
    return { box: "w-2 h-5", text: "text-[8px]" }; 
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

  const recordMistakeOnce = () => {
      if (!hasRecordedMistake) {
          registerMistake(questions[currentIndex].baseWordObj.id, 1);
          setHasRecordedMistake(true); 
      }
  };

  // ==========================================
  // OYUN MANTIĞI: ORTAK
  // ==========================================

  const handleSuccess = (wordToSpeak) => {
      setIsWordComplete(true);
      speak(wordToSpeak, 'main'); 
      updateGameStats('exercise', 1);
      
      const currentQ = questions[currentIndex];
      const dateKey = `lastExercise_${currentQ.formKey}`;
      handleUpdateWord(currentQ.baseWordObj.id, { [dateKey]: new Date().toISOString() });

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

      speak(wordToSpeak, 'main');
      updateGameStats('exercise', 1);

      const currentQ = questions[currentIndex];
      recordMistakeOnce(); // HATA KAYDI
      
      const dateKey = `lastExercise_${currentQ.formKey}`;
      handleUpdateWord(currentQ.baseWordObj.id, { [dateKey]: new Date().toISOString() });
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
        setCurrentWordPoints(p => Math.max(0, p - 2)); // Yanlış harf -2p
        
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
          setCurrentWordPoints(p => Math.max(0, p - 1)); // Yanlış yazım -1p

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
      setCurrentWordPoints(p => Math.max(0, p - 2)); // İpucu -2p

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

  // ===================================
  // === 1. MOD SEÇİM EKRANI ===
  // ===================================
  if (gameStatus === "selection") {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
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
                @media (hover: hover) {
                    .menu-btn:hover { border-color: #a5b4fc !important; background-color: #f8fafc !important; }
                    .btn-irregular:hover { border-color: #fca5a5 !important; background-color: #fef2f2 !important; }
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

                {/* --- INPUT SEÇİMİ TOGGLE --- */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex relative">
                    <button onClick={() => setInputMethod("bubbles")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all z-10 ${inputMethod === "bubbles" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}>
                        <MousePointer2 className="w-4 h-4" /> Harf Seç
                    </button>
                    <button onClick={() => setInputMethod("keyboard")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all z-10 ${inputMethod === "keyboard" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}>
                        <Keyboard className="w-4 h-4" /> Klavye
                    </button>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white text-center">
                    <h3 className="text-2xl font-bold mb-2">Form Çalışması</h3>
                    <p className="opacity-90 text-sm">Kelimenin istenen halini {inputMethod === "bubbles" ? "harfleri seçerek" : "klavye ile yazarak"} bul.</p>
                    <div className="mt-4 inline-block bg-white/20 px-4 py-1 rounded-full text-xs font-bold">
                        Aktif Havuz: {allWords.length} Kelime
                    </div>
                </div>

                <div className="space-y-3 pb-10">
                    
                    {/* 🔥 ÖZEL MODLAR: IRREGULAR 🔥 */}
                    <button 
                        onClick={(e) => startSession({ id: 'irr_v', label: 'Düzensiz Fiiller (Irregular Verbs)', key: 'irregular_verbs' }, e)}
                        disabled={getCount('irregular_verbs') === 0}
                        style={{ outline: 'none' }}
                        className="menu-btn btn-irregular w-full p-4 rounded-xl shadow-sm flex justify-between items-center focus:outline-none border-red-100 bg-red-50/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-2 rounded-lg text-red-500"><Sparkles className="w-5 h-5"/></div>
                            <span className="font-bold text-red-700">Düzensiz Fiiller</span>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-200 text-red-800">{getCount('irregular_verbs')}</span>
                    </button>

                    <button 
                        onClick={(e) => startSession({ id: 'irr_p', label: 'Düzensiz Çoğullar (Irregular Plurals)', key: 'irregular_plurals' }, e)}
                        disabled={getCount('irregular_plurals') === 0}
                        style={{ outline: 'none' }}
                        className="menu-btn btn-irregular w-full p-4 rounded-xl shadow-sm flex justify-between items-center focus:outline-none border-orange-100 bg-orange-50/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-2 rounded-lg text-orange-500"><Sparkles className="w-5 h-5"/></div>
                            <span className="font-bold text-orange-700">Düzensiz Çoğullar</span>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-200 text-orange-800">{getCount('irregular_plurals')}</span>
                    </button>

                    <div className="border-t border-slate-200 my-2"></div>

                    {/* STANDART MODLAR */}
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
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full shadow-sm"><X className="w-5 h-5 text-slate-400"/></button>
                <div className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 text-xs truncate max-w-[150px]">
                    {activeForm?.label.split('(')[0]}: {currentIndex + 1} / {questions.length}
                </div>
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200">
                    <Trophy className="w-4 h-4"/> {score}
                </div>
            </div>
            
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-500" style={{width:`${((currentIndex + 1) / questions.length) * 100}%`}}></div>
            </div>

            {/* OYUN KARTI */}
            <div className="bg-white p-5 rounded-3xl shadow-xl border border-slate-100 text-center relative overflow-hidden min-h-[450px] flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400"></div>

                {/* --- SAĞ ÜST: PUAN GÖSTERGESİ --- */}
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-bold border border-green-100 animate-in fade-in">
                    <Star className="w-3 h-3 fill-current"/> Soru: {Math.max(0, currentWordPoints)}p
                </div>

                {/* --- SOL ÜST: KELİME ETİKETLERİ --- */}
                {baseWordObj.tags && baseWordObj.tags.length > 0 && (
                    <div className="absolute top-4 left-4 flex flex-col items-start gap-1 z-10 max-w-[80px]">
                        {baseWordObj.tags.map((tag, i) => (
                            <span key={i} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-full">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-8 flex flex-col items-center gap-1"> 
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ANA KELİME (BASE)</div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black text-slate-800">{baseWordObj.word}</h2>
                        
                        <button onClick={(e) => { handleBlur(e); speak(baseWordObj.word, 'base'); }} className={`mini-btn p-1.5 rounded-lg border ${activeAudio === 'base' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}>
                            {activeAudio === 'base' ? <Square size={14} fill="currentColor"/> : <Volume2 size={14}/>}
                        </button>
                        <button onClick={(e) => { handleBlur(e); setShowWordTr(!showWordTr); }} className={`mini-btn p-1.5 rounded-lg border ${showWordTr ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                            <Languages size={14}/>
                        </button>
                    </div>
                    {showWordTr && (
                        <div className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg animate-in fade-in slide-in-from-top-1 mt-1">
                            {def.meaning}
                        </div>
                    )}
                </div>

                {/* Fonetik */}
                {baseWordObj?.phonetic?.trim() ? (
                  <div className="mt-1 flex justify-center animate-in fade-in slide-in-from-top-1">
                    <span className="text-indigo-400 font-serif italic text-lg tracking-wide px-3 py-0.5 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                      /{String(baseWordObj.phonetic).replace(/\//g, "")}/
                    </span>
                  </div>
                ) : ( <div className="h-7" /> )}
                
                {def.engExplanation && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative mt-2 text-left">
                         <p className="text-slate-600 text-sm italic pr-16 leading-relaxed">"{def.engExplanation}"</p>
                         <div className="absolute right-2 top-2 flex gap-1">
                             <button onClick={(e) => { handleBlur(e); speak(def.engExplanation, 'desc'); }} className={`mini-btn p-1.5 rounded-lg border ${activeAudio === 'desc' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}>
                                {activeAudio === 'desc' ? <Square size={12} fill="currentColor"/> : <Volume2 size={12}/>}
                             </button>
                             {def.trExplanation && (
                                 <button onClick={(e) => { handleBlur(e); setShowDefTr(!showDefTr); }} className={`mini-btn p-1.5 rounded-lg border ${showDefTr ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                                    <Languages size={12}/>
                                 </button>
                             )}
                         </div>
                         {showDefTr && def.trExplanation && <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-700 text-xs font-bold animate-in fade-in">TR: {def.trExplanation}</div>}
                    </div>
                )}

                <div className="space-y-3 mt-4">
                    {/* --- ORTA ALAN: İSTENEN FORM ETİKETİ --- */}
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-slate-50 inline-block px-2 py-1 rounded">
                        İSTENEN: {activeForm?.label.split('(')[0]}
                    </div>

                    {/* HARF KUTULARI */}
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

                {/* --- INPUT ALANI (BUBBLES VEYA KLAVYE) --- */}
                {inputMethod === "bubbles" ? (
                    <>
                        {!isWordComplete ? (
                            <div className="space-y-4">
                                <div className="flex flex-wrap justify-center gap-2 content-center min-h-[100px]">
                                    {shuffledLetters.map((item) => (
                                        <button key={item.id} onClick={(e) => handleLetterClick(item, e)} disabled={item.isUsed} className={`w-10 h-10 rounded-xl font-bold text-lg shadow-[0_3px_0_rgb(0,0,0,0.1)] transition-all active:translate-y-[2px] active:shadow-none outline-none focus:outline-none ${item.isUsed ? "opacity-0 pointer-events-none scale-0" : wrongAnimationId === item.id ? "bg-red-500 text-white animate-[shake_0.5s_ease-in-out]" : "bg-white border-2 border-slate-200 text-slate-700 active:bg-indigo-100"}`}>
                                            {item.char}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-center border-t border-slate-100 pt-3">
                                     <button onClick={handleHint} disabled={isWordComplete || targetWord.length <= 1} className={`flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm active:scale-95 transition-transform focus:outline-none ${(isWordComplete || targetWord.length <= 1) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <Lightbulb className="w-4 h-4"/> 
                                        <span>İpucu {targetWord.length <= 1 ? "(Yok)" : (hintCount === 0 ? "(-5p)" : "(-0p)")}</span>
                                        <span className="text-[10px] bg-white/50 px-1.5 rounded ml-1">Hata: {mistakeCount}/3</span>
                                     </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : (
                    /* KLAVYE MODU */
                    <>
                        {!isWordComplete ? (
                            <form onSubmit={handleKeyboardSubmit} className="space-y-3 pb-2">
                                <input ref={inputRef} type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Cevabı yaz..." className={`w-full text-center text-2xl font-bold p-3 border-b-4 rounded-xl outline-none transition-all ${wrongAnimationId === "input" ? "border-red-500 bg-red-50 text-red-600 animate-[shake_0.5s_ease-in-out]" : "border-indigo-200 bg-indigo-50 text-indigo-700 focus:border-indigo-500"}`} autoComplete="off" autoCorrect="off" autoCapitalize="none" />
                                <div className="flex justify-between items-center px-2">
                                    <div className="text-xs font-bold text-slate-400">Hata Hakkı: <span className="text-red-500">{3 - mistakeCount}</span></div>
                                    <button type="button" onClick={handleKeyboardHint} disabled={hintCount >= (targetWord.length <= 2 ? 1 : 2)} className="text-xs flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold active:scale-95 disabled:opacity-50">
                                        <Lightbulb className="w-3 h-3" /> İpucu (-2p)
                                    </button>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-md mt-4 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">Kontrol Et <Check className="w-5 h-5"/></button>
                            </form>
                        ) : null}
                    </>
                )}

                {/* BAŞARI / GEÇİŞ */}
                {isWordComplete && (
                    <div className="animate-in zoom-in duration-300 pb-2">
                        <div className="flex items-center justify-center gap-2 mb-4 text-green-600 font-bold bg-green-50 p-3 rounded-xl border border-green-100">
                            {mistakeCount >= 3 ? <><AlertTriangle className="w-5 h-5 text-orange-500"/> Doğrusu Bu</> : <><CheckCircle2 className="w-6 h-6"/> Harika!</>}
                        </div>
                        <button onClick={handleNext} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-transform">
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
            <button onClick={handleQuitEarly} className="w-full text-center text-slate-400 hover:text-red-500 text-sm font-medium transition-colors focus:outline-none p-2">
                <LogOut className="w-4 h-4 inline mr-1" /> Bitir (Puanı Al ve Çık)
            </button>
        </div>
    </div>
  );
}
