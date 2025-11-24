import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { X, Trophy, Volume2, Languages, Loader2, HelpCircle, Tag } from "lucide-react";
import { translateTextWithAI } from "../services/aiService";

export default function Quiz() {
  const { getAllWords, knownWordIds } = useData();
  const navigate = useNavigate();

  // STATE'LER
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  
  const [hintTranslation, setHintTranslation] = useState(null);
  const [loadingHint, setLoadingHint] = useState(false);

  // KATEGORİ STATE'İ
  const [isQuizStarted, setIsQuizStarted] = useState(false);

  // Sadece anlamı olan kelimeleri al (Boş kelimeler quiz'i bozar)
  const allValidUnknownWords = useMemo(() => {
      return getAllWords()
        .filter(w => !knownWordIds.includes(w.id)) // Bilinmeyenler
        .filter(w => w.definitions && w.definitions[0]?.meaning); // Anlamı olanlar
  }, [getAllWords, knownWordIds]);

  const categories = useMemo(() => {
      const cats = allValidUnknownWords.map(w => w.category).filter(Boolean);
      return ["Tümü", ...new Set(cats)].sort();
  }, [allValidUnknownWords]);

  useEffect(() => { setHintTranslation(null); setLoadingHint(false); }, [index]);

  const startQuizWithCategory = (category) => {
    let pool = [];
    if (category === "Tümü") {
        pool = allValidUnknownWords;
    } else {
        pool = allValidUnknownWords.filter(w => w.category === category);
    }

    // Yeterli kelime var mı kontrolü
    if (pool.length < 4) {
      alert(`"${category}" kategorisinde quiz yapmak için en az 4 kelime gerekli. (Şu an: ${pool.length})`);
      return;
    }

    // Soru Hazırlama
    const selectedPool = [...pool].sort(() => 0.5 - Math.random()).slice(0, 20);
    
    // Şıklar için TÜM kelimelerden (bilinenler dahil) yanlış cevap çekebiliriz ki şıklar zengin olsun
    const allWordsForDistractors = getAllWords().filter(w => w.definitions && w.definitions[0]?.meaning);

    const generatedQuestions = selectedPool.map(target => {
      const correct = target.definitions[0].meaning;
      const distractors = allWordsForDistractors
        .filter(w => w.id !== target.id)
        .sort(()=>0.5-Math.random())
        .slice(0,3)
        .map(w=>w.definitions[0].meaning);
      
      return { 
          wordObj: target, 
          correct, 
          options: [...distractors, correct].sort(()=>0.5-Math.random()) 
      };
    });
    
    setQuestions(generatedQuestions);
    setIndex(0);
    setScore(0);
    setFinished(false);
    setIsQuizStarted(true);
  };

  const handleAnswer = (option) => {
    if (isAnswered) return;
    setIsAnswered(true); setSelected(option);
    if (option === questions[index].correct) setScore(s => s + 5);
    
    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex(i => i + 1); setSelected(null); setIsAnswered(false);
      } else {
        setFinished(true);
      }
    }, 1000);
  };

  const handleTranslateHint = async () => {
      const hint = questions[index]?.wordObj.definitions[0].engExplanation;
      if (!hint) return;
      setLoadingHint(true);
      const res = await translateTextWithAI(hint);
      setHintTranslation(res);
      setLoadingHint(false);
  };

  const speak = (txt) => { const u = new SpeechSynthesisUtterance(txt); u.lang = "en-US"; window.speechSynthesis.speak(u); };

  // --- EKRAN 1: KATEGORİ SEÇİMİ ---
  if (!isQuizStarted) {
      return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm"><X className="w-6 h-6 text-slate-600"/></button>
                    <h2 className="text-2xl font-bold text-slate-800">Quiz Konusu Seç</h2>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center mb-6">
                    <HelpCircle className="w-12 h-12 text-amber-500 mx-auto mb-3"/>
                    <p className="text-slate-600">Test edilebilir <span className="font-bold text-amber-600">{allValidUnknownWords.length}</span> kelime var.</p>
                    <p className="text-xs text-slate-400 mt-1">*En az 4 kelime olan kategoriler seçilebilir.</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {categories.map(cat => {
                        const count = cat === "Tümü" ? allValidUnknownWords.length : allValidUnknownWords.filter(w => w.category === cat).length;
                        const isDisabled = count < 4;
                        return (
                            <button 
                                key={cat} 
                                onClick={() => startQuizWithCategory(cat)}
                                disabled={isDisabled}
                                className={`p-4 rounded-xl border shadow-sm flex justify-between items-center transition-all group ${isDisabled ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed" : "bg-white border-slate-200 hover:border-amber-500 hover:bg-amber-50"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isDisabled ? "bg-slate-200 text-slate-400" : "bg-amber-100 text-amber-600"}`}><Tag className="w-5 h-5"/></div>
                                    <span className={`font-bold ${isDisabled ? "text-slate-400" : "text-slate-700 group-hover:text-amber-700"}`}>{cat}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDisabled ? "bg-slate-200 text-slate-400" : "bg-slate-100 text-slate-500"}`}>{count} kelime</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
      )
  }

  // --- EKRAN 3: SONUÇ ---
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
           <button onClick={() => setIsQuizStarted(false)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Başka Test Yap</button>
           <button onClick={() => navigate("/")} className="w-full bg-white border font-bold py-3 rounded-xl">Ana Sayfa</button>
        </div>
      </div>
    );
  }

  // --- EKRAN 2: QUIZ SORUSU ---
  const current = questions[index];
  const progress = ((index + 1) / questions.length) * 100;
  const hint = current.wordObj.definitions[0].engExplanation;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       <div className="w-full max-w-md space-y-6 mt-4">
          <div className="flex justify-between items-center">
             <button onClick={() => setIsQuizStarted(false)}><X className="w-6 h-6 text-slate-400"/></button>
             <div className="font-bold text-indigo-600">Soru {index+1} / {questions.length}</div>
             <div className="flex items-center gap-1 bg-amber-100 text-amber-600 px-2 py-1 rounded-lg font-bold text-sm"><Trophy className="w-4 h-4"/> {score}</div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>
          
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 text-center space-y-6 mt-6 animate-in fade-in zoom-in duration-300">
             {hint && (
                 <div className="flex flex-col items-center gap-2">
                     <div className="bg-indigo-50 text-indigo-800 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                         <span className="text-sm italic">"{hint}"</span>
                         <button onClick={handleTranslateHint} className="p-1 bg-white rounded-full">{loadingHint?<Loader2 className="w-3 h-3 animate-spin"/>:<Languages className="w-3 h-3"/>}</button>
                     </div>
                     {hintTranslation && <div className="bg-green-50 text-green-700 px-3 py-1 text-xs font-bold rounded">TR: {hintTranslation}</div>}
                 </div>
             )}
             <h2 className="text-4xl font-extrabold text-slate-800">{current.wordObj.word}</h2>
             <button onClick={()=>speak(current.wordObj.word)} className="mx-auto p-2 bg-slate-50 rounded-full text-indigo-500"><Volume2 className="w-6 h-6"/></button>
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
                 return <button key={i} onClick={()=>handleAnswer(opt)} disabled={isAnswered} className={cls}>{opt}</button>
             })}
          </div>
       </div>
    </div>
  );
}
