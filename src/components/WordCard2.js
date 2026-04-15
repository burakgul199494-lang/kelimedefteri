import React, { useEffect } from "react";
import { Volume2, BookOpen, Info, Quote, Tag as TagIcon } from "lucide-react";

export default function WordCard2({ wordObj }) {
  
  // Bileşen ekrandan kalkınca veya değişince sesi durdur
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, [wordObj]);

  const speak = (txt, e) => {
    if (e) e.stopPropagation();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const getShortType = (t) => ({
    noun: "isim", verb: "fiil", adjective: "sıfat", 
    adverb: "zarf", conjunction: "bağlaç", prep: "edat",
    pronoun: "zamir", article: "tanımlık"
  }[t] || t);

  return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 w-full overflow-hidden text-left">
          {/* ÜST BİLGİ ŞERİDİ */}
          <div className="bg-slate-50 px-3 py-3 sm:px-4 border-b border-slate-100 flex justify-between items-start gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg sm:text-xl font-black text-slate-800 tracking-tight break-words">{wordObj.word}</span>
                  {wordObj.phonetic && (
                     <span className="text-xs text-indigo-400 font-serif italic bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 shrink-0">
                         /{wordObj.phonetic.replace(/\//g, '')}/
                     </span>
                  )}
                  <button onClick={(e)=>speak(wordObj.word, e)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-full transition-colors shrink-0">
                      <Volume2 className="w-4 h-4"/>
                  </button>
              </div>
          </div>

          <div className="p-3 sm:p-4 space-y-4">
              {/* ETİKETLER */}
              {wordObj.tags && wordObj.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                      {wordObj.tags.map((tag, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                              <TagIcon className="w-3 h-3"/> {tag}
                          </span>
                      ))}
                  </div>
              )}

              {/* ANLAMLAR VE AÇIKLAMALAR */}
              <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <BookOpen className="w-3 h-3"/> Anlamlar & Açıklamalar
                  </div>
                  {wordObj.definitions?.map((def, idx) => (
                     <div key={idx} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                           <span className="text-[10px] font-black text-white uppercase bg-slate-400 px-1.5 py-0.5 rounded">
                              {getShortType(def.type)}
                           </span>
                           <span className="font-bold text-slate-700 break-words">{def.meaning}</span>
                        </div>
                        {def.engExplanation && (
                            <div className="text-[11px] sm:text-xs text-slate-600 pl-2 border-l-2 border-indigo-200">
                                <div className="font-semibold text-[10px] text-indigo-400 uppercase">İngilizce Tanım:</div>
                                {def.engExplanation}
                            </div>
                        )}
                        {def.trExplanation && (
                            <div className="text-[11px] sm:text-xs text-slate-500 pl-2 border-l-2 border-green-200 italic">
                                <div className="font-semibold text-[10px] text-green-500 uppercase">Türkçe Çeviri:</div>
                                {def.trExplanation}
                            </div>
                        )}
                     </div>
                  ))}
              </div>

              {/* DİLBİLGİSİ ÇEKİMLERİ (Varsa Görünür) */}
              {(wordObj.plural || wordObj.v2 || wordObj.v3 || wordObj.vIng || wordObj.thirdPerson || wordObj.advLy || wordObj.compEr || wordObj.superEst) && (
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                          <Info className="w-3 h-3"/> Kelime Formları
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px] sm:text-[11px]">
                          {wordObj.plural && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200"><b>Plural:</b> {wordObj.plural}</span>}
                          {wordObj.v2 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100"><b>V2:</b> {wordObj.v2}</span>}
                          {wordObj.v3 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100"><b>V3:</b> {wordObj.v3}</span>}
                          {wordObj.vIng && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200"><b>V-ing:</b> {wordObj.vIng}</span>}
                          {wordObj.advLy && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100"><b>Adverb:</b> {wordObj.advLy}</span>}
                      </div>
                  </div>
              )}

              {/* ÖRNEK CÜMLE */}
              {wordObj.sentence && (
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                          <Quote className="w-3 h-3"/> Örnek Cümle
                      </div>
                      <div className="bg-indigo-600 rounded-2xl p-3 sm:p-4 text-white shadow-md shadow-indigo-100 relative">
                          <div className="flex gap-2 sm:gap-3 items-start">
                              <button onClick={(e)=>speak(wordObj.sentence, e)} className="shrink-0 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors mt-0.5">
                                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white"/>
                              </button>
                              <div className="space-y-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-medium leading-relaxed italic break-words">"{wordObj.sentence}"</p>
                                  {wordObj.sentence_tr && (
                                      <p className="text-[10px] sm:text-xs text-indigo-100 font-medium pt-1 border-t border-white/10 break-words">{wordObj.sentence_tr}</p>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
  );
}
