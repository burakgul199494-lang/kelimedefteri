import React, { useState } from "react";
import { Volume2, RotateCw, BookOpen, Layers, Type } from "lucide-react";

export default function WordCard({ wordObj }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Sesli Okuma Fonksiyonu (İngilizce)
  const handleSpeak = (e) => {
    e.stopPropagation(); // Karta tıklanmış gibi algılanıp dönmesini engeller
    const utterance = new SpeechSynthesisUtterance(wordObj.word);
    utterance.lang = "en-US";
    utterance.rate = 0.8; // Biraz yavaş okusun, anlaşılır olsun
    window.speechSynthesis.speak(utterance);
  };

  // Kartı Döndürme
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Gramer detaylarını kontrol et (Var mı yok mu?)
  const hasGrammar = wordObj.v2 || wordObj.v3 || wordObj.plural || wordObj.vIng;

  return (
    <div 
      onClick={handleFlip} 
      className="group w-full h-[450px] cursor-pointer [perspective:1000px]"
    >
      <div
        className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] shadow-xl rounded-2xl ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        
        {/* ============================== */}
        {/* === ÖN YÜZ (İNGİLİZCE) ======= */}
        {/* ============================== */}
        <div className="absolute inset-0 w-full h-full bg-white rounded-2xl p-6 flex flex-col items-center justify-between [backface-visibility:hidden] border-2 border-indigo-50">
          
          {/* Üst Kısım: Kelime ve Ses */}
          <div className="w-full text-center mt-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                {wordObj.word}
              </h2>
              <button
                onClick={handleSpeak}
                className="p-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full transition-colors shadow-sm active:scale-95"
                title="Telaffuzu Dinle"
              >
                <Volume2 className="w-6 h-6" />
              </button>
            </div>
            
            {/* Kelime Türü (Noun, Verb vs. etiketlerden tahmin veya veri) */}
            <div className="flex justify-center gap-2 mt-2">
               {wordObj.tags && wordObj.tags.map((tag, i) => (
                 <span key={i} className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase tracking-wider">
                   {tag}
                 </span>
               ))}
            </div>
          </div>

          {/* Orta Kısım: İngilizce Tanım & Gramer */}
          <div className="w-full space-y-4">
            
            {/* İngilizce Açıklama */}
            {wordObj.definitions && wordObj.definitions[0]?.engExplanation && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                <span className="text-xs text-blue-400 font-bold uppercase mb-1 block">Definition</span>
                <p className="text-slate-700 font-medium text-lg leading-snug">
                  "{wordObj.definitions[0].engExplanation}"
                </p>
              </div>
            )}

            {/* Gramer Bilgileri (Varsa Göster) */}
            {hasGrammar && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {wordObj.plural && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 block uppercase">Plural</span>
                    <span className="font-semibold text-slate-700">{wordObj.plural}</span>
                  </div>
                )}
                {wordObj.v2 && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 block uppercase">Past (V2)</span>
                    <span className="font-semibold text-slate-700">{wordObj.v2}</span>
                  </div>
                )}
                {wordObj.v3 && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 block uppercase">Perfect (V3)</span>
                    <span className="font-semibold text-slate-700">{wordObj.v3}</span>
                  </div>
                )}
                 {wordObj.vIng && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 block uppercase">Gerund (-ing)</span>
                    <span className="font-semibold text-slate-700">{wordObj.vIng}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Alt Kısım: İngilizce Örnek Cümle */}
          <div className="w-full bg-slate-50 p-4 rounded-xl border-l-4 border-indigo-400 italic text-slate-600 text-center relative mt-2">
            <span className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-indigo-400">Example</span>
            "{wordObj.sentence}"
          </div>

          <div className="text-xs text-slate-300 font-medium mt-2 flex items-center gap-1">
            <RotateCw className="w-3 h-3" /> Türkçesi için tıkla
          </div>
        </div>

        {/* ============================== */}
        {/* === ARKA YÜZ (TÜRKÇE) ======== */}
        {/* ============================== */}
        <div className="absolute inset-0 w-full h-full bg-slate-800 text-white rounded-2xl p-6 flex flex-col items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-slate-700">
          
          {/* Çeviri Başlığı */}
          <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="text-sm text-indigo-300 font-bold uppercase tracking-widest mb-2 block">Türkçesi</span>
            
            {/* Eğer tanımlarda Türkçe anlam varsa oradan al, yoksa manuel çeviriyi al (Veri yapına göre ayarlandı) */}
            <h2 className="text-5xl font-extrabold text-white mb-2">
              {wordObj.definitions && wordObj.definitions[0]?.meaning 
                ? wordObj.definitions[0].meaning 
                : "Çeviri Yok"}
            </h2>
            
            {/* Diğer anlamlar varsa listele */}
            {wordObj.definitions && wordObj.definitions.length > 1 && (
               <div className="text-slate-400 text-sm mt-2">
                 Diğer: {wordObj.definitions.slice(1).map(d => d.meaning).join(", ")}
               </div>
            )}
          </div>

          {/* Türkçe Açıklama */}
           {wordObj.definitions && wordObj.definitions[0]?.trExplanation && (
            <div className="w-full bg-slate-700/50 p-4 rounded-xl border border-slate-600 text-center mb-6">
              <BookOpen className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
              <p className="text-slate-200 text-lg">
                "{wordObj.definitions[0].trExplanation}"
              </p>
            </div>
          )}

          {/* Türkçe Örnek Cümle Çevirisi */}
          {wordObj.sentence_tr && (
            <div className="w-full text-center px-4">
              <div className="inline-block bg-indigo-600/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold mb-2">
                Cümle Çevirisi
              </div>
              <p className="text-slate-300 italic text-lg leading-relaxed">
                "{wordObj.sentence_tr}"
              </p>
            </div>
          )}
          
           <div className="mt-auto text-xs text-slate-500 font-medium flex items-center gap-1">
            <RotateCw className="w-3 h-3" /> İngilizceye dön
          </div>

        </div>

      </div>
    </div>
  );
}
