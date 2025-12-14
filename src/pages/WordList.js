import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import {
  ArrowLeft,
  Volume2,
  RotateCcw,
  Check,
  Trophy,
  ArrowDownCircle,
  Hourglass,
  Layers
} from "lucide-react";

export default function WordList() {
  const { type } = useParams(); // "known", "unknown", "waiting"
  const navigate = useNavigate();

  const {
    knownWordIds,
    getAllWords,
    learningQueue,
    handleSmartLearn
  } = useData();

  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const PER_PAGE = 50;

  const isKnown = type === "known";
  const isWaiting = type === "waiting";

  const mode = isKnown ? "review" : isWaiting ? "waiting" : "learn";

  let title = "Kelime Listesi";
  let wordList = [];
  const all = getAllWords();

  const queueIds = learningQueue ? learningQueue.map(q => q.wordId) : [];

  if (isKnown) {
    title = "Öğrendiğim Kelimeler";
    wordList = all.filter(w => knownWordIds.includes(w.id));
  } else if (isWaiting) {
    title = "Tekrar Bekleyenler";
    wordList = all.filter(w => queueIds.includes(w.id));
  } else {
    title = "Öğreneceğim Kelimeler";
    wordList = all.filter(
      w => !knownWordIds.includes(w.id) && !queueIds.includes(w.id)
    );
  }

  const filteredWords = wordList
    .filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.word.localeCompare(b.word));

  const displayedWords = filteredWords.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PER_PAGE);
  }, [search, type]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PER_PAGE);
  };

  const speak = (txt, e) => {
    e.stopPropagation();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const getShortType = t =>
    ({
      noun: "noun",
      verb: "verb",
      adjective: "adj",
      adverb: "adv",
      conjunction: "conj",
      prep: "prep",
      pronoun: "pron",
      article: "art"
    }[t] || t);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">

        {/* ÜST BAR */}
        <div className="sticky top-0 bg-slate-50 py-2 z-10 flex items-center gap-3 mb-4 shadow-sm px-2 rounded-b-xl">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <div className="text-xs text-slate-400 font-bold">
              {filteredWords.length} kelime
            </div>
          </div>
        </div>

        {/* ARAMA */}
        <input
          type="text"
          placeholder="Kelime ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:border-indigo-300"
        />

        {displayedWords.length === 0 ? (
          <div className="text-center text-slate-400 mt-20 flex flex-col items-center">
            {isKnown ? (
              <Trophy className="w-16 h-16 mb-4 text-green-200 opacity-50" />
            ) : isWaiting ? (
              <Hourglass className="w-16 h-16 mb-4 text-amber-200 opacity-50" />
            ) : (
              <Layers className="w-16 h-16 mb-4 text-blue-200 opacity-50" />
            )}
            <p className="font-medium text-slate-500">Liste boş.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-10">
            {displayedWords.map(item => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold">{item.word}</span>
                      <button
                        onClick={e => speak(item.word, e)}
                        className="p-1 text-indigo-400 bg-indigo-50 rounded-full"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.definitions.map((def, idx) => (
                      <div key={idx} className="flex gap-2 text-sm">
                        <span className="text-xs font-bold text-slate-400">
                          {getShortType(def.type)}
                        </span>
                        <span>{def.meaning}</span>
                      </div>
                    ))}
                  </div>

                  {/* 🔥 TEK DEĞİŞEN YER */}
                  <div className="flex flex-col gap-1">
                    {isKnown ? (
                      <button
                        onClick={() =>
                          handleSmartLearn(item.id, "know", "review")
                        }
                        title="Tekrar (Seviye Değişmez)"
                        className="p-2 text-slate-300 hover:text-amber-500"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleSmartLearn(item.id, "master", mode)
                        }
                        title="Ezberledim"
                        className="p-2 text-slate-300 hover:text-green-500"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {visibleCount < filteredWords.length && (
              <button
                onClick={handleLoadMore}
                className="w-full py-4 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex justify-center gap-2"
              >
                <ArrowDownCircle className="w-5 h-5" />
                Daha Fazla Göster
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
