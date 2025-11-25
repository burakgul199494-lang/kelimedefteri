import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { ArrowLeft, Search, X, BookOpen, AlertCircle, Volume2, ArrowDownCircle, Edit2, Check, RotateCcw, Trash2 } from "lucide-react";
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
  
  // --- SAYFALAMA STATE ---
  const [visibleCount, setVisibleCount] = useState(50);
  const PER_PAGE = 50;

  // Debounce (Gecikmeli Arama)
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  // Arama Mantığı
  useEffect(() => {
    const cleanTerm = debouncedTerm.toLowerCase().trim();
    
    // Arama kutusu boşsa listeyi temizle (Sözlük mantığı)
    if (!cleanTerm) {
        setResults([]);
        return;
    }

    const allWords = getAllWords();
    
    const filtered = allWords.filter(item => {
        // 1. İngilizce kelime
        if (item.word.toLowerCase().includes(cleanTerm)) return true;
        // 2. Türkçe anlamlar
        if (item.definitions.some(d => d.meaning.toLowerCase().includes(cleanTerm))) return true;
        // 3. Fiil çekimleri
        if (item.v2?.toLowerCase().includes(cleanTerm)) return true;
        if (item.v3?.toLowerCase().includes(cleanTerm)) return true;
        
        return false;
    }).sort((a, b) => a.word.localeCompare(b.word)); // Alfabetik sırala

    setResults(filtered);
    setVisibleCount(PER_PAGE); // Her yeni aramada sayacı sıfırla

  }, [debouncedTerm, getAllWords]);

  const handleClear = () => {
      setTerm("");
      setResults([]);
  };

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

  // Görüntülenecek dilim
  const displayedResults = results.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        
        {/* Üst Bar */}
        <div className="sticky top-0 bg-slate-50 py-2 z-10 flex items-center gap-3 mb-4 shadow-sm px-2 rounded-b-xl">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Sözlük</h2>
        </div>

        {/* Arama Kutusu */}
        <div className="relative group mb-6">
          <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Kelime veya anlam ara..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full pl-12 pr-12 p-4 rounded-2xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            autoFocus
          />
          {term && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* --- LİSTE ALANI --- */}
        <div className="space-y-3 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Durum 1: Sonuç Yok */}
            {debouncedTerm && results.length === 0 && (
                <div className="text-center bg-red-50 p-6 rounded-2xl border border-red-100">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2"/>
                    <p className="text-red-600 font-medium">"{debouncedTerm}" bulunamadı.</p>
                    <div className="mt-4">
                        <button onClick={() => navigate("/add-word")} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-red-50">
                            Yeni Kelime Olarak Ekle
                        </button>
                    </div>
                </div>
            )}

            {/* Durum 2: Sonuçlar Listeleniyor */}
            {displayedResults.length > 0 && (
                <>
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-2 mb-2">
                        {results.length} Sonuç Bulundu
                    </div>
                    
                    {displayedResults.map((item) => {
                        const isKnown = knownWordIds.includes(item.id);
                        const handleEdit = () => navigate("/add-word", { state: { editingWord: item } });

                        return (
                            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2">
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

                                    {/* Örnek Cümle */}
                                    <div className="mt-3 pt-2 border-t border-slate-50 flex gap-2 items-start group">
                                        <button onClick={(e)=>speak(item.sentence, e)} className="shrink-0 p-1 text-slate-300 hover:text-indigo-500 transition-colors"><Volume2 className="w-3.5 h-3.5"/></button>
                                        <div className="text-xs text-slate-400 italic leading-relaxed py-0.5">"{item.sentence}"</div>
                                    </div>
                                    </div>

                                    {/* Butonlar (Liste ile Aynı) */}
                                    <div className="flex flex-col gap-1 ml-1">
                                        {item.source === "user" && (
                                            <button onClick={handleEdit} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                                        )}
                                        {isKnown ? (
                                            <button onClick={() => removeFromKnown(item.id)} className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Öğrenilenlerden Çıkar"><RotateCcw className="w-5 h-5"/></button>
                                        ) : (
                                            <button onClick={() => addToKnown(item.id)} className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Öğrenildi İşaretle"><Check className="w-5 h-5"/></button>
                                        )}
                                        {item.source === "user" && (
                                            <button onClick={() => handleDeleteWord(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="w-4 h-4"/></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Daha Fazla Yükle Butonu */}
                    {visibleCount < results.length && (
                        <button 
                            onClick={handleLoadMore}
                            className="w-full py-4 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
                        >
                            <ArrowDownCircle className="w-5 h-5"/>
                            Daha Fazla Göster ({results.length - visibleCount} kaldı)
                        </button>
                    )}
                </>
            )}

            {/* Durum 3: Başlangıç */}
            {!debouncedTerm && (
                <div className="text-center text-slate-400 mt-10 opacity-50">
                    <BookOpen className="w-20 h-20 mx-auto mb-4 stroke-1" />
                    <p>Aramak istediğin kelimeyi veya anlamını yaz.</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
