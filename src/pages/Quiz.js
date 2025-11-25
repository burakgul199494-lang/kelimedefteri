import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { X, Trophy, Volume2, Languages, Loader2, Target } from "lucide-react";
import { translateTextWithAI } from "../services/aiService";

export default function Quiz() {
  const { getAllWords, knownWordIds, learningQueue, addScore } = useData();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  
  const [hintTranslation, setHintTranslation] = useState(null);
  const [loadingHint, setLoadingHint] = useState(false);

  useEffect(() => { startQuiz(); }, []);

  // SORU DEĞİŞTİĞİNDE STATE'LERİ ZORLA SIFIRLA
  useEffect(() => { 
      setHintTranslation(null); 
      setLoadingHint(false);
      setSelected(null);
      setIsAnswered(false);
  }, [index]);

  const startQuiz = () => {
    const all = getAllWords();
    const now = new Date();

    const validWords = all.filter(w => w.definitions && w.definitions[0]?.meaning);
    
    const playableWords = validWords.filter(w => {
        if (knownWordIds.includes(w.id)) return false;
        const progress = learningQueue.find(q => q.wordId === w.id);
        if (progress) {
            const reviewDate = new Date(progress.nextReview);
            if (reviewDate > now) return false; 
        }
        return true; 
    });

    if (playableWords.length < 4) {
      alert(`Quiz için "çalışılmaya hazır" en az 4 kelime lazım. (Şu an: ${playableWords.length})`);
      navigate("/"); return;
    }

    const pool = [...playableWords].sort(() => 0.5 - Math.random()).slice(0, 20);
    
    const generated = pool.map(target => {
      const correct = target.definitions[0].meaning;
      const others = validWords.filter(w => w.id !== target.id).sort(()=>0.5-Math.random()).slice(0,3).map(w=>w.definitions[0].meaning);
      return { wordObj: target, correct, options: [...others, correct].sort(()=>0.5-Math.random()) };
    });
    
    setQuestions(generated); setIndex(0); setScore(0); setFinished(false);
  };

  const handleAnswer = (option) => {
    if (isAnswered) return;
    setIsAnswered(true); setSelected(option);
    if (option === questions[index].correct) setScore(s => s + 5);
    
    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex(i => i + 1);
        // State sıfırlama işlemi yukarıdaki useEffect[index] içinde de yapılıyor,
        // ama geçişin pürüzsüz olması için burada da tetikliyoruz.
      } else {
        setFinished(true);
        const finalPoints = score + (option === questions[index].correct ? 5 : 0);
        addScore(finalPoints); 
      }
    }, 1000);
  };

  const handleQuitEarly = () => {
      if (score > 0) {
          addScore(score); 
      }
      setFinished(true); 
  };

  const handleTranslateHint = async () => {
      const hint = questions[index]?.wordObj.definitions[0].engExplanation;
      if (!hint) return;
      setLoadingHint(true);
      const res = await translateTextWithAI(hint);
      setHintTranslation(res);
      setLoadingHint(false);
  };

  const speak = (txt) => { 
    if(!txt) return;
    const u = new SpeechSynthesisUtterance(txt); 
    u.lang = "en-US"; 
    window.speechSynthesis.speak(u); 
  };

  if (finished) {
    const max = questions.length * 5;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <Trophy className="w-12 h-12 text-yellow-500 mx-auto"/>
           <h2 className="text-2xl font-bold">Test Bitti!</h2>
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-sm text-slate-400 font-bold">PUAN</div>
              <div className="text-5xl font-extrabold text-indigo-600 mt-2">{score}</div>
              <div className="text-xs text-slate-400">/ {max}</div>
           </div>
           <button onClick={() => navigate("/")} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Ana Sayfa</button>
           <button onClick={startQuiz} className="w-full bg-white border font-bold py-3 rounded-xl">Tekrar Dene</button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) return <div className="p-10 text-center">Yükleniyor...</div>;

  const current = questions[index];
  const progress = ((index + 1) / questions.length) * 100;
  const hint = current.wordObj.definitions[0].engExplanation;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       <div className="w-full max-w-md space-y-6 mt-4">
          <div className="flex justify-between items-center">
             <button onClick={()=>navigate("/")}><X className="w-6 h-6 text-slate-400"/></button>
             <div className="font-bold text-indigo-600">Soru {index+1} / {questions.length}</div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-600 px-2 py-1 rounded-lg font-bold text-sm"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>
          
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 text-center space-y-6 mt-6 animate-in fade-in zoom-in duration-300">
             {hint && (
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-indigo-50 text-indigo-800 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                        <span className="text-sm italic">"{hint}"</span>
                        <button onClick={() => speak(hint)} className="p-1 bg-white rounded-full hover:bg-indigo-100 transition-colors" title="Oku"><Volume2 className="w-3 h-3 text-indigo-500"/></button>
                        <button onClick={handleTranslateHint} className="p-1 bg-white rounded-full hover:bg-indigo-100 transition-colors" title="Çevir">{loadingHint ? <Loader2 className="w-3 h-3 animate-spin"/> : <Languages className="w-3 h-3 text-indigo-500"/>}</button>
                    </div>
                    {hintTranslation && <div className="bg-green-50 text-green-700 px-3 py-1 text-xs font-bold rounded">TR: {hintTranslation}</div>}
                </div>
             )}
             <h2 className="text-4xl font-extrabold text-slate-800">{current.wordObj.word}</h2>
             <button onClick={()=>speak(current.wordObj.word)} className="mx-auto p-2 bg-slate-50 rounded-full text-indigo-500 hover:bg-indigo-100 transition-colors"><Volume2 className="w-6 h-6"/></button>
          </div>

          <div className="space-y-3 mt-6">
            {current.options.map((opt, i) => {
               let cls = "w-full p-4 rounded-xl text-left font-medium border-2 transition-all shadow-sm ";
               if (isAnswered) {
                  if (opt === current.correct) cls += "bg-green-100 border-green-500 text-green-700";
                  else if (opt === selected) cls += "bg-red-100 border-red-500 text-red-700";
                  else cls += "opacity-50";
               } else {
                  cls += "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50";
               }
               // DÜZELTME BURADA: key={opt} yaptık. key={i} olunca eski butonları tutuyordu.
               return <button key={opt} onClick={()=>handleAnswer(opt)} disabled={isAnswered} className={cls}>{opt}</button>
            })}
          </div>

          <button onClick={handleQuitEarly} className="w-full mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto">
            <Target className="w-4 h-4"/> Bitir (Puanı Al ve Çık)
          </button>

       </div>
    </div>
  );
}
