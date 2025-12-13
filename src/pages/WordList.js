import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { ArrowLeft, Volume2, RotateCcw, Check, ArrowDownCircle, Hourglass, Trophy, Layers } from "lucide-react";

export default function WordList() {
  const { type } = useParams(); // "known", "unknown" veya "waiting"
  const navigate = useNavigate();
  const { 
    knownWordIds, getAllWords, learningQueue,
    removeFromKnown, addToKnown 
  } = useData();

  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(50); 
  const PER_PAGE = 50; 

  const isKnown = type === "known";
  const isWaiting = type === "waiting";

  let title = "Kelime Listesi";
  let wordList = [];
  const all = getAllWords();

  // --- LİSTELEME MANTIĞI ---
  if (isKnown) {
    // 1. Öğrenilenler
    title = "Öğrendiğim Kelimeler";
    wordList = all.filter(w => knownWordIds.includes(w.id));
  } else if (isWaiting) {
    // 2. Beklemede Olanlar
    title = "Tekrar Bekleyenler";
    // learningQueue içinde olup, tarihi GELECEKTE olanlar
    const now = new Date();
    const waitingIds = learningQueue
        .filter(q => new Date(q.nextReview) > now)
        .map(q => q.wordId);
    
    wordList = all.filter(w => waitingIds.includes(w.id));
  } else {
    // 3. Öğreneceğim (Kalanlar)
    // Ne bilinenlerde ne de öğrenme kuyruğunda (beklemede) olmayanlar
    // Not: Basitlik için sadece "Bilinmeyenler" olarak filtreliyoruz.
    title = "Öğreneceğim Kelimeler";
    wordList = all.filter(w => !knownWordIds.includes(w.id));
    
    // Eğer 'Bekleyenler' listesindekileri de 'Öğreneceğim' listesinden düşmek istersen:
    // const waitingIds = learningQueue.map(q => q.wordId);
    // wordList = wordList.filter(w => !waitingIds.includes(w.id));
    // Ancak genellikle 'Bilinmeyenler' havuzunda durması kullanıcıya 'daha çalışılacak var' hissi verir, tercih senin.
    // Şimdilik sadece Known olmayanları gösteriyoruz.
  }

  // Arama ve Sıralama
  const filteredWords = wordList
    .filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.word.localeCompare(b.word));

  const displayedWords = filteredWords.slice(0, visibleCount);

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
          placeholder="Listede ara..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:border-indigo-300 transition-colors" 
        />

        {/* Liste */}
        {displayedWords.length === 0 ? (
          <div className="text-center text-slate-400 mt-20 flex flex-col items-center">
            {isKnown ? <Trophy className="w-16 h-16 mb-4 text-green-200"/> : isWaiting ? <Hourglass className="w-16 h-16 mb-4 text-amber-200"/> : <Layers className="w-16 h-16 mb-4 text-blue-200"/>}
            <p className="font-medium text-slate-500">Liste boş.</p>
            {isWaiting && <p className="text-xs mt-2 max-w-xs">Şu an tekrar etmen için bekleyen kelime yok. Kelime çalıştıkça burası dolacak.</p>}
          </div>
        ) : (
          <div className="space-y-3 pb-10">
            {displayedWords.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 animate-in fade-in">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    
                    {/* Başlık */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-lg font-bold text-slate-800 leading-none">{item.word}</span>
                      <button onClick={(e)=>speak(item.word, e)} className="p-1 text-indigo-400 hover:text-indigo-600 bg-indigo-50 rounded-full transition-colors">
                        <Volume2 className="w-3.5 h-3.5"/>
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

                    {/* Örnek Cümle */}
                    <div className="mt-3 pt-2 border-t border-slate-50 flex gap-2 items-start group">
                        <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-1 text-slate-300 hover:text-indigo-500 transition-colors"><Volume2 className="w-3.5 h-3.5"/></button>
                        <div className="text-xs text-slate-400 italic leading-relaxed py-0.5">"{item.sentence}"</div>
                    </div>

                  </div>

                  {/* Butonlar */}
                  <div className="flex flex-col gap-1 ml-1">
                    {/* Eğer "Beklemede" veya "Bilinmeyen" ise -> Öğrenildi (Check) butonu */}
                    {!isKnown && (
                        <button onClick={() => addToKnown(item.id)} className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Öğrenildi İşaretle">
                            <Check className="w-5 h-5"/>
                        </button>
                    )}
                    
                    {/* Eğer "Öğrenilen" ise -> Geri al (Rotate) butonu */}
                    {isKnown && (
                        <button onClick={() => removeFromKnown(item.id)} className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Öğrenilenlerden Çıkar">
                            <RotateCcw className="w-5 h-5"/>
                        </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* DAHA FAZLA YÜKLE */}
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
