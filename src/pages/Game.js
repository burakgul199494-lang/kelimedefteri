import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import WordCard from "../components/WordCard";
import { useNavigate } from "react-router-dom";
import {
  X, Home, Target, Check, CheckCheck, Trophy, RotateCcw, 
  Brain, Hourglass, Layers, ArrowRight, AlertTriangle, Flag, Lightbulb, Loader2
} from "lucide-react";

export default function Game() {
  const { getAllWords, knownWordIds, handleSmartLearn, learningQueue, addScore, updateGameStats, handleUpdateWord } = useData();
  const navigate = useNavigate();

  const [gameStage, setGameStage] = useState("selection");
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [stats, setStats] = useState({ learned: 0, review: 0, mastered: 0 });
  const [activeMode, setActiveMode] = useState(null);

  const [showMasterConfirm, setShowMasterConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- PEKİŞTİRME (REINFORCEMENT) STATE'LERİ ---
  const [reinforcementQuestions, setReinforcementQuestions] = useState([]);
  const [reinfIndex, setReinfIndex] = useState(0);
  const [reinfInput, setReinfInput] = useState("");
  const [reinfFeedback, setReinfFeedback] = useState(null);
  const [reinfMistakes, setReinfMistakes] = useState(0);
  const [reinfHintCount, setReinfHintCount] = useState(0);
  const [revealedCorrectId, setRevealedCorrectId] = useState(null);
  const [wrongOptionIds, setWrongOptionIds] = useState([]); 
  const [isReinfTransitioning, setIsReinfTransitioning] = useState(false);

  const POINTS_PER_CARD = 5;

  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  const pools = useMemo(() => {
    const all = getAllWords();
    const now = new Date();
    const getQueueItem = (id) => learningQueue ? learningQueue.find(q => q.wordId === id) : null;

    const waitingPool = all.filter(w => {
        const q = getQueueItem(w.id);
        return q && new Date(q.nextReview) > now;
    });

    const reviewPool = all.filter(w => knownWordIds.includes(w.id));

    const learnPool = all.filter(w => {
        if (knownWordIds.includes(w.id)) return false;
        const q = getQueueItem(w.id);
        if (!q) return true;
        if (new Date(q.nextReview) <= now) return true;
        return false;
    });

    return { learnPool, reviewPool, waitingPool };
  }, [getAllWords, knownWordIds, learningQueue]);

  // --- PEKİŞTİRME BAŞLATMA FONKSİYONU ---
  const startReinforcement = () => {
    const allWords = getAllWords();
    const testTypes = ["quiz", "reverse", "writing"]; 
    
    const generatedQuestions = sessionWords.map(wordObj => {
        const randomType = testTypes[Math.floor(Math.random() * testTypes.length)];
        
        let options = [];
        if (randomType === "quiz" || randomType === "reverse") {
            const distractors = allWords
                .filter(w => w.id !== wordObj.id && w.definitions && w.definitions.length > 0)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
            
            options = [...distractors, wordObj].sort(() => 0.5 - Math.random());
        }

        return {
            wordObj,
            type: randomType,
            options
        };
    });

    setReinforcementQuestions(generatedQuestions);
    setReinfIndex(0);
    setReinfMistakes(0);
    setReinfHintCount(0);
    setRevealedCorrectId(null);
    setWrongOptionIds([]);
    setIsReinfTransitioning(false);
    setGameStage("reinforcement"); 
  };

  const startSession = (mode, e) => {
    handleBlur(e); 
    setActiveMode(mode);
    let pool = []; 

    if (mode === "learn") pool = pools.learnPool;
    else if (mode === "review") pool = pools.reviewPool;
    else if (mode === "waiting") pool = pools.waitingPool;

    if (pool.length === 0) {
      alert("Bu modda şu an çalışılacak kelime yok!");
      return;
    }

    const neverSeen = [];
    const seen = [];

    pool.forEach(w => {
        if (!w.lastSeen) neverSeen.push(w);
        else seen.push(w);
    });

    neverSeen.sort(() => 0.5 - Math.random());
    seen.sort((a, b) => new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime());

    const smartSortedPool = [...neverSeen, ...seen];
    const selected = smartSortedPool.slice(0, 10).sort(() => 0.5 - Math.random());

    setSessionWords(selected);
    setCurrentIndex(0);
    setStats({ learned: 0, review: 0, mastered: 0 });
    setGameStage("playing");
  };

  const handleAnswerAction = async (dir, type, e) => {
    if (e) handleBlur(e); 
    if (currentIndex >= sessionWords.length) return;

    if (activeMode === 'waiting' && type === 'dont_know') {
        setShowResetConfirm(true); 
        return;
    }

    setSwipeDirection(dir);
    const currentWord = sessionWords[currentIndex];

    setTimeout(async () => {
      if (activeMode === 'review') {
          setStats((p) => ({ ...p, review: p.review + 1 }));
          updateGameStats('flashcard', 1);
      } 
      else if (activeMode === 'waiting' && type === 'waiting_pass') {
          setStats((p) => ({ ...p, review: p.review + 1 })); 
          updateGameStats('flashcard', 1);
      }
      else {
          if (type === "dont_know") {
              await handleUpdateWord(currentWord.id, { lastSeen: new Date().toISOString() });
              setStats((p) => ({ ...p, review: p.review + 1 })); 
              updateGameStats('flashcard', 1);
          } 
          else {
              await handleSmartLearn(currentWord.id, type);
              if (type === "know") {
                  setStats((p) => ({ ...p, learned: p.learned + 1 }));
                  updateGameStats('flashcard', 1);
              }
              else if (type === "master") {
                  setStats((p) => ({ ...p, mastered: p.mastered + 1, learned: p.learned + 1 }));
                  updateGameStats('flashcard', 1);
              }
          }
      }

      if (currentIndex + 1 < sessionWords.length) {
        setCurrentIndex((p) => p + 1);
        setSwipeDirection(null);
      } else {
        startReinforcement(); 
        setSwipeDirection(null);
      }
    }, 150); 
  };

  const handleMasterClick = (e) => { handleBlur(e); setShowMasterConfirm(true); };
  const confirmMastery = (e) => { handleBlur(e); setShowMasterConfirm(false); handleAnswerAction("up", "master", e); };
  
  const confirmReset = (e) => {
      handleBlur(e);
      setShowResetConfirm(false);
      setSwipeDirection("left");
      const currentWord = sessionWords[currentIndex];
      setTimeout(async () => {
          await handleSmartLearn(currentWord.id, "dont_know");
          setStats((p) => ({ ...p, review: p.review + 1 }));
          if (currentIndex + 1 < sessionWords.length) {
              setCurrentIndex((p) => p + 1);
              setSwipeDirection(null);
          } else {
              startReinforcement();
              setSwipeDirection(null);
          }
      }, 150);
  };

  const closeModal = (e) => { handleBlur(e); setShowMasterConfirm(false); setShowResetConfirm(false); };
  
  const handleQuitEarly = (e) => {
    handleBlur(e);
    setGameStage("summary");
  };


  // ==================== PEKİŞTİRME MANTIĞI ====================

  const moveToNextReinf = () => {
      if (reinfIndex + 1 < reinforcementQuestions.length) {
          setIsReinfTransitioning(true); // 🔥 Geçişi başlat (eski butonları tamamen yok et)

          setTimeout(() => {
              setReinfIndex(p => p + 1);
              setReinfFeedback(null);
              setReinfInput("");
              setReinfMistakes(0);
              setReinfHintCount(0);
              setRevealedCorrectId(null);
              setWrongOptionIds([]); 
              setIsReinfTransitioning(false); // 🔥 Yeni sorularla birlikte ekranı geri getir
          }, 150);
      } else {
          setGameStage("summary"); 
      }
  };

  // QUIZ & REVERSE QUIZ
  const handleReinforcementAnswer = (isCorrect, clickedId, e) => {
      if (e) handleBlur(e); 
      const currentQ = reinforcementQuestions[reinfIndex];
      
      if (isCorrect) {
          setReinfFeedback("correct");
          if (activeMode === 'learn') addScore(POINTS_PER_CARD);

          setTimeout(() => {
              moveToNextReinf();
          }, 800);
      } else {
          const newMistakes = reinfMistakes + 1;
          setReinfMistakes(newMistakes);
          setWrongOptionIds(prev => [...prev, clickedId]); 
          
          if (newMistakes >= 3) { 
              setReinfFeedback("wrong");
              setRevealedCorrectId(currentQ.wordObj.id); 
              setTimeout(() => moveToNextReinf(), 1500);
          } else {
              setReinfFeedback("wrong");
              setTimeout(() => setReinfFeedback(null), 600);
          }
      }
  };

  // YAZMA MODU
  const handleReinfSubmit = (e) => {
      e.preventDefault();
      if (e) handleBlur(e); 
      const currentQ = reinforcementQuestions[reinfIndex];
      const targetWord = currentQ.wordObj.word.trim().toLowerCase();
      const userInput = reinfInput.trim().toLowerCase();
      
      if (userInput === targetWord) {
          setReinfFeedback("correct");
          if (activeMode === 'learn') {
              addScore(POINTS_PER_CARD); 
          }
          setTimeout(() => moveToNextReinf(), 800);
      } else {
          const newMistakes = reinfMistakes + 1;
          setReinfMistakes(newMistakes);
          
          if (newMistakes >= 3) { 
              setReinfFeedback("wrong");
              setReinfInput(currentQ.wordObj.word); 
              setTimeout(() => moveToNextReinf(), 1500);
          } else {
              setReinfFeedback("wrong");
              setTimeout(() => setReinfFeedback(null), 600);
          }
      }
  };

  const handlePassReinforcement = (e) => {
      if (e) handleBlur(e);
      const currentQ = reinforcementQuestions[reinfIndex];
      
      setReinfInput(currentQ.wordObj.word); 
      setReinfFeedback("wrong"); 
      setTimeout(() => moveToNextReinf(), 1500); 
  };

  const handleReinfHint = (e) => {
      if (e) handleBlur(e);
      if (reinfHintCount >= 2) return;
      
      const targetWord = reinforcementQuestions[reinfIndex].wordObj.word;
      const nextHintCount = reinfHintCount + 1;
      setReinfHintCount(nextHintCount);
      
      let correctPrefix = "";
      for (let i = 0; i < nextHintCount; i++) {
          if (targetWord[i]) correctPrefix += targetWord[i];
      }
      setReinfInput(correctPrefix);
  };


  // ==================== UI BÖLÜMÜ ====================

  if (gameStage === "selection") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
        <style>{`
            * { -webkit-tap-highlight-color: transparent !important; }
            .game-btn { transition: transform 0.1s ease, background-color 0.2s ease, border-color 0.2s ease; }
            @media (hover: hover) {
                .btn-select:hover { border-color: #fb923c !important; background-color: #fff7ed !important; }
                .btn-learn:hover { border-color: #818cf8 !important; background-color: #eef2ff !important; }
                .btn-wait:hover { border-color: #cbd5e1 !important; background-color: #f8fafc !important; }
                .icon-btn:hover { background-color: #f1f5f9 !important; }
            }
        `}</style>
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="icon-btn p-2 bg-white rounded-full shadow-sm active:bg-slate-100 transition-colors"><Home className="w-5 h-5 text-slate-600" /></button>
            <h2 className="text-xl font-bold text-slate-800">Flash Kartlar</h2>
            <div className="w-9"></div>
          </div>
          <div className="text-center py-6">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Nasıl Çalışalım?</h1>
            <p className="text-slate-500">Bugünkü hedefini seç ve kelimeleri çevirmeye başla.</p>
          </div>
          <div className="space-y-4">
            <button onClick={(e) => startSession("review", e)} disabled={pools.reviewPool.length === 0} className="game-btn btn-select w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RotateCcw className="w-8 h-8" /></div>
                  <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Öğrendiklerini Pekiştir</div></div>
                </div>
                <div className="text-2xl font-black text-orange-600">{pools.reviewPool.length}</div>
              </div>
            </button>
            <button onClick={(e) => startSession("learn", e)} disabled={pools.learnPool.length === 0} className="game-btn btn-learn w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><Brain className="w-8 h-8" /></div>
                  <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni Kelimeler</div></div>
                </div>
                <div className="text-2xl font-black text-indigo-600">{pools.learnPool.length}</div>
              </div>
            </button>
            <button onClick={(e) => startSession("waiting", e)} disabled={pools.waitingPool.length === 0} className="game-btn btn-wait w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 active:scale-95 disabled:opacity-60 focus:outline-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div>
                  <div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Henüz Zamanı Gelmeyenler Kelimeler</div></div>
                </div>
                <div className="text-2xl font-black text-slate-500">{pools.waitingPool.length}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== PEKİŞTİRME EKRANI ====================
  if (gameStage === "reinforcement") {
      const currentQ = reinforcementQuestions[reinfIndex];
      const progress = ((reinfIndex) / reinforcementQuestions.length) * 100;
      
      const mainMeaning = currentQ.wordObj.definitions && currentQ.wordObj.definitions[0] 
            ? currentQ.wordObj.definitions[0].meaning : "Anlam bulunamadı";

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 relative">
            <style>{`
                @keyframes softShake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-soft-shake { animation: softShake 0.4s ease-in-out; }
            `}</style>
             
             <div className="w-full max-w-md mb-6">
                <div className="flex justify-between items-center mb-2">
                    <button onClick={handleQuitEarly} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"><X className="w-6 h-6" /></button>
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">Test {reinfIndex + 1}/{reinforcementQuestions.length}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
            </div>

            {/* 🔥 GEÇİŞ BAŞLADIYSA YAPIYI GİZLE (DOM SIFIRLANIR) 🔥 */}
            {isReinfTransitioning ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin"/>
                </div>
            ) : (
                <div 
                    className={`w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center transition-all duration-300 border-2 ${
                        reinfFeedback === 'correct' ? 'border-green-400 bg-green-50' : 
                        reinfFeedback === 'wrong' ? 'border-red-400 bg-red-50 animate-soft-shake' : 'border-slate-100'
                    }`}
                >
                    
                    {/* QUİZ (İngilizce -> Türkçe) */}
                    {currentQ.type === "quiz" && (
                        <div className="animate-in fade-in">
                            <div className="flex justify-between px-1 mb-2">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Anlamını Seç</span>
                                <span className="text-xs font-bold text-red-400">Kalan Hata: {2 - reinfMistakes}</span>
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 mb-8 break-words">{currentQ.wordObj.word}</h2>
                            <div className="grid grid-cols-1 gap-3">
                                {currentQ.options.map((opt, i) => {
                                    const isCorrectAnswer = opt.id === currentQ.wordObj.id;
                                    const isRevealed = revealedCorrectId === opt.id;
                                    const isWrong = wrongOptionIds.includes(opt.id); 
                                    
                                    let btnClass = "w-full p-4 border-2 rounded-xl font-bold transition-all outline-none focus:outline-none select-none touch-manipulation ";
                                    
                                    if (isRevealed) {
                                        btnClass += "bg-green-100 border-green-500 text-green-800 scale-105 shadow-md";
                                    } else if (reinfFeedback === 'correct' && isCorrectAnswer) {
                                        btnClass += "bg-green-100 border-green-500 text-green-800 shadow-md";
                                    } else if (isWrong) {
                                        btnClass += "bg-red-50 border-red-200 text-red-400 opacity-50"; 
                                    } else if (reinfFeedback !== null) {
                                        btnClass += "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
                                    } else {
                                        btnClass += "bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 active:scale-95";
                                    }

                                    return (
                                        <button 
                                            // 🔥 BURASI EN KRİTİK NOKTA: reinfIndex eklenerek butonun eski buton sayılması engellendi
                                            key={`${reinfIndex}-${i}`} 
                                            onClick={(e) => handleReinforcementAnswer(isCorrectAnswer, opt.id, e)} 
                                            disabled={reinfFeedback !== null || isWrong || isRevealed} 
                                            // 🔥 İKİNCİ KRİTİK NOKTA: Mavi pasif tık izini silmek için eklendi
                                            style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                                            className={btnClass}
                                        >
                                            {opt.definitions && opt.definitions[0] ? opt.definitions[0].meaning : "Anlam yok"}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* REVERSE QUİZ (Türkçe -> İngilizce) */}
                    {currentQ.type === "reverse" && (
                        <div className="animate-in fade-in">
                            <div className="flex justify-between px-1 mb-2">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">İngilizcesini Seç</span>
                                <span className="text-xs font-bold text-red-400">Kalan Hata: {2 - reinfMistakes}</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-8 break-words">{mainMeaning}</h2>
                            <div className="grid grid-cols-1 gap-3">
                                {currentQ.options.map((opt, i) => {
                                    const isCorrectAnswer = opt.id === currentQ.wordObj.id;
                                    const isRevealed = revealedCorrectId === opt.id;
                                    const isWrong = wrongOptionIds.includes(opt.id); 
                                    
                                    let btnClass = "w-full p-4 border-2 rounded-xl font-bold transition-all outline-none focus:outline-none select-none touch-manipulation ";
                                    
                                    if (isRevealed) {
                                        btnClass += "bg-green-100 border-green-500 text-green-800 scale-105 shadow-md";
                                    } else if (reinfFeedback === 'correct' && isCorrectAnswer) {
                                        btnClass += "bg-green-100 border-green-500 text-green-800 shadow-md";
                                    } else if (isWrong) {
                                        btnClass += "bg-red-50 border-red-200 text-red-400 opacity-50"; 
                                    } else if (reinfFeedback !== null) {
                                        btnClass += "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
                                    } else {
                                        btnClass += "bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 active:scale-95";
                                    }

                                    return (
                                        <button 
                                            // 🔥 BURASI EN KRİTİK NOKTA
                                            key={`${reinfIndex}-${i}`} 
                                            onClick={(e) => handleReinforcementAnswer(isCorrectAnswer, opt.id, e)} 
                                            disabled={reinfFeedback !== null || isWrong || isRevealed} 
                                            // 🔥 İKİNCİ KRİTİK NOKTA
                                            style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                                            className={btnClass}
                                        >
                                            {opt.word}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* YAZMA (Türkçe verilir, İngilizce istenir) */}
                    {currentQ.type === "writing" && (
                        <div className="animate-in fade-in">
                            <div className="flex justify-between items-center px-1 mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">İngilizcesini Yaz</span>
                                <span className="text-xs font-bold text-red-400">Kalan Hata: {2 - reinfMistakes}</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2 break-words">{mainMeaning}</h2>
                            {currentQ.wordObj.sentence && <p className="text-sm text-slate-500 italic mb-6">İpucu: "{currentQ.wordObj.sentence.replace(new RegExp(currentQ.wordObj.word, 'gi'), '_____')}"</p>}
                            
                            <div className="flex justify-end mb-2 px-1">
                                <button type="button" onClick={handleReinfHint} disabled={reinfHintCount >= 2 || reinfFeedback !== null} className="text-xs flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold active:scale-95 disabled:opacity-50">
                                    <Lightbulb className="w-3 h-3"/> Harf Aç ({reinfHintCount}/2)
                                </button>
                            </div>

                            <form onSubmit={handleReinfSubmit}>
                                <input 
                                    type="text" 
                                    value={reinfInput} 
                                    onChange={(e) => setReinfInput(e.target.value)} 
                                    disabled={reinfFeedback !== null}
                                    autoFocus
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    placeholder="Kelimeyi buraya yaz..." 
                                    className={`w-full p-4 text-center text-2xl font-bold border-b-4 rounded-xl outline-none mb-4 transition-colors ${
                                        reinfFeedback === 'wrong' ? 'bg-red-50 border-red-300 text-red-600' : 
                                        'bg-slate-50 border-slate-300 focus:border-indigo-500 text-slate-800'
                                    }`}
                                />
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={handlePassReinforcement} 
                                        disabled={reinfFeedback !== null} 
                                        className="w-1/3 bg-slate-200 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-300 disabled:opacity-50 active:scale-95 transition-all outline-none focus:outline-none"
                                    >
                                        Pas
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={!reinfInput.trim() || reinfFeedback !== null} 
                                        className="w-2/3 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all outline-none focus:outline-none"
                                    >
                                        Kontrol Et
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
      );
  }

  // ==================== BİTİŞ EKRANI ====================
  if (gameStage === "summary") {
    let modeTitle = "Oturum Bitti!";
    if (activeMode === "learn") modeTitle = "Çalışma Tamamlandı";
    if (activeMode === "review") modeTitle = "Tekrar Tamamlandı";
    if (activeMode === "waiting") modeTitle = "Ekstra Çalışma Bitti";

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{modeTitle}</h2>
          <div className="flex justify-center gap-6 my-6 border-b border-slate-100 pb-6">
            <div><div className="text-3xl font-bold text-green-600">{stats.learned}</div><div className="text-xs text-slate-500 font-bold uppercase">Başarılı</div></div>
            {stats.mastered > 0 && <div><div className="text-3xl font-bold text-blue-500">{stats.mastered}</div><div className="text-xs text-slate-500 font-bold uppercase">Full Ezber</div></div>}
            <div><div className="text-3xl font-bold text-orange-500">{stats.review}</div><div className="text-xs text-slate-500 font-bold uppercase">Görülen</div></div>
          </div>
          <button onClick={() => setGameStage("selection")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3 active:scale-95 transition-transform"><Layers className="w-5 h-5" /> Başka Mod Seç</button>
          <button onClick={() => navigate("/")} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"><Home className="w-5 h-5" /> Ana Sayfa</button>
        </div>
      </div>
    );
  }

  // ==================== FLASH KART EKRANI ====================
  const currentCard = sessionWords[currentIndex];
  const progress = sessionWords.length > 0 ? (currentIndex / sessionWords.length) * 100 : 0;
  const isLastCard = currentIndex === sessionWords.length - 1;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 overflow-hidden relative">
      <style>{`
            * { -webkit-tap-highlight-color: transparent !important; }
            @media (hover: hover) {
                .btn-orange:hover { background-color: #fff7ed !important; border-color: #ffedd5 !important; }
                .btn-green:hover { background-color: #f0fdf4 !important; border-color: #dcfce7 !important; }
                .btn-blue:hover { background-color: #eff6ff !important; border-color: #dbeafe !important; }
                .btn-white:hover { background-color: #f8fafc !important; }
                .icon-btn:hover { background-color: #f1f5f9 !important; }
            }
            .game-btn { transition: transform 0.1s ease, background-color 0.2s ease; }
      `}</style>

      {showMasterConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCheck className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Bunu Öğrendin mi?</h3>
            <p className="text-slate-500 mb-6">Bu kelimeyi tamamen öğrendiğin kelimeler listesine taşıyacağım. Emin misin?</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-50 focus:outline-none">İptal</button>
              <button onClick={confirmMastery} className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold active:bg-blue-700 focus:outline-none">Evet, Öğrendim</button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Dikkat!</h3>
            <p className="text-slate-500 mb-6">Bu kelimeyi "Bilmiyorum" olarak işaretlersen seviyesi sıfırlanacak ve "Öğreneceğim" listesine geri gönderilecek. Emin misin?</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 px-4 border border-slate-200 rounded-xl font-bold text-slate-600 active:bg-slate-50 focus:outline-none">İptal</button>
              <button onClick={confirmReset} className="flex-1 py-3 px-4 bg-orange-600 text-white rounded-xl font-bold active:bg-orange-700 focus:outline-none">Evet, Sıfırla</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <button onClick={handleQuitEarly} className="icon-btn text-slate-400 p-2 rounded-full active:bg-slate-100 transition-colors"><X className="w-6 h-6" /></button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold border border-slate-200">
                 {activeMode === 'learn' ? 'Öğrenme' : activeMode === 'review' ? 'Tekrar' : 'Bekleme'} Modu
              </span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{currentIndex + 1} / {sessionWords.length}</span>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative">
        {currentCard && (
          <div className={`relative w-full max-w-sm transition-all duration-150 transform 
              ${swipeDirection === "left" ? "-translate-x-24 -rotate-6 opacity-0" : ""}
              ${swipeDirection === "right" ? "translate-x-24 rotate-6 opacity-0" : ""}
              ${swipeDirection === "up" ? "-translate-y-24 scale-90 opacity-0" : ""}`}
          >
            <WordCard 
                key={currentCard.id} 
                wordObj={currentCard} 
                onSwipeLeft={() => handleAnswerAction("left", "dont_know", null)}
                onSwipeRight={() => {
                    if (activeMode === 'review') handleAnswerAction("right", "review_pass", null);
                    else if (activeMode === 'waiting') handleAnswerAction("right", "waiting_pass", null);
                    else handleAnswerAction("right", "know", null);
                }}
            />
          </div>
        )}
      </div>

      <div className="pb-10 px-6 max-w-md mx-auto w-full">
        {activeMode === 'review' ? (
            <button onClick={(e) => { handleBlur(e); handleAnswerAction("right", "review_pass", e); }} className="game-btn btn-white w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 focus:outline-none">
                <span>{isLastCard ? "Turu Bitir" : "Sıradaki Kelime"}</span>
                {isLastCard ? <Flag className="w-5 h-5"/> : <ArrowRight className="w-5 h-5" />}
            </button>
        ) : activeMode === 'waiting' ? (
            <div className="flex gap-3 justify-center">
              <button onClick={(e) => { handleBlur(e); handleAnswerAction("right", "waiting_pass", e); }} disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} className="game-btn btn-white flex-1 bg-white border-2 border-slate-200 text-slate-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none">
                {isLastCard ? <Flag className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
                <span className="text-sm">{isLastCard ? "Turu Bitir" : "Sıradaki Kelime"}</span>
              </button>
              <button onClick={(e) => handleMasterClick(e)} disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} className="game-btn btn-blue flex-1 bg-white border-2 border-blue-100 text-blue-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none">
                <CheckCheck className="w-6 h-6" /><span className="text-sm">Bunu Öğrendim</span>
              </button>
            </div>
        ) : (
            <div className="flex gap-3 justify-center">
              <button onClick={(e) => { handleBlur(e); handleAnswerAction("left", "dont_know", e); }} disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} className="game-btn btn-orange flex-1 bg-white border-2 border-orange-100 text-orange-500 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none">
                <X className="w-6 h-6" /><span className="text-sm">Pas</span>
              </button>
              <button onClick={(e) => { handleBlur(e); handleAnswerAction("right", "know", e); }} disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} className="game-btn btn-green flex-1 bg-white border-2 border-green-100 text-green-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none">
                <Check className="w-6 h-6" /><span className="text-sm">Öğreniyorum</span>
              </button>
              <button onClick={(e) => handleMasterClick(e)} disabled={!!swipeDirection || showMasterConfirm || showResetConfirm} className="game-btn btn-blue flex-1 bg-white border-2 border-blue-100 text-blue-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 focus:outline-none">
                <CheckCheck className="w-6 h-6" /><span className="text-sm">Bunu Öğrendim</span>
              </button>
            </div>
        )}
        <button onClick={handleQuitEarly} className="icon-btn mt-6 flex items-center justify-center gap-2 text-slate-400 p-2 rounded-full active:bg-slate-100 transition-colors text-sm font-medium mx-auto focus:outline-none">
          <Target className="w-4 h-4" /> Bitir
        </button>
      </div>
    </div>
  );
}
