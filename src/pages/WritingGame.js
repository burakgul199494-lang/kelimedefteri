import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { X, Trophy, Volume2, Lightbulb, Loader2, ArrowRight } from "lucide-react";

export default function WritingGame() {
  const { getAllWords, knownWordIds, learningQueue, addScore } = useData();
  const navigate = useNavigate();

  // Oyun Durumları
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState("loading"); // loading, playing, finished

  // Kelime Mantığı Durumları
  const [shuffledLetters, setShuffledLetters] = useState([]); // Aşağıdaki karışık harfler
  const [completedLetters, setCompletedLetters] = useState([]); // Yukarıya yerleşen doğru harfler
  const [wrongAnimationId, setWrongAnimationId] = useState(null); // Hatalı tıklanan harf animasyonu için
  const [isWordComplete, setIsWordComplete] = useState(false); // Kelime bitti mi?

  useEffect(() => {
    startGame();
  }, []);

  // Soru değiştiğinde harfleri karıştır ve resetle
  useEffect(() => {
    if (gameStatus === "playing" && questions[currentIndex]) {
      const word = questions[currentIndex].word.trim();
      
      // Harflere unique ID veriyoruz ki aynı harflerden birden fazla varsa karışmasın (örn: PAPER -> 2 tane P)
      const letters = word.split('').map((char, index) => ({
        id: `${char}-${index}-${Math.random()}`,
        char: char,
        isUsed: false
      }));

      // Harfleri karıştır
      const shuffled = [...letters].sort(() => Math.random() - 0.5);
      
      setShuffledLetters(shuffled);
      setCompletedLetters([]);
      setIsWordComplete(false);
    }
  }, [currentIndex, gameStatus]);

  const startGame = () => {
    const all = getAllWords();
    const now = new Date();
    
    // Geçerli kelimeleri filtrele
    const validWords = all.filter(w => w.definitions && w.definitions[0]?.meaning);
    
    const pool = validWords.filter(w => {
        if (knownWordIds.includes(w.id)) return false; 
        const progress = learningQueue.find(q => q.wordId === w.id);
        if (progress) {
            const reviewDate = new Date(progress.nextReview);
            if (reviewDate > now) return false; 
        }
        return true; 
    });

    if (pool.length === 0) {
        alert("Şu an çalışılacak aktif kelime yok.");
        navigate("/");
        return;
    }

    // 20 Kelime seç
    const selected = pool.sort(() => 0.5 - Math.random()).slice(0, 20);
    setQuestions(selected);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

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

  // HARFE TIKLAMA MANTIĞI
  const handleLetterClick = (letterObj) => {
    if (isWordComplete || letterObj.isUsed) return;

    // Sıradaki beklenen harf ne?
    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    // Harf kontrolü (Büyük/Küçük harf duyarsız)
    if (letterObj.char.toLowerCase() === expectedChar.toLowerCase()) {
      // DOĞRU HARF
      
      // 1. Aşağıdaki havuzda bu harfi kullanıldı işaretle
      const newShuffled = shuffledLetters.map(l => 
        l.id === letterObj.id ? { ...l, isUsed: true } : l
      );
      setShuffledLetters(newShuffled);

      // 2. Yukarıya ekle
      const newCompleted = [...completedLetters, letterObj.char];
      setCompletedLetters(newCompleted);

      // 3. Kelime bitti mi kontrol et
      if (newCompleted.length === targetWord.length) {
        handleWordComplete();
      }

    } else {
      // YANLIŞ HARF
      // Titreme ve kırmızı efekt için ID set et
      setWrongAnimationId(letterObj.id);
      setTimeout(() => setWrongAnimationId(null), 500); // 0.5sn sonra efekti sil
    }
  };

  // İPUCU MANTIĞI (Otomatik doğru harfi basar)
  const handleHint = () => {
    if (isWordComplete) return;

    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    // Havuzda kullanılmamış ve doğru karaktere sahip İLK harfi bul
    const correctLetterObj = shuffledLetters.find(l => 
      !l.isUsed && l.char.toLowerCase() === expectedChar.toLowerCase()
    );

    if (correctLetterObj) {
      handleLetterClick(correctLetterObj);
    }
  };

  // KELİME TAMAMLANINCA
  const handleWordComplete = () => {
    setIsWordComplete(true);
    speak(targetWord); // Kelimeyi oku
    addScore(5); // Puan ekle
    setScore(s => s + 5);

    // 1 Saniye bekle sonra diğer soruya geç
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(p => p + 1);
      } else {
        setGameStatus("finished");
      }
    }, 1200);
  };

  // ERKEN BİTİRME
  const handleQuitEarly = () => {
      if (score > 0) addScore(score);
      setGameStatus("finished");
  };

  // --- RENDER BÖLÜMÜ ---

  if (gameStatus === "finished") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce">
             <Trophy className="w-10 h-10 text-purple-600"/>
           </div>
           <h2 className="text-2xl font-bold text-slate-800">Harika İş Çıkardın!</h2>
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="text-sm text-slate-400 font-bold uppercase">Toplam Puan</div>
             <div className="text-5xl font-extrabold text-purple-600 mt-2">{score}</div>
           </div>
           <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50">Ana Sayfa</button>
           <button onClick={startGame} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200">Tekrar Oyna</button>
        </div>
      </div>
    );
  }

  if (gameStatus === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-purple-600 w-10 h-10"/></div>;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       <div className="w-full max-w-md space-y-6 mt-2">
          
          {/* HEADER */}
          <div className="flex justify-between items-center">
             <button onClick={()=>navigate("/")} className="p-2 bg-white rounded-full hover:bg-slate-100 shadow-sm"><X className="w-5 h-5 text-slate-400"/></button>
             <div className="font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">{currentIndex+1} / {questions.length}</div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-purple-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>
          
          {/* ANA KART */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6 relative overflow-hidden min-h-[400px] flex flex-col justify-between">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-pink-400"></div>
             
             {/* SORU BÖLÜMÜ */}
             <div className="space-y-3 mt-2">
               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Türkçesi</div>
               <h2 className="text-3xl font-extrabold text-slate-800 break-words">{turkishMeaning}</h2>
               {turkishExplanation && (
                 <div className="text-sm text-slate-500 font-medium bg-slate-50 p-2 rounded-lg inline-block border border-slate-100">
                    💡 {turkishExplanation}
                 </div>
               )}
             </div>

             {/* YAZI ALANI (Placeholders) */}
             <div className="flex flex-wrap justify-center gap-2 min-h-[60px] items-end">
                {targetWord.split('').map((_, idx) => {
                  const char = completedLetters[idx];
                  const isFilled = char !== undefined;
                  return (
                    <div 
                      key={idx} 
                      className={`
                        w-10 h-12 flex items-center justify-center text-2xl font-bold border-b-4 rounded-t-lg transition-all
                        ${isFilled ? "border-purple-500 text-purple-700 bg-purple-50 translate-y-0" : "border-slate-200 bg-slate-50 text-transparent"}
                      `}
                    >
                      {char}
                    </div>
                  );
                })}
             </div>

             {/* KARIŞIK HARFLER (BUTONLAR) */}
             <div className="grid grid-cols-6 gap-2 place-items-center">
                {shuffledLetters.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLetterClick(item)}
                    disabled={item.isUsed || isWordComplete}
                    className={`
                      w-11 h-11 rounded-xl font-bold text-lg shadow-[0_4px_0_rgb(0,0,0,0.1)] transition-all active:shadow-none active:translate-y-[4px]
                      ${item.isUsed 
                          ? "opacity-0 pointer-events-none scale-0" 
                          : wrongAnimationId === item.id 
                              ? "bg-red-500 text-white shadow-red-700 animate-[shake_0.5s_ease-in-out]" 
                              : "bg-white border-2 border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-600"
                      }
                    `}
                  >
                    {item.char}
                  </button>
                ))}
             </div>

             {/* KONTROL BUTONLARI (İpucu & Ses) */}
             <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => speak(targetWord)} 
                  className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors active:scale-95"
                >
                  <Volume2 className="w-5 h-5"/> Dinle
                </button>
                
                <button 
                  onClick={handleHint} 
                  disabled={isWordComplete}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-100 text-amber-700 rounded-2xl font-bold hover:bg-amber-200 transition-colors active:scale-95 disabled:opacity-50"
                >
                  <Lightbulb className="w-5 h-5"/> İpucu
                </button>
             </div>

          </div>

          <button onClick={handleQuitEarly} className="w-full text-center text-slate-400 hover:text-red-500 text-sm font-medium transition-colors">
            Bitir ve Çık
          </button>

          {/* Hata Animasyonu İçin Style */}
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
