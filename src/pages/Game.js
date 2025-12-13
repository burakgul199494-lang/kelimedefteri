import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import WordCard from "../components/WordCard";
import { useNavigate } from "react-router-dom";
import {
  X,
  RotateCcw,
  Home,
  Target,
  Check,
  Trophy,
  BookOpen,
  Clock,
  Tag,
  Play,
  Layers
} from "lucide-react";

export default function Game() {
  const { getAllWords, knownWordIds, handleSmartLearn, learningQueue, addScore } = useData();
  const navigate = useNavigate();

  // --- STATE'LER ---
  const [gameStage, setGameStage] = useState("selection");
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [stats, setStats] = useState({ learned: 0, review: 0 });
  const [selectedTag, setSelectedTag] = useState(null);
  const [includeResting, setIncludeResting] = useState(false);

  const POINTS_PER_CARD = 5;

  // ---------------------------------------
  // --- ETİKET SAYIMLARI (HAZIR/DİNLENME) ---
  // ---------------------------------------
  const tagStats = useMemo(() => {
    const all = getAllWords();
    const statsMap = {};
    const now = new Date();

    all.forEach((w) => {
      if (!knownWordIds.includes(w.id)) {
        let isReady = true;
        const progress = learningQueue.find((q) => q.wordId === w.id);
        if (progress) {
          const reviewDate = new Date(progress.nextReview);
          if (reviewDate > now) isReady = false;
        }

        if (Array.isArray(w.tags)) {
          w.tags.forEach((t) => {
            if (t) {
              if (!statsMap[t]) statsMap[t] = { ready: 0, resting: 0 };
              if (isReady) statsMap[t].ready++;
              else statsMap[t].resting++;
            }
          });
        }
      }
    });

    return Object.entries(statsMap)
      .map(([tag, counts]) => ({ tag, ...counts }))
      .sort((a, b) => a.tag.localeCompare(b.tag, "tr"));
  }, [getAllWords, knownWordIds, learningQueue]);

  // --------------------------
  // --- OTURUMU BAŞLAT ---
  // --------------------------
  const startSession = (tag = null, forceIncludeResting = false) => {
    setSelectedTag(tag);
    const all = getAllWords();
    const now = new Date();

    let filteredPool = tag ? all.filter((w) => w.tags?.includes(tag)) : all;

    const playableWords = filteredPool.filter((w) => {
      if (knownWordIds.includes(w.id)) return false;
      if (forceIncludeResting) return true;

      const p = learningQueue.find((q) => q.wordId === w.id);
      if (!p) return true;

      return new Date(p.nextReview) <= now;
    });

    if (playableWords.length === 0) {
      alert("Bu kategoride çalışılacak aktif kelime kalmadı!");
      return;
    }

    const shuffled = [...playableWords].sort(() => 0.5 - Math.random());
    setSessionWords(shuffled.slice(0, 20));
    setCurrentIndex(0);
    setStats({ learned: 0, review: 0 });
    setGameStage("playing");
  };

  // --------------------------
  // --- KART KAYDIRMA ---
  // --------------------------
  const handleSwipe = async (dir) => {
    if (currentIndex >= sessionWords.length) return;

    setSwipeDirection(dir);
    const currentWord = sessionWords[currentIndex];

    setTimeout(async () => {
      if (dir === "right") {
        await handleSmartLearn(currentWord.id, "know");
        setStats((p) => ({ ...p, learned: p.learned + 1 }));
      } else {
        await handleSmartLearn(currentWord.id, "dont_know");
        setStats((p) => ({ ...p, review: p.review + 1 }));
      }

      if (currentIndex + 1 < sessionWords.length) {
        setCurrentIndex((p) => p + 1);
        setSwipeDirection(null);
      } else {
        setGameStage("summary");
        setSwipeDirection(null);

        const totalPoints = sessionWords.length * POINTS_PER_CARD;
        if (totalPoints > 0) addScore(totalPoints);
      }
    }, 300);
  };

  // ----------------------------
  // --- ERKEN BİTİR ---
  // ----------------------------
  const handleQuitEarly = () => {
    const pointsEarned = currentIndex * POINTS_PER_CARD;
    if (pointsEarned > 0) addScore(pointsEarned);
    setGameStage("summary");
  };

  // ===========================
  // === SEÇİM EKRANI ==========
  // ===========================
  if (gameStage === "selection") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100"
            >
              <Home className="w-5 h-5 text-slate-600" />
            </button>

            <h2 className="text-xl font-bold text-slate-800">Çalışma Modu</h2>
            <div className="w-9"></div>
          </div>

          <div className="text-center py-4">
            <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
              <Layers className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              Hangi bağlamda çalışacaksın?
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Turuncu sayılar dinlenmedeki kelimelerdir.
            </p>
          </div>

          {/* TÜMÜ */}
          <div className="space-y-4 pb-10">
            <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200">
              <button
                onClick={() => startSession(null, includeResting)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl shadow-sm flex items-center justify-between group active:scale-95 mb-3"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">TÜMÜ</div>
                    <div className="text-xs text-indigo-100 opacity-80">
                      Karışık Çalış
                    </div>
                  </div>
                </div>
                <Play className="w-6 h-6 opacity-80 group-hover:translate-x-1 transition-transform" />
              </button>

              <div
                onClick={() => setIncludeResting(!includeResting)}
                className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg"
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    includeResting
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-slate-300"
                  }`}
                >
                  {includeResting && <Check className="w-3 h-3" />}
                </div>
                <span className="text-sm text-slate-600 font-medium">
                  Dinlenmedeki kelimeleri de sor
                </span>
              </div>
            </div>

            {/* KATEGORİLER */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-50 text-slate-400 font-medium">
                  Kategoriler
                </span>
              </div>
            </div>

            {tagStats.length === 0 ? (
              <div className="text-center text-slate-400 py-4 bg-white rounded-xl border border-dashed border-slate-300">
                Aktif kategori bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {tagStats.map(({ tag, ready, resting }) => {
                  const isOnlyResting = ready === 0 && resting > 0;

                  return (
                    <button
                      key={tag}
                      onClick={() => startSession(tag, isOnlyResting)}
                      className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm group active:scale-95"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isOnlyResting
                              ? "bg-orange-100 text-orange-600"
                              : "bg-indigo-100 text-indigo-600"
                          }`}
                        >
                          <Tag className="w-5 h-5" />
                        </div>

                        <div className="text-left">
                          <div className="font-bold text-slate-700 group-hover:text-indigo-700">
                            {tag}
                          </div>
                          <div className="text-xs text-slate-400">
                            Toplam {ready + resting} kelime
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {ready > 0 && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                            <Play className="w-3 h-3 fill-green-700" /> {ready}
                          </span>
                        )}
                        {resting > 0 && (
                          <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {resting}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===========================
  // === ÖZET EKRANI ============
  // ===========================
  if (gameStage === "summary") {
    const all = getAllWords();

    let filteredPool = selectedTag
      ? all.filter((w) => w.tags?.includes(selectedTag))
      : all;

    const totalKnown = filteredPool.filter((w) =>
      knownWordIds.includes(w.id)
    ).length;

    const now = new Date();
    const waitingCount = filteredPool.filter((w) => {
      const p = learningQueue.find((q) => q.wordId === w.id);
      if (!p) return false;
      const d = new Date(p.nextReview);
      return d > now && !knownWordIds.includes(w.id);
    }).length;

    const availableToPlay = filteredPool.length - totalKnown - waitingCount;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {selectedTag ? `${selectedTag} Bitti!` : "Oturum Tamamlandı!"}
          </h2>

          <div className="flex justify-center gap-6 my-6 border-b border-slate-100 pb-6">
            <div>
              <div className="text-3xl font-bold text-green-600">
                {stats.learned}
              </div>
              <div className="text-xs text-slate-500 font-bold uppercase">
                Öğrenildi
              </div>
            </div>

            <div>
              <div className="text-3xl font-bold text-orange-500">
                {stats.review}
              </div>
              <div className="text-xs text-slate-500 font-bold uppercase">
                Tekrar
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {selectedTag && (
              <div className="bg-indigo-50 p-2 rounded-lg text-sm font-bold text-indigo-700 mb-2 border border-indigo-100">
                Kategori: {selectedTag}
              </div>
            )}

            <div className="flex justify-between text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              <span>Tamamen Öğrenilen:</span>
              <span className="font-bold text-indigo-600">{totalKnown}</span>
            </div>

            <div className="flex justify-between text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              <span>Dinlenmede:</span>
              <span className="font-bold text-orange-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {waitingCount}
              </span>
            </div>

            <div className="flex justify-between text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              <span>Sırada Bekleyen:</span>
              <span className="font-bold text-green-600">
                {availableToPlay}
              </span>
            </div>
          </div>

          <button
            onClick={() => startSession(selectedTag, true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mb-3"
          >
            <RotateCcw className="w-5 h-5" /> Devam Et (Hepsini Sor)
          </button>

          <button
            onClick={() => setGameStage("selection")}
            className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <Layers className="w-5 h-5" /> Kategori Değiştir
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full mt-3 bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" /> Ana Sayfa
          </button>
        </div>
      </div>
    );
  }

  // ===========================
  // === OYUN (KARTLAR) =========
  // ===========================
  const currentCard = sessionWords[currentIndex];
  const progress =
    sessionWords.length > 0 ? (currentIndex / sessionWords.length) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 overflow-hidden">
      {/* Progress Bar + Üst Bar */}
      <div className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={handleQuitEarly}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              {selectedTag && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold border border-indigo-100">
                  {selectedTag}
                </span>
              )}

              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {currentIndex + 1} / {sessionWords.length}
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* KART */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {currentCard && (
          <div
            className={`relative w-full max-w-sm transition-all duration-300 transform 
              ${
                swipeDirection === "left"
                  ? "-translate-x-24 -rotate-6 opacity-0"
                  : ""
              }
              ${
                swipeDirection === "right"
                  ? "translate-x-24 rotate-6 opacity-0"
                  : ""
              }`}
          >
            {/* 🔥 ÖNEMLİ: KEY EKLENDİ, ÇEVİRİ SORUNU TAMAMEN ÇÖZÜLDÜ */}
            <WordCard key={currentCard.id} wordObj={currentCard} />
          </div>
        )}
      </div>

      {/* BUTONLAR */}
      <div className="pb-10 px-6 max-w-md mx-auto w-full">
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleSwipe("left")}
            disabled={!!swipeDirection}
            className="flex-1 bg-white border-2 border-orange-100 hover:bg-orange-50 text-orange-500 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1"
          >
            <X className="w-6 h-6" />
            <span>Bilmiyorum</span>
          </button>

          <button
            onClick={() => handleSwipe("right")}
            disabled={!!swipeDirection}
            className="flex-1 bg-white border-2 border-green-100 hover:bg-green-50 text-green-600 font-bold py-4 rounded-2xl shadow-sm flex flex-col items-center gap-1"
          >
            <Check className="w-6 h-6" />
            <span>Biliyorum</span>
          </button>
        </div>

        <button
          onClick={handleQuitEarly}
          className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto"
        >
          <Target className="w-4 h-4" /> Bitir
        </button>
      </div>
    </div>
  );
}
