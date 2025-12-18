import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  Trophy, 
  Loader2, 
  Home, 
  Volume2, 
  CheckCircle2, 
  AlertCircle, 
  Dumbbell, // Egzersiz ikonu
  Layers,
  ArrowRight
} from "lucide-react";

const FORM_TYPES = [
  { id: "plural", label: "Plural Form (Çoğul)", key: "plural" },
  { id: "v2", label: "V2 Form (Past)", key: "v2" },
  { id: "v3", label: "V3 Form (Participle)", key: "v3" },
  { id: "thirdPerson", label: "3. Tekil (He/She/It)", key: "thirdPerson" },
  { id: "advLy", label: "Zarf (-ly) Form", key: "advLy" },
  { id: "compEr", label: "Comp (-er) Form", key: "compEr" },
  { id: "superEst", label: "Super (-est) Form", key: "superEst" },
];

export default function ExerciseGame() {
  const { getAllWords, addScore, updateGameStats } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameStatus, setGameStatus] = useState("selection"); // selection, playing, finished
  const [activeForm, setActiveForm] = useState(null);
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // Yazma Mantığı State'leri
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [completedLetters, setCompletedLetters] = useState([]);
  const [isWordComplete, setIsWordComplete] = useState(false);
  const [wrongAnimationId, setWrongAnimationId] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  // --- KELİME HAVUZU VE SAYIM ---
  // getAllWords() zaten silinenler hariç tüm (Öğrenilen, Bekleyen, Öğrenilecek) kelimeleri getirir.
  const allWords = useMemo(() => getAllWords(), [getAllWords]);

  // Sayım Hesaplama
  const getCount = (key) => {
    return allWords.filter(w => w[key] && w[key].trim().length > 0).length;
  };

  // --- OYUNU BAŞLATMA ---
  const startSession = (formTypeObj) => {
    const key = formTypeObj.key;
    
    // 1. O forma sahip kelimeleri filtrele
    const validWords = allWords.filter(w => w[key] && w[key].trim().length > 0);

    if (validWords.length === 0) {
      alert("Bu formda çalışılacak kelime bulunamadı.");
      return;
    }

    // 2. Rastgele 10 tane seç
    const selected = validWords.sort(() => 0.5 - Math.random()).slice(0, 10);

    // 3. Soruları hazırla
    const generatedQuestions = selected.map(w => ({
        baseWordObj: w,
        targetWord: w[key].trim(), // Cevap (Örn: Books)
        formLabel: formTypeObj.label
    }));

    setQuestions(generatedQuestions);
    setActiveForm(formTypeObj);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

  // --- SORU YÜKLEME ---
  useEffect(() => {
    window.speechSynthesis.cancel();
    setShowTranslation(false);

    if (gameStatus === "playing" && questions[currentIndex]) {
      const target = questions[currentIndex].targetWord;
      
      // Harfleri hazırla
      const letters = target.split('').map((char, index) => ({
        id: `${char}-${index}-${Math.random()}`,
        char: char,
        isUsed: false
      }));
      
      // Karıştır
      setShuffledLetters([...letters].sort(() => Math.random() - 0.5));
      setCompletedLetters([]);
      setIsWordComplete(false);
    }
  }, [currentIndex, gameStatus, questions]);

  // --- DİNAMİK BOYUT (Kutucuklar için) ---
  const getDynamicStyle = (length) => {
    if (length <= 5) return { box: "w-11 h-14", text: "text-2xl" }; 
    if (length <= 8) return { box: "w-8 h-11", text: "text-xl" };   
    if (length <= 11) return { box: "w-6 h-9", text: "text-lg" };    
    if (length <= 14) return { box: "w-4 h-8", text: "text-sm" }; 
    return { box: "w-3 h-6", text: "text-[10px]" };                       
  };

  // --- HARF TIKLAMA ---
  const handleLetterClick = (letterObj) => {
    if (isWordComplete || letterObj.isUsed) return;

    const targetWord = questions[currentIndex].targetWord;
    const nextIndex = completedLetters.length;
    const expectedChar = targetWord[nextIndex];

    // Case-insensitive kontrol (Bazen V2 büyük harfle başlayabilir diye)
    if (letterObj.char.toLowerCase() === expectedChar.toLowerCase()) {
        // DOĞRU
        const newShuffled = shuffledLetters.map(l => 
            l.id === letterObj.id ? { ...l, isUsed: true } : l
        );
        setShuffledLetters(newShuffled);
        const newCompleted = [...completedLetters, letterObj.char];
        setCompletedLetters(newCompleted);

        // KELİME BİTTİ Mİ?
        if (newCompleted.length === targetWord.length) {
            handleWordComplete(targetWord);
        }
    } else {
        // YANLIŞ
        setWrongAnimationId(letterObj.id);
        setTimeout(() => setWrongAnimationId(null), 500);
    }
  };

  const handleWordComplete = (wordToSpeak) => {
      setIsWordComplete(true);
      speak(wordToSpeak); // Hedef kelimeyi oku (Sat, Books vs.)
      
      // İstatistik Güncelle (Yazma istatistiğine ekliyoruz veya genel aktivite)
      updateGameStats('writing', 1);

      // Puan Ekle
      addScore(10);
      setScore(s => s + 10);
  };

  const handleNext = () => {
      if (currentIndex + 1 < questions.length) {
          setCurrentIndex(p => p + 1);
      } else {
          setGameStatus("finished");
      }
  };

  const speak = (txt) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
  };

  // --- EKRANLAR ---

  // 1. SEÇİM EKRANI
  if (gameStatus === "selection") {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
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

                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white text-center">
                    <h3 className="text-2xl font-bold mb-2">Form Çalışması</h3>
                    <p className="opacity-90 text-sm">Tüm kelime havuzunu kullanarak kelimelerin farklı hallerini pratik et.</p>
                    <div className="mt-4 inline-block bg-white/20 px-4 py-1 rounded-full text-xs font-bold">
                        Toplam Havuz: {allWords.length} Kelime
                    </div>
                </div>

                <div className="space-y-3">
                    {FORM_TYPES.map(form => {
                        const count = getCount(form.key);
                        return (
                            <button 
                                key={form.id}
                                onClick={() => startSession(form)}
                                disabled={count === 0}
                                className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center hover:border-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <Layers className="w-5 h-5 text-slate-500"/>
                                    </div>
                                    <span className="font-bold text-slate-700">{form.label}</span>
                                </div>
                                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full group-hover:bg-indigo-100 group-hover:text-indigo-700">
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

  // 2. BİTİŞ EKRANI
  if (gameStatus === "finished") {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <Trophy className="w-10 h-10 text-green-600"/>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Egzersiz Tamamlandı!</h2>
                
                <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-sm text-slate-400 font-bold uppercase">Kazanılan Puan</div>
                    <div className="text-5xl font-extrabold text-indigo-600 mt-2">{score}</div>
                </div>

                <button onClick={() => setGameStatus("selection")} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700">
                    Başka Egzersiz Yap
                </button>
                <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50">
                    Ana Sayfa
                </button>
            </div>
        </div>
      );
  }

  // 3. OYUN EKRANI
  if (!questions[currentIndex]) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin"/></div>;

  const currentQ = questions[currentIndex];
  const targetWord = currentQ.targetWord;
  const baseWordObj = currentQ.baseWordObj;
  const progress = ((currentIndex + 1) / questions.length) * 100;
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
        `}</style>

        <div className="w-full max-w-md space-y-4 mt-2">
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <button onClick={() => setGameStatus("finished")} className="p-2 bg-white rounded-full shadow-sm"><X className="w-5 h-5 text-slate-400"/></button>
                <div className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    {activeForm?.label}: {currentIndex + 1} / {questions.length}
                </div>
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200">
                    <Trophy className="w-4 h-4"/> {score}
                </div>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div>
            </div>

            {/* Soru Kartı */}
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center relative overflow-hidden min-h-[400px] flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400"></div>

                {/* Üst Kısım: Baz Kelime ve Tanım */}
                <div className="mt-2 space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ANA KELİME</div>
                    <div className="flex items-center justify-center gap-2">
                        <h2 className="text-3xl font-black text-slate-800">{baseWordObj.word}</h2>
                        <button onClick={() => speak(baseWordObj.word)} className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100">
                            <Volume2 className="w-5 h-5"/>
                        </button>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                        <p className="text-slate-600 text-sm italic">"{baseWordObj.definitions[0]?.engExplanation}"</p>
                        
                        {/* Çeviri Butonu / Metni */}
                        {showTranslation ? (
                            <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-700 font-bold text-sm animate-in fade-in">
                                {baseWordObj.definitions[0]?.trExplanation || baseWordObj.definitions[0]?.meaning}
                            </div>
                        ) : (
                            <button onClick={() => setShowTranslation(true)} className="text-xs text-indigo-400 font-bold mt-2 hover:text-indigo-600 underline">
                                Türkçe Çeviriyi Gör
                            </button>
                        )}
                    </div>
                </div>

                {/* Hedef Kelime (Boşluklar) */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 inline-block px-2 py-1 rounded">
                        İSTENEN: <span className="text-indigo-600">{activeForm?.label.split(' ')[0]}</span>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-1 min-h-[50px] items-end content-center">
                        {target.split('').map((_, idx) => {
                            const char = completedLetters[idx];
                            const isFilled = char !== undefined;
                            return (
                                <div key={idx} className={`${styles.box} ${styles.text} flex items-center justify-center font-bold border-b-4 rounded-t-lg transition-all ${isFilled ? "border-indigo-500 text-indigo-700 bg-indigo-50" : "border-slate-200 bg-slate-50 text-transparent"}`}>
                                    {char}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Harfler veya Devam Et Butonu */}
                {!isWordComplete ? (
                    <div className="flex flex-wrap justify-center gap-2 content-center">
                        {shuffledLetters.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleLetterClick(item)}
                                disabled={item.isUsed}
                                className={`w-10 h-10 rounded-xl font-bold text-lg shadow-[0_3px_0_rgb(0,0,0,0.1)] transition-all active:translate-y-[2px] active:shadow-none
                                    ${item.isUsed 
                                        ? "opacity-0 pointer-events-none scale-0" 
                                        : wrongAnimationId === item.id 
                                            ? "bg-red-500 text-white animate-[shake_0.5s_ease-in-out]" 
                                            : "bg-white border-2 border-slate-200 text-slate-700 active:bg-indigo-100"
                                    }`}
                            >
                                {item.char}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="animate-in zoom-in duration-300">
                        <div className="flex items-center justify-center gap-2 mb-4 text-green-600 font-bold">
                            <CheckCircle2 className="w-6 h-6"/> Doğru!
                        </div>
                        <button onClick={handleNext} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700">
                            {currentIndex + 1 === questions.length ? "Bitir ve Puan Al" : "Sıradaki Kelime"} 
                            <ArrowRight className="w-5 h-5"/>
                        </button>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
}
