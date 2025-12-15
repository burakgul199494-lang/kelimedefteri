import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import {
  X,
  Trophy,
  Loader2,
  Quote,
  Volume2,
  Square,
  Languages,
  Lightbulb,
  RefreshCw,
  BrainCircuit,
  Hourglass,
  Home,
  Layers
} from "lucide-react";

/* ======================================================
   ORTAK BUTON – MOBİL İZ BIRAKMAYAN (WordCard ile AYNI)
====================================================== */
const ActionButton = ({ icon: Icon, onClick, isActive, title }) => (
  <button
    onClick={onClick}
    title={title}
    style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}
    className={`
      p-2 rounded-full border flex items-center justify-center shrink-0
      focus:outline-none focus:ring-0
      transition-colors duration-200
      ${
        isActive
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-slate-400 border-slate-200"
      }
    `}
  >
    <Icon className="w-4 h-4 fill-current" />
  </button>
);

export default function GapFillingGame() {
  const { getAllWords, knownWordIds, learningQueue, addScore } = useData();
  const navigate = useNavigate();

  const [gameMode, setGameMode] = useState(null);
  const [gameStatus, setGameStatus] = useState("mode-selection");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [completedLetters, setCompletedLetters] = useState([]);
  const [wrongAnimationId, setWrongAnimationId] = useState(null);
  const [isWordComplete, setIsWordComplete] = useState(false);

  const [hintCount, setHintCount] = useState(0);
  const [currentWordPoints, setCurrentWordPoints] = useState(5);
  const [mistakeCount, setMistakeCount] = useState(0);

  const [showHintTr, setShowHintTr] = useState(false);
  const [activeAudio, setActiveAudio] = useState(null);

  /* ================= WORD POOLS ================= */
  const getWordPools = () => {
    const all = getAllWords();
    const now = new Date();

    const validWords = all.filter(
      (w) =>
        w.word &&
        w.sentence &&
        w.sentence.toLowerCase().includes(w.word.toLowerCase()) &&
        w.definitions?.[0]?.meaning
    );

    const queueIds = learningQueue?.map((q) => q.wordId) || [];

    const learnPool = validWords.filter(
      (w) => !knownWordIds.includes(w.id) && !queueIds.includes(w.id)
    );

    const reviewPool = validWords.filter((w) => {
      const q = learningQueue.find((x) => x.wordId === w.id);
      return (q && new Date(q.nextReview) <= now) || knownWordIds.includes(w.id);
    });

    const waitingPool = validWords.filter((w) => {
      const q = learningQueue.find((x) => x.wordId === w.id);
      return q && new Date(q.nextReview) > now;
    });

    return { learnPool, reviewPool, waitingPool };
  };

  const { learnPool, reviewPool, waitingPool } = getWordPools();

  /* ================= SESSION ================= */
  const startSession = (mode) => {
    setGameMode(mode);
    const pool =
      mode === "learn" ? learnPool : mode === "review" ? reviewPool : waitingPool;

    if (!pool.length) return alert("Bu modda uygun kelime yok.");

    setQuestions(pool.sort(() => 0.5 - Math.random()).slice(0, 20));
    setCurrentIndex(0);
    setScore(0);
    setGameStatus("playing");
  };

  /* ================= WORD LOAD ================= */
  useEffect(() => {
    window.speechSynthesis.cancel();
    setActiveAudio(null);

    if (gameStatus === "playing" && questions[currentIndex]) {
      const word = questions[currentIndex].word.trim();
      const letters = word.split("").map((char, i) => ({
        id: `${char}-${i}-${Math.random()}`,
        char,
        isUsed: false,
      }));

      setShuffledLetters([...letters].sort(() => Math.random() - 0.5));
      setCompletedLetters([]);
      setIsWordComplete(false);
      setHintCount(0);
      setMistakeCount(0);
      setCurrentWordPoints(5);
      setShowHintTr(false);
    }
  }, [currentIndex, gameStatus]);

  const currentWordObj = questions[currentIndex];
  const targetWord = currentWordObj?.word || "";

  const getMaskedSentence = () => {
    if (!currentWordObj) return "";
    const regex = new RegExp(`\\b${currentWordObj.word}\\b`, "gi");
    return currentWordObj.sentence.replace(regex, "________");
  };

  const englishDefinition =
    currentWordObj?.definitions?.[0]?.engExplanation;
  const turkishDefinition =
    currentWordObj?.definitions?.[0]?.trExplanation;

  /* ================= AUDIO ================= */
  const handleSpeak = (text, id) => {
    if (!text) return;

    if (activeAudio === id) {
      window.speechSynthesis.cancel();
      setActiveAudio(null);
      return;
    }

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.8;
    u.onend = () => setActiveAudio(null);
    setActiveAudio(id);
    window.speechSynthesis.speak(u);
  };

  /* ================= GAME ================= */
  const handleLetterClick = (l) => {
    if (isWordComplete || l.isUsed) return;

    const idx = completedLetters.length;
    if (l.char.toLowerCase() === targetWord[idx].toLowerCase()) {
      setShuffledLetters((p) =>
        p.map((x) => (x.id === l.id ? { ...x, isUsed: true } : x))
      );
      const next = [...completedLetters, l.char];
      setCompletedLetters(next);

      if (next.length === targetWord.length) handleWordComplete();
    } else {
      const m = mistakeCount + 1;
      setMistakeCount(m);
      setWrongAnimationId(l.id);
      setTimeout(() => setWrongAnimationId(null), 500);

      if (m >= 2) {
        setCurrentWordPoints(0);
        setTimeout(() => {
          setCompletedLetters(targetWord.split(""));
          setIsWordComplete(true);
          handleSpeak(targetWord, "word");
          setTimeout(nextQuestion, 2000);
        }, 600);
      }
    }
  };

  const handleHint = () => {
    if (isWordComplete) return;
    const c = hintCount + 1;
    setHintCount(c);
    setCurrentWordPoints(c === 1 ? 2 : 0);

    const idx = completedLetters.length;
    const char = targetWord[idx];
    const correct = shuffledLetters.find(
      (l) => !l.isUsed && l.char.toLowerCase() === char.toLowerCase()
    );
    if (correct) handleLetterClick(correct);
  };

  const handleWordComplete = () => {
    setIsWordComplete(true);
    handleSpeak(targetWord, "word");
    if (currentWordPoints > 0) {
      addScore(currentWordPoints);
      setScore((s) => s + currentWordPoints);
    }
    setTimeout(nextQuestion, 1200);
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < questions.length) setCurrentIndex((i) => i + 1);
    else setGameStatus("finished");
  };

  /* ================= UI ================= */
  if (gameStatus === "mode-selection") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={() => startSession("learn")}>Başla</button>
      </div>
    );
  }

  if (gameStatus === "finished") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="mx-auto mb-4" />
          <div className="text-4xl font-bold">{score}</div>
          <button onClick={() => setGameStatus("mode-selection")}>
            Tekrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex justify-center">
      <div className="max-w-md w-full bg-white p-6 rounded-3xl shadow-xl space-y-6">
        {/* ===== CÜMLE ===== */}
        <div className="text-center space-y-3">
          <Quote className="mx-auto text-blue-400" />
          <h2 className="italic text-slate-700">{getMaskedSentence()}</h2>

          {/* SES + ÇEVİRİ (DÜZELTİLDİ) */}
          <div className="flex justify-center gap-2">
            <ActionButton
              icon={activeAudio === "sentence" ? Square : Volume2}
              onClick={() =>
                handleSpeak(currentWordObj.sentence, "sentence")
              }
              isActive={activeAudio === "sentence"}
            />
            {turkishDefinition && (
              <ActionButton
                icon={Languages}
                onClick={() => setShowHintTr((p) => !p)}
                isActive={showHintTr}
              />
            )}
          </div>
        </div>

        {/* ===== İPUCU ===== */}
        {englishDefinition && (
          <div className="bg-slate-50 p-3 rounded-xl text-sm">
            "{englishDefinition}"
            {showHintTr && (
              <div className="mt-2 text-indigo-700">
                TR: {turkishDefinition}
              </div>
            )}
          </div>
        )}

        {/* ===== HARFLER ===== */}
        <div className="flex flex-wrap justify-center gap-2">
          {shuffledLetters.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLetterClick(l)}
              disabled={l.isUsed}
              style={{ WebkitTapHighlightColor: "transparent" }}
              className={`
                w-10 h-10 rounded-xl font-bold border
                ${
                  l.isUsed
                    ? "opacity-0"
                    : wrongAnimationId === l.id
                    ? "bg-red-500 text-white"
                    : "bg-white text-slate-700"
                }
              `}
            >
              {l.char}
            </button>
          ))}
        </div>

        {/* ===== İPUCU BUTONU ===== */}
        <div className="flex justify-center">
          <button
            onClick={handleHint}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-xl"
          >
            <Lightbulb /> İpucu ({currentWordPoints}p)
          </button>
        </div>
      </div>
    </div>
  );
}
