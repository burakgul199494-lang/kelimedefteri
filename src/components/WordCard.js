import React, { useState, useEffect } from "react";
import {
  Volume2,
  Languages,
  Loader2,
  Tag,
  Star
} from "lucide-react";
import { translateTextWithAI } from "../services/aiService";

export default function WordCard({ wordObj }) {
  const [flipped, setFlipped] = useState(false);

  const [sentenceTranslation, setSentenceTranslation] = useState(null);
  const [loadingSentence, setLoadingSentence] = useState(false);

  const [defTranslations, setDefTranslations] = useState({});
  const [loadingDefs, setLoadingDefs] = useState({});

  // Kelime değiştiğinde tüm state'leri sıfırla
  useEffect(() => {
    setFlipped(false);
    setSentenceTranslation(null);
    setLoadingSentence(false);
    setDefTranslations({});
    setLoadingDefs({});
  }, [wordObj.id]);

  // Seslendirme
  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  };

  // Cümle çevirisi
  const translateSentence = async (e) => {
    e.stopPropagation();
    if (loadingSentence || sentenceTranslation) return;

    try {
      setLoadingSentence(true);
      const tr = await translateTextWithAI(wordObj.example);
      setSentenceTranslation(tr);
    } catch (err) {
      setSentenceTranslation("Çeviri yapılamadı.");
    }
    setLoadingSentence(false);
  };

  // Tüm tanımları çevirme
  const translateAllDefs = async () => {
    const textBlock = wordObj.definitions.join(" ||| ");

    const tr = await translateTextWithAI(textBlock);

    const parts = tr.split("|||").map((t) => t.trim());

    const obj = {};
    parts.forEach((p, i) => {
      obj[i] = p;
    });

    setDefTranslations(obj);
  };

  return (
    <div
      className="relative w-full h-auto cursor-pointer"
      onClick={() => setFlipped((p) => !p)}
      style={{ perspective: "1000px" }}
    >
      {/* KART KUTUSU */}
      <div
        className={`relative transition-transform duration-700 w-full rounded-2xl shadow-xl border border-slate-200 bg-white`}
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)"
        }}
      >
        {/* --- ÖN YÜZ --- */}
        <div
          className="absolute inset-0 p-6 flex flex-col justify-center rounded-2xl bg-white"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-slate-800">
              {wordObj.word}
            </h2>

            <button onClick={(e) => speak(wordObj.word, e)}>
              <Volume2 className="w-6 h-6 text-indigo-600" />
            </button>
          </div>

          {/* Etiketler */}
          {wordObj.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {wordObj.tags.map((t, i) => (
                <span
                  key={i}
                  className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg font-semibold"
                >
                  <Tag className="w-3 h-3 mr-1 inline" />
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 text-center text-slate-400 font-semibold">
            Kartı çevir ⤵
          </div>
        </div>

        {/* --- ARKA YÜZ --- */}
        <div
          className="absolute inset-0 p-6 rounded-2xl bg-slate-50"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)"
          }}
        >
          {/* Tüm tanımları çevir */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              translateAllDefs();
            }}
            className="mb-3 text-indigo-600 font-semibold underline"
          >
            Tüm Tanımları Çevir
          </button>

          {/* Tanımlar */}
          <div className="space-y-3">
            {wordObj.definitions?.map((def, index) => (
              <div
                key={index}
                className="bg-white p-3 rounded-xl shadow-sm border"
              >
                <p className="text-slate-700">{def}</p>

                {defTranslations[index] && (
                  <p className="mt-2 text-green-700 bg-green-50 p-2 rounded-lg text-sm">
                    {defTranslations[index]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Örnek Cümle */}
          {wordObj.example && (
            <div className="mt-5 bg-white p-4 rounded-xl shadow-sm border">
              <p className="italic">{wordObj.example}</p>

              <button
                onClick={translateSentence}
                className="mt-2 flex gap-2 items-center text-indigo-600"
              >
                {loadingSentence ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Languages className="w-4 h-4" />
                )}
                Cümleyi Çevir
              </button>

              {sentenceTranslation && (
                <p className="mt-2 text-green-700 bg-green-50 p-2 rounded-lg text-sm">
                  {sentenceTranslation}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
