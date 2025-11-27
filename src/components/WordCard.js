import React, { useState, useEffect } from "react";
import { Volume2, Languages, Loader2, Tag } from "lucide-react";
import { translateTextWithAI } from "../services/aiService";

export default function WordCard({ wordObj, inGameMode = false }) {
  // -----------------------------
  // STATE
  // -----------------------------
  const [isFlipped, setIsFlipped] = useState(false);

  const [sentenceTranslation, setSentenceTranslation] = useState(null);
  const [loadingSentence, setLoadingSentence] = useState(false);

  const [defTranslations, setDefTranslations] = useState({});
  const [loadingDefs, setLoadingDefs] = useState({});

  // -----------------------------
  // KELİME DEĞİŞTİĞİNDE HER ŞEYİ SIFIRLA
  // -----------------------------
  useEffect(() => {
    setIsFlipped(false);
    setSentenceTranslation(null);
    setLoadingSentence(false);
    setDefTranslations({});
    setLoadingDefs({});
  }, [wordObj.id]);

  // -----------------------------
  // SESLENDİRME
  // -----------------------------
  const speak = (text, e) => {
    if (e) e.stopPropagation();
    if (!text) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  };

  // -----------------------------
  // CÜMLE ÇEVİR
  // -----------------------------
  const handleTranslateSentence = async (e) => {
    e.stopPropagation();
    if (!wordObj.sentence || loadingSentence || sentenceTranslation) return;

    try {
      setLoadingSentence(true);
      const tr = await translateTextWithAI(wordObj.sentence);
      setSentenceTranslation(tr);
    } catch {
      setSentenceTranslation("Çeviri yapılamadı.");
    } finally {
      setLoadingSentence(false);
    }
  };

  // -----------------------------
  // TANIM ÇEVİR
  // -----------------------------
  const handleTranslateDef = async (index, text, e) => {
    e.stopPropagation();
    if (!text || loadingDefs[index] || defTranslations[index]) return;

    try {
      setLoadingDefs((p) => ({ ...p, [index]: true }));
      const tr = await translateTextWithAI(text);
      setDefTranslations((p) => ({ ...p, [index]: tr }));
    } catch {
      setDefTranslations((p) => ({ ...p, [index]: "Çeviri yapılamadı." }));
    } finally {
      setLoadingDefs((p) => ({ ...p, [index]: false }));
    }
  };

  // -----------------------------
  const getShortType = (t) => {
    const map = {
      noun: "n.",
      verb: "v.",
      adjective: "adj.",
      adverb: "adv.",
      prep: "prep.",
      pronoun: "pron.",
      conj: "conj.",
      article: "art.",
      other: "other",
    };
    return map[t] || t;
  };

  const renderSourceBadge = (src) => (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
        src === "system"
          ? "bg-blue-100 text-blue-600"
          : "bg-orange-100 text-orange-600"
      }`}
    >
      {src === "system" ? "Sistem" : "Kullanıcı"}
    </span>
  );

  const FeatureRow = ({ label, value }) => {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between group">
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="font-semibold shrink-0">{label}:</span>
          <span className="truncate">{value}</span>
        </div>
        <button
          onClick={(e) => speak(value, e)}
          className="p-1 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors opacity-60 group-hover:opacity-100"
        >
          <Volume2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const definitions = Array.isArray(wordObj.definitions)
    ? wordObj.definitions
    : [];

  // -----------------------------
  // KART DÖNDÜRME
  // sadece Game modunda aktif
  // -----------------------------
  const handleFlip = () => {
    if (!inGameMode) return;
    setIsFlipped((prev) => !prev);
  };

  // -----------------------------
  // FRONT – BACK Tasarım
  // -----------------------------
  return (
    <div
      className="relative w-full max-w-sm h-[460px] perspective mx-auto"
      onClick={handleFlip}
      style={{ perspective: "1000px" }}
    >
      <div
        className={`relative w-full h-full duration-500 transform-style-preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* ----------------------------------------------------- */}
        {/* FRONT  – Ön Yüz (Kelime büyük şekilde)                */}
        {/* ----------------------------------------------------- */}
        <div className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-slate-200 p-6 backface-hidden flex flex-col items-center justify-center">

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                Kelime
              </span>
              {renderSourceBadge(wordObj.source)}
            </div>

            <h1 className="text-5xl font-extrabold text-slate-900">
              {wordObj.word}
            </h1>

            <button
              onClick={(e) => speak(wordObj.word, e)}
              className="p-4 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
            >
              <Volume2 className="w-7 h-7" />
            </button>
          </div>

          {inGameMode && (
            <p className="text-xs text-slate-400 mt-8">Kartı çevirmek için tıkla</p>
          )}
        </div>

        {/* ----------------------------------------------------- */}
        {/* BACK – Arka Yüz (Anlam, tanımlar, çekimler vs.)       */}
        {/* ----------------------------------------------------- */}
        <div className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-slate-200 p-5 rotate-y-180 backface-hidden overflow-y-auto">
          <div className="space-y-4">
            {/* DEFINITIONS */}
            {definitions.map((def, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border ${
                  i === 0
                    ? "bg-indigo-50 border-indigo-100"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {def?.type && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-700">
                      {getShortType(def.type)}
                    </span>
                  )}

                  {def?.meaning && (
                    <span className="font-bold text-lg text-slate-900">
                      {def.meaning}
                    </span>
                  )}
                </div>

                {def?.engExplanation && (
                  <div className="mt-1 pl-2 border-l-2 border-indigo-200/50 group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm italic text-indigo-600">
                        "{def.engExplanation}"
                      </p>

                      <div className="flex gap-1">
                        <button
                          onClick={(e) => speak(def.engExplanation, e)}
                          className="opacity-50 hover:opacity-100 p-1 bg-white rounded-full shadow-sm"
                        >
                          <Volume2 className="w-3 h-3 text-indigo-500" />
                        </button>

                        <button
                          onClick={(e) =>
                            handleTranslateDef(i, def.engExplanation, e)
                          }
                          className="opacity-50 hover:opacity-100 p-1 bg-white rounded-full shadow-sm"
                        >
                          {loadingDefs[i] ? (
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                          ) : (
                            <Languages className="w-3 h-3 text-indigo-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    {defTranslations[i] && (
                      <div className="mt-1 text-xs text-indigo-800 bg-indigo-100/50 p-1.5 rounded">
                        TR: {defTranslations[i]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* ÇEKİMLER */}
            {(wordObj.plural ||
              wordObj.v2 ||
              wordObj.v3 ||
              wordObj.vIng ||
              wordObj.thirdPerson) && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                  Fiil & İsim Çekimleri
                </div>

                <FeatureRow label="Plural" value={wordObj.plural} />
                <FeatureRow label="3rd P" value={wordObj.thirdPerson} />
                <FeatureRow label="V2" value={wordObj.v2} />
                <FeatureRow label="V3" value={wordObj.v3} />
                <FeatureRow label="V-ing" value={wordObj.vIng} />
              </div>
            )}

            {/* SIFAT – ZARF HALLERİ */}
            {(wordObj.advLy || wordObj.compEr || wordObj.superEst) && (
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-orange-500 font-bold">
                  Sıfat & Zarf Halleri
                </div>

                <FeatureRow label="Zarf" value={wordObj.advLy} />
                <FeatureRow label="Comp" value={wordObj.compEr} />
                <FeatureRow label="Super" value={wordObj.superEst} />
              </div>
            )}

            {/* ÖRNEK CÜMLE */}
            {wordObj.sentence && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                    Örnek Cümle
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleTranslateSentence}
                      className="p-1.5 bg-white text-indigo-500 rounded-full border border-slate-200 hover:bg-indigo-50"
                    >
                      {loadingSentence ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={(e) => speak(wordObj.sentence, e)}
                      className="p-1.5 bg-white text-indigo-500 rounded-full border border-slate-200 hover:bg-indigo-50"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-base text-slate-600 italic">
                  "{wordObj.sentence}"
                </p>

                {sentenceTranslation && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-slate-800 text-sm font-medium">
                      TR: {sentenceTranslation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAGS */}
            {wordObj.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {wordObj.tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200 flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3 opacity-50" /> {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
