import React, { useState, useEffect, useRef } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mic,
  Square,
  Volume2,
  Trophy,
  Home,
  RefreshCw,
  Brain,
  Hourglass,
  CheckCircle2,
  AlertCircle,
  X,
  Target,
  Layers
} from "lucide-react";

export default function Pronunciation() {
  const { getAllWords, knownWordIds, learningQueue, addScore } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameStage, setGameStage] = useState("selection");
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [activeMode, setActiveMode] = useState(null);
  
  // Telaffuz State'leri
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState(null); 
  const [isRoundDone, setIsRoundDone] = useState(false);

  // Referans: Her render'da kaybolmasın diye
  const recognitionRef = useRef(null);

  // --- IPHONE FIX: FOCUS TEMİZLEME ---
  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  // --- 1. KELİME HAVUZLARI ---
  const getWordPools = () => {
    const all = getAllWords();
    const now = new Date();

    const learnPool = all.filter(w => !knownWordIds.includes(w.id) && !learningQueue.find(q => q.wordId === w.id));
    const reviewPool = all.filter(w => knownWordIds.includes(w.id));
    const waitingPool = all.filter(w => {
        const q = learningQueue.find(item => item.wordId === w.id);
        return q && new Date(q.nextReview) > now;
    });

    return { learnPool, reviewPool, waitingPool };
  };

  const { learnPool, reviewPool, waitingPool } = getWordPools();

  // --- 2. OYUNU BAŞLAT ---
  const startSession = (mode, e) => {
    handleBlur(e); // Mobile Fix

    setActiveMode(mode);
    let selectedPool = [];
    if (mode === "learn") selectedPool = learnPool;
    else if (mode === "review") selectedPool = reviewPool;
    else if (mode === "waiting") selectedPool = waitingPool;

    if (selectedPool.length === 0) {
      alert("Bu modda çalışılacak kelime yok!");
      return;
    }

    const selected = selectedPool.sort(() => 0.5 - Math.random()).slice(0, 10);
    setSessionWords(selected);
    setCurrentIndex(0);
    setSessionScore(0);
    setGameStage("playing");
    resetRound();
  };

  const resetRound = () => {
    stopMicrophone(); 
    setSpokenText("");
    setFeedback(null);
    setIsRoundDone(false);
  };

  // --- 3. MİKROFON YÖNETİMİ ---
  
  const startListening = () => {
    if (recognitionRef.current) {
        recognitionRef.current.abort();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tarayıcınız ses tanımayı desteklemiyor (Chrome kullanın).");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        setIsListening(true);
        setFeedback(null);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText(transcript);
        evaluatePronunciation(transcript);
        setIsListening(false);
    };

    recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'no-speech') return; 
        if (event.error !== 'aborted') {
            setFeedback({ score: 0, type: "error", msg: "Anlaşılamadı." });
        }
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopMicrophone = () => {
    if (recognitionRef.current) {
        recognitionRef.current.abort(); 
        recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleMic = (e) => {
    handleBlur(e); // Mobile Fix
    if (isListening) {
        stopMicrophone();
    } else {
        startListening();
    }
  };

  useEffect(() => {
    return () => {
        stopMicrophone();
        window.speechSynthesis.cancel();
    };
  }, []);

  // --- 4. PUANLAMA MANTIĞI ---
  const evaluatePronunciation = (spoken) => {
    const target = sessionWords[currentIndex].word.toLowerCase().trim();
    const input = spoken.toLowerCase().trim().replace(/[.,?!]/g, ""); 

    let earnedPoints = 0;
    let type = "error";
    let msg = "";

    if (input === target) {
      earnedPoints = 10;
      type = "success";
      msg = "Mükemmel! (10 Puan)";
    } else if (input.includes(target)) {
      earnedPoints = 8;
      type = "success";
      msg = "Güzel! (8 Puan)";
    } else {
        const matchCount = target.split('').filter(char => input.includes(char)).length;
        const accuracy = matchCount / target.length;
        
        if (accuracy > 0.7) {
            earnedPoints = 5;
            type = "warning";
            msg = "İdare eder (5 Puan)";
        } else {
            earnedPoints = 0;
            type = "error";
            msg = "Yanlış (0 Puan)";
        }
    }

    setSessionScore(prev => prev + earnedPoints);
    setFeedback({ score: earnedPoints, type, msg });
    setIsRoundDone(true);
  };

  // --- 5. DİĞER AKSİYONLAR ---
  const handleNext = (e) => {
    handleBlur(e); // Mobile Fix
    stopMicrophone(); 
    
    if (currentIndex + 1 < sessionWords.length) {
      setCurrentIndex(p => p + 1);
      resetRound();
    } else {
      addScore(sessionScore);
      setGameStage("finished");
    }
  };

  const handleQuitEarly = () => {
      stopMicrophone();
      if (sessionScore > 0) addScore(sessionScore); 
      setGameStage("finished"); 
  };

  const speakWord = (e) => {
    handleBlur(e); // Mobile Fix
    const word = sessionWords[currentIndex].word;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  // ===========================
  // === 1. MOD SEÇİM EKRANI ===
  // ===========================
  if (gameStage === "selection") {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-6">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
                    <Home className="w-5 h-5 text-slate-600" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Telaffuz Koçu</h2>
                    <div className="w-9"></div>
                </div>

                <div className="text-center py-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Konuşma Zamanı!</h1>
                    <p className="text-slate-500">Kelimeleri sesli oku, yapay zeka puanlasın.</p>
                </div>

                <div className="space-y-4">
                    {/* Tekrar Modu */}
                    <button 
                        onClick={(e) => startSession('review', e)} 
                        disabled={reviewPool.length === 0} 
                        style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                        className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all group active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><RefreshCw className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Tekrar Modu</div><div className="text-sm text-slate-500">Bilinen kelimeleri oku</div></div>
                            </div>
                            <div className="text-2xl font-black text-orange-600">{reviewPool.length}</div>
                        </div>
                    </button>

                    {/* Öğrenme Modu */}
                    <button 
                        onClick={(e) => startSession('learn', e)} 
                        disabled={learnPool.length === 0} 
                        style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                        className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><Brain className="w-8 h-8" /></div>
                                <div className="text-left"><div className="font-bold text-xl text-slate-800">Öğrenme Modu</div><div className="text-sm text-slate-500">Yeni kelimeler oku</div></div>
                            </div>
                            <div className="text-2xl font-black text-indigo-600">{learnPool.length}</div>
                        </div>
                    </button>

                    {/* Bekleme Modu */}
                    <button 
                        onClick={(e) => startSession('waiting', e)} 
                        disabled={waitingPool.length === 0} 
                        style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                        className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group active:scale-95 disabled:opacity-60 focus:outline-none focus:ring-0"
                    >
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
  // === 2. BİTİŞ EKRANI ===
  // ===========================
  if (gameStage === "finished") {
    const maxScore = sessionWords.length * 10;
    
    let modeTitle = "Oturum Tamamlandı!";
    if (activeMode === 'learn') modeTitle = "Bitti";
    if (activeMode === 'review') modeTitle = "Bitti";
    if (activeMode === 'waiting') modeTitle = "Bitti";

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
           <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce"><Trophy className="w-10 h-10 text-purple-600"/></div>
           <h2 className="text-2xl font-bold text-slate-800">{modeTitle}</h2>
           
           <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="text-sm text-slate-400 font-bold uppercase">TOPLAM PUAN</div>
             <div className="text-5xl font-extrabold text-purple-600 mt-2">{sessionScore}</div>
             <div className="text-xs text-slate-400 mt-1">Maksimum: {maxScore}</div>
           </div>

           <button 
                onClick={() => setGameStage("selection")} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3 shadow-lg shadow-blue-200"
           >
                Başka Test Çöz
           </button>
           
           <button 
                onClick={() => navigate("/")} 
                className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"
           >
                <Home className="w-5 h-5" /> Ana Sayfa
           </button>
        </div>
      </div>
    );
  }

  // ===========================
  // === 3. OYUN EKRANI ===
  // ===========================
  const currentWord = sessionWords[currentIndex];
  const progress = ((currentIndex + 1) / sessionWords.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
       
       {/* --- MOBİL İÇİN KRİTİK CSS DÜZELTMELERİ --- */}
       <style>{`
         * {
           -webkit-tap-highlight-color: transparent !important;
         }
         
         /* Sadece Mouse ile hover efekti (Mobil yapışmayı engeller) */
         @media (hover: hover) {
            .mic-btn:hover { background-color: #4338ca !important; }
            .action-btn:hover { background-color: #e0e7ff !important; }
         }

         /* Ortak Buton Stilleri */
         .mic-btn {
            transition: all 0.2s ease;
         }
         .action-btn {
            transition: all 0.2s ease;
         }
       `}</style>

       <div className="w-full max-w-md space-y-6 mt-4">
           
           {/* Header */}
           <div className="flex justify-between items-center">
               <button onClick={handleQuitEarly} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100"><X className="w-5 h-5 text-slate-400"/></button>
               <div className="font-bold text-indigo-600">
                   {activeMode === 'review' ? 'Tekrar' : activeMode === 'learn' ? 'Öğrenme' : 'Bekleme'}: {currentIndex + 1} / {sessionWords.length}
               </div>
               <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm"><Trophy className="w-4 h-4"/> {sessionScore}</div>
           </div>
           <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{width:`${progress}%`}}></div></div>

           {/* Kelime Kartı */}
           <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center space-y-6 min-h-[300px] flex flex-col justify-center items-center">
               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">OKUMAN GEREKEN KELİME</div>
               
               <h2 className="text-5xl font-black text-slate-800 tracking-tight">{currentWord.word}</h2>
               
               <button 
                   onClick={(e) => speakWord(e)}
                   style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                   className="action-btn flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-bold transition-colors focus:outline-none focus:ring-0"
               >
                   <Volume2 className="w-4 h-4" /> Doğrusunu Dinle
               </button>

               {/* Geri Bildirim */}
               {feedback && (
                   <div className={`w-full p-4 rounded-2xl border-2 animate-in fade-in zoom-in duration-300 ${
                       feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                       feedback.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                       'bg-red-50 border-red-200 text-red-700'
                   }`}>
                       <div className="text-xs font-bold opacity-70 uppercase mb-1">Senin Okuduğun</div>
                       <div className="text-lg font-bold italic">"{spokenText}"</div>
                       <div className="mt-2 text-sm font-black flex items-center justify-center gap-1">
                           {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                           {feedback.msg}
                       </div>
                   </div>
               )}
           </div>

           {/* Mikrofon / Sonraki Butonu */}
           <div className="flex justify-center pt-4">
               {!isRoundDone ? (
                   <div className="flex flex-col items-center gap-3">
                       {/* MİKROFON BUTONU (DÜZELTİLDİ: CSS CLASS + BLUR) */}
                       <button
                           onClick={(e) => toggleMic(e)}
                           style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                           className={`mic-btn w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-95 focus:outline-none focus:ring-0 select-none touch-manipulation ${
                               isListening 
                                   ? "bg-red-500 text-white animate-pulse ring-4 ring-red-200" 
                                   : "bg-indigo-600 text-white"
                           }`}
                       >
                           {isListening ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-10 h-10" />}
                       </button>
                       <span className="text-slate-400 text-sm font-medium">{isListening ? "Dinliyorum..." : "Bas ve Oku"}</span>
                   </div>
               ) : (
                   <button 
                       onClick={(e) => handleNext(e)} 
                       style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
                       className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 flex items-center justify-center gap-2 focus:outline-none focus:ring-0"
                   >
                       {currentIndex + 1 === sessionWords.length ? "Sonucu Gör" : "Sıradaki Kelime"} <ArrowLeft className="w-5 h-5 rotate-180"/>
                   </button>
               )}
           </div>

           {/* BİTİR VE ÇIK BUTONU */}
           <button onClick={handleQuitEarly} style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }} className="w-full mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto focus:outline-none focus:ring-0">
               Bitir (Puanı Al ve Çık)
           </button>

       </div>
    </div>
  );
}
