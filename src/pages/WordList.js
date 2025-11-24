import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { ArrowLeft, Volume2, RotateCcw, Trash2, Edit2, X, Check, Trophy, Tag } from "lucide-react";

export default function WordList() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { knownWordIds, getAllWords, getDeletedWords, handleDeleteWord, restoreWord, permanentlyDeleteWord, removeFromKnown, addToKnown } = useData();
  const [search, setSearch] = useState("");

  const isTrash = type === "trash";
  const isKnown = type === "known";
  let title = isTrash ? "Silinenler" : isKnown ? "Öğrendiklerim" : "Öğreneceklerim";
  let wordList = isTrash ? getDeletedWords() : getAllWords().filter(w => isKnown ? knownWordIds.includes(w.id) : !knownWordIds.includes(w.id));

  const filteredWords = wordList.filter(w => w.word.toLowerCase().includes(search.toLowerCase()) || (w.category && w.category.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => a.word.localeCompare(b.word));

  const speak = (txt, e) => { e.stopPropagation(); const u = new SpeechSynthesisUtterance(txt); u.lang = "en-US"; window.speechSynthesis.speak(u); };
  const getShortType = (t) => ({noun:"n.", verb:"v.", adjective:"adj.", adverb:"adv.", conjunction:"conj"}[t] || t);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="sticky top-0 bg-slate-50 py-2 z-10 flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600"/></button>
          <h2 className="text-xl font-bold text-slate-800">{title} ({filteredWords.length})</h2>
        </div>

        <input type="text" placeholder="Kelime veya kategori ara..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:border-indigo-300" />

        {filteredWords.length === 0 ? (
          <div className="text-center text-slate-400 mt-20"><p>Liste boş.</p></div>
        ) : (
          <div className="space-y-3">
            {filteredWords.map((item) => {
               const handleEdit = () => navigate("/add-word", { state: { editingWord: item } });
               return (
                 <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2">
                   
                   {/* KATEGORİ ETİKETİ (YENİ) */}
                   {item.category && (
                       <div className="flex justify-start mb-1">
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wide border border-purple-100">
                               <Tag className="w-3 h-3"/> {item.category}
                           </span>
                       </div>
                   )}

                   <div className="flex justify-between items-start">
                     <div className="flex-1 min-w-0 pr-2">
                       <div className="flex items-center gap-2 mb-2 flex-wrap">
                         <span className="text-lg font-bold text-slate-800 leading-none">{item.word}</span>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.source==="system"?"bg-blue-100 text-blue-600":"bg-orange-100 text-orange-600"}`}>{item.source==="system"?"Sistem":"Kullanıcı"}</span>
                         {!isTrash && <button onClick={(e)=>speak(item.word, e)} className="p-1 text-indigo-400 hover:text-indigo-600 bg-indigo-50 rounded-full"><Volume2 className="w-4 h-4"/></button>}
                       </div>
                       
                       <div className="space-y-1.5">
                         {item.definitions.map((def, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                               <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap shrink-0 mt-0.5">{getShortType(def.type)}</span>
                               <span className="font-medium leading-tight mt-0.5 break-words">{def.meaning}</span>
                            </div>
                         ))}
                       </div>

                       {/* GRİ KUTU (Fiil) */}
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

                       {/* TURUNCU KUTU (Sıfat) */}
                       {(item.advLy || item.compEr || item.superEst) && (
                          <div className="mt-2 text-xs text-slate-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
                            <div className="flex flex-wrap gap-2">
                                {item.advLy && <div className="bg-white px-1.5 py-0.5 rounded border border-orange-200 whitespace-nowrap"><span className="font-bold text-orange-400">Ly:</span> {item.advLy}</div>}
                                {item.compEr && <div className="bg-white px-1.5 py-0.5 rounded border border-orange-200 whitespace-nowrap"><span className="font-bold text-orange-400">Comp:</span> {item.compEr}</div>}
                                {item.superEst && <div className="bg-white px-1.5 py-0.5 rounded border border-orange-200 whitespace-nowrap"><span className="font-bold text-orange-400">Super:</span> {item.superEst}</div>}
                            </div>
                          </div>
                       )}
                       
                       {!isTrash && (
                         <div className="mt-3 pt-2 border-t border-slate-50 flex gap-2 items-start group">
                           <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-1 text-slate-300 hover:text-indigo-500"><Volume2 className="w-3.5 h-3.5"/></button>
                           <div className="text-xs text-slate-400 italic leading-relaxed py-0.5">"{item.sentence}"</div>
                         </div>
                       )}
                     </div>

                     <div className="flex flex-col gap-1 ml-1">
                       {isTrash ? (
                         <div className="flex flex-col gap-2">
                           <button onClick={() => restoreWord(item)} className="px-2 py-1 bg-green-100 text-green-600 rounded-lg text-[10px] font-bold">Geri Yükle</button>
                           {item.source === "user" && <button onClick={() => permanentlyDeleteWord(item)} className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-bold">Sil</button>}
                         </div>
                       ) : (
                         <>
                           {item.source === "user" && <button onClick={handleEdit} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>}
                           <button onClick={() => isKnown ? removeFromKnown(item.id) : addToKnown(item.id)} className={`p-2 rounded-lg ${isKnown ? "text-slate-300 hover:text-amber-500 hover:bg-amber-50" : "text-slate-300 hover:text-green-500 hover:bg-green-50"}`}>{isKnown ? <RotateCcw className="w-5 h-5"/> : <Check className="w-5 h-5"/>}</button>
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
