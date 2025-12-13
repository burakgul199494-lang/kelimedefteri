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
  const hasGrammar = wordObj.v2 || wordObj.v3 || wordObj.plural || wordObj.vIng;

  // Gramer Kutucuğu
  const GrammarBox = ({ label, value, colorClass }) => {
    const isPlayingThis = playingText === value;
    return (
      <div className={`flex items-center justify-between p-3 rounded-xl border ${colorClass} transition-all hover:shadow-md group/gbox`}>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase opacity-60 tracking-wider">{label}</span>
          <span className="font-bold text-sm text-slate-700">{value}</span>
        </div>
        <button
          onClick={(e) => toggleSpeak(e, value)}
          className={`p-1.5 bg-white rounded-full shadow-sm transition-opacity text-indigo-600 ${isPlayingThis ? 'opacity-100' : 'opacity-0 group-hover/gbox:opacity-100'}`}
        >
          {isPlayingThis ? <Square className="w-3.5 h-3.5 fill-indigo-600" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  };

  return (
    <div 
      onClick={handleFlip} 
      className="w-full cursor-pointer font-sans [perspective:1000px]"
    >
      {/* GRID STACKING + OPACITY SWAP YÖNTEMİ
         Her iki yüzü de aynı hücreye (col-1 row-1) koyuyoruz.
         Dönüş efektini opacity ile destekleyerek karışmayı önlüyoruz.
      */}
      <div className="relative w-full grid grid-cols-1">
        
        {/* ============================== */}
        {/* === ÖN YÜZ (MODERN İNGİLİZCE) === */}
        {/* ============================== */}
        <div 
          className={`
            col-start-1 row-start-1 
            bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 
            transition-all duration-700 ease-in-out min-h-[500px]
            [backface-visibility:hidden]
            ${isFlipped 
              ? "[transform:rotateY(180deg)] opacity-0 pointer-events-none" 
              : "[transform:rotateY(0deg)] opacity-100 z-10"}
          `}
        >
          
          {/* HERO BÖLÜMÜ */}
          <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 p-6 pt-10 text-center shrink-0 flex flex-col items-center justify-center min-h-[180px]">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10 w-full">
              <div className="flex items-center justify-center gap-4 mb-4">
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

              {/* Tagler */}
              <div className="flex flex-wrap justify-center gap-2">
                {wordObj.tags && wordObj.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-black/20 text-white/80 text-[10px] font-bold rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* İÇERİK GÖVDESİ */}
          <div className="flex-1 flex flex-col p-5 gap-4 bg-slate-50/50">
            {/* Tanımlar */}
            <div className="space-y-3">
              {wordObj.definitions && wordObj.definitions.map((def, index) => {
                const isPlayingDef = playingText === def.engExplanation;
                return (
                  <div 
                    key={index} 
                    className={`relative p-4 rounded-2xl border transition-all ${
                      index === 0 
                        ? 'bg-white border-indigo-100 shadow-sm' 
                        : 'bg-slate-50 border-slate-100 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        index === 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {def.type || `Def ${index + 1}`}
                      </span>
                      <button
                        onClick={(e) => toggleSpeak(e, def.engExplanation)}
                        className={`transition-colors ${isPlayingDef ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`}
                      >
                         {isPlayingDef ? <Square className="w-4 h-4 fill-indigo-600" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-slate-700 font-medium leading-relaxed">
                      "{def.engExplanation || 'No definition.'}"
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Gramer Grid */}
            {hasGrammar && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {wordObj.plural && <GrammarBox label="Plural" value={wordObj.plural} colorClass="bg-pink-50 border-pink-100 text-pink-700" />}
                {wordObj.v2 && <GrammarBox label="Past (V2)" value={wordObj.v2} colorClass="bg-orange-50 border-orange-100 text-orange-700" />}
                {wordObj.v3 && <GrammarBox label="Perfect (V3)" value={wordObj.v3} colorClass="bg-emerald-50 border-emerald-100 text-emerald-700" />}
                {wordObj.vIng && <GrammarBox label="Gerund" value={wordObj.vIng} colorClass="bg-sky-50 border-sky-100 text-sky-700" />}
              </div>
            )}

            {/* Örnek Cümle */}
            <div className="relative bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm group/sentence mt-2">
               <Quote className="absolute top-3 left-3 w-4 h-4 text-indigo-200" />
               <div className="pl-6 pr-8">
                 <p className="text-slate-600 italic text-sm leading-relaxed font-medium">
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
            
            <div className="h-4"></div>
          </div>

          {/* Footer Uyarısı */}
          <div className="py-2 bg-white border-t border-slate-100 flex justify-center items-center text-xs text-slate-400 font-semibold gap-1 mt-auto rounded-b-3xl">
            <RotateCw className="w-3 h-3 animate-spin-slow" />
            <span>Türkçesi için dokun</span>
          </div>

        </div>

        {/* ============================== */}
        {/* === ARKA YÜZ (MODERN TÜRKÇE) === */}
        {/* ============================== */}
        <div 
          className={`
            col-start-1 row-start-1 
            bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700
            transition-all duration-700 ease-in-out min-h-[500px]
            [backface-visibility:hidden]
            ${isFlipped 
              ? "[transform:rotateY(0deg)] opacity-100 z-10" 
              : "[transform:rotateY(-180deg)] opacity-0 pointer-events-none"}
          `}
        >
          
          {/* Header */}
          <div className="p-6 bg-slate-800 border-b border-slate-700/50 text-center shrink-0">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2 block">Türkçe Karşılıkları</span>
            <div className="w-12 h-1 bg-indigo-500 mx-auto rounded-full"></div>
          </div>

          {/* Tanımlar Listesi */}
          <div className="flex-1 p-5 space-y-4">
             {wordObj.definitions && wordObj.definitions.map((def, index) => (
                <div key={index} className="flex gap-4 group/tr">
                  <div className="flex flex-col items-center gap-1 mt-1">
                     <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-600'}`}></div>
                     <div className="w-0.5 h-full bg-slate-800 group-last/tr:hidden min-h-[20px]"></div>
                  </div>
                  <div className="flex-1 pb-4">
                     <h3 className={`text-xl font-bold ${index === 0 ? 'text-white' : 'text-slate-400'}`}>
                       {def.meaning}
                     </h3>
                     {def.trExplanation && (
                       <p className="text-sm text-slate-400 mt-1 leading-relaxed border-l-2 border-slate-700 pl-3">
                         {def.trExplanation}
                       </p>
                     )}
                  </div>
                </div>
             ))}
          </div>

          {/* Footer Çeviri */}
          <div className="bg-slate-800/50 p-5 backdrop-blur-sm border-t border-slate-700 mt-auto">
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
