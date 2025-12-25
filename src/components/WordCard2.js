import React, { useState, useEffect } from "react";
import { Volume2, Square, Languages, Tag } from "lucide-react";

const WordCard = ({ wordObj }) => {
  const [visibleDefTranslations, setVisibleDefTranslations] = useState({});
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const [playingText, setPlayingText] = useState(null);

  // --- 1. SES & RESET ---
  useEffect(() => {
    window.speechSynthesis.cancel();
    setPlayingText(null);
    setVisibleDefTranslations({});
    setShowSentenceTranslation(false);
    return () => window.speechSynthesis.cancel();
  }, [wordObj]);

  const toggleSpeak = (text, e) => {
    if (e) e.stopPropagation();
    if (!text) return;

    if (playingText === text) {
      window.speechSynthesis.cancel();
      setPlayingText(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingText(null);
      utterance.onerror = () => setPlayingText(null);
      window.speechSynthesis.speak(utterance);
      setPlayingText(text);
    }
  };

  const toggleDefTranslation = (index, e) => {
    if (e) e.stopPropagation();
    setVisibleDefTranslations((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleSentenceTranslation = (e) => {
    if (e) e.stopPropagation();
    setShowSentenceTranslation(!showSentenceTranslation);
  };

  const getShortType = (t) => {
    const map = { noun: "n.", verb: "v.", adjective: "adj.", adverb: "adv.", prep: "prep.", pronoun: "pron.", conj: "conj.", article: "art.", other: "other" };
    return map[t] || t;
  };

  // --- 2. ORTAK BUTON BİLEŞENİ ---
  const ActionButton = ({ icon: Icon, onClick, isActive, title }) => (
    <button
      onClick={onClick}
      title={title}
      style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}
      className={`
        p-2 rounded-full border flex items-center justify-center shrink-0
        focus:outline-none focus:ring-0
        transition-colors duration-200
        ${isActive 
          ? 'bg-indigo-600 text-white border-indigo-600' 
          : 'bg-white text-slate-400 border-slate-200'    
        }
      `}
    >
      <Icon className="w-3.5 h-3.5 fill-current" />
    </button>
  );

  // --- 3. GRAMER SATIRI ---
  const FeatureRow = ({ label, value }) => {
    if (!value) return null;
    const isPlaying = playingText === value;

    return (
      <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
        <div className="flex items-center gap-3 flex-1 mr-2 min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase min-w-[24px] shrink-0">
            {label}
          </span>
          <span className="text-sm font-semibold text-slate-700 break-words leading-tight">
            {value}
          </span>
        </div>
        <div className="shrink-0">
          <ActionButton 
            icon={isPlaying ? Square : Volume2} 
            onClick={(e) => toggleSpeak(value, e)} 
            isActive={isPlaying} 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-lg p-6 text-center border border-slate-100 mb-6 mx-auto transition-shadow duration-300">
      
      {/* 🔥 GÜNCELLEME: ETİKETLER BURAYA TAŞINDI 🔥 
          (absolute, top-4, right-4 ile sağ üste sabitlendi)
      */}
      {wordObj.tags && Array.isArray(wordObj.tags) && wordObj.tags.length > 0 && (
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10 max-w-[80px]">
              {wordObj.tags.map((tag, i) => (
                  <span key={i} className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate max-w-full">
                      {tag}
                  </span>
              ))}
          </div>
      )}

      {/* =============================================
          1. KELİME BAŞLIĞI
          =============================================
      */}
      <div className="flex items-center justify-center gap-3 mb-6 mt-4"> {/* mt-4 ile üstten biraz boşluk verdik */}
        
        {/* SOL: Kelime ve Altında Fonetik */}
        <div className="flex flex-col items-center">
            <h2 className="text-4xl font-extrabold text-slate-800 break-words leading-tight text-center">
                {wordObj.word}
            </h2>
            
            {wordObj.phonetic && (
                <span className="text-slate-400 font-serif italic text-lg -mt-1 tracking-wide">
                    {wordObj.phonetic.replace(/\//g, '')} 
                </span>
            )}
        </div>

        {/* SAĞ: Ses Butonu */}
        <div className="scale-110 shrink-0 self-center ml-2"> 
            <ActionButton 
                icon={playingText === wordObj.word ? Square : Volume2}
                onClick={(e) => toggleSpeak(wordObj.word, e)}
                isActive={playingText === wordObj.word}
            />
        </div>
      </div>

      {/* 2. TANIMLAR */}
      <div className="space-y-4 text-left">
        {wordObj.definitions.map((def, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border transition-colors ${idx === 0 ? "bg-indigo-50/50 border-indigo-100" : "bg-slate-50/50 border-slate-100"}`}>
            
            {/* Tür & Kelime Anlamı */}
            <div className="flex flex-wrap items-baseline gap-2 mb-2">
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${idx === 0 ? "bg-indigo-200 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
                {getShortType(def.type)}
              </span>
              <span className={`font-bold text-lg leading-tight ${idx === 0 ? "text-indigo-900" : "text-slate-700"}`}>
                {def.meaning}
              </span>
            </div>

            {/* İngilizce Açıklama ve Butonlar */}
            {def.engExplanation && (
              <div className="pl-3 border-l-2 border-indigo-200/50">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm italic font-medium leading-relaxed ${idx === 0 ? "text-indigo-600/80" : "text-slate-500"}`}>
                    "{def.engExplanation}"
                  </p>
                  
                  {/* BUTON GRUBU */}
                  <div className="flex gap-1.5 shrink-0 mt-0.5">
                    <ActionButton 
                        icon={playingText === def.engExplanation ? Square : Volume2}
                        onClick={(e) => toggleSpeak(def.engExplanation, e)}
                        isActive={playingText === def.engExplanation}
                    />
                    <ActionButton 
                        icon={Languages}
                        onClick={(e) => toggleDefTranslation(idx, e)}
                        isActive={visibleDefTranslations[idx]}
                    />
                  </div>
                </div>
                
                {/* Gizli Türkçe Açıklama */}
                {visibleDefTranslations[idx] && (
                  <div className="mt-3 pt-2 border-t border-indigo-200/30 animate-in fade-in slide-in-from-top-1">
                      <p className="text-xs text-indigo-800 font-medium bg-white/60 p-2 rounded-lg border border-indigo-100">
                        {def.trExplanation ? `TR: ${def.trExplanation}` : <span className="text-slate-400 italic font-normal">Sistemde çeviri bulunamadı.</span>}
                      </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. GRAMER TABLOSU */}
      {(wordObj.plural || wordObj.v2 || wordObj.v3 || wordObj.vIng || wordObj.thirdPerson) && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-left mt-4 shadow-sm">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-2 border-b border-slate-100 pb-1">Fiil & İsim Çekimleri</div>
          <div className="grid grid-cols-1 gap-y-1">
            <FeatureRow label="Pl." value={wordObj.plural} />
            <FeatureRow label="3rd" value={wordObj.thirdPerson} />
            <FeatureRow label="V2" value={wordObj.v2} />
            <FeatureRow label="V3" value={wordObj.v3} />
            <FeatureRow label="Ing" value={wordObj.vIng} />
          </div>
        </div>
      )}

      {(wordObj.advLy || wordObj.compEr || wordObj.superEst) && (
          <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-left mt-2">
              <div className="text-[10px] uppercase tracking-wide text-orange-400 font-bold mb-2 border-b border-orange-100 pb-1">Sıfat & Zarf Halleri</div>
              <div className="grid grid-cols-1 gap-y-1">
                  <FeatureRow label="Adv." value={wordObj.advLy} />
                  <FeatureRow label="Comp." value={wordObj.compEr} />
                  <FeatureRow label="Super." value={wordObj.superEst} />
              </div>
          </div>
      )}

      {/* 4. ÖRNEK CÜMLE */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Örnek Cümle</div>
          
          {/* BUTON GRUBU */}
          <div className="flex gap-1.5 shrink-0">
             <ActionButton 
                  icon={playingText === wordObj.sentence ? Square : Volume2}
                  onClick={(e) => toggleSpeak(wordObj.sentence, e)}
                  isActive={playingText === wordObj.sentence}
              />
             <ActionButton 
                icon={Languages}
                onClick={toggleSentenceTranslation}
                isActive={showSentenceTranslation}
              />
          </div>
        </div>
        <p className="text-base text-slate-600 italic leading-relaxed text-left">"{wordObj.sentence}"</p>
        
        {/* Gizli Cümle Çevirisi */}
        {showSentenceTranslation && (
          <div className="mt-3 pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-1 text-left">
              <p className="text-slate-800 text-sm font-medium bg-white p-2 rounded-lg border border-slate-100">
                 {wordObj.sentence_tr ? `TR: ${wordObj.sentence_tr}` : <span className="text-slate-400 italic font-normal">Sistemde çeviri bulunamadı.</span>}
              </p>
          </div>
        )}
      </div>

      {/* Eski etiketler alanı silindi */}

    </div>
  );
};

export default WordCard;
