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

  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isRoundDone, setIsRoundDone] = useState(false);

  const recognitionRef = useRef(null);

  // --- KELİME HAVUZLARI ---
  const getWordPools = () => {
    const all = getAllWords();
    const now = new Date();

    const learnPool = all.filter(
      (w) =>
        !knownWordIds.includes(w.id) &&
        !learningQueue.find((q) => q.wordId === w.id)
    );
    const reviewPool = all.filter((w) => knownWordIds.includes(w.id));
    const waitingPool = all.filter((w) => {
      const q = learningQueue.find((item) => item.wordId === w.id);
      return q && new Date(q.nextReview) > now;
    });

    return { learnPool, reviewPool, waitingPool };
  };

  const { learnPool, reviewPool, waitingPool } = getWordPools();

  // --- OYUNU BAŞLAT ---
  const startSession = (mode) => {
    setActiveMode(mode);

    let selectedPool = [];
    if (mode === "learn") selectedPool = learnPool;
    if (mode === "review") selectedPool = reviewPool;
    if (mode === "waiting") selectedPool = waitingPool;

    if (selectedPool.length === 0) {
      alert("Bu modda çalışılacak kelime yok!");
      return;
    }

    const selected = selectedPool
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);

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

  // --- MİKROFON ---
  const startListening = () => {
    if (recognitionRef.current) recognitionRef.current.abort();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Tarayıcınız ses tanımayı desteklemiyor.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setSpokenText(transcript);
      evaluatePronunciation(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopMicrophone = () => {
    if (recognitionRef.current) recognitionRef.current.abort();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const toggleMic = () => {
    isListening ? stopMicrophone() : startListening();
  };

  // --- PUANLAMA ---
  const evaluatePronunciation = (spoken) => {
    const target = sessionWords[currentIndex].word.toLowerCase().trim();
    const input = spoken.toLowerCase().trim();

    let earnedPoints = 0;
    let type = "error";
    let msg = "Yanlış (0 Puan)";

    if (input === target) {
      earnedPoints = 10;
      type = "success";
      msg = "Mükemmel! (10 Puan)";
    }

    setSessionScore((p) => p + earnedPoints);
    setFeedback({ score: earnedPoints, type, msg });
    setIsRoundDone(true);
  };

  const handleNext = () => {
    if (currentIndex + 1 < sessionWords.length) {
      setCurrentIndex((i) => i + 1);
      resetRound();
    } else {
      addScore(sessionScore);
      setGameStage("finished");
    }
  };

  // ===========================
  // === 1. MOD SEÇİM EKRANI ===
  // ===========================
  if (gameStage === "selection") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100"
            >
              <Home className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">Telaffuz Koçu</h2>
            <div className="w-9"></div>
          </div>

          <div className="text-center py-6">
            <h1 className="text-3xl font-black text-slate-800 mb-2">
              Konuşma Zamanı!
            </h1>
            <p className="text-slate-500">
              Kelimeleri sesli oku, yapay zeka puanlasın.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => startSession("review")}
              disabled={reviewPool.length === 0}
              className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
                    <RefreshCw className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-800">
                      Tekrar Modu
                    </div>
                    <div className="text-sm text-slate-500">
                      Bilinen kelimeleri oku
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-black text-orange-600">
                  {reviewPool.length}
                </div>
              </div>
            </button>

            <button
              onClick={() => startSession("learn")}
              disabled={learnPool.length === 0}
              className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                    <Brain className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-800">
                      Öğrenme Modu
                    </div>
                    <div className="text-sm text-slate-500">
                      Yeni kelimeler oku
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-black text-indigo-600">
                  {learnPool.length}
                </div>
              </div>
            </button>

            <button
              onClick={() => startSession("waiting")}
              disabled={waitingPool.length === 0}
              className="w-full bg-white p-5 rounded-2xl shadow-md border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-500">
                    <Hourglass className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xl text-slate-700">
                      Bekleme Listesi
                    </div>
                    <div className="text-sm text-slate-400">
                      Gelecekteki kelimeler
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-500">
                  {waitingPool.length}
                </div>
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
    const max = sessionWords.length * 10;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
          <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Trophy className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            Telaffuz Testi Bitti
          </h2>
          <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-sm text-slate-400 font-bold uppercase">
              TOPLAM PUAN
            </div>
            <div className="text-5xl font-extrabold text-indigo-600 mt-2">
              {sessionScore}
            </div>
            <div className="text-xs text-slate-400 font-bold">
              Maksimum: {max}
            </div>
          </div>
          <button
            onClick={() => setGameStage("selection")}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl"
          >
            Başka Test Çöz
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl"
          >
            Ana Sayfa
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
      <div className="w-full max-w-md space-y-6 mt-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setGameStage("finished")}
            className="p-2 bg-white rounded-full shadow-sm"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>

          <div className="font-bold text-indigo-600">
            {currentIndex + 1} / {sessionWords.length}
          </div>

          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm">
            <Trophy className="w-4 h-4" /> {sessionScore}
          </div>
        </div>

        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-6">
          <div className="text-xs font-bold text-slate-400 uppercase">
            OKUMAN GEREKEN KELİME
          </div>

          <h2 className="text-5xl font-black text-slate-800">
            {currentWord.word}
          </h2>

          <button
            onClick={() => {
              const u = new SpeechSynthesisUtterance(currentWord.word);
              u.lang = "en-US";
              window.speechSynthesis.speak(u);
            }}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-bold"
          >
            <Volume2 className="w-4 h-4" /> Doğrusunu Dinle
          </button>

          {feedback && (
            <div
              className={`p-4 rounded-2xl border-2 ${
                feedback.type === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <div className="italic">"{spokenText}"</div>
              <div className="font-bold mt-2">{feedback.msg}</div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          {!isRoundDone ? (
            <button
              onClick={toggleMic}
              className={`w-20 h-20 rounded-full flex items-center justify-center ${
                isListening
                  ? "bg-red-500 animate-pulse"
                  : "bg-indigo-600"
              } text-white`}
            >
              {isListening ? <Square /> : <Mic />}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl"
            >
              Sıradaki Kelime
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
