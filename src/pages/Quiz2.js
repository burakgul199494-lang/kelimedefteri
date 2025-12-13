import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Trophy, 
  Loader2, 
  Home, 
  RefreshCw, 
  BrainCircuit, 
  Hourglass,
  CheckCircle2, // Görsel zenginlik için eklendi
  HelpCircle    // Görsel zenginlik için eklendi
} from "lucide-react";

export default function Quiz2() {
  const { getAllWords, knownWordIds, learningQueue, addScore } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameMode, setGameMode] = useState(null); // 'review', 'learn', 'waiting'
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
    const validWords = all.filter(w => w.definitions && w.definitions[0]?.meaning);
    const now = new Date();

    // 1. ÖĞRENME MODU
    const learnPool = validWords.filter(w => !knownWordIds.includes(w.id));

    // 2. TEKRAR MODU
    const reviewPool = validWords.filter(w => knownWordIds.includes(w.id));

    // 3. BEKLEME LİSTESİ
    const waitingPool = validWords.filter(w => {
        const q = learningQueue ? learningQueue.find(item => item.wordId === w.id) : null;
        return q && new Date(q.nextReview) > now;
    });

    return { learnPool, reviewPool, waitingPool };
  };

  const { learnPool, reviewPool, waitingPool } = getWordPools();

  // --- OYUN BAŞLATMA ---
  const startQuiz = (mode) => {
    setGameMode(mode);
    let pool = [];

    if (mode === "learn") pool = learnPool;
    else if (mode === "review") pool = reviewPool;
    else if (mode === "waiting") pool = waitingPool;

    if (pool.length < 4) {
      alert(`Bu modda quiz başlatmak için en az 4 kelimeye ihtiyaç var. (Şu an: ${pool.length})`);
      return;
    }

    // Soruları Oluştur
    const selectedWords = [...pool].sort(() => 0.5 - Math.random()).slice(0, 20);
    const allValidWords = getAllWords().filter(w => w.definitions && w.definitions[0]?.meaning);

    const generated = selectedWords.map(target => {
      // DOĞRU CEVAP: İngilizce Kelime
      const correct = target.word; 
      
      // SORU: Türkçe Anlamı
      const questionText = target.definitions[0].meaning; 

      // YANLIŞ ŞIKLAR: Diğer İngilizce kelimeler
      const others = allValidWords
        .filter(w => w.id !== target.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.word);
      
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
    setGameStatus("playing");
  };

  useEffect(() => { 
      setSelected(null);
      setIsAnswered(false);
  }, [index]);

  const handleAnswer = (option, e) => {
    if(e && e.target) e.target.blur();

    if (isAnswered) return;
    setIsAnswered(true); 
    setSelected(option);
    
    if (option === questions[index].correct) setScore(s => s + 5);
    
    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIsTransitioning(true);
        setTimeout(() => {
            setIndex(i => i + 1);
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
            <div className="w-full max-w-sm space-y-6">
                
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
                      <Home className="w-5 h-5 text-slate-600" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Ters Quiz</h2>
                    <div className="w-9"></div>
                </div>

                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Anlamdan Kelimeye</h1>
                    <p className="text-slate-500">Türkçe anlamını gör, İngilizcesini bul.</p>
                </div>

                <div className="space-y-4">
                    {/* 1. TEKRAR MODU */}
                    <button 
                        onClick={() => startQuiz('review')} 
                        disabled={reviewPool.length < 4}
                        className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all group active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600 group-hover:bg-orange-200 transition-colors">
                                    <RefreshCw className="w-8 h-8" />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-xl text-slate-800">Tekrar Modu</div>
                                    <div className="text-sm text-slate-500">Öğrendiklerini pekiştir</div>
                                </div>
                            </div>
                            <div className="text-2xl font-black text-orange-600">{reviewPool.length}</div>
                        </div>
                    </button>

                    {/* 2. ÖĞRENME MODU */}
                    <button 
                        onClick={() => startQuiz('learn')} 
                        disabled={learnPool.length < 4}
                        className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                                    <BrainCircuit className="w-8 h-8" />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-xl text-slate-800">Öğrenme Modu</div>
                                    <div className="text-sm text-slate-500">Yeni kelimelerle test</div>
                                </div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{learnPool.length}</div>
                        </div>
                    </button>

                    {/* 3. BEKLEME LİSTESİ */}
                    <button 
                        onClick={() => startQuiz('waiting')} 
                        disabled={waitingPool.length < 4}
                        className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-500 group-hover:bg-slate-200 transition-colors">
                                    <Hourglass className="w-8 h-8" />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-xl text-slate-700">Bekleme Listesi</div>
                                    <div className="text-sm text-slate-400">Gelecekte sorulacaklar</div>
                                </div>
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
    let modeTitle = "Test Tamamlandı!";
    if (gameMode === "learn") modeTitle = "Yeni Kelime Testi Bitti";
    if (gameMode === "review") modeTitle = "Tekrar Testi Bitti";
    if (gameMode === "waiting") modeTitle = "Bekleme Testi Bitti";

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
       <div className="w-full max-w-md space-y-6 mt-4">
          
          {/* HEADER */}
          <div className="flex justify-between items-center">
             <button onClick={handleQuitEarly}><X className="w-6 h-6 text-slate-400"/></button>
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
                {/* SORU KARTI (TÜRKÇE ANLAM) */}
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 text-center space-y-4 mt-6 animate-in fade-in zoom-in duration-300">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
                        <HelpCircle className="w-3 h-3"/> BU KELİME HANGİSİ?
                    </div>
                    
                    {/* Okuma ve Çeviri Butonları Kaldırıldı, Sadece Metin */}
                    <h2 className="text-3xl font-extrabold text-slate-800 break-words leading-tight">
                        {current.questionText}
                    </h2>
                    
                    <div className="w-12 h-1 bg-indigo-100 mx-auto rounded-full"></div>
                </div>

                {/* ŞIKLAR (İNGİLİZCE KELİMELER) */}
                <div className="space-y-3 mt-6">
                    {current.options.map((opt, i) => {
                        let cls = "w-full p-4 rounded-xl text-left font-bold text-lg border-2 transition-all shadow-sm flex items-center justify-between ";
                        
                        if (isAnswered) {
                            if (opt === current.correct) {
                                cls += "bg-green-100 border-green-500 text-green-700";
                            } else if (opt === selected) {
                                cls += "bg-red-100 border-red-500 text-red-700";
                            } else {
                                cls += "opacity-50 border-slate-200";
                            }
                        } else {
                            cls += "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 active:bg-indigo-50 text-slate-700";
                        }

                        return (
                            <button 
                                key={`${index}-${i}`} 
                                onClick={(e)=>handleAnswer(opt, e)} 
                                disabled={isAnswered} 
                                className={cls}
                            >
                                <span>{opt}</span>
                                {isAnswered && opt === current.correct && <CheckCircle2 className="w-5 h-5"/>}
                            </button>
                        );
                    })}
                </div>
              </>
          )}

          <button onClick={handleQuitEarly} className="w-full mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto">
            Bitir (Puanı Al ve Çık)
          </button>

       </div>
    </div>
  );
}
