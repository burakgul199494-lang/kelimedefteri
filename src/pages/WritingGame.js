import React, { useState, useEffect, useRef } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { X, Trophy, Volume2, Languages, Loader2, ArrowRight, AlertCircle, CheckCircle2, Eraser } from "lucide-react";
import { translateTextWithAI } from "../services/aiService";

export default function WritingGame() {
  const { getAllWords, knownWordIds } = useData();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // --- STATE'LER ---
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameStatus, setGameStatus] = useState("loading"); // loading, playing, finished
  
  // Soru State'leri
  const [userInput, setUserInput] = useState("");
  const [attempts, setAttempts] = useState(0); // 0: İlk hak, 1: Son hak
  const [feedback, setFeedback] = useState(null); // null, 'correct', 'wrong', 'revealed'
  
  // İpucu State'leri
  const [hintTranslation, setHintTranslation] = useState(null);
  const [loadingHint, setLoadingHint] = useState(false);

  useEffect(() => {
    startGame();
  }, []);

  // Her yeni soruda input'a odaklan ve temizle
  useEffect(() => {
    if (gameStatus === "playing") {
      setUserInput("");
      setAttempts(0);
      setFeedback(null);
      setHintTranslation(null);
      setLoadingHint(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, gameStatus]);

  const startGame = () => {
    const all = getAllWords();
    // En az bir anlamı olan kelimeleri al
    const validWords = all.filter(w => w.definitions && w.definitions[0]?.meaning);
    
    // Öncelik bilinmeyenlerde olsun, yetmezse bilinenlerden de al
    let pool = validWords.filter(w => !knownWordIds.includes(w.id));
    if (pool.length < 20) {
        const knowns = validWords.filter(w => knownWordIds.includes(w.id));
        pool = [...pool, ...knowns];
    }

    // Karıştır ve 20 tane al
    const selected = pool.sort(() => 0.5 - Math.random()).slice(0, 20);
    
    if (selected.length === 0) {
        alert("Oynamak için yeterli kelime yok!");
        navigate("/");
        return;
    }

    setQuestions(selected);
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

  const currentWord = questions[currentIndex];
  // Ana Türkçe anlamı alıyoruz (ilk tanım)
  const turkishMeaning = currentWord?.definitions[0]?.meaning;
  const englishHint = currentWord?.definitions[0]?.engExplanation;

  // --- AKSİYONLAR ---

  const speak = (text) => {
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const handleTranslateHint = async () => {
    if (!englishHint || hintTranslation) return;
    setLoadingHint(true);
    const res = await translateTextWithAI(englishHint);
    setHintTranslation(res);
    setLoadingHint(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (feedback === "correct" || feedback === "revealed") {
        nextQuestion();
        return;
    }

    const correctWord = currentWord.word.toLowerCase().trim();
    const userWord = userInput.toLowerCase().trim();

    if (!userWord) return;

    if (userWord === correctWord) {
        // DOĞRU BİLDİ
        setFeedback("correct");
        speak(currentWord.word); // Doğru bilince oku
        // Puanlama: İlk hakta 10, ikinci hakta 5 puan
        setScore(s => s + (attempts === 0 ? 10 : 5));
    } else {
        // YANLIŞ BİLDİ
        if (attempts === 0) {
            // İlk hata: Uyarı ver, bir hak daha tanı
            setFeedback("wrong");
            setAttempts(1);
            inputRef.current?.select(); // Yazıyı seç ki kolay silsin
        } else {
            // İkinci hata: Oyunu bitirme, doğrusunu göster, puan yok
            setFeedback("revealed");
            setUserInput(currentWord.word); // Doğrusunu yaz
        }
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
        setCurrentIndex(p => p + 1);
    } else {
        setGameStatus("finished");
    }
  };

  // --- BİTİŞ EKRANI ---
  if (gameStatus === "finished") {
    const maxScore = questions.length * 10;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
             <Trophy className="w-10 h-10 text-purple-600"/>
           </div>
           <h2 className="text-2xl font-bold text-slate-800">Yazma Testi Bitti!</h2>
           
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-sm text-slate-400 font-bold uppercase">Toplam Puan</div>
              <div className="text-5xl font-extrabold text-purple-600 mt-2">{score}</div>
              <div className="text-xs text-slate-400 font-bold">Maksimum: {maxScore}</div>
           </div>

           <button onClick={() => navigate("/")} className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50">Ana Sayfa</button>
           <button onClick={startGame} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200">Tekrar Dene</button>
        </div>
      </div>
    );
  }

  if (gameStatus === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-purple-600"/></div>;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       <div className="w-full max-w-md space-y-6 mt-4">
          
          {/* Üst Bar */}
          <div className="flex justify-between items-center">
             <button onClick={()=>navigate("/")} className="p-2 bg-white rounded-full hover:bg-slate-100 shadow-sm"><X className="w-5 h-5 text-slate-400"/></button>
             <div className="font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">{currentIndex+1} / {questions.length}</div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm border border-amber-200"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-purple-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>
          
          {/* Soru Kartı */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in duration-300 relative overflow-hidden">
             
             {/* Arka Plan Dekoru */}
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-400 to-pink-400"></div>

             <div className="space-y-2">
                 <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Türkçesi</div>
                 <h2 className="text-3xl font-extrabold text-slate-800">{turkishMeaning}</h2>
             </div>

             {/* İpucu Alanı */}
             {englishHint && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase">İpucu (Açıklama)</span>
                        <div className="flex gap-1">
                            <button onClick={() => speak(englishHint)} className="p-1 bg-white border rounded-lg hover:bg-purple-50 text-purple-600"><Volume2 className="w-3 h-3"/></button>
                            <button onClick={handleTranslateHint} className="p-1 bg-white border rounded-lg hover:bg-blue-50 text-blue-600">
                                {loadingHint ? <Loader2 className="w-3 h-3 animate-spin"/> : <Languages className="w-3 h-3"/>}
                            </button>
                        </div>
                    </div>
                    <p className="italic">"{englishHint}"</p>
                    {hintTranslation && <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-700 font-medium text-xs">TR: {hintTranslation}</div>}
                </div>
             )}

             {/* Form */}
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        disabled={feedback === "correct" || feedback === "revealed"}
                        className={`w-full p-4 text-center text-xl font-bold border-2 rounded-2xl outline-none transition-colors ${
                            feedback === "correct" ? "border-green-500 bg-green-50 text-green-700" :
                            feedback === "wrong" ? "border-red-300 bg-red-50 text-red-700" :
                            feedback === "revealed" ? "border-red-500 bg-red-100 text-red-800" :
                            "border-slate-200 focus:border-purple-500 focus:bg-purple-50"
                        }`}
                        placeholder="İngilizcesini yaz..."
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                    />
                    {/* Durum İkonu */}
                    <div className="absolute right-4 top-4">
                        {feedback === "correct" && <CheckCircle2 className="w-6 h-6 text-green-500"/>}
                        {feedback === "wrong" && <AlertCircle className="w-6 h-6 text-red-500"/>}
                        {feedback === "revealed" && <X className="w-6 h-6 text-red-600"/>}
                    </div>
                </div>

                {/* Feedback Mesajı */}
                <div className="h-6 text-sm font-bold">
                    {feedback === "wrong" && <span className="text-red-500 flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3"/> Yanlış! 1 hakkın kaldı.</span>}
                    {feedback === "revealed" && <span className="text-red-600">Maalesef bilemedin. Doğru cevap buydu.</span>}
                    {feedback === "correct" && <span className="text-green-600">Tebrikler! Doğru cevap.</span>}
                </div>

                {/* Buton */}
                <button 
                    type="submit"
                    className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                        feedback === "correct" || feedback === "revealed"
                        ? "bg-slate-800 text-white hover:bg-slate-900" 
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                >
                    {feedback === "correct" || feedback === "revealed" ? (
                        <>Sıradaki <ArrowRight className="w-5 h-5"/></>
                    ) : (
                        "Kontrol Et"
                    )}
                </button>
             </form>

          </div>
       </div>
    </div>
  );
}
