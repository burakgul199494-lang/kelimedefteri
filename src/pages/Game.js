import React, { useState, useEffect } from "react";
import { Volume2, Languages, Loader2, Tag } from "lucide-react";
import { translateTextWithAI } from "../services/aiService";

export default function WordCard({ wordObj }) {
  const [sentenceTranslation, setSentenceTranslation] = useState(null);
  const [loadingSentence, setLoadingSentence] = useState(false);

  const [defTranslations, setDefTranslations] = useState({});
  const [loadingDefs, setLoadingDefs] = useState({});

  // 🔥 Kart değişince tüm çeviri state'lerini sıfırla
  useEffect(() => {
    setSentenceTranslation(null);
    setLoadingSentence(false);
    setDefTranslations({});
    setLoadingDefs({});
  }, [wordObj.id]);

  // Seslendirme
  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Cümle Çevirisi
  const handleTranslateSentence = async (e) => {
    e.stopPropagation();
    if (sentenceTranslation || loadingSentence) return;

    try {
      setLoadingSentence(true);
      const tr = await translateTextWithAI(wordObj.example);
      setSentenceTranslation(tr);
    } catch (err) {
      setSentenceTranslation("Çeviri yapılamadı.");
    } finally {
      setLoadingSentence(false);
    }
  };

  // Tanım (Definition) Çevirisi
  const translateDefinition = async (definition, index) => {
    if (defTranslations[index] || loadingDefs[index]) return;

    setLoadingDefs((prev) => ({ ...prev, [index]: true }));
    try {
      const tr = await translateTextWithAI(definition);
      setDefTranslations((prev) => ({ ...prev, [index]: tr }));
    } catch (err) {
      setDefTranslations((prev) => ({
        ...prev,
        [index]: "Çeviri yapılamadı.",
      }));
    }
    setLoadingDefs((prev) => ({ ...prev, [index]: false }));
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
      {/* Kelime + Seslendirme */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-3xl font-bold text-slate-800">{wordObj.word}</h2>
        <button onClick={(e) => speak(wordObj.word, e)}>
          <Volume2 className="w-6 h-6 text-indigo-600 hover:text-indigo-800" />
        </button>
      </div>

      {/* Etiketler */}
      {wordObj.tags && wordObj.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {wordObj.tags.map((t, i) => (
            <span
              key={i}
              className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg font-semibold"
            >
              <Tag className="w-3 h-3 inline mr-1" />
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Definition + Çeviri */}
      <div className="space-y-4">
        {wordObj.definitions?.map((def, index) => (
          <div key={index} className="bg-slate-50 p-3 rounded-xl">
            <div className="flex justify-between items-center">
              <p className="text-slate-700">{def}</p>
              <button
                onClick={() => translateDefinition(def, index)}
                className="text-indigo-600 hover:text-indigo-800 ml-3"
              >
                {loadingDefs[index] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Languages className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Tanım çevirisi */}
            {defTranslations[index] && (
              <p className="text-sm mt-2 text-green-700 bg-green-50 p-2 rounded-lg">
                {defTranslations[index]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Örnek Cümle + Çeviri */}
      {wordObj.example && (
        <div className="mt-6 bg-slate-50 p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <p className="text-slate-700 italic">"{wordObj.example}"</p>
            <button
              onClick={handleTranslateSentence}
              className="text-indigo-600 hover:text-indigo-800"
            >
              {loadingSentence ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Languages className="w-5 h-5" />
              )}
            </button>
          </div>

          {sentenceTranslation && (
            <p className="text-sm mt-3 text-green-700 bg-green-50 p-2 rounded-lg">
              {sentenceTranslation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
