import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Trophy, 
  Volume2, 
  Languages, 
  Loader2, 
  Home, 
  RefreshCw, 
  BrainCircuit, 
  Hourglass,
  Square,
  Star,
  Tag
} from "lucide-react";

export default function Quiz() {
  const { getAllWords, knownWordIds, learningQueue, addScore, updateGameStats, handleUpdateWord } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameMode, setGameMode] = useState(null); 
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [gameStatus, setGameStatus] = useState("mode-selection"); 
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [showHintTr, setShowHintTr] = useState(false);
  
  // --- SES TAKİBİ ---
  const [activeAudio, setActiveAudio] = useState(null);

  const getWordPools = () => {
    const all = getAllWords();
    const validWords = all.filter(
      w => w.definitions && w.definitions[0]?.meaning
    );
    const now = new Date();

    const getQueueItem = (id) =>
      learningQueue ? learningQueue.find(q => q.wordId === id) : null;

    const waitingPool = validWords.filter(w => {
      const q = getQueueItem(w.id);
      return q && new Date(q.nextReview) > now;
    });

    const reviewPool = validWords.filter(w =>
      knownWordIds.includes(w.id)
    );

    const learnPool = validWords.filter(w => {
      if (knownWordIds.includes(w.id)) return false;
      const q = getQueueItem(w.id);
      if (!q) return true;
      if (new Date(q.nextReview) <= now) return true;
      return false;
    });

    return { learnPool, reviewPool, waitingPool };
  };

  const { learnPool, reviewPool, waitingPool } = getWordPools();

  // --- IPHONE FIX ---
  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  // --- OYUN BAŞLATMA ---
  const startQuiz = (mode, e) => {
    handleBlur(e);
    setGameMode(mode);
    let pool = [];

    if (mode === "learn") pool = learnPool;
    else if (mode === "review") pool = reviewPool;
    else if (mode === "waiting") pool = waitingPool;

    if (pool.length < 4) {
      alert(`Quiz başlatmak için bu modda en az 4 kelimeye ihtiyaç var. (Şu an: ${pool.length})`);
      return;
    }

    // --- AKILLI SIRALAMA ---
    const neverSeen = [];
    const seen = [];

    pool.forEach(w => {
        if (!w.lastSeen_quiz) {
            neverSeen.push(w);
        } else {
            seen.push(w);
        }
    });

    neverSeen.sort(() => 0.5 - Math.random());
    seen.sort((a, b) => new Date(a.lastSeen_quiz).getTime() - new Date(b.lastSeen_quiz).getTime());

    const smartSortedPool = [...neverSeen, ...seen];
    const selectedCandidates = smartSortedPool.slice(0, 20);
    const selectedWords = selectedCandidates.sort(() => 0.5 - Math.random());

    const allValidWords = getAllWords().filter(w => w.definitions && w.definitions[0]?.meaning);

    const generated = selectedWords.map(target => {
      const correct = target.definitions[0].meaning;
      
      const others = allValidWords
        .filter(w => 
            w.id !== target.id && 
            w.word.toLowerCase().trim() !== target.word.toLowerCase().trim()
        )
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.definitions[0].meaning);
      
      return { 
        wordObj: target, 
        correct, 
        options: [...others, correct].sort(() => 0.5 - Math.random()) 
      };
    });
    
    setQuestions(generated);
    setIndex(0);
    setScore(0);
    
    setSelected(null);
    setIsAnswered(false);
    setShowHintTr(false);
    
    setGameStatus("playing");
  };

  // --- SAYFA DEĞİŞİKLİĞİNDE SESİ DURDUR ---
  useEffect(() => { 
      window.speechSynthesis.cancel(); 
      setActiveAudio(null); 
      return () => window.speechSynthesis.cancel();
  }, [index, gameStatus]);

  const handleAnswer = (option, e) => {
    handleBlur(e);

    if (isAnswered) return;
    setIsAnswered(true); 
    setSelected(option);
    
    const currentWord = questions[index].wordObj;
    handleUpdateWord(currentWord.id, { lastSeen_quiz: new Date().toISOString() });

    if (option === questions[index].correct) {
        setScore(s => s + 5);
    }

    updateGameStats('quiz', 1);
    
    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIsTransitioning(true);
        setTimeout(() => {
            setIndex(i => i + 1);
            setSelected(null);
            setIsAnswered(false); 
            setShowHintTr(false);
            setIsTransitioning(false);
        }, 150); 
      } else {
        setGameStatus("finished");
        const finalPoints = score + (option === questions[index].correct ? 5 : 0);
        addScore(finalPoints); 
      }
    }, 1000);
  };

  const handleQuitEarly = () => {
      if (score > 0) addScore(score);
      setGameStatus("finished"); 
  };

  const handleSpeak = (txt, id) => { 
    if(!txt) return;

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

  // ===========================
  // === 1. MOD SEÇİM EKRANI ===
  // ===========================
  if (gameStatus === "mode-selection") {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <style>{`
                * { -webkit-tap-highlight-color: transparent !important; }
                .menu-btn { 
                    background-color: white;
                    border: 2px solid #f1f5f9; 
                    transition: all 0.2s ease;
                }
                .menu-btn:active {
                    transform: scale(0.96);
                    background-color: #f8fafc;
                }
                .menu-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                @media (hover: hover) {
                    .btn-review:hover { border-color: #fed7aa !important; background-color: #fff7ed !important; }
                    .btn-learn:hover { border-color: #c7d2fe !important; background-color: #eef2ff !important; }
                    .btn-wait:hover { border-color: #cbd5e1 !important; background-color: #f8fafc !important; }
                }
            `}</style>

            <div className="w-full max-w-sm space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
                      <Home className="w-5 h-5 text-slate-600" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Quiz</h2>
                    <div className="w-9"></div>
                </div>
                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Nasıl Test Edelim?</h1>
                    <p className="text-slate-500">Türkçesini bul.</p>
                </div>
                <div className="space-y-4">
                    <button onClick={(e) => startQuiz('review', e)} disabled={reviewPool.length < 4} style={{ outline: 'none' }} className="menu-btn btn-review w-full p-5 rounded-2xl shadow-md focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4"><div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div><div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Öğrendiklerini Pekiştir</div></div></div>
                            <div className="text-2xl font-black text-orange-600">{reviewPool.length}</div>
                        </div>
                    </button>
                    <button onClick={(e) => startQuiz('learn', e)} disabled={learnPool.length < 4} style={{ outline: 'none' }} className="menu-btn btn-learn w-full p-5 rounded-2xl shadow-md focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4"><div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><BrainCircuit className="w-8 h-8" /></div><div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni Kelimeler</div></div></div>
                            <div className="text-2xl font-black text-indigo-600">{learnPool.length}</div>
                        </div>
                    </button>
                    <button onClick={(e) => startQuiz('waiting', e)} disabled={waitingPool.length < 4} style={{ outline: 'none' }} className="menu-btn btn-wait w-full p-5 rounded-2xl shadow-md focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4"><div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div><div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Henüz Zamanı Gelmeyen Kelimeler</div></div></div>
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
    let modeTitle = "Test Tamamlandı!";
    if (gameMode === "learn") modeTitle = "Bitti";
    if (gameMode === "review") modeTitle = "Bitti";
    if (gameMode === "waiting") modeTitle = "Bitti";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-purple-600"/></div>
           <h2 className="text-2xl font-bold text-slate-800">{modeTitle}</h2>
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="text-sm text-slate-400 font-bold uppercase">TOPLAM PUAN</div>
             <div className="text-5xl font-extrabold text-indigo-600 mt-2">{score}</div>
             <div className="text-xs text-slate-400 font-bold">Maksimum: {max}</div>
           </div>
           <button onClick={() => setGameStatus("mode-selection")} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200">Başka Test Çöz</button>
           <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50">Ana Sayfa</button>
        </div>
      </div>
    );
  }

  // ===========================
  // === 3. OYUN EKRANI ===
  // ===========================
  if (questions.length === 0) return <div className="p-10 text-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-600 mx-auto"/></div>;

  const current = questions[index];
  const progress = ((index + 1) / questions.length) * 100;
  
  const hintEng = current.wordObj.definitions[0].engExplanation;
  const hintTr = current.wordObj.definitions[0].trExplanation;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       <style>{`
         * { -webkit-tap-highlight-color: transparent !important; }
         .quiz-option-btn {
            background-color: white; border: 2px solid #e2e8f0; color: #334155; transition: all 0.2s ease;
         }
         .quiz-option-btn:active { background-color: #f1f5f9; transform: scale(0.98); }
         .quiz-action-btn {
            background-color: white; border: 1px solid #e2e8f0; color: #94a3b8; transition: all 0.2s ease;
         }
         .quiz-action-btn:active { background-color: #f1f5f9; transform: scale(0.95); }
         @media (hover: hover) {
            .quiz-option-btn:hover { border-color: #a5b4fc !important; background-color: #eef2ff !important; }
            .quiz-action-btn:hover { background-color: #f1f5f9; border-color: #cbd5e1; color: #4f46e5; }
         }
       `}</style>

       <div className="w-full max-w-md space-y-6 mt-4">
          
          {/* Header */}
          <div className="flex justify-between items-center">
             <button onClick={handleQuitEarly} className="p-2 rounded-full active:bg-slate-100 transition-colors"><X className="w-6 h-6 text-slate-400"/></button>
             <div className="font-bold text-indigo-600">
                {gameMode === 'review' ? 'Tekrar' : gameMode === 'learn' ? 'Öğrenme' : 'Bekleme'}: {index+1} / {questions.length}
             </div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-600 px-2 py-1 rounded-lg font-bold text-sm"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>
          
          {isTransitioning ? (
              <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin"/>
              </div>
          ) : (
              <>
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 text-center space-y-6 mt-6 animate-in fade-in zoom-in duration-300 relative overflow-hidden">
                    
                    {/* --- SAĞ ÜST KÖŞE: PUAN --- */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-bold border border-green-100">
                        <Star className="w-3 h-3 fill-current"/> 5p
                    </div>

                    {/* --- 🔥 SOL ÜST KÖŞE: ETİKETLER (top-0: en tepeye yaslı) 🔥 --- */}
                    {current.wordObj.tags && current.wordObj.tags.length > 0 && (
                        <div className="absolute top-0 left-4 mt-4 flex gap-1 max-w-[50%] flex-wrap justify-start">
                            {current.wordObj.tags.map((tag, i) => (
                                <span key={i} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-full">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* --- ANA İÇERİK (mt-8 ile aşağı itildi) --- */}
                    <div className="mt-8 flex flex-col items-center gap-4">

                        {/* İngilizce İpucu Alanı */}
                        {hintEng && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="bg-indigo-50 text-indigo-800 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                                    <span className="text-sm italic">"{hintEng}"</span>
                                    
                                    <button 
                                        onClick={(e) => {
                                            handleBlur(e);
                                            handleSpeak(hintEng, 'hint');
                                        }}
                                        style={{ outline: 'none' }}
                                        className={`quiz-action-btn p-1.5 rounded-lg border flex items-center justify-center focus:outline-none focus:ring-0 ${activeAudio === 'hint' ? '!text-red-500 !border-red-200' : ''}`}
                                        title={activeAudio === 'hint' ? "Durdur" : "Oku"}
                                    >
                                        {activeAudio === 'hint' ? <Square className="w-3 h-3 fill-current"/> : <Volume2 className="w-3 h-3"/>}
                                    </button>
                                    
                                    {hintTr && (
                                        <button 
                                            onClick={(e) => {
                                                handleBlur(e);
                                                setShowHintTr(!showHintTr);
                                            }} 
                                            style={{ outline: 'none' }}
                                            className={`quiz-action-btn p-1.5 rounded-lg border flex items-center justify-center focus:outline-none focus:ring-0 ${showHintTr ? '!bg-indigo-100 !text-indigo-600 !border-indigo-200' : ''}`}
                                            title="Çeviri"
                                        >
                                            <Languages className="w-3 h-3"/>
                                        </button>
                                    )}
                                </div>
                                
                                {showHintTr && hintTr && (
                                    <div className="bg-green-50 text-green-700 px-3 py-1 text-xs font-bold rounded animate-in fade-in">
                                        TR: {hintTr}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <h2 className="text-4xl font-extrabold text-slate-800">{current.wordObj.word}</h2>

                        {current.wordObj.phonetic && (
                            <div className="flex justify-center animate-in fade-in slide-in-from-top-1">
                                <span className="text-indigo-400 font-serif italic text-lg tracking-wide px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100">
                                / {current.wordObj.phonetic.replace(/\//g, "")} /
                                </span>
                            </div>
                        )}
                        
                        <button 
                            onClick={(e) => {
                                handleBlur(e);
                                handleSpeak(current.wordObj.word, 'main');
                            }}
                            style={{ outline: 'none' }}
                            className={`
                                quiz-action-btn mx-auto p-3 rounded-full border flex items-center justify-center
                                focus:outline-none focus:ring-0
                                ${activeAudio === 'main' ? '!text-white !bg-indigo-600 !border-indigo-600' : ''}
                            `}
                            title={activeAudio === 'main' ? "Durdur" : "Oku"}
                        >
                            {activeAudio === 'main' ? <Square className="w-6 h-6 fill-current"/> : <Volume2 className="w-6 h-6"/>}
                        </button>
                    </div>
                </div>

                {/* ŞIKLAR */}
                <div className="space-y-3 mt-6">
                    {current.options.map((opt, i) => {
                        let dynamicClass = "quiz-option-btn w-full p-4 rounded-xl text-left font-medium shadow-sm focus:outline-none focus:ring-0 select-none touch-manipulation";
                        
                        if (isAnswered) {
                            if (opt === current.correct) {
                                dynamicClass = "w-full p-4 rounded-xl text-left font-medium shadow-sm border-2 bg-green-100 border-green-500 text-green-700";
                            } else if (opt === selected) {
                                dynamicClass = "w-full p-4 rounded-xl text-left font-medium shadow-sm border-2 bg-red-100 border-red-500 text-red-700";
                            } else {
                                dynamicClass = "w-full p-4 rounded-xl text-left font-medium shadow-sm border-2 bg-white border-slate-200 text-slate-400 opacity-50";
                            }
                        }

                        return (
                            <button 
                                    key={`${index}-${i}`} 
                                    onClick={(e)=>handleAnswer(opt, e)} 
                                    disabled={isAnswered} 
                                    style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                                    className={dynamicClass}
                            >
                                    {opt}
                            </button>
                        );
                    })}
                </div>
              </>
          )}

          <button onClick={handleQuitEarly} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="w-full mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto focus:outline-none focus:ring-0">
            Bitir (Puanı Al ve Çık)
          </button>

       </div>
    </div>
  );
}
