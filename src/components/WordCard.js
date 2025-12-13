import React, { useState, useEffect } from "react";
import { Volume2, Square, RotateCw, Quote } from "lucide-react";

export default function WordCard({ wordObj }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [playingText, setPlayingText] = useState(null);

  // 1. Kelime değişince resetle
  useEffect(() => {
    window.speechSynthesis.cancel();
    setPlayingText(null);
    setIsFlipped(false);
  }, [wordObj]);

  // 2. Ses Fonksiyonu
  const toggleSpeak = (e, text) => {
    e.stopPropagation();
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

  const handleFlip = () => setIsFlipped(!isFlipped);

  // Sadece ilk tanımı alıyoruz
  const mainDefinition = wordObj.definitions && wordObj.definitions[0];

  return (
    <div 
      onClick={handleFlip} 
      className="w-full cursor-pointer font-sans [perspective:1000px]"
    >
      <div className="relative w-full transition-all duration-500 ease-in-out [transform-style:preserve-3d]">
        
        {/* ============================== */}
        {/* === ÖN YÜZ (SADELEŞTİRİLMİŞ İNGİLİZCE) === */}
        {/* ============================== */}
        <div 
          className={`
            w-full bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 
            transition-all duration-500 ease-in-out
            [backface-visibility:hidden]
            ${
              isFlipped 
                ? "absolute top-0 left-0 opacity-0 pointer-events-none [transform:rotateY(180deg)]" 
                : "relative opacity-100 z-10 [transform:rotateY(0deg)] min-h-[400px]"
            }
          `}
        >
          
          {/* HERO BÖLÜMÜ (Etiketsiz, sadece kelime) */}
          <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 p-6 flex flex-col items-center justify-center min-h-[160px] text-center shrink-0">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10 w-full flex items-center justify-center gap-4">
              <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-md break-words">
                {wordObj.word}
              </h1>
              <button
                onClick={(e) => toggleSpeak(e, wordObj.word)}
                className="p-3 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-full backdrop-blur-md transition-all active:scale-90 shrink-0"
              >
                {playingText === wordObj.word ? <Square className="w-6 h-6 fill-current" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* İÇERİK GÖVDESİ */}
          <div className="flex-1 flex flex-col p-6 gap-5 bg-slate-50/50 justify-center">
            
            {/* 1. Tek Tanım (Definition) */}
            {mainDefinition && (
              <div className={`relative p-5 rounded-2xl border bg-white border-indigo-100 shadow-sm`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
                    Definition
                  </span>
                  <button
                    onClick={(e) => toggleSpeak(e, mainDefinition.engExplanation)}
                    className={`transition-colors ${playingText === mainDefinition.engExplanation ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`}
                  >
                     {playingText === mainDefinition.engExplanation ? <Square className="w-4 h-4 fill-indigo-600" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-slate-700 font-medium text-lg leading-relaxed">
                  "{mainDefinition.engExplanation || 'No definition.'}"
                </p>
              </div>
            )}

            {/* 2. Örnek Cümle */}
            <div className="relative bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm group/sentence">
               <Quote className="absolute top-4 left-4 w-4 h-4 text-indigo-200" />
               <div className="pl-6 pr-8">
                 <p className="text-slate-600 italic text-base leading-relaxed font-medium">
                   "{wordObj.sentence}"
                 </p>
                 <button
                    onClick={(e) => toggleSpeak(e, wordObj.sentence)}
                    className={`absolute bottom-3 right-3 p-1.5 bg-indigo-50 text-indigo-500 rounded-full transition-all hover:bg-indigo-100 ${playingText === wordObj.sentence ? 'opacity-100' : 'opacity-0 group-hover/sentence:opacity-100'}`}
                  >
                    {playingText === wordObj.sentence ? <Square className="w-4 h-4 fill-indigo-500" /> : <Volume2 className="w-4 h-4" />}
                  </button>
               </div>
            </div>
            
          </div>

          {/* Footer Uyarısı */}
          <div className="py-3 bg-white border-t border-slate-100 flex justify-center items-center text-xs text-slate-400 font-semibold gap-1 mt-auto rounded-b-3xl">
            <RotateCw className="w-3 h-3 animate-spin-slow" />
            <span>Türkçesi için dokun</span>
          </div>

        </div>

        {/* ============================== */}
        {/* === ARKA YÜZ (SADELEŞTİRİLMİŞ TÜRKÇE) === */}
        {/* ============================== */}
        <div 
          className={`
            w-full bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700
            transition-all duration-500 ease-in-out
            [backface-visibility:hidden]
            ${
              isFlipped 
                ? "relative opacity-100 z-10 [transform:rotateY(0deg)] min-h-[400px]" 
                : "absolute top-0 left-0 opacity-0 pointer-events-none [transform:rotateY(-180deg)]"
            }
          `}
        >
          
          {/* Header */}
          <div className="p-6 bg-slate-800 border-b border-slate-700/50 text-center shrink-0">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2 block">Türkçe Karşılığı</span>
            <div className="w-12 h-1 bg-indigo-500 mx-auto rounded-full"></div>
          </div>

          {/* Ana İçerik */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center gap-6">
             {mainDefinition && (
                <div>
                   <h3 className="text-3xl font-bold text-white mb-3">
                     {mainDefinition.meaning}
                   </h3>
                   {mainDefinition.trExplanation && (
                     <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto border-t border-slate-700 pt-3">
                       {mainDefinition.trExplanation}
                     </p>
                   )}
                </div>
             )}
          </div>

          {/* Footer Çeviri */}
          <div className="bg-slate-800/50 p-6 backdrop-blur-sm border-t border-slate-700 mt-auto">
            {wordObj.sentence_tr && (
               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative">
                  <div className="absolute -top-2.5 left-4 bg-slate-700 px-2 py-0.5 rounded text-[10px] text-indigo-300 font-bold uppercase">Çeviri</div>
                  <p className="text-slate-300 italic text-sm">"{wordObj.sentence_tr}"</p>
               </div>
            )}
             <div className="mt-4 flex justify-center items-center text-xs text-slate-500 font-semibold gap-1">
              <RotateCw className="w-3 h-3" />
              <span>İngilizceye dön</span>
            </div>
          </div>

        </div>

      </div>
      
      <style jsx>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
