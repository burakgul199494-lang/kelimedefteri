import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Shield, Search, Edit2, Trash2, 
  Volume2, Wand2, Loader2, CheckCircle2, 
  Info, BookOpen, Quote, Tag as TagIcon 
} from "lucide-react";
import QuickAddModal from "../components/QuickAddModal";
import { fetchMagicWordData } from "../services/aiService";
import { Virtuoso } from "react-virtuoso"; 

export default function AdminDashboard() {
  const { dynamicSystemWords, handleDeleteSystemWord, handleSaveSystemWord, isAdmin } = useData();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [magicWord, setMagicWord] = useState("");
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicStatus, setMagicStatus] = useState(null);

  useEffect(() => {
      const handler = setTimeout(() => {
          setDebouncedSearch(search);
      }, 300);
      return () => clearTimeout(handler);
  }, [search]);

  if (!isAdmin) {
      setTimeout(() => navigate("/"), 0);
      return null;
  }

  const filtered = dynamicSystemWords
     .filter(w => w.word.toLowerCase().includes(debouncedSearch.toLowerCase()))
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

  const handleMagicAdd = async (e) => {
      e.preventDefault();
      const wordToFetch = magicWord.trim();
      if (!wordToFetch) return;

      const exists = dynamicSystemWords.some(w => w.word.toLowerCase() === wordToFetch.toLowerCase());
      if (exists) {
          alert(`"${wordToFetch}" zaten ekli!`);
          setMagicWord("");
          return;
      }

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

  // --- HER ŞEYİ GÖSTEREN YENİ KELİME KARTI ---
  const renderWordCard = (index, item) => (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 mx-1 overflow-hidden">
          {/* ÜST BİLGİ ŞERİDİ */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-slate-800 tracking-tight">{item.word}</span>
                  {item.phonetic && (
                     <span className="text-sm text-indigo-400 font-serif italic bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                         /{item.phonetic.replace(/\//g, '')}/
                     </span>
                  )}
                  <button onClick={(e)=>speak(item.word, e)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-full transition-colors">
                      <Volume2 className="w-4 h-4"/>
                  </button>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setEditingItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={() => handleDeleteSystemWord(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
          </div>

          <div className="p-4 space-y-4">
              {/* ETİKETLER */}
              {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                              <TagIcon className="w-3 h-3"/> {tag}
                          </span>
                      ))}
                  </div>
              )}

              {/* ANLAMLAR VE AÇIKLAMALAR */}
              <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <BookOpen className="w-3 h-3"/> Anlamlar & Açıklamalar
                  </div>
                  {item.definitions?.map((def, idx) => (
                     <div key={idx} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-white uppercase bg-slate-400 px-1.5 py-0.5 rounded">
                              {getShortType(def.type)}
                           </span>
                           <span className="font-bold text-slate-700">{def.meaning}</span>
                        </div>
                        {def.engExplanation && (
                            <div className="text-xs text-slate-600 pl-2 border-l-2 border-indigo-200">
                                <div className="font-semibold text-[10px] text-indigo-400 uppercase">İngilizce Tanım:</div>
                                {def.engExplanation}
                            </div>
                        )}
                        {def.trExplanation && (
                            <div className="text-xs text-slate-500 pl-2 border-l-2 border-green-200 italic">
                                <div className="font-semibold text-[10px] text-green-500 uppercase">Türkçe Çeviri:</div>
                                {def.trExplanation}
                            </div>
                        )}
                     </div>
                  ))}
              </div>

              {/* DİLBİLGİSİ ÇEKİMLERİ (Sadece Dolu Olanlar) */}
              {(item.plural || item.v2 || item.v3 || item.vIng || item.thirdPerson || item.advLy || item.compEr || item.superEst) && (
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                          <Info className="w-3 h-3"/> Kelime Formları
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                          {item.plural && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200"><b>Plural:</b> {item.plural}</span>}
                          {item.v2 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100"><b>V2:</b> {item.v2}</span>}
                          {item.v3 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100"><b>V3:</b> {item.v3}</span>}
                          {item.vIng && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200"><b>V-ing:</b> {item.vIng}</span>}
                          {item.advLy && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100"><b>Adverb:</b> {item.advLy}</span>}
                      </div>
                  </div>
              )}

              {/* ÖRNEK CÜMLE */}
              {item.sentence && (
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                          <Quote className="w-3 h-3"/> Örnek Cümle
                      </div>
                      <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-md shadow-indigo-100 relative">
                          <div className="flex gap-3 items-start">
                              <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                                  <Volume2 className="w-4 h-4 text-white"/>
                              </button>
                              <div className="space-y-1">
                                  <p className="text-sm font-medium leading-relaxed italic">"{item.sentence}"</p>
                                  {item.sentence_tr && (
                                      <p className="text-xs text-indigo-100 font-medium pt-1 border-t border-white/10">{item.sentence_tr}</p>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {isAddingNew && <QuickAddModal onClose={() => setIsAddingNew(false)} />}
      {editingItem && <QuickAddModal prefillData={editingItem} onClose={() => setEditingItem(null)} />}
      
      <div className="max-w-md mx-auto">
         <div className="sticky top-0 bg-slate-50/80 backdrop-blur-md py-4 z-10 flex items-center gap-3 mb-4">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-white rounded-full bg-slate-100 shadow-sm"><ArrowLeft className="w-5 h-5 text-slate-600"/></button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Shield className="w-6 h-6 text-indigo-600"/> Yönetici Paneli</h2>
         </div>

         <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-0.5 rounded-3xl mb-6 shadow-xl shadow-indigo-100">
            <div className="bg-white rounded-[22px] p-5">
                <div className="flex items-center gap-2 mb-4 font-black text-slate-700 uppercase tracking-tighter">
                    <Wand2 className="w-5 h-5 text-indigo-500 animate-pulse" /> Sihirli Ekleme (AI)
                </div>
                <form onSubmit={handleMagicAdd} className="flex gap-2">
                    <input type="text" placeholder="Kelimeyi yaz ve Enter..." value={magicWord} onChange={(e) => setMagicWord(e.target.value)} disabled={isMagicLoading} className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-700 placeholder:text-slate-300"/>
                    <button type="submit" disabled={isMagicLoading || !magicWord.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-2xl font-bold transition-all disabled:opacity-50 min-w-[90px] flex justify-center items-center shadow-lg shadow-indigo-100">
                        {isMagicLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "EKLE"}
                    </button>
                </form>
                {magicStatus === 'success' && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 p-3 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-4 h-4" /> Kelime tüm detaylarıyla eklendi!
                    </div>
                )}
            </div>
         </div>

         <div className="flex items-center justify-between mb-6 px-1">
            <div className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{dynamicSystemWords.length} KELİME MEVCUT</div>
            <button onClick={() => setIsAddingNew(true)} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">MANUEL EKLE</button>
         </div>

         <div className="relative mb-6">
             <Search className="absolute left-4 top-4 text-slate-300 w-5 h-5"/>
             <input type="text" placeholder="Kelimelerde ara..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-12 p-4 bg-white border-2 border-slate-100 rounded-2xl outline-none shadow-sm focus:border-indigo-200 transition-all font-medium text-slate-600"/>
         </div>
             
         <div className="min-h-[500px] pb-20">
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
