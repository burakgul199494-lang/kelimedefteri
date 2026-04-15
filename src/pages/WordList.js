import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { 
  ArrowLeft, Volume2, RotateCcw, Check, Trophy, 
  Clock, Search, BookOpen, Info, Quote, Tag as TagIcon 
} from "lucide-react";
import { Virtuoso } from "react-virtuoso";

export default function WordList() {
  const { type } = useParams(); 
  const navigate = useNavigate();
  const { knownWordIds, getAllWords, removeFromKnown, addToKnown, learningQueue } = useData();

  // Arama State'leri (Artık Debounce ile çalışacak)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [tick, setTick] = useState(0);

  // Debounce (Gecikmeli Arama)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Saniye Sayacı
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const isKnown = type === "known";
  const isWaiting = type === "waiting";

  let title = "Kelime Listesi";
  let wordList = [];
  const all = getAllWords();
  const now = new Date();

  // --- SEVİYE HESAPLAMA ---
  const wordsWithDetails = all.map(word => {
      const qItem = learningQueue ? learningQueue.find(q => String(q.wordId) === String(word.id)) : null;
      let level = 0;
      if (knownWordIds.map(String).includes(String(word.id))) level = 6; 
      else if (qItem) level = qItem.level || 0; 
      else level = 0; 

      return { ...word, queueData: qItem, level };
  });

  // --- LİSTELEME MANTIĞI ---
  if (isKnown) {
    title = "Öğrendiğim Kelimeler";
    wordList = wordsWithDetails.filter(w => w.level === 6);
  } else if (isWaiting) {
    title = "Bekleyen Kelimeler";
    wordList = wordsWithDetails.filter(w => w.queueData && new Date(w.queueData.nextReview) > now);
  } else {
    title = "Öğreneceğim Kelimeler";
    wordList = wordsWithDetails.filter(w => {
        if (w.level === 0) return true;
        if (w.queueData && new Date(w.queueData.nextReview) <= now) return true;
        return false;
    });
  }

  // --- ARAMA VE SIRALAMA ---
  const filteredWords = wordList
    .filter(w => w.word.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.word.localeCompare(b.word);
    });

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

  // --- SÜRE HESAPLAMA ---
  const getTimeRemaining = (dateString) => {
      const diff = new Date(dateString) - new Date();
      if (diff <= 0) return "Şimdi!";
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      let parts = [];
      if (days > 0) parts.push(`${days}g`);
      if (hours > 0) parts.push(`${hours}sa`);
      if (minutes > 0) parts.push(`${minutes}dk`);
      parts.push(`${seconds}sn`);
      return parts.join(" ");
  };

  // --- ROZETLER ---
  const getLevelBadge = (level) => {
      switch(level) {
        case 0: return <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Lvl 0 (Yeni)</span>;
        case 1: return <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Lvl 1 (24s)</span>;
        case 2: return <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Lvl 2 (3g)</span>;
        case 3: return <span className="bg-violet-100 text-violet-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Lvl 3 (1h)</span>;
        case 4: return <span className="bg-purple-100 text-purple-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Lvl 4 (2h)</span>;
        case 5: return <span className="bg-fuchsia-100 text-fuchsia-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">Lvl 5 (1ay)</span>;
        case 6: return <span className="bg-green-100 text-green-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1"><Trophy className="w-3 h-3"/> Master</span>;
        default: return null;
      }
  };

  // --- YENİ MODERN KART TASARIMI ---
  const renderWordCard = (index, item) => (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 mx-1 overflow-hidden">
          {/* ÜST BİLGİ ŞERİDİ & BUTONLAR */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-black text-slate-800 tracking-tight">{item.word}</span>
                  {item.phonetic && (
                     <span className="text-xs text-indigo-400 font-serif italic bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                         /{item.phonetic.replace(/\//g, '')}/
                     </span>
                  )}
                  <button onClick={(e)=>speak(item.word, e)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-full transition-colors">
                      <Volume2 className="w-4 h-4"/>
                  </button>
              </div>

              {/* HIZLI AKSİYON BUTONLARI */}
              <div className="flex gap-2">
                  {item.level === 6 ? (
                      <button onClick={() => removeFromKnown(item.id)} className="flex items-center gap-1.5 p-2 px-3 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-sm">
                          <RotateCcw className="w-4 h-4"/> Unuttum
                      </button>
                  ) : (
                      <button onClick={() => addToKnown(item.id)} className="flex items-center gap-1.5 p-2 px-3 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-all shadow-sm">
                          <Check className="w-4 h-4"/> Biliyorum
                      </button>
                  )}
              </div>
          </div>

          <div className="p-4 space-y-4">
              {/* ROZETLER VE SAYAÇ */}
              <div className="flex flex-wrap items-center gap-2">
                  {getLevelBadge(item.level)}
                  {item.tags && item.tags.map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          <TagIcon className="w-3 h-3"/> {tag}
                      </span>
                  ))}
                  {item.queueData && new Date(item.queueData.nextReview) > new Date() && (
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                          <Clock className="w-3 h-3"/> Bekliyor: {getTimeRemaining(item.queueData.nextReview)}
                      </div>
                  )}
              </div>

              {/* ANLAMLAR VE AÇIKLAMALAR */}
              <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      <BookOpen className="w-3 h-3"/> Anlamlar
                  </div>
                  {item.definitions?.map((def, idx) => (
                     <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-white uppercase bg-slate-400 px-1.5 py-0.5 rounded">
                              {getShortType(def.type)}
                           </span>
                           <span className="font-bold text-slate-700">{def.meaning}</span>
                        </div>
                        {def.engExplanation && (
                            <div className="text-xs text-slate-600 pl-2 border-l-2 border-indigo-200">
                                {def.engExplanation}
                            </div>
                        )}
                        {def.trExplanation && (
                            <div className="text-xs text-slate-500 pl-2 border-l-2 border-green-200 italic">
                                {def.trExplanation}
                            </div>
                        )}
                     </div>
                  ))}
              </div>

              {/* DİLBİLGİSİ ÇEKİMLERİ */}
              {(item.plural || item.v2 || item.v3 || item.vIng || item.thirdPerson || item.advLy || item.compEr || item.superEst) && (
                  <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                          <Info className="w-3 h-3"/> Formlar
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                          {item.plural && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200"><b>Pl:</b> {item.plural}</span>}
                          {item.v2 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100"><b>V2:</b> {item.v2}</span>}
                          {item.v3 && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-100"><b>V3:</b> {item.v3}</span>}
                          {item.vIng && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200"><b>Ing:</b> {item.vIng}</span>}
                          {item.advLy && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100"><b>Adv:</b> {item.advLy}</span>}
                      </div>
                  </div>
              )}

              {/* ÖRNEK CÜMLE */}
              {item.sentence && (
                  <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 relative">
                      <div className="flex gap-3 items-start">
                          <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full transition-colors">
                              <Volume2 className="w-4 h-4"/>
                          </button>
                          <div className="space-y-1">
                              <p className="text-sm font-medium text-indigo-900 italic">"{item.sentence}"</p>
                              {item.sentence_tr && (
                                  <p className="text-xs text-indigo-500 font-medium pt-1">{item.sentence_tr}</p>
                              )}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        
        <div className="sticky top-0 bg-slate-50/80 backdrop-blur-md py-4 z-10 flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full mt-1 w-max">
                {filteredWords.length} Kelime
            </p>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-4 text-slate-300 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Kelime ara..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-12 p-4 bg-white border-2 border-slate-100 rounded-2xl outline-none shadow-sm focus:border-indigo-200 font-medium text-slate-600 transition-all" 
          />
        </div>

        {filteredWords.length === 0 ? (
            <div className="text-center text-slate-400 mt-20 p-6 bg-white rounded-2xl border border-dashed border-slate-200">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300"/>
                <p className="font-medium">Bu listede kelime bulunamadı.</p>
            </div>
        ) : (
            <div className="min-h-[500px] pb-20">
              <Virtuoso
                useWindowScroll
                data={filteredWords}
                itemContent={renderWordCard}
              />
            </div>
        )}
      </div>
    </div>
  );
}
