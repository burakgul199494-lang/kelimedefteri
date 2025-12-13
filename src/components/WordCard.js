import React, { useState } from "react";
import { Volume2, RotateCw, BookOpen } from "lucide-react";

export default function WordCard({ wordObj }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Genel Okuma Fonksiyonu
  const speakText = (e, text) => {
    e.stopPropagation(); // Kartın dönmesini engeller
    if (!text) return;
    
    window.speechSynthesis.cancel(); // Önceki sesi durdur
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Gramer var mı kontrolü
  const hasGrammar = wordObj.v2 || wordObj.v3 || wordObj.plural || wordObj.vIng;

  // Gramer etiketlerini oluşturmak için yardımcı fonksiyon
  const renderGrammarTag = (label, value) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-1 pl-2 pr-1 py-1 bg-slate-50 rounded border border-slate-200 text-slate-600 group/tag hover:border-indigo-200 transition-colors">
        <span className="text-[9px] text-slate-400 font-bold uppercase mr-0.5">{label}:</span>
        <span className="font-bold text-xs">{value}</span>
        <button
          onClick={(e) => speakText(e, value)}
          className="p-1 ml-1 bg-white hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-full shadow-sm transition-colors"
          title={`${label} halini dinle`}
        >
          <Volume2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div 
      onClick={handleFlip} 
      className="group w-full h-[550px] cursor-pointer [perspective:1000px]"
    >
      <div
        className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] shadow-xl rounded-2xl ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        
        {/* ============================== */}
        {/* === ÖN YÜZ (İNGİLİZCE) ======= */}
        {/* ============================== */}
        <div className="absolute inset-0 w-full h-full bg-white rounded-2xl p-4 flex flex-col [backface-visibility:hidden] border-2 border-indigo-50 overflow-hidden">
          
          {/* 1. BAŞLIK ALANI (Sabit) */}
          <div className="text-center border-b border-slate-100 pb-2 mb-2 shrink-0">
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                {wordObj.word}
              </h2>
              <button
                onClick={(e) => speakText(e, wordObj.word)}
                className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full transition-colors active:scale-95"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            {/* Tagler */}
            <div className="flex justify-center gap-2 mt-1">
               {wordObj.tags && wordObj.tags.map((tag, i) => (
                 <span key={i} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded uppercase border border-slate-200">
                   {tag}
                 </span>
               ))}
            </div>
          </div>

          {/* 2. TANIMLAR LİSTESİ (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {wordObj.definitions && wordObj.definitions.map((def, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-xl border relative group/item transition-colors ${index === 0 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}
              >
                {/* Tür Etiketi ve Ses */}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${index === 0 ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {def.type || (index + 1)}
                  </span>
                  <button
                    onClick={(e) => speakText(e, def.engExplanation)}
                    className="p-1.5 bg-white rounded-full shadow-sm hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-colors"
                    title="Bu tanımı dinle"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {/* İngilizce Açıklama */}
                <p className={`font-medium leading-snug ${index === 0 ? 'text-slate-800 text-base' : 'text-slate-600 text-sm'}`}>
                  "{def.engExplanation || 'No definition available.'}"
                </p>
              </div>
            ))}
          </div>

          {/* 3. ALT BİLGİLER (Gramer & Örnek - Sabit) */}
          <div className="mt-2 pt-2 border-t border-slate-100 shrink-0 space-y-2">
            
            {/* --- GÜNCELLENEN KISIM: Gramer Butonları --- */}
            {hasGrammar && (
              <div className="flex flex-wrap justify-center gap-2">
                {renderGrammarTag('Plural', wordObj.plural)}
                {renderGrammarTag('V2', wordObj.v2)}
                {renderGrammarTag('V3', wordObj.v3)}
                {renderGrammarTag('V-Ing', wordObj.vIng)}
              </div>
            )}

            {/* Örnek Cümle */}
            <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 flex items-start gap-2">
               <button
                  onClick={(e) => speakText(e, wordObj.sentence)}
                  className="mt-0.5 p-1 bg-white text-indigo-500 rounded-full shadow-sm hover:bg-indigo-50 shrink-0"
                  title="Cümleyi Dinle"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
               <p className="text-sm italic text-slate-600 leading-tight">
                 "{wordObj.sentence}"
               </p>
            </div>
            
            <div className="text-[10px] text-center text-slate-300 font-medium flex items-center justify-center gap-1">
              <RotateCw className="w-3 h-3" /> Türkçesi için tıkla
            </div>
          </div>
        </div>

        {/* ============================== */}
        {/* === ARKA YÜZ (TÜRKÇE) ======== */}
        {/* ============================== */}
        <div className="absolute inset-0 w-full h-full bg-slate-800 text-white rounded-2xl p-4 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-slate-700 overflow-hidden">
          
          <div className="text-center py-2 shrink-0 border-b border-slate-700">
             <span className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Türkçe Karşılıkları</span>
          </div>

          {/* Türkçe Tanımlar Listesi (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar py-2">
            {wordObj.definitions && wordObj.definitions.map((def, index) => (
              <div key={index} className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-1.5 rounded ${index === 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-600 text-slate-400'}`}>
                    {def.type || (index + 1)}
                  </span>
                  <h3 className="text-lg font-bold text-white leading-none">
                    {def.meaning}
                  </h3>
                </div>
                {def.trExplanation && (
                  <p className="text-sm text-slate-300 leading-snug border-t border-slate-600/50 pt-1 mt-1">
                    {def.trExplanation}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Alt Kısım */}
          <div className="mt-auto shrink-0 pt-2 border-t border-slate-700 space-y-2">
             {wordObj.sentence_tr && (
              <div className="w-full text-center px-2 py-2 bg-slate-900/30 rounded-lg">
                <div className="text-[9px] text-indigo-300/50 font-bold uppercase mb-0.5">Örnek Çeviri</div>
                <p className="text-slate-300 italic text-sm">
                  "{wordObj.sentence_tr}"
                </p>
              </div>
            )}
            
             <div className="text-[10px] text-center text-slate-500 font-medium flex items-center justify-center gap-1">
              <RotateCw className="w-3 h-3" /> İngilizceye dön
            </div>
          </div>

        </div>

      </div>
      
      {/* Scrollbar CSS */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .group:hover .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
