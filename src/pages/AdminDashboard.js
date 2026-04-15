import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Shield, Search, Edit2, Trash2, 
  Volume2, Wand2, Loader2, CheckCircle2, 
  Info, BookOpen, Quote, Tag as TagIcon, Languages, RotateCcw
} from "lucide-react";
import QuickAddModal from "../components/QuickAddModal";
import { fetchMagicWordData, translateWord } from "../services/aiService";
import { Virtuoso } from "react-virtuoso"; 

export default function AdminDashboard() {
  const { dynamicSystemWords, handleDeleteSystemWord, handleSaveSystemWord, isAdmin, blacklistedWords, removeFromBlacklist } = useData();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); 

  const [magicWord, setMagicWord] = useState("");
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicStatus, setMagicStatus] = useState(null);

  const [trWord, setTrWord] = useState("");
  const [translatedEnWord, setTranslatedEnWord] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
      const handler = setTimeout(() => setDebouncedSearch(search), 300);
      return () => clearTimeout(handler);
  }, [search]);

  if (!isAdmin) {
      setTimeout(() => navigate("/"), 0);
      return null;
  }

  const filtered = dynamicSystemWords
     .filter(w => {
         if (filterMode === 'blacklisted') return blacklistedWords.includes(String(w.id));
         // 🔥 ARTIK isStatic DEĞİL, ID'Sİ ox- İLE BAŞLAYANLARI FİLTRELİYORUZ
         if (filterMode === 'static') return String(w.id).startsWith("ox-");
         return true;
     })
     .filter(w => {
         const searchLower = debouncedSearch.toLowerCase().trim();
         if (!searchLower) return true;
         if (w.word.toLowerCase().includes(searchLower)) return true;
         if (w.definitions && w.definitions.some(d => d.meaning.toLowerCase().includes(searchLower))) return true;
         return false;
     })
     .sort((a,b) => a.word.localeCompare(b.word));

  const speak = (txt, e) => {
    e.stopPropagation();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const getShortType = (t) => ({
    noun: "isim", verb: "fiil", adjective: "sıfat", 
    adverb: "zarf", conjunction: "bağlaç", prep: "edat",
    pronoun: "zamir", article: "tanımlık"
  }[t] || t);

  const handleTranslate = async (e) => {
      e.preventDefault();
      if (!trWord.trim()) return;
      setIsTranslating(true);
      setTranslatedEnWord("");
      const res = await translateWord(trWord.trim());
      if (res.success) {
          setTranslatedEnWord(res.word);
      } else {
          alert("Çeviri hatası: " + res.message);
      }
      setIsTranslating(false);
  };

  const handleMagicAdd = async (e) => {
      e.preventDefault();
      const wordToFetch = magicWord.trim();
      if (!wordToFetch) return;

      setIsMagicLoading(true);
      setMagicStatus(null);
      const aiResult = await fetchMagicWordData(wordToFetch);

      if (aiResult.success && aiResult.data) {
          const wordsArray = Array.isArray(aiResult.data) ? aiResult.data : [aiResult.data];
          let hasError = false;
          for (const wordObj of wordsArray) {
              const saveResult = await handleSaveSystemWord(wordObj);
              if (!saveResult.success) hasError = true;
          }
          if (!hasError) {
              setMagicStatus('success');
              setMagicWord(""); 
              setTimeout(() => setMagicStatus(null), 3000);
          } else {
              alert("Kaydetme hatası.");
              setMagicStatus('error');
          }
      } else {
          alert("AI Hatası: " + aiResult.message);
          setMagicStatus('error');
      }
      setIsMagicLoading(false);
  };

  const renderWordCard = (index, item) => {
      const isBlacklisted = blacklistedWords.includes(String(item.id));
      
      // 🔥 YENİ KONTROL: ID ox- ile başlıyorsa Oxford'dur. 
      // Hem Oxford hem de isStatic false ise (yani veritabanındaysa) düzenlenmiştir.
      const isOxford = String(item.id).startsWith("ox-");
      const isEdited = isOxford && !item.isStatic;

      let containerClass = "bg-white rounded-2xl shadow-sm mb-4 overflow-hidden w-full transition-all ";
      
      // Düzenlenmiş olsa bile Oxford kelimesi turuncu çerçevesini korur
      if (isOxford) containerClass += "border-2 border-orange-400 ";
      else containerClass += "border border-slate-200 ";
      
      if (isBlacklisted) containerClass += "opacity-80 bg-slate-50 "; 

      return (
      <div className={containerClass}>
          <div className="bg-slate-50 px-3 py-3 sm:px-4 border-b border-slate-100 flex justify-between items-start gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <span className={`text-lg sm:text-xl font-black tracking-tight break-words ${isBlacklisted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {item.word}
                  </span>
                  
                  {/* 🔥 ROZETLER */}
                  {isOxford && !isEdited && <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded border border-orange-200 uppercase tracking-widest">Kod (Oxford)</span>}
                  {isEdited && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-widest">Oxford (Düzenlendi)</span>}
                  
                  {isBlacklisted && <span className="text-[9px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200 uppercase tracking-widest">Kara Listede</span>}

                  {item.phonetic && (
                     <span className="text-xs text-indigo-400 font-serif italic bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 shrink-0">
                         /{item.phonetic.replace(/\//g, '')}/
                     </span>
                  )}
                  <button onClick={(e)=>speak(item.word, e)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-full transition-colors shrink-0">
                      <Volume2 className="w-4 h-4"/>
                  </button>
              </div>
              <div className="flex gap-1.5 shrink-0">
                  {isBlacklisted ? (
                      <button onClick={() => removeFromBlacklist(item.id)} className="flex items-center gap-1 p-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors shadow-sm">
                          <RotateCcw className="w-3.5 h-3.5"/> Geri Getir
                      </button>
                  ) : (
                      <>
                          <button onClick={() => setEditingItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteSystemWord(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </>
                  )}
              </div>
          </div>

          <div className={`p-3 sm:p-4 space-y-4 ${isBlacklisted ? 'opacity-70 pointer-events-none' : ''}`}>
              {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                              <TagIcon className="w-3 h-3"/> {tag}
                          </span>
                      ))}
                  </div>
              )}

              <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <BookOpen className="w-3 h-3"/> Anlamlar & Açıklamalar
                  </div>
                  {item.definitions?.map((def, idx) => (
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

              {(item.plural || item.v2 || item.v3 || item.vIng || item.thirdPerson || item.advLy || item.compEr || item.superEst) && (
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                          <Info className="w-3 h-3"/> Kelime Formları
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px] sm:text-[11px]">
                          {item.plural && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200"><b>Plural:</b> {item.plural}</span>}
                          {item.v2 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100"><b>V2:</b> {item.v2}</span>}
                          {item.v3 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100"><b>V3:</b> {item.v3}</span>}
                          {item.vIng && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200"><b>V-ing:</b> {item.vIng}</span>}
                          {item.advLy && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100"><b>Adverb:</b> {item.advLy}</span>}
                      </div>
                  </div>
              )}

              {item.sentence && (
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                          <Quote className="w-3 h-3"/> Örnek Cümle
                      </div>
                      <div className="bg-indigo-600 rounded-2xl p-3 sm:p-4 text-white shadow-md shadow-indigo-100 relative">
                          <div className="flex gap-2 sm:gap-3 items-start">
                              <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors mt-0.5">
                                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white"/>
                              </button>
                              <div className="space-y-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-medium leading-relaxed italic break-words">"{item.sentence}"</p>
                                  {item.sentence_tr && (
                                      <p className="text-[10px] sm:text-xs text-indigo-100 font-medium pt-1 border-t border-white/10 break-words">{item.sentence_tr}</p>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2 sm:p-4 w-full overflow-x-hidden">
      {isAddingNew && <QuickAddModal onClose={() => setIsAddingNew(false)} />}
      {editingItem && <QuickAddModal prefillData={editingItem} onClose={() => setEditingItem(null)} />}
      
      <div className="max-w-md mx-auto w-full">
         <div className="sticky top-0 bg-slate-50/90 backdrop-blur-md py-3 sm:py-4 z-10 flex items-center gap-2 sm:gap-3 mb-4 w-full">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-white rounded-full bg-slate-100 shadow-sm shrink-0"><ArrowLeft className="w-5 h-5 text-slate-600"/></button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2 truncate"><Shield className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0"/> Yönetici Paneli</h2>
         </div>

         <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-0.5 rounded-3xl mb-6 shadow-xl shadow-indigo-100 w-full">
            <div className="bg-white rounded-[22px] p-4 sm:p-5 w-full">
                <div className="flex items-center gap-2 mb-3 sm:mb-4 font-black text-slate-700 uppercase tracking-tighter text-sm sm:text-base">
                    <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 animate-pulse" /> Sihirli Ekleme (AI)
                </div>
                
                <form onSubmit={handleMagicAdd} className="flex flex-col sm:flex-row gap-2 w-full">
                    <input type="text" placeholder="Kelimeyi yaz ve Enter..." value={magicWord} onChange={(e) => setMagicWord(e.target.value)} disabled={isMagicLoading} className="w-full sm:flex-1 p-3 sm:p-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm sm:text-base"/>
                    <button type="submit" disabled={isMagicLoading || !magicWord.trim()} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white p-3 sm:px-6 rounded-xl sm:rounded-2xl font-bold transition-all disabled:opacity-50 min-w-[90px] flex justify-center items-center shadow-lg shadow-indigo-100 shrink-0">
                        {isMagicLoading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : "EKLE"}
                    </button>
                </form>
                {magicStatus === 'success' && (
                    <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 p-2 sm:p-3 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Kelime eklendi!
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-indigo-100/30 w-full">
                    <div className="flex items-center gap-1.5 mb-3 text-[10px] sm:text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                        <Languages className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> Türkçesini Yaz, İngilizcesini Bul
                    </div>
                    <form onSubmit={handleTranslate} className="flex flex-col sm:flex-row gap-2 w-full">
                        <input type="text" placeholder="Örn: kapı, pencere..." value={trWord} onChange={(e) => setTrWord(e.target.value)} disabled={isTranslating} className="w-full sm:flex-1 p-3 bg-indigo-50/50 border-2 border-indigo-50 rounded-xl outline-none focus:border-indigo-300 transition-all font-medium text-slate-600 text-sm placeholder:text-indigo-200" />
                        <button type="submit" disabled={isTranslating || !trWord.trim()} className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 sm:px-5 rounded-xl font-bold transition-all disabled:opacity-50 text-sm flex items-center justify-center shrink-0">
                            {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : "ÇEVİR"}
                        </button>
                    </form>

                    {translatedEnWord && (
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-100 animate-in fade-in zoom-in-95 gap-3 w-full">
                            <div className="text-xs font-medium text-emerald-800 text-center sm:text-left">
                                İngilizcesi: <span className="text-base sm:text-lg font-black ml-1 break-words">{translatedEnWord}</span>
                            </div>
                            <button onClick={() => { setMagicWord(translatedEnWord); setTranslatedEnWord(""); setTrWord(""); }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-colors shadow-sm shadow-emerald-200 shrink-0">
                                Sihirli Ekle
                            </button>
                        </div>
                    )}
                </div>
            </div>
         </div>

         <div className="flex items-center justify-between mb-4 sm:mb-6 px-1 w-full">
            <div className="bg-indigo-100 text-indigo-700 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap">{dynamicSystemWords.length} KELİME MEVCUT</div>
            <button onClick={() => setIsAddingNew(true)} className="text-[10px] sm:text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest whitespace-nowrap">MANUEL EKLE</button>
         </div>

         <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-hide w-full">
            <button onClick={() => setFilterMode('all')} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterMode === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                Tümü ({dynamicSystemWords.length})
            </button>
            <button onClick={() => setFilterMode('static')} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterMode === 'static' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                <div className={`w-2 h-2 rounded-full ${filterMode === 'static' ? 'bg-white' : 'bg-orange-400'}`}></div> Koddan (Oxford)
            </button>
            <button onClick={() => setFilterMode('blacklisted')} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterMode === 'blacklisted' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                <div className={`w-2 h-2 rounded-full ${filterMode === 'blacklisted' ? 'bg-white' : 'bg-red-400'}`}></div> Kara Liste ({blacklistedWords.length})
            </button>
         </div>

         <div className="relative mb-6 w-full">
             <Search className="absolute left-3 top-3.5 sm:left-4 sm:top-4 text-slate-300 w-4 h-4 sm:w-5 sm:h-5"/>
             <input type="text" placeholder="Türkçe/İngilizce ara..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 sm:pl-12 p-3 sm:p-4 bg-white border-2 border-slate-100 rounded-xl sm:rounded-2xl outline-none shadow-sm focus:border-indigo-200 transition-all font-medium text-slate-600 text-sm sm:text-base"/>
         </div>
             
         <div className="min-h-[500px] pb-20 w-full">
             <Virtuoso
                useWindowScroll
                data={filtered}
                itemContent={renderWordCard}
             />
         </div>
      </div>
    </div>
  );
}
