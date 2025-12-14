import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Trophy, 
  Loader2, 
  Target, 
  Quote, 
  Volume2, 
  Languages, 
  Lightbulb, 
  RefreshCw, 
  BrainCircuit, 
  Hourglass, 
  Home,
  Layers // Başka mod seç ikonu
} from "lucide-react";

export default function GapFillingGame() {
  const { getAllWords, knownWordIds, learningQueue, addScore } = useData();
  const navigate = useNavigate();

  // --- OYUN STATE'LERİ ---
  const [gameMode, setGameMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("mode-selection"); // mode-selection, playing, finished
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // --- KELİME & HARF MANTIĞI (Writing Game'den alındı) ---
  const [shuffledLetters, setShuffledLetters] = useState([]); 
  const [completedLetters, setCompletedLetters] = useState([]); 
  const [wrongAnimationId, setWrongAnimationId] = useState(null); 
  const [isWordComplete, setIsWordComplete] = useState(false); 

  // Puanlama ve Hata
  const [hintCount, setHintCount] = useState(0);
  const [currentWordPoints, setCurrentWordPoints] = useState(5); 
  const [mistakeCount, setMistakeCount] = useState(0);

  // İpucu (Türkçe) Göster/Gizle
  const [showHintTr, setShowHintTr] = useState(false);

  // --- KELİME HAVUZLARI (SRS DÜZELTİLDİ) ---
  const getWordPools = () => {
    const all = getAllWords();
    const validWords = all.filter(w => w.definitions && w.definitions[0]?.meaning);
    const now = new Date();

    // Kuyruktaki ID'ler
    const queueIds = learningQueue ? learningQueue.map(q => q.wordId) : [];

    // 1. ÖĞRENME MODU (Kalanlar)
    // Kural: Öğrenilenlerde YOK --VE-- Kuyrukta YOK
    const learnPool = validWords.filter(w => 
        !knownWordIds.includes(w.id) && 
        !queueIds.includes(w.id)
    );

    // 2. TEKRAR MODU (Sırası Gelenler + Mezunlar)
    // Kural: (Kuyrukta VAR ve Zamanı Gelmiş) --VEYA-- (Zaten Öğrenilmiş)
    const reviewPool = validWords.filter(w => {
        const qItem = learningQueue ? learningQueue.find(item => item.wordId === w.id) : null;
        
        // A) Kuyrukta ve zamanı gelmiş (SRS Tekrarı)
        const isDue = qItem && new Date(qItem.nextReview) <= now;
        
        // B) Zaten tamamen öğrenilmiş (Mezun Tekrarı)
        const isKnown = knownWordIds.includes(w.id);

        return isDue || isKnown;
    });

    // 3. BEKLEME LİSTESİ (Gelecekteki Tekrarlar)
    // Kural: Kuyrukta VAR --VE-- Zamanı GELECEKTE
    const waitingPool = validWords.filter(w => {
        const qItem = learningQueue ? learningQueue.find(item => item.wordId === w.id) : null;
        return qItem && new Date(qItem.nextReview) > now;
    });

    return { learnPool, reviewPool, waitingPool };
  };

  const { learnPool, reviewPool, waitingPool } = getWordPools();

  // --- OYUN BAŞLATMA ---
  const startSession = (mode) => {
    setGameMode(mode);
    let selectedPool = [];

    if (mode === "learn") selectedPool = learnPool;
    else if (mode === "review") selectedPool = reviewPool;
    else if (mode === "waiting") selectedPool = waitingPool;

    if (selectedPool.length === 0) {
      alert("Bu modda uygun cümleli kelime yok.");
      return;
    }

    const selected = selectedPool.sort(() => 0.5 - Math.random()).slice(0, 20);
    setQuestions(selected);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

  // --- DİNAMİK BOYUT HESAPLAMA ---
  const getDynamicStyle = (length) => {
    if (length <= 5) return { box: "w-11 h-14", text: "text-2xl" }; 
    if (length <= 8) return { box: "w-8 h-11", text: "text-xl" };   
    if (length <= 11) return { box: "w-6 h-9", text: "text-lg" };    
    if (length <= 14) return { box: "w-4 h-8", text: "text-sm" }; 
    if (length <= 17) return { box: "w-3 h-6", text: "text-[10px]" }; 
    return { box: "w-2 h-5", text: "text-[8px]" };                       
  };

  // --- SORU YÜKLEME ---
  useEffect(() => {
    if (gameStatus === "playing" && questions[currentIndex]) {
      const word = questions[currentIndex].word.trim();
      const letters = word.split('').map((char, index) => ({
        id: `${char}-${index}-${Math.random()}`,
        char: char,
        isUsed: false
      }));
      const shuffled = [...letters].sort(() => Math.random() - 0.5);
      
      setShuffledLetters(shuffled);
      setCompletedLetters([]);
      setIsWordComplete(false);
      
      // Resetlemeler
      setHintCount(0);
      setMistakeCount(0); 
      setCurrentWordPoints(5); 
      setShowHintTr(false);
    }
  }, [currentIndex, gameStatus]);

  const currentWordObj = questions[currentIndex];
  const targetWord = currentWordObj?.word.trim() || "";
  
  // Gap Filling'e Özel: Maskelenmiş Cümle
  const getMaskedSentence = () => {
      if (!currentWordObj) return "";
      const regex = new RegExp(currentWordObj.word, "gi");
      return currentWordObj.sentence.replace(regex, "________");
  };

  const englishDefinition = currentWordObj?.definitions[0]?.engExplanation;
  const turkishDefinition = currentWordObj?.definitions[0]?.trExplanation;

  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  };

  // --- HARF TIKLAMA (Writing Game Mantığı) ---
  const handleLetterClick = (letterObj, e) => {
    if (e && e.currentTarget) e.currentTarget.blur();

    if (isWordComplete || letterObj.isUsed) return;

    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    if (letterObj.char.toLowerCase() === expectedChar.toLowerCase()) {
      // DOĞRU HARF
      const newShuffled = shuffledLetters.map(l => 
        l.id === letterObj.id ? { ...l, isUsed: true } : l
      );
      setShuffledLetters(newShuffled);
      const newCompleted = [...completedLetters, letterObj.char];
      setCompletedLetters(newCompleted);

      if (newCompleted.length === targetWord.length) {
        handleWordComplete(); 
      }
    } else {
      // YANLIŞ HARF
      const newMistakes = mistakeCount + 1;
      setMistakeCount(newMistakes);
      
      setWrongAnimationId(letterObj.id);
      setTimeout(() => setWrongAnimationId(null), 500);

      // LİMİT KONTROLÜ (2 HATA)
      if (newMistakes >= 2) {
          setCurrentWordPoints(0); 
          
          setTimeout(() => {
              setCompletedLetters(targetWord.split('')); 
              setIsWordComplete(true);
              speak(targetWord);
              
              setTimeout(() => {
                  if (currentIndex + 1 < questions.length) {
                      setCurrentIndex(p => p + 1);
                  } else {
                      setGameStatus("finished");
                  }
              }, 2000); 
          }, 600);
      }
    }
  };

  // --- İPUCU KULLANIMI ---
  const handleHint = (e) => {
    if (e && e.currentTarget) e.currentTarget.blur();
    if (isWordComplete) return;

    const newHintCount = hintCount + 1;
    setHintCount(newHintCount);

    if (newHintCount === 1) setCurrentWordPoints(2); 
    else if (newHintCount >= 2) setCurrentWordPoints(0); 

    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    const correctLetterObj = shuffledLetters.find(l => 
      !l.isUsed && l.char.toLowerCase() === expectedChar.toLowerCase()
    );

    if (correctLetterObj) handleLetterClick(correctLetterObj, null);
  };

  // --- KELİME BİTİRME ---
  const handleWordComplete = () => {
    setIsWordComplete(true);
    speak(targetWord);
    
    if (currentWordPoints > 0) {
        addScore(currentWordPoints);
        setScore(s => s + currentWordPoints);
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(p => p + 1);
      } else {
        setGameStatus("finished");
      }
    }, 1200);
  };

  const handleQuitEarly = () => {
      if (score > 0) addScore(score);
      setGameStatus("finished");
  };

  // ===========================
  // === MOD SEÇİM EKRANI ===
  // ===========================
  if (gameStatus === "mode-selection") {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-6">
                
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
                    <Home className="w-5 h-5 text-slate-600" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Boşluk Doldurma</h2>
                    <div className="w-9"></div>
                </div>

                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Cümle Tamamla</h1>
                    <p className="text-slate-500">Cümledeki boşluğa uygun kelimeyi yaz.</p>
                </div>

                <div className="space-y-4">
                    {/* Tekrar Modu */}
                    <button onClick={() => startSession('review')} disabled={reviewPool.length === 0} className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all group active:scale-95 disabled:opacity-60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Bilinen kelimelerle</div></div>
                            </div>
                            <div className="text-2xl font-black text-orange-600">{reviewPool.length}</div>
                        </div>
                    </button>

                    {/* Öğrenme Modu */}
                    <button onClick={() => startSession('learn')} disabled={learnPool.length === 0} className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group active:scale-95 disabled:opacity-60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><BrainCircuit className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni kelimelerle</div></div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{learnPool.length}</div>
                        </div>
                    </button>

                    {/* Bekleme Modu */}
                    <button onClick={() => startSession('waiting')} disabled={waitingPool.length === 0} className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group active:scale-95 disabled:opacity-60">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><Hourglass className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-700">Bekleme Listesi</div><div className="text-sm text-slate-400">Gelecekteki kelimeler</div></div>
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
  // === BİTİŞ EKRANI ==========
  // ===========================
  if (gameStatus === "finished") {
    const maxScore = questions.length * 5;
    let modeTitle = "Oturum Tamamlandı!";
    if (gameMode === "learn") modeTitle = "Yeni Kelimeler Tamamlandı";
    if (gameMode === "review") modeTitle = "Tekrar Tamamlandı";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-blue-600"/></div>
           <h2 className="text-2xl font-bold text-slate-800">{modeTitle}</h2>
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="text-sm text-slate-400 font-bold uppercase">Toplam Puan</div>
             <div className="text-5xl font-extrabold text-blue-600 mt-2">{score}</div>
             <div className="text-xs text-slate-400 font-bold">Maksimum: {maxScore}</div>
           </div>
           
           <button onClick={() => setGameStatus("mode-selection")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3 shadow-lg shadow-blue-200">
                <Layers className="w-5 h-5" /> Başka Mod Seç
           </button>
           
           <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2">
                <Home className="w-5 h-5" /> Ana Sayfa
           </button>
        </div>
      </div>
    );
  }

  if (gameStatus === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const styles = getDynamicStyle(targetWord.length);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       <div className="w-full max-w-md space-y-4 mt-2">
          
          {/* Header */}
          <div className="flex justify-between items-center">
             <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full active:bg-slate-100 shadow-sm transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
             <div className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                {gameMode === 'review' ? 'Tekrar' : gameMode === 'learn' ? 'Öğrenme' : 'Bekleme'}: {currentIndex+1} / {questions.length}
             </div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>
          
          {/* OYUN KARTI */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6 relative overflow-hidden min-h-[450px] flex flex-col justify-between">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
             
             {/* SORU (CÜMLE) */}
             <div className="space-y-3 mt-2">
               <div className="flex justify-center">
                   <div className="bg-blue-50 p-3 rounded-full"><Quote className="w-6 h-6 text-blue-400"/></div>
               </div>
               <h2 className="text-xl font-medium text-slate-700 leading-relaxed font-serif italic">
                   {getMaskedSentence()}
               </h2>
               
               {/* İPUCU KUTUSU */}
               {englishDefinition && (
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-600 mt-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase">Tanım (İpucu)</span>
                        <div className="flex gap-1">
                            <button onClick={() => speak(englishDefinition)} className="p-1 bg-white border rounded-lg hover:bg-blue-50 text-blue-600"><Volume2 className="w-3 h-3"/></button>
                            {turkishDefinition && (
                                <button onClick={() => setShowHintTr(!showHintTr)} className={`p-1 border rounded-lg hover:bg-indigo-50 ${showHintTr ? "bg-indigo-100 text-indigo-600" : "bg-white text-indigo-600"}`}>
                                    <Languages className="w-3 h-3"/>
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="italic">"{englishDefinition}"</p>
                    {showHintTr && turkishDefinition && <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-700 font-medium text-xs animate-in fade-in">TR: {turkishDefinition}</div>}
                 </div>
               )}
             </div>

             {/* YAZI ALANI (Writing Game Tarzı) */}
             <div className="flex flex-wrap justify-center gap-1 min-h-[60px] items-end content-center">
                {targetWord.split('').map((_, idx) => {
                  const char = completedLetters[idx];
                  const isFilled = char !== undefined;
                  return (
                    <div 
                      key={idx} 
                      className={`
                        ${styles.box} ${styles.text} 
                        flex items-center justify-center font-bold border-b-4 rounded-t-lg transition-all
                        ${isFilled ? "border-blue-500 text-blue-700 bg-blue-50 translate-y-0" : "border-slate-200 bg-slate-50 text-transparent"}
                      `}
                    >
                      {char}
                    </div>
                  );
                })}
             </div>

             {/* KARIŞIK HARFLER (BUTONLAR) */}
             <div key={currentIndex} className="flex flex-wrap justify-center gap-2 content-center">
                {shuffledLetters.map((item) => (
                  <button
                    key={item.id}
                    onClick={(e) => handleLetterClick(item, e)}
                    disabled={item.isUsed || isWordComplete}
                    style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                    className={`
                      w-10 h-10 md:w-11 md:h-11 rounded-xl font-bold text-lg shadow-[0_3px_0_rgb(0,0,0,0.1)] 
                      active:bg-blue-100 active:border-blue-300 active:text-blue-600 active:shadow-none active:translate-y-[2px]
                      transition-all duration-75 select-none touch-manipulation focus:outline-none focus:ring-0
                      ${item.isUsed 
                          ? "opacity-0 pointer-events-none scale-0" 
                          : wrongAnimationId === item.id 
                              ? "bg-red-500 text-white shadow-none animate-[shake_0.5s_ease-in-out]" 
                              : "bg-white border-2 border-slate-200 text-slate-700"
                      }
                    `}
                  >
                    {item.char}
                  </button>
                ))}
             </div>

             {/* KONTROL BUTONLARI (İpucu) */}
             <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100 mt-auto">
                <button 
                  onClick={handleHint} 
                  disabled={isWordComplete}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-700 rounded-2xl font-bold active:bg-amber-200 transition-colors active:scale-95 disabled:opacity-50 focus:outline-none"
                >
                  <Lightbulb className="w-5 h-5"/> 
                  {/* Puan ve Hata Bilgisi */}
                  <span className="text-xs ml-1 flex flex-col items-start leading-none">
                      <span>İpucu ({hintCount === 0 ? "5p" : hintCount === 1 ? "2p" : "0p"})</span>
                      <span className="text-[9px] text-amber-600/80">Hata: {mistakeCount}/2</span>
                  </span>
                </button>
             </div>

          </div>

          <button onClick={handleQuitEarly} className="w-full text-center text-slate-400 hover:text-red-500 text-sm font-medium transition-colors">
            Bitir ve Çık
          </button>

          <style jsx>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-5px); }
              75% { transform: translateX(5px); }
            }
          `}</style>
       </div>
    </div>
  );
}
