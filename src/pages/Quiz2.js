import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, Trophy, Loader2, Home, RefreshCw, BrainCircuit, Hourglass, Star, Tag, AlertTriangle 
} from "lucide-react";

export default function Quiz2() {
  // 🔥 registerMistake BURAYA EKLENDİ
  const { getAllWords, knownWordIds, learningQueue, addScore, updateGameStats, handleUpdateWord, registerMistake } = useData();
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

  // --- KELİME HAVUZLARI ---
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

    // 🔥 YENİ HAVUZ: Hata Sayısı >= 2 olanlar
    const hardPool = validWords.filter(w => (w.mistakeCount || 0) >= 2);

    return { learnPool, reviewPool, waitingPool, hardPool };
  };

  const { learnPool, reviewPool, waitingPool, hardPool } = getWordPools();

  // --- OYUN BAŞLATMA (AKILLI SIRALAMA) ---
  const startQuiz = (mode) => {
    setGameMode(mode);
    
    // 1. Hedef Havuzu Belirle
    let targetPool = [];
    if (mode === "learn") targetPool = learnPool;
    else if (mode === "review") targetPool = reviewPool;
    else if (mode === "waiting") targetPool = waitingPool;
    else if (mode === "hard") targetPool = hardPool; // Hata Modu

    // 🔥 GÜNCELLEME: 1 kelime bile olsa başlasın.
    if (targetPool.length === 0) {
      alert(`Bu modda hiç kelime yok.`);
      return;
    }

    // Yanlış şık havuzu (TÜM KELİMELERDEN)
    const allValidWords = getAllWords().filter(w => w.definitions && w.definitions[0]?.meaning);
    
    if (allValidWords.length < 4) {
        alert("Sistemin şık üretebilmesi için sözlükte toplam en az 4 kelime olmalı.");
        return;
    }

    // --- SIRALAMA ALGORİTMASI: lastSeen_quiz2 ---
    const neverSeen = [];
    const seen = [];

    targetPool.forEach(w => {
        if (!w.lastSeen_quiz2) { 
            neverSeen.push(w); 
        } else { 
            seen.push(w); 
        }
    });

    neverSeen.sort(() => 0.5 - Math.random());
    seen.sort((a, b) => new Date(a.lastSeen_quiz2).getTime() - new Date(b.lastSeen_quiz2).getTime());

    const smartSortedPool = [...neverSeen, ...seen];
    const selectedCandidates = smartSortedPool.slice(0, 20);
    const selectedWords = selectedCandidates.sort(() => 0.5 - Math.random());

    const generated = selectedWords.map(target => {
      const correct = target.word; // Cevap: İngilizce Kelime
      const questionText = target.definitions[0].meaning; // Soru: Türkçe Anlam
      
      // 🔥 ŞIKLARI OLUŞTUR (Tüm Havuzdan)
      const others = allValidWords
        .filter(w => 
            // 1. ID Kontrolü: Kendisi olmasın
            w.id !== target.id && 
            // 2. Metin Kontrolü (BANK KURALI): Aynı yazılan (eş sesli) kelime şıkka girmesin
            w.word.toLowerCase().trim() !== target.word.toLowerCase().trim()
        )
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.word);
      
      // Şık yetmezse doldur
      while (others.length < 3) { others.push("..."); }

      return { 
        wordObj: target, 
        correct, 
        questionText, 
        options: [...others, correct].sort(() => 0.5 - Math.random()) 
      };
    });
    
    setQuestions(generated);
    setIndex(0);
    setScore(0);
    setSelected(null);
    setIsAnswered(false);
    
    setGameStatus("playing");
  };

  // --- TEMİZLİK ---
  useEffect(() => { }, [index]);

  // --- CEVAP VERME ---
  const handleAnswer = (option) => {
    if (isAnswered) return;
    setIsAnswered(true); 
    setSelected(option);
    
    // KAYIT
    const currentWord = questions[index].wordObj;
    handleUpdateWord(currentWord.id, { lastSeen_quiz2: new Date().toISOString() });

    // PUAN VE HATA KONTROLÜ
    if (option === questions[index].correct) {
        setScore(s => s + 5);
    } else {
        // 🔥 YANLIŞ CEVAP: Sadece hata puanı (+1)
        registerMistake(currentWord.id, 1);
    }

    // İSTATİSTİK
    updateGameStats('reverse_quiz', 1); // Haftalık istatistik
    updateGameStats('quiz2', 1);        // Günlük Görev
    
    // GEÇİŞ MANTIĞI
    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIsTransitioning(true);
        setTimeout(() => {
            setIndex(i => i + 1);
            setSelected(null);
            setIsAnswered(false);
            setIsTransitioning(false);
        }, 100); 
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

  // ===========================
  // === 1. MOD SEÇİM EKRANI ===
  // ===========================
  if (gameStatus === "mode-selection") {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            
            <style>{`
                * { -webkit-tap-highlight-color: transparent !important; }
                .menu-btn { background-color: white; border: 2px solid #f1f5f9; transition: all 0.2s ease; }
                .menu-btn:active { transform: scale(0.96); background-color: #f8fafc; }
                .menu-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                @media (hover: hover) {
                    .menu-btn:hover { border-color: #e2e8f0 !important; background-color: #f8fafc !important; }
                    .btn-hard:hover { border-color: #fecaca !important; background-color: #fef2f2 !important; }
                }
            `}</style>

            <div className="w-full max-w-sm space-y-6">
                
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
                      <Home className="w-5 h-5 text-slate-600" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Ters Quiz</h2>
                    <div className="w-9"></div>
                </div>

                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Nasıl Ters Edelim?</h1>
                    <p className="text-slate-500">İngilizcesini bul.</p>
                </div>

                <div className="space-y-4">
                    {/* Tekrar Modu */}
                    <button onClick={() => startQuiz('review')} disabled={reviewPool.length < 1} style={{ outline: 'none' }} className="menu-btn w-full p-5 rounded-2xl shadow-md border-slate-100 hover:border-orange-200 hover:bg-orange-50 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Öğrendiklerini Pekiştir</div></div>
                            </div>
                            <div className="text-2xl font-black text-orange-600">{reviewPool.length}</div>
                        </div>
                    </button>

                    {/* Öğrenme Modu */}
                    <button onClick={() => startQuiz('learn')} disabled={learnPool.length < 1} style={{ outline: 'none' }} className="menu-btn w-full p-5 rounded-2xl shadow-md border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><BrainCircuit className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni Kelimeler</div></div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{learnPool.length}</div>
                        </div>
                    </button>

                    {/* Bekleme Modu */}
                    <button onClick={() => startQuiz('waiting')} disabled={waitingPool.length < 1} style={{ outline: 'none' }} className="menu-btn w-full p-5 rounded-2xl shadow-md border-slate-100 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Henüz Zamanı Gelmeyenler</div></div>
                            </div>
                            <div className="text-2xl font-black text-slate-500">{waitingPool.length}</div>
                        </div>
                    </button>

                    {/* 🔥 HATA YAPTIKLARIM BUTONU (Dinamik) 🔥 */}
                    {hardPool.length > 0 && (
                        <button onClick={() => startQuiz('hard')} style={{ outline: 'none' }} className="menu-btn btn-hard w-full p-5 rounded-2xl shadow-md border-red-100 bg-red-50 focus:outline-none focus:ring-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-200 p-3 rounded-xl text-red-700 animate-pulse"><AlertTriangle className="w-8 h-8" /></div>
                                    <div className="text-left">
                                        <div className="font-bold text-xl text-red-700">Hata Yaptıklarım</div>
                                        <div className="text-sm text-red-500">Zorlandığın Kelimeler</div>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-red-600">{hardPool.length}</div>
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
    const max = questions.length * 5;
    let modeTitle = "Test Tamamlandı!";
    if (gameMode === "learn") modeTitle = "Öğrenme Bitti";
    if (gameMode === "review") modeTitle = "Tekrar Bitti";
    if (gameMode === "waiting") modeTitle = "Bekleme Bitti";
    if (gameMode === "hard") modeTitle = "Zorlananlar Bitti";

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
                {gameMode === 'review' ? 'Tekrar' : gameMode === 'learn' ? 'Öğrenme' : gameMode === 'waiting' ? 'Bekleme' : 'Hata'}: {index+1} / {questions.length}
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

                    {/* --- 🔥 SOL ÜST KÖŞE: ETİKETLER (top-0) 🔥 --- */}
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
                        {/* Ters Quiz'de soru olarak TÜRKÇE gösterilir */}
                        <h2 className="text-3xl font-extrabold text-slate-800 break-words leading-tight">{current.questionText}</h2>
                    </div>
                </div>

                {/* ŞIKLAR (İngilizce Kelimeler) */}
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
                                    onClick={()=>handleAnswer(opt)} 
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
