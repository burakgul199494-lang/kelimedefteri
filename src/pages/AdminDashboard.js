import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Search, Edit2, Trash2, Volume2, Wand2, Loader2, CheckCircle2 } from "lucide-react";
import QuickAddModal from "../components/QuickAddModal";
import { fetchMagicWordData } from "../services/aiService"; // Yeni servisimizi import ettik

export default function AdminDashboard() {
  const { dynamicSystemWords, handleDeleteSystemWord, handleSaveSystemWord, isAdmin } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  
  const [editingItem, setEditingItem] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Sihirli Ekleme State'leri
  const [magicWord, setMagicWord] = useState("");
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicStatus, setMagicStatus] = useState(null); // 'success', 'error', null

  if (!isAdmin) {
      setTimeout(() => navigate("/"), 0);
      return null;
  }

  const filtered = dynamicSystemWords
     .filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
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

  // --- SİHİRLİ EKLEME FONKSİYONU (GÜNCELLENDİ: ÇOKLU ANLAM DESTEĞİ) ---
  const handleMagicAdd = async (e) => {
      e.preventDefault();
      const wordToFetch = magicWord.trim();
      if (!wordToFetch) return;

      // Kelime zaten var mı kontrolü
      const exists = dynamicSystemWords.some(w => w.word.toLowerCase() === wordToFetch.toLowerCase());
      if (exists) {
          alert(`"${wordToFetch}" zaten sistemde ekli! Farklı bir anlamını eklemek istiyorsan listedekini silip tekrar Sihirli Ekleme yapabilirsin.`);
          setMagicWord("");
          return;
      }

      setIsMagicLoading(true);
      setMagicStatus(null);

      // 1. AI'dan Veriyi Çek
      const aiResult = await fetchMagicWordData(wordToFetch);

      if (aiResult.success && aiResult.data) {
          // AI tek bir obje döndüyse hata almamak için onu diziye (Array) çeviriyoruz
          const wordsArray = Array.isArray(aiResult.data) ? aiResult.data : [aiResult.data];
          
          let hasError = false;

          // 2. Dizideki her bir kelime anlamı için döngü oluşturup ayrı ayrı kaydediyoruz
          for (const wordObj of wordsArray) {
              const saveResult = await handleSaveSystemWord(wordObj);
              if (!saveResult.success) {
                  hasError = true;
                  console.error("Kaydetme hatası:", saveResult.message);
              }
          }
          
          if (!hasError) {
              setMagicStatus('success');
              setMagicWord(""); // Başarılıysa inputu temizle
              
              // 3 saniye sonra başarı mesajını gizle
              setTimeout(() => setMagicStatus(null), 3000);
          } else {
              alert("Bazı anlamlar kaydedilirken bir hata oluştu.");
              setMagicStatus('error');
          }
      } else {
          alert("Yapay Zeka Hatası: " + aiResult.message);
          setMagicStatus('error');
      }
      setIsMagicLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      
      {isAddingNew && <QuickAddModal onClose={() => setIsAddingNew(false)} />}
      {editingItem && <QuickAddModal prefillData={editingItem} onClose={() => setEditingItem(null)} />}
      
      <div className="max-w-md mx-auto">
         <div className="sticky top-0 bg-slate-50 py-2 z-10 flex items-center gap-3 mb-6">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600"/></button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Shield className="w-6 h-6"/> Yönetici Paneli</h2>
         </div>

         {/* --- YENİ: SİHİRLİ EKLEME ÇUBUĞU --- */}
         <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-1 rounded-2xl mb-6 shadow-lg">
            <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Wand2 className="w-5 h-5 text-purple-500" />
                    <h3 className="font-bold text-slate-700">Sihirli Ekleme (AI)</h3>
                </div>
                <form onSubmit={handleMagicAdd} className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="İngilizce kelime yaz ve Enter'a bas..." 
                        value={magicWord} 
                        onChange={(e) => setMagicWord(e.target.value)}
                        disabled={isMagicLoading}
                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 font-medium"
                    />
                    <button 
                        type="submit" 
                        disabled={isMagicLoading || !magicWord.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                    >
                        {isMagicLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ekle"}
                    </button>
                </form>
                
                {/* Durum Bildirimleri */}
                {magicStatus === 'success' && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
                        <CheckCircle2 className="w-4 h-4" /> Kelime başarıyla analiz edildi ve sisteme eklendi!
                    </div>
                )}
            </div>
         </div>

         <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 text-sm font-bold text-blue-800">
               {dynamicSystemWords.length} Kelime
            </div>
            
            <button onClick={() => setIsAddingNew(true)} className="text-sm font-bold text-slate-500 hover:text-slate-800 underline decoration-slate-300 underline-offset-4">
                Manuel Form ile Ekle
            </button>
         </div>

         <div className="relative mb-6">
             <Search className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/>
             <input type="text" placeholder="Sistem kelimelerinde ara..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:border-indigo-300 transition-colors"/>
         </div>
             
         <div className="space-y-3">
             {filtered.map(item => (
                 <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-start shadow-sm">
                     
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

                         {(item.plural || item.v2 || item.v3 || item.vIng || item.thirdPerson) && (
                            <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="flex flex-wrap gap-2">
                                  {item.plural && <div className="bg-white px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap"><span className="font-bold text-slate-400">Pl:</span> {item.plural}</div>}
                                  {item.thirdPerson && <div className="bg-white px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap"><span className="font-bold text-slate-400">3rd:</span> {item.thirdPerson}</div>}
                                  {item.v2 && <div className="bg-white px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap"><span className="font-bold text-slate-400">V2:</span> {item.v2}</div>}
                                  {item.v3 && <div className="bg-white px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap"><span className="font-bold text-slate-400">V3:</span> {item.v3}</div>}
                                  {item.vIng && <div className="bg-white px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap"><span className="font-bold text-slate-400">Ing:</span> {item.vIng}</div>}
                              </div>
                            </div>
                         )}

                         {(item.advLy || item.compEr || item.superEst) && (
                            <div className="mt-2 text-xs text-slate-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
                              <div className="flex flex-wrap gap-2">
                                  {item.advLy && <div className="bg-white px-1.5 py-0.5 rounded border border-orange-200 whitespace-nowrap"><span className="font-bold text-orange-400">Ly:</span> {item.advLy}</div>}
                                  {item.compEr && <div className="bg-white px-1.5 py-0.5 rounded border border-orange-200 whitespace-nowrap"><span className="font-bold text-orange-400">Comp:</span> {item.compEr}</div>}
                                  {item.superEst && <div className="bg-white px-1.5 py-0.5 rounded border border-orange-200 whitespace-nowrap"><span className="font-bold text-orange-400">Super:</span> {item.superEst}</div>}
                              </div>
                            </div>
                         )}

                         {item.sentence && (
                         <div className="mt-3 pt-2 border-t border-slate-50 flex gap-2 items-start group">
                             <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-1 text-slate-300 hover:text-indigo-500 transition-colors">
                                 <Volume2 className="w-3.5 h-3.5"/>
                             </button>
                             <div className="text-xs text-slate-400 italic leading-relaxed py-0.5">"{item.sentence}"</div>
                         </div>
                         )}
                     </div>
                     
                     <div className="flex flex-col gap-2 ml-1">
                         <button 
                            onClick={() => setEditingItem(item)} 
                            className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                            title="Düzenle"
                         >
                             <Edit2 className="w-4 h-4"/>
                         </button>
                         <button 
                            onClick={() => handleDeleteSystemWord(item.id)} 
                            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                            title="Sil"
                         >
                             <Trash2 className="w-4 h-4"/>
                         </button>
                     </div>
                 </div>
             ))}
         </div>
      </div>
    </div>
  );
}
