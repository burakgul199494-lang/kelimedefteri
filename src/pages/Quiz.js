import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  X, Trophy, Volume2, Languages, Loader2,
  HelpCircle, Tag 
} from "lucide-react";
import { simpleTranslate } from "../services/aiService";

export default function Quiz() {
  const { getAllWords, knownWordIds } = useData();
  const navigate = useNavigate();

  // --- STATES ---
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [category, setCategory] = useState(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintTranslation, setHintTranslation] = useState(null);

  const [finished, setFinished] = useState(false);

  // --- KELİMELERİ ÇEK ---
  const allWords = getAllWords();

  const categories = useMemo(() => {
    const map = {};
    for (const w of allWords) {
      const cat = w.category || "Genel";
      if (!map[cat]) map[cat] = [];
      map[cat].push(w);
    }
    return map;
  }, [allWords]);


  // --- QUIZ BAŞLAT ---
  const startQuiz = (cat) => {
    setCategory(cat);
    const selectedWords = categories[cat] || [];
    const qs = [];

    selectedWords.forEach((w) => {
      if (!w.definitions || w.definitions.length === 0) return;

      qs.push({
        wordObj: w,
        question: w.word,
        options: generateOptions(w.word, selectedWords),
        correct: w.word,
      });
    });

    setQuestions(shuffleArray(qs).slice(0, 20));
    setIsQuizStarted(true);
  };


  // --- SEÇENEK ÜRET ---
  const generateOptions = (correct, wordsList) => {
    const options = [correct];

    while (options.length < 4) {
      const randomWord = wordsList[Math.floor(Math.random() * wordsList.length)].word;
      if (!options.includes(randomWord)) {
        options.push(randomWord);
      }
    }

    return shuffleArray(options);
  };


  // --- ŞIK SEÇ ---
  const chooseOption = (opt) => {
    if (isAnswered) return;

    setSelected(opt);
    setIsAnswered(true);

    if (opt === questions[index].correct) setScore((s) => s + 5);

    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex((i) => i + 1);
        setSelected(null);
        setIsAnswered(false);
        setHintTranslation(null);
      } else {
        setFinished(true);
      }
    }, 800);
  };


  // --- İPUCU ÇEVİR ---
  const handleTranslateHint = async () => {
    const hint = questions[index]?.wordObj.definitions[0].engExplanation;
    if (!hint) return;

    setLoadingHint(true);
    const tr = await simpleTranslate(hint);
    setHintTranslation(tr);
    setLoadingHint(false);
  };


  // --- SESLİ OKUT ---
  const speak = (txt) => {
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };


  // --- QUIZ BAŞLAMAMIŞSA ---
  if (!isQuizStarted) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <h1 className="text-2xl font-bold mt-4 mb-6 text-slate-900">
          Quiz Kategorisi Seç
        </h1>

        <div className="grid grid-cols-1 gap-3">
          {Object.keys(categories).map((cat) => (
            <button
              key={cat}
              onClick={() => startQuiz(cat)}
              className="p-4 rounded-xl bg-white border border-slate-200 text-left shadow-sm hover:bg-slate-50"
            >
              <div className="text-lg font-semibold text-slate-800">{cat}</div>
              <span className="text-xs text-slate-500">
                {categories[cat].length} kelime
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }


  // --- QUIZ BİTTİ ---
  if (finished) {
    const max = questions.length * 5;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Quiz Bitti</h2>
          <p className="text-sm text-slate-500 mb-4">
            Puan: <span className="font-bold">{score}</span> / {max}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
          >
            Yeniden Başla
          </button>
        </div>
      </div>
    );
  }

  // --- QUIZ EKRANI ---
  return (
    <div className="p-6">
      <div className="flex justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-slate-500 text-sm">
          Soru {index + 1} / {questions.length}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">
          {questions[index].question}
        </h2>

        <button
          onClick={() => speak(questions[index].question)}
          className="mx-auto block p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
        >
          <Volume2 className="w-6 h-6" />
        </button>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3">
        {questions[index].options.map((opt, i) => (
          <button
            key={i}
            onClick={() => chooseOption(opt)}
            className={
              "p-4 rounded-xl border text-left font-medium transition shadow-sm " +
              (isAnswered
                ? opt === questions[index].correct
                  ? "bg-green-100 border-green-300 text-green-700"
                  : opt === selected
                    ? "bg-red-100 border-red-300 text-red-700"
                    : "bg-white border-slate-200"
                : "bg-white border-slate-200 hover:bg-slate-50")
            }
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <HelpCircle className="text-indigo-500 w-5 h-5" />
          <button
            onClick={handleTranslateHint}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
          >
            İpucunu Türkçeye Çevir
          </button>

          {loadingHint && <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />}
        </div>

        {hintTranslation && (
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-sm">
            TR: {hintTranslation}
          </div>
        )}
      </div>
    </div>
  );
}


// --- UTIL ---
const shuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);
