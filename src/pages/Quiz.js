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
  Square // Durdurma ikonu için eklendi
} from "lucide-react";

export default function Quiz() {
  const { getAllWords, knownWordIds, learningQueue, addScore } = useData();
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
  
  // Ses durumu takibi için state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- KELİME HAVUZLARI (SRS DÜZELTİLDİ) ---
  const getWordPools = () => {
    const all = getAllWords();
    const validWords = all.filter(w => w.definitions && w.definitions[0]?.meaning);
    const now = new Date();

    // Kuyruktaki ID'ler
    const queueIds = learningQueue ? learningQueue.map(q => q.wordId) : [];

    // 1. ÖĞRENME MODU (Kalanlar)
    const learnPool = validWords.filter(w => 
        !knownWordIds.includes(w.id) && 
        !queueIds.includes(w.id)
    );

    // 2. TEKRAR MODU (Sırası Gelenler + Mezunlar)
    const reviewPool = validWords.filter(w => {
        const qItem = learningQueue ? learningQueue.find(item => item.wordId === w.id) : null;
        const isDue = qItem && new Date(qItem.nextReview) <= now;
        const isKnown = knownWordIds.includes(w.id);
        return isDue || isKnown;
    });

    // 3. BEKLEME LİSTESİ (Gelecekteki Tekrarlar)
    const waitingPool = validWords.filter(w => {
        const qItem = learningQueue ? learningQueue.find(item => item.wordId === w.id) : null;
        return qItem && new Date(qItem.nextReview) > now;
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
      alert(`Quiz başlatmak için bu modda en az 4 kelimeye ihtiyaç var. (Şu an: ${pool.length})`);
      return;
    }

    const selectedWords = [...pool].sort(() => 0.5 - Math.random()).slice(0, 20);
    const allValidWords = getAllWords().filter(w => w.definitions && w.definitions[0]?.meaning);

    const generated = selectedWords.map(target => {
      const correct = target.definitions[0].meaning;
      const others = allValidWords
        .filter(w => w.id !== target.id)
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
    setGameStatus("playing");
  };

  // --- OTOMATİK SES DURDURMA VE RESETLEME ---
  // Soru değiştiğinde (index), oyun bittiğinde veya component unmount olduğunda çalışır.
  useEffect(() => { 
      window.speechSynthesis.cancel(); // Mevcut sesi sustur
      setIsSpeaking(false); // State'i sıfırla
      
      setShowHintTr(false);
      setSelected(null);
      setIsAnswered(false);
      
      // Component unmount (sayfadan çıkış) temizliği
      return () => {
          window.speechSynthesis.cancel();
      }
  }, [index, gameStatus]);

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

  // --- YENİ SES FONKSİYONU (TOGGLE MANTIĞI) ---
  const handleSpeak = (txt) => { 
    if(!txt) return;

    if (isSpeaking) {
        // Eğer zaten konuşuyorsa -> DURDUR
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    } else {
        // Konuşmuyorsa -> BAŞLAT
        window.speechSynthesis.cancel(); // Garanti olsun diye önce temizle
        const u = new SpeechSynthesisUtterance(txt); 
        u.lang = "en-US";
        
        // Konuşma bitince ikonu eski haline getir
        u.onend = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false); // Hata olursa da resetle

        window.speechSynthesis.speak(u); 
        setIsSpeaking(true);
    }
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
                    <h2 className="text-xl font-bold text-slate-800">Quiz Zamanı!</h2>
                    <div className="w-9"></div>
                </div>

                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Nasıl Test Edelim?</h1>
                    <p className="text-slate-500">Hangi kelimelerle kendini denemek istersin?</p>
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
  
  const hintEng = current.wordObj.definitions[0].engExplanation;
  const hintTr = current.wordObj.definitions[0].trExplanation;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       <div className="w-full max-w-md space-y-6 mt-4">
          
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
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 text-center space-y-6 mt-6 animate-in fade-in zoom-in duration-300">
                    {/* İngilizce İpucu Alanı */}
                    {hintEng && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="bg-indigo-50 text-indigo-800 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                                <span className="text-sm italic">"{hintEng}"</span>
                                
                                {/* SES BUTONU (DÜZELTİLDİ) */}
                                <button 
                                    onClick={() => handleSpeak(hintEng)} 
                                    className="p-1 bg-white rounded-full hover:bg-indigo-100 transition-colors" 
                                    title={isSpeaking ? "Durdur" : "Oku"}
                                >
                                    {isSpeaking ? <Square className="w-3 h-3 text-red-500 fill-current"/> : <Volume2 className="w-3 h-3 text-indigo-500"/>}
                                </button>
                                
                                {hintTr && (
                                    <button 
                                        onClick={() => setShowHintTr(!showHintTr)} 
                                        className={`p-1 rounded-full transition-colors ${showHintTr ? "bg-indigo-200" : "bg-white hover:bg-indigo-100"}`} 
                                        title="Çeviri"
                                    >
                                        <Languages className="w-3 h-3 text-indigo-500"/>
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
                    
                    {/* ANA SES BUTONU (DÜZELTİLDİ) */}
                    <button 
                        onClick={() => handleSpeak(current.wordObj.word)} 
                        className="mx-auto p-2 bg-slate-50 rounded-full text-indigo-500 hover:bg-indigo-100 transition-colors"
                        title={isSpeaking ? "Durdur" : "Oku"}
                    >
                        {isSpeaking ? <Square className="w-6 h-6 text-red-500 fill-current"/> : <Volume2 className="w-6 h-6"/>}
                    </button>
                </div>

                <div className="space-y-3 mt-6">
                    {current.options.map((opt, i) => {
                        let cls = "w-full p-4 rounded-xl text-left font-medium border-2 transition-all shadow-sm ";
                        if (isAnswered) {
                            if (opt === current.correct) cls += "bg-green-100 border-green-500 text-green-700";
                            else if (opt === selected) cls += "bg-red-100 border-red-500 text-red-700";
                            else cls += "opacity-50";
                        } else {
                            cls += "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 active:bg-indigo-50";
                        }
                        return (
                            <button 
                                    key={`${index}-${i}`} 
                                    onClick={(e)=>handleAnswer(opt, e)} 
                                    disabled={isAnswered} 
                                    className={cls}
                            >
                                    {opt}
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
