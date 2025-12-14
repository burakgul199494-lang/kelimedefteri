import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { ArrowLeft, Volume2, RotateCcw, Check, Trophy, ArrowDownCircle, Hourglass, Layers, Clock, BarChart } from "lucide-react";

export default function WordList() {
  const { type } = useParams(); 
  const navigate = useNavigate();
  const { knownWordIds, getAllWords, removeFromKnown, addToKnown, learningQueue } = useData();

  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const PER_PAGE = 50;

  const isKnown = type === "known";
  const isWaiting = type === "waiting";

  let title = "Kelime Listesi";
  let wordList = [];
  const all = getAllWords();
  const now = new Date();

  // --- KELİME DETAYLARINI VE SEVİYELERİNİ HAZIRLA ---
  const wordsWithDetails = all.map(word => {
      const qItem = learningQueue ? learningQueue.find(q => q.wordId === word.id) : null;
      let level = 0;
      
      if (knownWordIds.includes(word.id)) {
          level = 3; // Mezun
      } else if (qItem) {
          level = qItem.level || 0; // 1 veya 2
      } else {
          level = 0; // Hiç başlanmamış
      }

      return { ...word, queueData: qItem, level };
  });

  // --- LİSTELEME MANTIĞI (Senin yeni sistemine göre) ---
  if (isKnown) {
    title = "Öğrendiğim Kelimeler (Lvl 3)";
    wordList = wordsWithDetails.filter(w => w.level === 3);

  } else if (isWaiting) {
    title = "Bekleyen Kelimeler";
    // Sadece süresi gelmeyenler
    wordList = wordsWithDetails.filter(w => w.queueData && new Date(w.queueData.nextReview) > now);

  } else {
    // UNKNOWN (Öğreneceğim) = Lvl 0 + Süresi Gelenler
    title = "Öğreneceğim Kelimeler";
    wordList = wordsWithDetails.filter(w => {
        if (w.level === 0) return true; // Yeni
        if (w.queueData && new Date(w.queueData.nextReview) <= now) return true; // Süresi gelmiş
        return false;
    });
  }

  // --- ARAMA VE SIRALAMA ---
  const filteredWords = wordList
    .filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
        // Seviyesi yüksek olanlar aşağıda dursun (veya yukarıda, tercihe bağlı)
        if (a.level !== b.level) return a.level - b.level;
        return a.word.localeCompare(b.word);
    });

  const displayedWords = filteredWords.slice(0, visibleCount);

  // --- YARDIMCI ---
  useEffect(() => { setVisibleCount(PER_PAGE); }, [search, type]);
  const handleLoadMore = () => { setVisibleCount(prev => prev + PER_PAGE); };
  const speak = (txt, e) => { e.stopPropagation(); const u = new SpeechSynthesisUtterance(txt); u.lang = "en-US"; window.speechSynthesis.speak(u); };

  const getTimeRemaining = (dateString) => {
      const diff = new Date(dateString) - new Date();
      if (diff <= 0) return "Şimdi!";
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return `${hours} saat`;
  };

  const getLevelBadge = (level) => {
      if (level === 0) return <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded border border-slate-200">Lvl 0 (Yeni)</span>;
      if (level === 1) return <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded border border-blue-200">Lvl 1</span>;
      if (level === 2) return <span className="bg-purple-100 text-purple-600 text-[10px] px-2 py-0.5 rounded border border-purple-200">Lvl 2</span>;
      if (level === 3) return <span className="bg-green-100 text-green-600 text-[10px] px-2 py-0.5 rounded border border-green-200">Lvl 3 (Mezun)</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        
        {/* Üst Bar */}
        <div className="sticky top-0 bg-slate-50 py-2 z-10 flex items-center gap-3 mb-4 shadow-sm px-2 rounded-b-xl">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600"/></button>
          <div>
              <h2 className="text-xl font-bold text-slate-800">{title}</h2>
              <div className="text-xs text-slate-400 font-bold">{filteredWords.length} kelime</div>
          </div>
        </div>

        <input type="text" placeholder="Kelime ara..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:border-indigo-300" />

        {/* Liste */}
        {displayedWords.length === 0 ? (
          <div className="text-center text-slate-400 mt-20"><p>Liste boş.</p></div>
        ) : (
          <div className="space-y-3 pb-10">
            {displayedWords.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-lg font-bold text-slate-800 leading-none">{item.word}</span>
                      
                      {/* --- SEVİYE VE SÜRE GÖSTERGESİ --- */}
                      {getLevelBadge(item.level)}
                      
                      {item.queueData && new Date(item.queueData.nextReview) > new Date() && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                              <Clock className="w-3 h-3"/> {getTimeRemaining(item.queueData.nextReview)}
                          </div>
                      )}

                      <button onClick={(e)=>speak(item.word, e)} className="p-1 text-indigo-400 bg-indigo-50 rounded-full"><Volume2 className="w-4 h-4"/></button>
                    </div>
                    
                    <div className="text-sm text-slate-600">{item.definitions[0]?.meaning}</div>
                  </div>

                  <div className="flex flex-col gap-1 ml-1">
                        {isKnown ? (
                          <button onClick={() => removeFromKnown(item.id)} className="p-2 text-slate-300 hover:text-amber-500 rounded-lg"><RotateCcw className="w-5 h-5"/></button>
                        ) : (
                          <button onClick={() => addToKnown(item.id)} className="p-2 text-slate-300 hover:text-green-500 rounded-lg"><Check className="w-5 h-5"/></button>
                        )}
                  </div>
                </div>
              </div>
            ))}
            {visibleCount < filteredWords.length && (
                <button onClick={handleLoadMore} className="w-full py-4 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100">
                   <ArrowDownCircle className="w-5 h-5"/> Daha Fazla
               </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
