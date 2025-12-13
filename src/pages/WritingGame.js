import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { X, Trophy, Volume2, Lightbulb, Loader2, RefreshCw, BrainCircuit } from "lucide-react";

export default function WritingGame() {
  const { getAllWords, knownWordIds, addScore } = useData();
  const navigate = useNavigate();

  const [gameMode, setGameMode] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState("mode-selection");

  const [shuffledLetters, setShuffledLetters] = useState([]); 
  const [completedLetters, setCompletedLetters] = useState([]); 
  const [wrongAnimationId, setWrongAnimationId] = useState(null); 
  const [isWordComplete, setIsWordComplete] = useState(false); 

  // --- SENİN İSTEDİĞİN ÖZEL BOYUTLANDIRMA ---
  const getDynamicStyle = (length) => {
    // 1-5 Harf: w-11
    if (length <= 5) return { box: "w-11 h-14", text: "text-2xl" }; 
    
    // 6-8 Harf: w-8
    if (length <= 8) return { box: "w-8 h-11", text: "text-xl" };   
    
    // 9-11 Harf: w-6
    if (length <= 11) return { box: "w-6 h-9", text: "text-lg" };    
    
    // 12-14 Harf: w-4 (16px) - Font küçüldü
    if (length <= 14) return { box: "w-4 h-8", text: "text-sm" }; 
    
    // 15-17 Harf: w-3 (12px) - Font çok küçüldü
    if (length <= 17) return { box: "w-3 h-6", text: "text-[10px]" }; 
    
    // 18-20+ Harf: w-2 (8px) - Mikroskobik
    return { box: "w-2 h-5", text: "text-[8px]" };                       
  };

  const selectMode = (mode) => {
    setGameMode(mode);
    startGame(mode);
  };

  const startGame = (mode) => {
    const all = getAllWords();
    const validWords = all.filter(w => w.definitions && w.definitions[0]?.meaning);
    
    let pool = [];
    if (mode === 'review') {
        pool = validWords.filter(w => knownWordIds.includes(w.id));
        if (pool.length === 0) {
            alert("Henüz öğrendiğin kelime yok.");
            setGameMode(null);
            return;
        }
    } else {
        pool = validWords.filter(w => !knownWordIds.includes(w.id));
        if (pool.length === 0) {
            alert("Tebrikler! Tüm kelimeleri öğrendin.");
            setGameMode(null);
            return;
        }
    }

    const selected = pool.sort(() => 0.5 - Math.random()).slice(0, 20);
    setQuestions(selected);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

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
    }
  }, [currentIndex, gameStatus]);

  const currentWordObj = questions[currentIndex];
  const targetWord = currentWordObj?.word.trim() || "";
  const turkishMeaning = currentWordObj?.definitions[0]?.meaning;
  const turkishExplanation = currentWordObj?.definitions[0]?.trExplanation; 

  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  };

  const handleLetterClick = (letterObj, e) => {
    if (e && e.currentTarget) e.currentTarget.blur();

    if (isWordComplete || letterObj.isUsed) return;

    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    if (letterObj.char.toLowerCase() === expectedChar.toLowerCase()) {
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
      setWrongAnimationId(letterObj.id);
      setTimeout(() => setWrongAnimationId(null), 500);
    }
  };

  const handleHint = (e) => {
    if (e && e.currentTarget) e.currentTarget.blur();
    if (isWordComplete) return;

    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    const correctLetterObj = shuffledLetters.find(l => 
      !l.isUsed && l.char.toLowerCase() === expectedChar.toLowerCase()
    );

    if (correctLetterObj) handleLetterClick(correctLetterObj, null);
  };

  const handleWordComplete = () => {
    setIsWordComplete(true);
    speak(targetWord);
    addScore(5);
    setScore(s => s + 5);

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

  if (gameStatus === "mode-selection") {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-slate-800">Yazma Alıştırması</h1>
                    <p className="text-slate-500">Hangi kelimelerle çalışmak istersin?</p>
                </div>
                <button onClick={() => selectMode('review')} className="w-full bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 flex items-center gap-4 hover:border-purple-200 hover:bg-purple-50 transition-all group active:scale-95">
                    <div className="bg-purple-100 p-4 rounded-2xl group-hover:bg-purple-200 transition-colors"><RefreshCw className="w-8 h-8 text-purple-600" /></div>
                    <div className="text-left"><div className="font-bold text-lg text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-400">Öğrendiğin kelimeleri pekiştir.</div></div>
                </button>
                <button onClick={() => selectMode('learn')} className="w-full bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 flex items-center gap-4 hover:border-indigo-200 hover:bg-indigo-50 transition-all group active:scale-95">
                    <div className="bg-indigo-100 p-4 rounded-2xl group-hover:bg-indigo-200 transition-colors"><BrainCircuit className="w-8 h-8 text-indigo-600" /></div>
                    <div className="text-left"><div className="font-bold text-lg text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-400">Yeni kelimelerle çalış.</div></div>
                </button>
                <button onClick={() => navigate("/")} className="w-full text-slate-400 font-bold py-3">Geri Dön</button>
            </div>
        </div>
    );
  }

  if (gameStatus === "finished") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-purple-600"/></div>
           <h2 className="text-2xl font-bold text-slate-800">Harika İş Çıkardın!</h2>
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="text-sm text-slate-400 font-bold uppercase">Toplam Puan</div>
             <div className="text-5xl font-extrabold text-purple-600 mt-2">{score}</div>
           </div>
           <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50">Ana Sayfa</button>
           <button onClick={() => startGame(gameMode)} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200">Tekrar Oyna</button>
        </div>
      </div>
    );
  }

  if (gameStatus === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-purple-600 w-10 h-10"/></div>;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  
  // DİNAMİK BOYUT HESABI ÇAĞIRMA
  const styles = getDynamicStyle(targetWord.length);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       <div className="w-full max-w-md space-y-4 mt-2">
          
          <div className="flex justify-between items-center">
             <button onClick={()=>navigate("/")} className="p-2 bg-white rounded-full active:bg-slate-100 shadow-sm transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
             <div className="font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                {gameMode === 'review' ? 'Tekrar' : 'Öğrenme'}: {currentIndex+1} / {questions.length}
             </div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-purple-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>
          
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6 relative overflow-hidden min-h-[450px] flex flex-col justify-between">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-pink-400"></div>
             
             {/* SORU */}
             <div className="space-y-2 mt-2">
               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Türkçesi</div>
               <h2 className="text-2xl font-extrabold text-slate-800 break-words leading-tight">{turkishMeaning}</h2>
               {turkishExplanation && (
                 <div className="text-sm text-slate-500 font-medium bg-slate-50 p-2 rounded-lg inline-block border border-slate-100">
                    💡 {turkishExplanation}
                 </div>
               )}
             </div>

             {/* YAZI ALANI (DİNAMİK BOYUTLAR) */}
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
                        ${isFilled ? "border-purple-500 text-purple-700 bg-purple-50 translate-y-0" : "border-slate-200 bg-slate-50 text-transparent"}
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
                      active:bg-purple-100 active:border-purple-300 active:text-purple-600 active:shadow-none active:translate-y-[2px]
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

             {/* KONTROL BUTONLARI */}
             <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100 mt-auto">
                <button 
                  onClick={() => speak(targetWord)} 
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold active:bg-slate-200 transition-colors active:scale-95 focus:outline-none"
                >
                  <Volume2 className="w-5 h-5"/> Dinle
                </button>
                
                <button 
                  onClick={handleHint} 
                  disabled={isWordComplete}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-700 rounded-2xl font-bold active:bg-amber-200 transition-colors active:scale-95 disabled:opacity-50 focus:outline-none"
                >
                  <Lightbulb className="w-5 h-5"/> İpucu
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
