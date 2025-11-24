import React, { useState } from "react";
import { Volume2, Languages, Loader2, Tag } from "lucide-react";
import { simpleTranslate } from "../services/aiService";

const WordCard = ({ wordObj }) => {
  const [sentenceTranslation, setSentenceTranslation] = useState(null);
  const [loadingSentence, setLoadingSentence] = useState(false);

  const [defTranslations, setDefTranslations] = useState({});
  const [loadingDefs, setLoadingDefs] = useState({});

  // SESLİ OKUMA
  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  // CÜMLE ÇEVİRİ
  const handleTranslateSentence = async (e) => {
    e.stopPropagation();
    if (sentenceTranslation) return;

    setLoadingSentence(true);
    const tr = await simpleTranslate(wordObj.sentence);
    setSentenceTranslation(tr);
    setLoadingSentence(false);
  };

  // TANIM (definition) ÇEVİRİ
  const handleTranslateDef = async (index, text, e) => {
    e.stopPropagation();
    if (defTranslations[index]) return;

    setLoadingDefs((prev) => ({ ...prev, [index]: true }));
    const tr = await simpleTranslate(text);

    setDefTranslations((prev) => ({ ...prev, [index]: tr }));
    setLoadingDefs((prev) => ({ ...prev, [index]: false }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 border border-slate-100">
      {/* ÜST KISIM */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">
          {wordObj.word}
        </h2>

        <button
          onClick={(e) => speak(wordObj.word, e)}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition"
        >
          <Volume2 className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* FİİL ÇEKİMLERİ */}
      {(wordObj.plural || wordObj.v2 || wordObj.v3 || wordObj.vIng || wordObj.thirdPerson) && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left space-y-1.5 mt-3">
          <div className="text-xs uppercase text-slate-400 font-bold">
            Fiil / İsim Çekimleri
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700">
            <FeatureRow label="Plural" value={wordObj.plural} />
            <FeatureRow label="3rd P" value={wordObj.thirdPerson} />
            <FeatureRow label="V2" value={wordObj.v2} />
            <FeatureRow label="V3" value={wordObj.v3} />
            <FeatureRow label="V-ing" value={wordObj.vIng} />
          </div>
        </div>
      )}

      {/* TANIMLAR */}
      <div className="mt-4 space-y-3">
        {wordObj.definitions?.map((def, idx) => (
          <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">
                <Tag className="inline w-4 h-4 mr-1 text-indigo-400" />
                {def.type} – {def.engExplanation}
              </span>

              <button
                onClick={(e) => handleTranslateDef(idx, def.engExplanation, e)}
                className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100"
              >
                {loadingDefs[idx] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Languages className="w-4 h-4 text-indigo-500" />
                )}
              </button>
            </div>

            {defTranslations[idx] && (
              <div className="mt-1 bg-indigo-50 border border-indigo-100 p-2 rounded text-sm text-indigo-800">
                TR: {defTranslations[idx]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ÖRNEK CÜMLE */}
      {wordObj.sentence && (
        <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center">
            <p className="italic text-slate-600">{wordObj.sentence}</p>

            <button
              onClick={handleTranslateSentence}
              className="p-2 rounded-lg border bg-white hover:bg-slate-100 transition"
            >
              {loadingSentence ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              ) : (
                <Languages className="w-5 h-5 text-indigo-500" />
              )}
            </button>
          </div>

          {sentenceTranslation && (
            <p className="mt-2 text-slate-800 text-sm font-medium">
              TR: {sentenceTranslation}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WordCard;

const FeatureRow = ({ label, value }) =>
  value ? (
    <div className="flex justify-between">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  ) : null;
