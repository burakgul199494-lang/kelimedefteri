import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import WordCard from "../components/WordCard";
import { ArrowLeft, Search, X, BookOpen, AlertCircle, ArrowDownCircle, Edit2, Check, RotateCcw, Trash2, Volume2 } from "lucide-react"; // Volume2 eklendi
import { useNavigate } from "react-router-dom";

export default function Dictionary() {
  const { 
    getAllWords, knownWordIds, 
    addToKnown, removeFromKnown, handleDeleteWord, restoreWord, permanentlyDeleteWord 
  } = useData();
  
  const navigate = useNavigate();
  
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [debouncedTerm, setDebouncedTerm] = useState(term);
  const [visibleCount, setVisibleCount] = useState(50);
  const PER_PAGE = 50;

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedTerm(term); }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  // --- AKILLI ARAMA VE SIRALAMA ---
  useEffect(() => {
    const cleanTerm = debouncedTerm.toLowerCase().trim();
    if (!cleanTerm) { setResults([]); return; }

    const allWords = getAllWords();
    
    const filtered = allWords.filter(item => {
        // Filtreleme mantığı (Aynı kalıyor)
        if (item.word.toLowerCase().includes(cleanTerm)) return true;
        if (item.definitions.some(d => d.meaning.toLowerCase().includes(cleanTerm))) return true;
        if (item.v2?.toLowerCase().includes(cleanTerm)) return true;
        if (item.v3?.toLowerCase().includes(cleanTerm)) return true;
        if (item.vIng?.toLowerCase().includes(cleanTerm)) return true;
        if (item.plural?.toLowerCase().includes(cleanTerm)) return true;
        if (item.thirdPerson?.toLowerCase().includes(cleanTerm)) return true;
        return false;
    }).sort((a, b) => {
        // --- YENİ SIRALAMA ALGORİTMASI ---
        const aWord = a.word.toLowerCase();
        const bWord = b.word.toLowerCase();
        
        // 1. Tam Eşleşme En Üste
        if (aWord === cleanTerm && bWord !== cleanTerm) return -1;
        if (bWord === cleanTerm && aWord !== cleanTerm) return 1;

        // 2. İle Başlayanlar İkinci Sıraya
        const aStarts = aWord.startsWith(cleanTerm);
        const bStarts = bWord.startsWith(cleanTerm);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        // 3. Geriye Kalanlar Alfabetik
        return aWord.localeCompare(bWord);
    });

    setResults(filtered);
    setVisibleCount(PER_PAGE);
  }, [debouncedTerm, getAllWords]);

  const handleClear = () => { setTerm(""); setResults([]); };
  const handleLoadMore = () => { setVisibleCount(prev => prev + PER_PAGE); };
  
  const speak = (txt, e) => {
    e.stopPropagation();
    const u = new SpeechSynthesisUtterance(txt); u.lang = "en-US"; window.speechSynthesis.speak(u);
  };

  const getShortType = (t) => ({ noun: "noun", verb: "verb", adjective: "adj", adverb: "adv", conjunction: "conj", prep: "prep", pronoun: "pron", article: "art" }[t] || t);

  const displayedResults = results.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        
        <div className="sticky top-0 bg-slate-50 py-2 z-20 flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
          <h2 className="text-2xl font-bold text-slate-800">Sözlük</h2>
        </div>

        <div className="relative group z-10">
          <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input type="text" placeholder="Kelime, anlam veya çekim ara..." value={term} onChange={(e) => setTerm(e.target.value)} className="w-full pl-12 pr-12 p-4 rounded-2xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium" autoFocus />
          {term && <button onClick={handleClear} className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>}
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            
            {debouncedTerm && results.length === 0 && (
                <div className="text-center bg-red-50 p-6 rounded-2xl border border-red-100">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2"/>
                    <p className="text-red-600 font-medium">"{debouncedTerm}" bulunamadı.</p>
                    <div className="mt-4">
                        {/* YENİ: Kelimeyi parametre olarak gönderiyoruz */}
                        <button onClick={() => navigate("/add-word", { state: { initialWord: debouncedTerm } })} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-red-50">
                            Yeni Kelime Olarak Ekle
                        </button>
                    </div>
                </div>
            )}

            {displayedResults.length > 0 && (
                <>
                    <div className="text-center text-sm font-bold text-slate-400 uppercase tracking-wider">{results.length} Sonuç Bulundu</div>
                    {displayedResults.map((item) => (
                        <div key={item.id} className="flex justify-center"><WordCard wordObj={item} /></div>
                    ))}
                    {visibleCount < results.length && (
                        <button onClick={handleLoadMore} className="w-full py-4 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"><ArrowDownCircle className="w-5 h-5"/> Daha Fazla Göster ({results.length - visibleCount} kaldı)</button>
                    )}
                </>
            )}

            {!debouncedTerm && (
                <div className="text-center text-slate-400 mt-10 opacity-50"><BookOpen className="w-20 h-20 mx-auto mb-4 stroke-1" /><p>Aramak istediğin kelimeyi veya anlamını yaz.</p></div>
            )}
        </div>
      </div>
    </div>
  );
}
