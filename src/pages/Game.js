import React, { useState, useEffect } from "react";
import { Volume2, Languages, Loader2, Tag, Image as LucideImage } from "lucide-react";
import { translateTextWithAI } from "../services/aiService";
import { fetchImageForWord } from "../services/imageService";

const WordCard = ({ wordObj }) => {
  // --- STATE'LER ---
  const [sentenceTranslation, setSentenceTranslation] = useState(null);
  const [loadingSentence, setLoadingSentence] = useState(false);
  
  const [defTranslations, setDefTranslations] = useState({});
  const [loadingDefs, setLoadingDefs] = useState({});
  
  const [imageUrl, setImageUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // --- SIFIRLAMA VE YÜKLEME ---
  useEffect(() => {
    // 1. Temizlik
    setSentenceTranslation(null);
    setDefTranslations({});
    setLoadingSentence(false);
    setLoadingDefs({});
    setImageUrl(null);

    // 2. Resim Getir
    const loadImage = async () => {
        setLoadingImage(true);
        // Eğer services/imageService.js yoksa veya hata verirse uygulama çökmesin diye try-catch
        try {
            const imgData = await fetchImageForWord(wordObj.word);
            if (imgData) setImageUrl(imgData);
        } catch (e) {
            console.error("Resim yüklenemedi:", e);
        }
        setLoadingImage(false);
    };

    loadImage();
  }, [wordObj.word]);

  // --- FONKSİYONLAR ---
  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleTranslateSentence = async (e) => {
    e.stopPropagation();
    if (sentenceTranslation) return;
    setLoadingSentence(true);
    const text = await translateTextWithAI(wordObj.sentence);
    setSentenceTranslation(text);
    setLoadingSentence(false);
  };

  const handleTranslateDef = async (index, text, e) => {
    e.stopPropagation();
    if (defTranslations[index]) return;
    setLoadingDefs((prev) => ({ ...prev, [index]: true }));
    const translated = await translateTextWithAI(text);
    setDefTranslations((prev) => ({ ...prev, [index]: translated }));
    setLoadingDefs((prev) => ({ ...prev, [index]: false }));
  };

  const getShortType = (t) => {
    const map = { 
        noun: "n.", verb: "v.", adjective: "adj.", adverb: "adv.", 
        prep: "prep.", pronoun: "pron.", conj: "conj.", article: "art.", other: "other" 
    };
    return map[t] || t;
  };

  const renderSourceBadge = (source) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${source === "system" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
      {source === "system" ? "Sistem" : "Kullanıcı"}
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
        <button onClick={(e) => speak(value, e)} className="p-1 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors opacity-60 group-hover:opacity-100">
          <Volume2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mb-4 mx-auto">
      
      {/* 1. RESİM ALANI */}
      <div className="w-full h-48 bg-slate-100 relative flex items-center justify-center overflow-hidden">
        {loadingImage && <Loader2 className="w-8 h-8 text-slate-400 animate-spin"/>}
        
        {!loadingImage && !imageUrl && (
            <LucideImage className="w-12 h-12 text-slate-300 opacity-50"/>
        )}
        
        {!loadingImage && imageUrl && (
            <>
            <img src={imageUrl.url} alt={wordObj.word} className="w-full h-full object-cover animate-in fade-in duration-500" />
            <a href={imageUrl.photographerUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-1 right-1 text-[8px] text-white bg-black/50 px-1 rounded opacity-70 hover:opacity-100">
                Photo by {imageUrl.photographer} / Unsplash
            </a>
            </>
        )}
         <div className="absolute top-2 right-2">{renderSourceBadge(wordObj.source)}</div>
      </div>

      {/* 2. KART İÇERİĞİ */}
      <div className="p-6 text-center relative -mt-4 bg-white rounded-t-3xl z-10">
        
        <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-4xl font-extrabold text-slate-800 break-words">{wordObj.word}</h2>
            <button onClick={(e) => speak(wordObj.word, e)} className="p-3 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors">
                <Volume2 className="w-6 h-6" />
            </button>
        </div>

        <div className="space-y-4 text-left">
            
            {/* Anlamlar */}
            {wordObj.definitions.map((def, idx) => (
            <div key={idx} className={`p-3 rounded-xl border ${idx === 0 ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100"}`}>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${idx === 0 ? "bg-indigo-200 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
                        {getShortType(def.type)}
                    </span>
                    <span className={`font-bold text-lg ${idx === 0 ? "text-indigo-900" : "text-slate-700"}`}>{def.meaning}</span>
                </div>
                
                {def.engExplanation && (
                <div className="mt-1 pl-2 border-l-2 border-indigo-200/50 group">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm italic font-medium ${idx === 0 ? "text-indigo-500" : "text-slate-500"}`}>"{def.engExplanation}"</p>
                        <div className="flex gap-1">
                            <button onClick={(e) => speak(def.engExplanation, e)} className="opacity-50 hover:opacity-100 p-1 bg-white rounded-full shadow-sm"><Volume2 className="w-3 h-3 text-indigo-500" /></button>
                            <button onClick={(e) => handleTranslateDef(idx, def.engExplanation, e)} className="opacity-50 hover:opacity-100 p-1 bg-white rounded-full shadow-sm">
                                {loadingDefs[idx] ? <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> : <Languages className="w-3 h-3 text-indigo-500" />}
                            </button>
                        </div>
                    </div>
                    {defTranslations[idx] && <div className="mt-1 text-xs text-indigo-800 bg-indigo-100/50 p-1.5 rounded">TR: {defTranslations[idx]}</div>}
                </div>
                )}
            </div>
            ))}

            {/* Fiil Çekimleri */}
            {(wordObj.plural || wordObj.v2 || wordObj.v3 || wordObj.vIng || wordObj.thirdPerson) && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left space-y-1.5 mt-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1">Fiil & İsim Çekimleri</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700">
                    <FeatureRow label="Plural" value={wordObj.plural} />
                    <FeatureRow label="3rd P" value={wordObj.thirdPerson} />
                    <FeatureRow label="V2" value={wordObj.v2} />
                    <FeatureRow label="V3" value={wordObj.v3} />
                    <FeatureRow label="V-ing" value={wordObj.vIng} />
                </div>
            </div>
            )}

            {/* Sıfat Çekimleri */}
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

            {/* Örnek Cümle */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Örnek Cümle</div>
                    <div className="flex gap-2">
                        <button onClick={handleTranslateSentence} className="p-1.5 bg-white text-indigo-500 rounded-full border border-slate-200 hover:bg-indigo-50 transition-colors">
                            {loadingSentence ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                        </button>
                        <button onClick={(e) => speak(wordObj.sentence, e)} className="p-1.5 bg-white text-indigo-500 rounded-full border border-slate-200 hover:bg-indigo-50 transition-colors">
                            <Volume2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <p className="text-base text-slate-600 italic">"{wordObj.sentence}"</p>
                {sentenceTranslation && <div className="mt-2 pt-2 border-t border-slate-200 animate-in fade-in"><p className="text-slate-800 text-sm font-medium">TR: {sentenceTranslation}</p></div>}
            </div>

            {/* Etiketler */}
            {wordObj.tags && Array.isArray(wordObj.tags) && wordObj.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {wordObj.tags.map((tag, i) => (
                         tag && (
                            <span key={i} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full flex items-center gap-1 border border-slate-200">
                                <Tag className="w-3 h-3 opacity-50"/> {tag}
                            </span>
                         )
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default WordCard;
