import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { ArrowLeft, Volume2, RotateCcw, Check, Trophy, ArrowDownCircle, Hourglass, Layers } from "lucide-react";

export default function WordList() {
  const { type } = useParams(); // "known", "unknown" veya "waiting"
  const navigate = useNavigate();
  // learningQueue eklendi, delete fonksiyonları UI'dan kalktığı için buradan da sildik (temizlik için)
  const { knownWordIds, getAllWords, removeFromKnown, addToKnown, learningQueue } = useData();

  const [search, setSearch] = useState("");
  
  // --- SAYFALAMA STATE'İ ---
  const [visibleCount, setVisibleCount] = useState(50);
  const PER_PAGE = 50;

  const isKnown = type === "known";
  const isWaiting = type === "waiting";

  let title = "Kelime Listesi";
  let wordList = [];
  const all = getAllWords();

  // --- LİSTELEME MANTIĞI ---
  if (isKnown) {
    title = "Öğrendiğim Kelimeler";
    wordList = all.filter(w => knownWordIds.includes(w.id));
  } else if (isWaiting) {
    // BEKLEMEDE OLANLAR
    title = "Tekrar Bekleyenler";
    const now = new Date();
    // learningQueue boş gelebilir diye kontrol ediyoruz
    const queue = learningQueue || [];
    // Tarihi henüz gelmemiş (gelecekte) olanları bul
    const waitingIds = queue.filter(q => new Date(q.nextReview) > now).map(q => q.wordId);
    
    wordList = all.filter(w => waitingIds.includes(w.id));
  } else {
    // UNKNOWN (Kalanlar)
    title = "Öğreneceğim Kelimeler";
    wordList = all.filter(w => !knownWordIds.includes(w.id));
  }

  // Arama ve Sıralama
  const filteredWords = wordList
    .filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.word.localeCompare(b.word));

  // --- GÖRÜNÜR LİSTE ---
  const displayedWords = filteredWords.slice(0, visibleCount);

  // Arama yapıldığında veya liste türü değiştiğinde sayacı sıfırla
  useEffect(() => {
    setVisibleCount(PER_PAGE);
  }, [search, type]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PER_PAGE);
  };

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

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        
        {/* Üst Bar */}
        <div className="sticky top-0 bg-slate-50 py-2 z-10 flex items-center gap-3 mb-4 shadow-sm px-2 rounded-b-xl">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm">
            <ArrowLeft className="w-6 h-6 text-slate-600"/>
          </button>
          <div>
             <h2 className="text-xl font-bold text-slate-800">{title}</h2>
             <div className="text-xs text-slate-400 font-bold">{filteredWords.length} kelime</div>
          </div>
        </div>

        {/* Arama Kutusu */}
        <input 
          type="text" 
          placeholder="Kelime ara..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:border-indigo-300 transition-colors" 
        />

        {/* Liste */}
        {displayedWords.length === 0 ? (
          <div className="text-center text-slate-400 mt-20 flex flex-col items-center">
            {isKnown ? <Trophy className="w-16 h-16 mb-4 text-green-200 opacity-50"/> : isWaiting ? <Hourglass className="w-16 h-16 mb-4 text-amber-200 opacity-50"/> : <Layers className="w-16 h-16 mb-4 text-blue-200 opacity-50"/>}
            <p className="font-medium text-slate-500">Liste boş.</p>
            {isWaiting && <p className="text-xs mt-2 max-w-xs">Şu an tekrar bekleyen kelime yok.</p>}
          </div>
        ) : (
          <div className="space-y-3 pb-10">
            {displayedWords.map((item) => {
              
              return (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 animate-in fade-in">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      
                      {/* Başlık ve Rozet */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-lg font-bold text-slate-800 leading-none">{item.word}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.source==="system"?"bg-blue-100 text-blue-600":"bg-orange-100 text-orange-600"}`}>
                          {item.source==="system"?"Sistem":"Kullanıcı"}
                        </span>
                        <button onClick={(e)=>speak(item.word, e)} className="p-1 text-indigo-400 hover:text-indigo-600 bg-indigo-50 rounded-full transition-colors">
                            <Volume2 className="w-4 h-4"/>
                        </button>
                      </div>
                      
                      {/* Anlamlar */}
                      <div className="space-y-1.5">
                        {item.definitions.map((def, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap shrink-0 mt-0.5">
                              {getShortType(def.type)}
                            </span>
                            <span className="font-medium leading-tight mt-0.5 break-words">
                                {def.meaning}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Ekstra Bilgiler */}
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
                      
                      <div className="mt-3 pt-2 border-t border-slate-50 flex gap-2 items-start group">
                        <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-1 text-slate-300 hover:text-indigo-500 transition-colors"><Volume2 className="w-3.5 h-3.5"/></button>
                        <div className="text-xs text-slate-400 italic leading-relaxed py-0.5">"{item.sentence}"</div>
                      </div>
                    </div>

                    {/* Butonlar */}
                    <div className="flex flex-col gap-1 ml-1">
                          {/* Eğer bilinenlerdeyse -> Çıkar, Değilse -> Ekle */}
                          {isKnown ? (
                            <button onClick={() => removeFromKnown(item.id)} className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Öğrenilenlerden Çıkar"><RotateCcw className="w-5 h-5"/></button>
                          ) : (
                            <button onClick={() => addToKnown(item.id)} className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Öğrenildi İşaretle"><Check className="w-5 h-5"/></button>
                          )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* DAHA FAZLA YÜKLE BUTONU */}
            {visibleCount < filteredWords.length && (
                <button 
                   onClick={handleLoadMore}
                    className="w-full py-4 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
                >
                   <ArrowDownCircle className="w-5 h-5"/>
                    Daha Fazla Göster ({filteredWords.length - visibleCount} kaldı)
               </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
