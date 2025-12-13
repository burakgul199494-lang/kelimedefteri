import React, { useState, useEffect } from "react";
import { Volume2, Square, RotateCw, Quote } from "lucide-react";

export default function WordCard({ wordObj }) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Hangi metnin çaldığını takip etmek için state (null ise çalmıyor demektir)
  const [playingText, setPlayingText] = useState(null);

  // 1. KELİME DEĞİŞTİĞİNDE SESİ KES
  useEffect(() => {
    window.speechSynthesis.cancel();
    setPlayingText(null);
    setIsFlipped(false); // Yeni kelime gelince kartı da ön yüze çevir
  }, [wordObj]);

  // 2. SES AÇ/KAPA (TOGGLE) FONKSİYONU
  const toggleSpeak = (e, text) => {
    e.stopPropagation(); // Kartın dönmesini engelle
    if (!text) return;

    // Eğer şu an bu metin çalıyorsa -> DURDUR
    if (playingText === text) {
      window.speechSynthesis.cancel();
      setPlayingText(null);
    } 
    // Çalmıyorsa veya başka bir şey çalıyorsa -> YENİSİNİ ÇAL
    else {
      window.speechSynthesis.cancel(); // Öncekini sustur
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      
      // Okuma bittiğinde ikonu eski haline getir
      utterance.onend = () => {
        setPlayingText(null);
      };
      
      // Hata olursa veya kesilirse de ikonu düzelt
      utterance.onerror = () => {
        setPlayingText(null);
      };

      window.speechSynthesis.speak(utterance);
      setPlayingText(text);
    }
  };

  const handleFlip = () => setIsFlipped(!isFlipped);

  const hasGrammar = wordObj.v2 || wordObj.v3 || wordObj.plural || wordObj.vIng;

  // Gramer Kutucuğu Bileşeni
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
      className="group w-full h-[620px] cursor-pointer [perspective:1000px] font-sans"
    >
      <div
        className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        
        {/* ============================== */}
        {/* === ÖN YÜZ (MODERN İNGİLİZCE) === */}
        {/* ============================== */}
        <div className="absolute inset-0 w-full h-full bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden [backface-visibility:hidden] border border-slate-100">
          
          {/* 1. HERO BÖLÜMÜ (Kelime) */}
          <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 p-6 pt-10 text-center shrink-0 flex flex-col items-center justify-center min-h-[180px]">
            {/* Arka plan dekoru */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="relative z-10 w-full">
              
              {/* Kelime ve Ana Ses Butonu */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-md">
                  {wordObj.word}
                </h1>
                <button
                  onClick={(e) => toggleSpeak(e, wordObj.word)}
                  className="p-3 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-full backdrop-blur-md transition-all active:scale-90"
                >
                  {playingText === wordObj.word ? (
                    <Square className="w-6 h-6 fill-current" /> // Durdur İkonu
                  ) : (
                    <Volume2 className="w-6 h-6" /> // Oku İkonu
                  )}
                </button>
              </div>

              {/* Tagler (Kelimenin ALTINA alındı ve küçültüldü) */}
              <div className="flex justify-center gap-2">
                {wordObj.tags && wordObj.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-black/20 text-white/80 text-[10px] font-bold rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/10">
                    {tag}
                  </span>
                ))}
              </div>

            </div>
          </div>

          {/* 2. İÇERİK GÖVDESİ */}
          <div className="flex-1 flex flex-col p-5 gap-4 overflow-hidden bg-slate-50/50">
            
            {/* A. Tanımlar (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
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

            {/* B. Gramer Grid (Varsa) */}
            {hasGrammar && (
              <div className="grid grid-cols-2 gap-2 shrink-0 animate-in slide-in-from-bottom-2">
                {wordObj.plural && <GrammarBox label="Plural" value={wordObj.plural} colorClass="bg-pink-50 border-pink-100 text-pink-700" />}
                {wordObj.v2 && <GrammarBox label="Past (V2)" value={wordObj.v2} colorClass="bg-orange-50 border-orange-100 text-orange-700" />}
                {wordObj.v3 && <GrammarBox label="Perfect (V3)" value={wordObj.v3} colorClass="bg-emerald-50 border-emerald-100 text-emerald-700" />}
                {wordObj.vIng && <GrammarBox label="Gerund" value={wordObj.vIng} colorClass="bg-sky-50 border-sky-100 text-sky-700" />}
              </div>
            )}

            {/* C. Örnek Cümle */}
            <div className="relative bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm shrink-0 group/sentence">
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

          </div>

          {/* Footer Uyarısı */}
          <div className="py-2 bg-white border-t border-slate-100 flex justify-center items-center text-xs text-slate-400 font-semibold gap-1">
            <RotateCw className="w-3 h-3 animate-spin-slow" />
            <span>Türkçesi için dokun</span>
          </div>

        </div>

        {/* ============================== */}
        {/* === ARKA YÜZ (MODERN TÜRKÇE) === */}
        {/* ============================== */}
        <div className="absolute inset-0 w-full h-full bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] border border-slate-700">
          
          {/* Header */}
          <div className="p-6 bg-slate-800 border-b border-slate-700/50 text-center shrink-0">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2 block">Türkçe Karşılıkları</span>
            <div className="w-12 h-1 bg-indigo-500 mx-auto rounded-full"></div>
          </div>

          {/* Tanımlar Listesi */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
             {wordObj.definitions && wordObj.definitions.map((def, index) => (
                <div key={index} className="flex gap-4 group/tr">
                  <div className="flex flex-col items-center gap-1 mt-1">
                     <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-600'}`}></div>
                     <div className="w-0.5 h-full bg-slate-800 group-last/tr:hidden"></div>
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
          <div className="bg-slate-800/50 p-5 backdrop-blur-sm border-t border-slate-700 shrink-0">
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
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .group:hover .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #94a3b8; }
      `}</style>
    </div>
  );
}
