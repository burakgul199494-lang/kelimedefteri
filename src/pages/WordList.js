import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { ArrowLeft, Volume2, RotateCcw, Check, Trophy, ArrowDownCircle, Hourglass, Layers, Clock } from "lucide-react";

export default function WordList() {
  const { type } = useParams(); // "known", "unknown" veya "waiting"
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

  // --- 1. KELİME DETAYLARINI HAZIRLA (SRS VERİLERİ) ---
  // Her kelimenin içine kuyruk bilgisini (varsa) ekliyoruz.
  const wordsWithDetails = all.map(word => {
      const qItem = learningQueue ? learningQueue.find(q => q.wordId === word.id) : null;
      return { ...word, queueData: qItem };
  });

  // Kuyruktaki kelimelerin ID listesi (Filtreleme için)
  const queueIds = learningQueue ? learningQueue.map(q => q.wordId) : [];

  // --- 2. LİSTELEME MANTIĞI ---
  if (isKnown) {
    // ÖĞRENİLENLER
    title = "Öğrendiğim Kelimeler";
    wordList = wordsWithDetails.filter(w => knownWordIds.includes(w.id));

  } else if (isWaiting) {
    // SÜREÇTEKİLER (Bekleyen + Zamanı Gelenler)
    title = "Süreçteki Kelimeler";
    wordList = wordsWithDetails.filter(w => queueIds.includes(w.id));

  } else {
    // ÖĞRENECEKLERİM (Sıfır Kelimeler)
    title = "Öğreneceğim Kelimeler";
    // Hem mezun değil hem de süreçte değil
    wordList = wordsWithDetails.filter(w => !knownWordIds.includes(w.id) && !queueIds.includes(w.id));
  }

  // --- 3. ARAMA VE SIRALAMA ---
  const filteredWords = wordList
    .filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
        // Eğer Bekleme listesiyse, en yakın zamanı en üste koy
        if (isWaiting && a.queueData && b.queueData) {
            return new Date(a.queueData.nextReview) - new Date(b.queueData.nextReview);
        }
        // Diğerlerinde alfabetik
        return a.word.localeCompare(b.word);
    });

  const displayedWords = filteredWords.slice(0, visibleCount);

  // --- 4. YARDIMCI FONKSİYONLAR ---
  useEffect(() => { setVisibleCount(PER_PAGE); }, [search, type]);
  
  const handleLoadMore = () => { setVisibleCount(prev => prev + PER_PAGE); };

  const speak = (txt, e) => {
    e.stopPropagation();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const getTimeRemaining = (dateString) => {
      const target = new Date(dateString);
      const diff = target - new Date();
      
      if (diff <= 0) return "Şimdi!";

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) return `${days} gün`;
      if (hours > 0) return `${hours} sa`;
      return `${minutes} dk`;
  };

  const getShortType = (t) => ({ noun: "noun", verb: "verb", adjective: "adj", adverb: "adv" }[t] || t);

  // --- 5. ARAYÜZ (JSX) ---
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
          type="text" placeholder="Kelime ara..." value={search} onChange={e => setSearch(e.target.value)} 
          className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:border-indigo-300 transition-colors" 
        />

        {/* Liste */}
        {displayedWords.length === 0 ? (
          <div className="text-center text-slate-400 mt-20 flex flex-col items-center">
            {isKnown ? <Trophy className="w-16 h-16 mb-4 text-green-200 opacity-50"/> : isWaiting ? <Hourglass className="w-16 h-16 mb-4 text-amber-200 opacity-50"/> : <Layers className="w-16 h-16 mb-4 text-blue-200 opacity-50"/>}
            <p className="font-medium text-slate-500">Liste boş.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-10">
            {displayedWords.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 animate-in fade-in">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    
                    {/* Başlık Satırı */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-lg font-bold text-slate-800 leading-none">{item.word}</span>
                      
                      {/* --- SEVİYE VE GERİ SAYIM ROZETİ (YENİ) --- */}
                      {item.queueData && (
                          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                              new Date(item.queueData.nextReview) <= new Date() 
                              ? "bg-green-100 text-green-700 border-green-200" // Zamanı gelmişse Yeşil
                              : "bg-slate-100 text-slate-500 border-slate-200" // Bekliyorsa Gri
                          }`}>
                              <span>Lvl {item.queueData.level}</span>
                              <span className="opacity-50">|</span>
                              <Clock className="w-3 h-3"/>
                              <span>{getTimeRemaining(item.queueData.nextReview)}</span>
                          </div>
                      )}

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

                    {/* Ekstra Bilgiler (V2, V3 vb.) */}
                    {(item.plural || item.v2 || item.v3 || item.vIng || item.thirdPerson) && (
                        <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="flex flex-wrap gap-2">
                            {item.plural && <div><span className="font-bold text-slate-400">Pl:</span> {item.plural}</div>}
                            {item.v2 && <div><span className="font-bold text-slate-400">V2:</span> {item.v2}</div>}
                            {item.v3 && <div><span className="font-bold text-slate-400">V3:</span> {item.v3}</div>}
                          </div>
                        </div>
                    )}
                    
                    {/* Cümle */}
                    <div className="mt-3 pt-2 border-t border-slate-50 flex gap-2 items-start group">
                        <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-1 text-slate-300 hover:text-indigo-500 transition-colors"><Volume2 className="w-3.5 h-3.5"/></button>
                        <div className="text-xs text-slate-400 italic leading-relaxed py-0.5">"{item.sentence}"</div>
                    </div>

                  </div>

                  {/* Butonlar */}
                  <div className="flex flex-col gap-1 ml-1">
                        {isKnown ? (
                          <button onClick={() => removeFromKnown(item.id)} className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Öğrenilenlerden Çıkar"><RotateCcw className="w-5 h-5"/></button>
                        ) : (
                          <button onClick={() => addToKnown(item.id)} className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Öğrenildi İşaretle"><Check className="w-5 h-5"/></button>
                        )}
                  </div>
                </div>
              </div>
            ))}

            {/* DAHA FAZLA YÜKLE */}
            {visibleCount < filteredWords.length && (
                <button onClick={handleLoadMore} className="w-full py-4 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
                   <ArrowDownCircle className="w-5 h-5"/> Daha Fazla Göster ({filteredWords.length - visibleCount} kaldı)
               </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
