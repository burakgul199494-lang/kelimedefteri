import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { ArrowLeft, Volume2, RotateCcw, Trash2, Edit2, X, Check, Trophy } from "lucide-react";

export default function WordList() {
  const { type } = useParams(); // URL'den "known", "unknown" veya "trash" bilgisini alır
  const navigate = useNavigate();
  const { 
    knownWordIds, getAllWords, getDeletedWords, 
    handleDeleteWord, restoreWord, permanentlyDeleteWord, 
    removeFromKnown, addToKnown 
  } = useData();

  const [search, setSearch] = useState("");

  const isTrash = type === "trash";
  const isKnown = type === "known";

  let title = "Kelime Listesi";
  let wordList = [];

  if (isTrash) {
    title = "Silinen Kelimeler";
    wordList = getDeletedWords();
  } else {
    const all = getAllWords();
    if (isKnown) {
      title = "Öğrendiğim Kelimeler";
      wordList = all.filter(w => knownWordIds.includes(w.id));
    } else {
      title = "Öğreneceğim Kelimeler";
      wordList = all.filter(w => !knownWordIds.includes(w.id));
    }
  }

  // Arama Filtresi
  const filteredWords = wordList
    .filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.word.localeCompare(b.word));

  const speak = (txt, e) => {
    e.stopPropagation();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const getShortType = (t) => ({noun:"n.", verb:"v.", adjective:"adj.", adverb:"adv."}[t] || t);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="sticky top-0 bg-slate-50 py-2 z-10 flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600"/></button>
          <h2 className="text-xl font-bold text-slate-800">{title} ({filteredWords.length})</h2>
        </div>

        <input type="text" placeholder="Kelime ara..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl outline-none shadow-sm" />

        {filteredWords.length === 0 ? (
          <div className="text-center text-slate-400 mt-20">
            {isTrash ? <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-20"/> : isKnown ? <Check className="w-16 h-16 mx-auto mb-4 opacity-20"/> : <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500 opacity-50"/>}
            <p>{isTrash ? "Çöp kutusu boş." : isKnown ? "Henüz kelime öğrenmedin." : "Harika! Tüm kelimeleri bitirdin."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWords.map((item) => {
               // Kelime düzenleme sayfasına veriyi göndererek gitme
               const handleEdit = () => navigate("/add-word", { state: { editingWord: item } });

               return (
                 <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2">
                   <div className="flex justify-between items-start">
                     <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                         <span className="text-lg font-bold text-slate-800">{item.word}</span>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.source==="system"?"bg-blue-100 text-blue-600":"bg-orange-100 text-orange-600"}`}>{item.source==="system"?"Sistem":"Kullanıcı"}</span>
                         {!isTrash && <button onClick={(e)=>speak(item.word, e)} className="p-1 text-indigo-400 bg-indigo-50 rounded-full"><Volume2 className="w-4 h-4"/></button>}
                       </div>
                       
                       {item.definitions.map((def, idx) => (
                          <div key={idx} className="flex gap-2 items-baseline text-sm text-slate-700">
                             <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">{getShortType(def.type)}</span>
                             <span>{def.meaning}</span>
                          </div>
                       ))}
                       
                       {!isTrash && (
                         <div className="mt-2 pt-2 border-t border-slate-50 flex gap-2 items-start">
                           <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-1 text-slate-300 hover:text-indigo-500"><Volume2 className="w-3.5 h-3.5"/></button>
                           <div className="text-xs text-slate-400 italic">"{item.sentence}"</div>
                         </div>
                       )}
                     </div>

                     <div className="flex flex-col gap-1 ml-2">
                       {isTrash ? (
                         <>
                           <button onClick={() => restoreWord(item)} className="px-3 py-1 bg-green-100 text-green-600 rounded-lg text-xs font-bold">Geri Yükle</button>
                           {item.source === "user" && <button onClick={() => permanentlyDeleteWord(item)} className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">Sil</button>}
                         </>
                       ) : (
                         <>
                           {item.source === "user" && <button onClick={handleEdit} className="p-2 text-slate-400 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>}
                           {isKnown ? (
                             <button onClick={() => removeFromKnown(item.id)} className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg" title="Öğrenilenlerden Çıkar"><RotateCcw className="w-5 h-5"/></button>
                           ) : (
                             <button onClick={() => addToKnown(item.id)} className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-lg" title="Öğrenildi İşaretle"><Check className="w-5 h-5"/></button>
                           )}
                           {item.source === "user" && <button onClick={() => handleDeleteWord(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><X className="w-4 h-4"/></button>}
                         </>
                       )}
                     </div>
                   </div>
                 </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
