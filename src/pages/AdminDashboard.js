import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Search, Edit2, Trash2, Volume2, Wand2, Loader2, CheckCircle2 } from "lucide-react";
import QuickAddModal from "../components/QuickAddModal";
import { fetchMagicWordData } from "../services/aiService";
import { Virtuoso } from "react-virtuoso"; 

export default function AdminDashboard() {
  const { dynamicSystemWords, handleDeleteSystemWord, handleSaveSystemWord, isAdmin } = useData();
  const navigate = useNavigate();
  
  // Arama State'leri
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Sihirli Ekleme State'leri
  const [magicWord, setMagicWord] = useState("");
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicStatus, setMagicStatus] = useState(null);

  // --- 1. DEBOUNCE (GECİKMELİ ARAMA) ---
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
    noun: "noun", verb: "verb", adjective: "adj", 
    adverb: "adv", conjunction: "conj", prep: "prep",
    pronoun: "pron", article: "art"
  }[t] || t);

  // --- 2. ÇOKLU ANLAM DESTEKLİ SİHİRLİ EKLEME ---
  const handleMagicAdd = async (e) => {
      e.preventDefault();
      const wordToFetch = magicWord.trim();
      if (!wordToFetch) return;

      const exists = dynamicSystemWords.some(w => w.word.toLowerCase() === wordToFetch.toLowerCase());
      if (exists) {
          alert(`"${wordToFetch}" zaten sistemde ekli! Farklı anlamlar için mevcut olanı silip tekrar deneyebilirsin.`);
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
              alert("Kaydetme sırasında bir hata oluştu.");
              setMagicStatus('error');
          }
      } else {
          alert("Yapay Zeka Hatası: " + aiResult.message);
          setMagicStatus('error');
      }
      setIsMagicLoading(false);
  };

  // --- 3. SANAL LİSTE KART BİLEŞENİ ---
  const renderWordCard = (index, item) => (
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm mb-3 mx-1">
          <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-lg font-bold text-slate-800 leading-none">{item.word}</span>
                  {item.phonetic && (
                     <span className="text-sm text-slate-400 font-serif italic">
                         /{item.phonetic.replace(/\//g, '')}/
                     </span>
                  )}
                  <button onClick={(e)=>speak(item.word, e)} className="p-1 text-indigo-400 hover:text-indigo-600 bg-indigo-50 rounded-full transition-colors">
                      <Volume2 className="w-4 h-4"/>
                  </button>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {item.tags?.[0] || "B1"}
                  </span>
              </div>

              <div className="space-y-1.5">
                  {item.definitions?.map((def, idx) => (
                     <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap shrink-0 mt-0.5">
                           {getShortType(def.type)}
                        </span>
                        <span className="font-medium leading-tight mt-0.5">{def.meaning}</span>
                     </div>
                  ))}
              </div>

              {item.sentence && (
              <div className="mt-3 pt-2 border-t border-slate-50 flex gap-2 items-start">
                  <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-1 text-slate-300 hover:text-indigo-500 transition-colors">
                      <Volume2 className="w-3.5 h-3.5"/>
                  </button>
                  <div className="text-xs text-slate-400 italic leading-relaxed py-0.5">"{item.sentence}"</div>
              </div>
              )}
          </div>
          
          <div className="flex flex-col gap-2 ml-1">
              <button onClick={() => setEditingItem(item)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors"><Edit2 className="w-4 h-4"/></button>
              <button onClick={() => handleDeleteSystemWord(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4"/></button>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      {isAddingNew && <QuickAddModal onClose={() => setIsAddingNew(false)} />}
      {editingItem && <QuickAddModal prefillData={editingItem} onClose={() => setEditingItem(null)} />}
      
      <div className="max-w-md mx-auto">
         <div className="sticky top-0 bg-slate-50 py-2 z-10 flex items-center gap-3 mb-6">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600"/></button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Shield className="w-6 h-6"/> Yönetici Paneli</h2>
         </div>

         <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-1 rounded-2xl mb-6 shadow-lg">
            <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3 font-bold text-slate-700">
                    <Wand2 className="w-5 h-5 text-purple-500" /> Sihirli Ekleme (AI)
                </div>
                <form onSubmit={handleMagicAdd} className="flex gap-2">
                    <input type="text" placeholder="Kelimeyi yaz ve Enter'a bas..." value={magicWord} onChange={(e) => setMagicWord(e.target.value)} disabled={isMagicLoading} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 font-medium"/>
                    <button type="submit" disabled={isMagicLoading || !magicWord.trim()} className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded-xl font-bold transition-all disabled:opacity-50 min-w-[80px] flex justify-center items-center">
                        {isMagicLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ekle"}
                    </button>
                </form>
                {magicStatus === 'success' && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
                        <CheckCircle2 className="w-4 h-4" /> Tüm anlamlar başarıyla eklendi!
                    </div>
                )}
            </div>
         </div>

         <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-sm font-bold text-blue-800">{dynamicSystemWords.length} Kelime</div>
            <button onClick={() => setIsAddingNew(true)} className="text-sm font-bold text-slate-500 hover:text-slate-800 underline underline-offset-4">Manuel Ekle</button>
         </div>

         <div className="relative mb-6">
             <Search className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/>
             <input type="text" placeholder="Kelimelerde ara..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:border-indigo-300"/>
         </div>
             
         {/* PERFORMANS ODAKLI SANAL LİSTE */}
         <div className="min-h-[400px]">
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
