import React, { useState, useEffect } from "react";
import { Volume2, Square, Languages, Tag } from "lucide-react";

const WordCard = ({ wordObj }) => {
  // --- STATE'LER ---
  const [visibleDefTranslations, setVisibleDefTranslations] = useState({});
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  
  // Ses kontrolü için state
  const [playingText, setPlayingText] = useState(null);

  // 1. KELİME DEĞİŞTİĞİNDE veya SAYFA KAPANDIĞINDA SESİ DURDUR
  useEffect(() => {
    window.speechSynthesis.cancel();
    setPlayingText(null);
    setVisibleDefTranslations({}); // Yeni kelime gelince çevirileri kapat
    setShowSentenceTranslation(false);

    // Cleanup (Temizlik) fonksiyonu
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [wordObj]);

  // 2. GELİŞMİŞ SES FONKSİYONU (AÇ/KAPA)
  const toggleSpeak = (text, e) => {
    if (e) e.stopPropagation();
    if (!text) return;

    if (playingText === text) {
      // Çalıyorsa DURDUR
      window.speechSynthesis.cancel();
      setPlayingText(null);
    } else {
      // Çalmıyorsa BAŞLAT
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

  // Çeviri Aç/Kapa Fonksiyonları
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

  // --- GÜNCELLENMİŞ GRAMER SATIRI (UZUN KELİME SORUNU ÇÖZÜLDÜ) ---
  const FeatureRow = ({ label, value }) => {
    if (!value) return null;
    const isPlaying = playingText === value;

    return (
      <div className="flex items-start justify-between group py-1 border-b border-slate-50 last:border-0">
        <div className="flex flex-col text-left mr-2 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
          {/* break-words: Uzun kelime varsa alt satıra geçer, butonu ezmez */}
          <span className="text-sm font-semibold text-slate-700 break-words leading-tight">{value}</span>
        </div>
        <button 
          onClick={(e) => toggleSpeak(value, e)} 
          className={`shrink-0 p-1.5 rounded-full transition-colors focus:outline-none ${isPlaying ? 'bg-indigo-100 text-indigo-600 opacity-100' : 'text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 opacity-60 group-hover:opacity-100'}`} 
          title="Oku"
        >
           {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-lg p-6 text-center border border-slate-100 mb-6 mx-auto hover:shadow-xl transition-shadow duration-300">
      
      {/* HEADER KALDIRILDI, DİREKT KELİME İLE BAŞLIYORUZ */}
      
      {/* 1. KELİME & ANA SES */}
      <div className="flex items-center justify-center gap-4 mb-6 mt-2">
        <h2 className="text-4xl font-extrabold text-slate-800 break-words leading-tight text-left">
            {wordObj.word}
        </h2>
        <button 
            onClick={(e) => toggleSpeak(wordObj.word, e)} 
            className="shrink-0 p-3 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors focus:outline-none"
        >
          {playingText === wordObj.word ? <Square className="w-6 h-6 fill-current" /> : <Volume2 className="w-6 h-6" />}
        </button>
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

            {/* İngilizce Açıklama */}
            {def.engExplanation && (
              <div className="pl-3 border-l-2 border-indigo-200/50 group">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm italic font-medium leading-relaxed ${idx === 0 ? "text-indigo-600/80" : "text-slate-500"}`}>
                    "{def.engExplanation}"
                  </p>
                  
                  {/* Buton Grubu */}
                  <div className="flex gap-1 shrink-0 ml-1">
                    {/* Oku */}
                    <button 
                        onClick={(e) => toggleSpeak(def.engExplanation, e)} 
                        className={`p-1.5 rounded-full focus:outline-none ${playingText === def.engExplanation ? 'text-indigo-600 bg-indigo-100' : 'text-slate-400 hover:text-indigo-500 hover:bg-white'}`}
                    >
                        {playingText === def.engExplanation ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    {/* Çeviri */}
                    <button 
                      onClick={(e) => toggleDefTranslation(idx, e)} 
                      className={`p-1.5 rounded-full focus:outline-none transition-all ${visibleDefTranslations[idx] ? 'text-indigo-600 bg-indigo-100' : 'text-slate-400 hover:text-indigo-500 hover:bg-white'}`}
                      title="Çeviriyi Göster"
                    >
                        <Languages className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                {/* Gizli Türkçe Açıklama */}
                {visibleDefTranslations[idx] && (
                  <div className="mt-2 pt-2 border-t border-indigo-200/30 animate-in fade-in slide-in-from-top-1">
                     <p className="text-xs text-indigo-800 font-medium bg-white/60 p-2 rounded-lg border border-indigo-100">
                        {def.trExplanation ? `TR: ${def.trExplanation}` : <span className="text-slate-400 italic font-normal">Sistemde çeviri bulunamadı.</span>}
                     </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* 3. GRAMER TABLOSU (Responsive & Buton Çakışması Engellendi) */}
        {(wordObj.plural || wordObj.v2 || wordObj.v3 || wordObj.vIng || wordObj.thirdPerson) && (
          <div className="bg-white p-3 rounded-2xl border border-slate-200 text-left mt-4 shadow-sm">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-2 border-b border-slate-100 pb-1">Fiil & İsim Çekimleri</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FeatureRow label="Plural" value={wordObj.plural} />
              <FeatureRow label="3rd Person" value={wordObj.thirdPerson} />
              <FeatureRow label="V2 (Past)" value={wordObj.v2} />
              <FeatureRow label="V3 (Perfect)" value={wordObj.v3} />
              <FeatureRow label="V-ing" value={wordObj.vIng} />
            </div>
          </div>
        )}

        {(wordObj.advLy || wordObj.compEr || wordObj.superEst) && (
            <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100 text-left mt-2">
                <div className="text-[10px] uppercase tracking-wide text-orange-400 font-bold mb-2 border-b border-orange-100 pb-1">Sıfat & Zarf Halleri</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <FeatureRow label="Zarf" value={wordObj.advLy} />
                    <FeatureRow label="Comp." value={wordObj.compEr} />
                    <FeatureRow label="Super." value={wordObj.superEst} />
                </div>
            </div>
        )}

        {/* 4. ÖRNEK CÜMLE */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Örnek Cümle</div>
            <div className="flex gap-2">
               {/* Çeviri Butonu */}
               <button 
                  onClick={toggleSentenceTranslation} 
                  className={`p-1.5 rounded-full border transition-colors focus:outline-none ${showSentenceTranslation ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'bg-white text-slate-400 border-slate-200 hover:text-indigo-500'}`}
                  title="Çeviriyi Göster"
                >
                  <Languages className="w-4 h-4" />
                </button>
                {/* Oku Butonu */}
                <button 
                    onClick={(e) => toggleSpeak(wordObj.sentence, e)} 
                    className={`p-1.5 rounded-full border transition-colors focus:outline-none ${playingText === wordObj.sentence ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-500 border-slate-200 hover:bg-indigo-50'}`}
                >
                  {playingText === wordObj.sentence ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                </button>
            </div>
          </div>
          <p className="text-base text-slate-600 italic leading-relaxed">"{wordObj.sentence}"</p>
          
          {/* Gizli Cümle Çevirisi */}
          {showSentenceTranslation && (
            <div className="mt-3 pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-1">
                <p className="text-slate-800 text-sm font-medium bg-white p-2 rounded-lg border border-slate-100">
                   {wordObj.sentence_tr ? `TR: ${wordObj.sentence_tr}` : <span className="text-slate-400 italic font-normal">Sistemde çeviri bulunamadı.</span>}
                </p>
            </div>
          )}
        </div>

        {/* 5. ETİKETLER */}
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
