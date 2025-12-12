import React, { useState } from "react";
import { Volume2, Languages, Tag } from "lucide-react"; 

const WordCard = ({ wordObj }) => {
  // Tanım çevirileri için state
  const [openTranslations, setOpenTranslations] = useState({});
  // Cümle çevirisi için state (YENİ)
  const [showSentenceTr, setShowSentenceTr] = useState(false);

  const toggleTranslation = (idx) => {
    setOpenTranslations(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const getShortType = (t) => {
    const map = { noun: "n.", verb: "v.", adjective: "adj.", adverb: "adv.", prep: "prep.", pronoun: "pron.", conj: "conj.", article: "art.", other: "other" };
    return map[t] || t;
  };

  const renderSourceBadge = (source) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${source === "system" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
      {source === "system" ? "Sistem" : "Kullanıcı"}
    </span>
  );

  // --- DÜZELTİLEN BİLEŞEN: FeatureRow ---
  // Sorun: "truncate" metni kesiyordu ve mobilde sığmıyordu.
  // Çözüm: "break-words" ve "whitespace-normal" ile alt satıra geçmesini sağladık.
  const FeatureRow = ({ label, value }) => {
    if (!value) return null;
    return (
      <div className="flex items-start justify-between group py-1">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 min-w-0 flex-1">
          <span className="font-semibold text-slate-500 shrink-0 text-xs sm:text-sm">{label}:</span>
          {/* break-words ve whitespace-normal sayesinde uzun kelimeler alt satıra iner */}
          <span className="break-words whitespace-normal text-slate-800 font-medium leading-tight text-left">
            {value}
          </span>
        </div>
        
        {/* Butonun ezilmemesi için shrink-0 ve margin ekledik */}
        <button 
            onClick={(e) => speak(value, e)} 
            className="ml-2 p-1 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors opacity-60 group-hover:opacity-100 shrink-0" 
            title="Oku"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 text-center border border-slate-100 mb-4 mx-auto">
      
      {/* Üst Kısım: Kaynak ve Kelime */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Kelime</span>
        {renderSourceBadge(wordObj.source)}
      </div>
      
      <div className="flex items-center justify-center gap-3 mb-4">
        <h2 className="text-4xl font-extrabold text-slate-800 break-words">{wordObj.word}</h2>
        <button onClick={(e) => speak(wordObj.word, e)} className="p-3 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors">
          <Volume2 className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4 text-left">
        
        {/* --- ANLAMLAR --- */}
        {wordObj.definitions.map((def, idx) => (
          <div key={idx} className={`p-3 rounded-xl border ${idx === 0 ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${idx === 0 ? "bg-indigo-200 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
                {getShortType(def.type)}
              </span>
              <span className={`font-bold text-lg leading-tight ${idx === 0 ? "text-indigo-900" : "text-slate-700"}`}>{def.meaning}</span>
            </div>
            
            {def.engExplanation && (
              <div className="mt-1 pl-2 border-l-2 border-indigo-200/50 group">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm italic font-medium ${idx === 0 ? "text-indigo-500" : "text-slate-500"}`}>"{def.engExplanation}"</p>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={(e) => speak(def.engExplanation, e)} className="opacity-50 hover:opacity-100 p-1 bg-white rounded-full shadow-sm">
                        <Volume2 className="w-3 h-3 text-indigo-500" />
                    </button>
                    {/* Tanım Çevirisi Butonu */}
                    {def.trExplanation && (
                        <button onClick={() => toggleTranslation(idx)} className={`p-1 rounded-full shadow-sm transition-colors ${openTranslations[idx] ? "bg-indigo-100 text-indigo-600" : "bg-white text-slate-400 hover:text-indigo-500"}`}>
                            <Languages className="w-3 h-3" />
                        </button>
                    )}
                  </div>
                </div>
                
                {/* Tanım Çevirisi Gösterimi */}
                {openTranslations[idx] && def.trExplanation && (
                    <div className="mt-2 text-xs text-indigo-800 bg-indigo-100/50 p-2 rounded animate-in fade-in slide-in-from-top-1 border border-indigo-100">
                        <span className="font-bold mr-1">TR:</span>{def.trExplanation}
                    </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* --- GRAMER DETAYLARI (Wrap Düzenlemesi Yapıldı) --- */}
        {(wordObj.plural || wordObj.v2 || wordObj.v3 || wordObj.vIng || wordObj.thirdPerson) && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left space-y-1.5 mt-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1">Fiil & İsim Çekimleri</div>
            {/* Grid yapısını koruduk ama FeatureRow içinde wrap sağladık */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700">
              <FeatureRow label="Plural" value={wordObj.plural} />
              <FeatureRow label="3rd P" value={wordObj.thirdPerson} />
              <FeatureRow label="V2" value={wordObj.v2} />
              <FeatureRow label="V3" value={wordObj.v3} />
              <FeatureRow label="V-ing" value={wordObj.vIng} />
            </div>
          </div>
        )}

        {(wordObj.advLy || wordObj.compEr || wordObj.superEst) && (
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-left space-y-1.5 mt-2">
                <div className="text-[10px] uppercase tracking-wide text-orange-400 font-bold mb-1">Sıfat & Zarf Halleri</div>
                <div className="text-sm text-slate-700 space-y-1">
                    <FeatureRow label="Zarf" value={wordObj.advLy} />
                    <FeatureRow label="Comp" value={wordObj.compEr} />
                    <FeatureRow label="Super" value={wordObj.superEst} />
                </div>
            </div>
        )}

        {/* --- ÖRNEK CÜMLE (Çeviri Toggle Eklendi) --- */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Örnek Cümle</div>
            <div className="flex gap-1">
                <button onClick={(e) => speak(wordObj.sentence, e)} className="p-1.5 bg-white text-indigo-500 rounded-full border border-slate-200 hover:bg-indigo-50 transition-colors">
                  <Volume2 className="w-4 h-4" />
                </button>
                {/* Cümle Çeviri Butonu */}
                {wordObj.sentence_tr && (
                    <button 
                        onClick={() => setShowSentenceTr(!showSentenceTr)} 
                        className={`p-1.5 rounded-full border transition-colors ${showSentenceTr ? "bg-indigo-100 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-400 hover:text-indigo-500"}`}
                    >
                        <Languages className="w-4 h-4" />
                    </button>
                )}
            </div>
          </div>
          
          <p className="text-base text-slate-700 italic leading-relaxed">"{wordObj.sentence}"</p>
          
          {/* Cümle Çevirisi (Varsayılan Gizli) */}
          {showSentenceTr && wordObj.sentence_tr && (
             <div className="mt-2 pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-1">
                <p className="text-slate-800 text-sm font-medium bg-white p-2 rounded-lg border border-slate-100 text-center">
                    {wordObj.sentence_tr}
                </p>
             </div>
          )}
        </div>

        {/* ETİKETLER */}
        {wordObj.tags && Array.isArray(wordObj.tags) && wordObj.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {wordObj.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full flex items-center gap-1 border border-slate-200">
                        <Tag className="w-3 h-3 opacity-50"/> {tag}
                    </span>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};

export default WordCard;
