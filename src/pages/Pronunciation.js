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
  X
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
      w => !knownWordIds.includes(w.id) && !learningQueue.find(q => q.wordId === w.id)
    );
    const reviewPool = all.filter(w => knownWordIds.includes(w.id));
    const waitingPool = all.filter(w => {
      const q = learningQueue.find(item => item.wordId === w.id);
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

  // --- MİKROFON ---
  const startListening = async () => {
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

    setSessionScore(p => p + earnedPoints);
    setFeedback({ score: earnedPoints, type, msg });
    setIsRoundDone(true);
  };

  const handleNext = () => {
    if (currentIndex + 1 < sessionWords.length) {
      setCurrentIndex(i => i + 1);
      resetRound();
    } else {
      addScore(sessionScore);
      setGameStage("finished");
    }
  };

  // =====================
  // === SEÇİM EKRANI ===
  // =====================
  if (gameStage === "selection") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={() => startSession("learn")}>Başla</button>
      </div>
    );
  }

  // =====================
  // === BİTİŞ EKRANI ===
  // =====================
  if (gameStage === "finished") {
    const max = sessionWords.length * 10;

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <Trophy />
          <h2>Telaffuz Testi Bitti</h2>
          <div>{sessionScore} / {max}</div>
          <button onClick={() => setGameStage("selection")}>Tekrar</button>
        </div>
      </div>
    );
  }

  // =====================
  // === OYUN EKRANI ===
  // =====================
  const currentWord = sessionWords[currentIndex];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1>{currentWord.word}</h1>

      {!isRoundDone ? (
        <button onClick={toggleMic}>
          {isListening ? <Square /> : <Mic />}
        </button>
      ) : (
        <button onClick={handleNext}>Devam</button>
      )}

      {feedback && (
        <div>
          {feedback.type === "success"
            ? <CheckCircle2 />
            : <AlertCircle />}
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
