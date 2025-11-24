import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import WordCard from "../components/WordCard";
import { ArrowLeft, Search, X, BookOpen, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dictionary() {
  const { getAllWords } = useData();
  const navigate = useNavigate();
  
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [debouncedTerm, setDebouncedTerm] = useState(term);

  // Yazma işlemi bittikten kısa bir süre sonra aramayı tetikle (Performans için)
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedTerm(term);
    }, 300); // 300ms bekleme
    return () => clearTimeout(timer);
  }, [term]);

  // Arama Mantığı (Debounced Term değişince çalışır)
  useEffect(() => {
    const cleanTerm = debouncedTerm.toLowerCase().trim();
    
    if (!cleanTerm) {
        setResults([]);
        return;
    }

    const allWords = getAllWords();
    
    const filtered = allWords.filter(item => {
        // 1. İngilizce kelime içinde geçiyor mu?
        if (item.word.toLowerCase().includes(cleanTerm)) return true;
        
        // 2. Türkçe anlamların içinde geçiyor mu?
        if (item.definitions.some(d => d.meaning.toLowerCase().includes(cleanTerm))) return true;

        // 3. Fiil çekimlerinde geçiyor mu? (Opsiyonel)
        if (item.v2?.toLowerCase().includes(cleanTerm)) return true;
        if (item.v3?.toLowerCase().includes(cleanTerm)) return true;
        
        return false;
    });

    setResults(filtered);

  }, [debouncedTerm, getAllWords]);

  // Input temizleme
  const handleClear = () => {
      setTerm("");
      setResults([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        
        {/* Üst Bar */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Sözlük</h2>
        </div>

        {/* Arama Kutusu */}
        <div className="relative group">
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

        {/* Sonuçlar */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Durum 1: Arama yapılıyor ama sonuç yok */}
            {debouncedTerm && results.length === 0 && (
                <div className="text-center bg-red-50 p-6 rounded-2xl border border-red-100">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2"/>
                    <p className="text-red-600 font-medium">"{debouncedTerm}" bulunamadı.</p>
                    <p className="text-xs text-red-400 mt-1">Yeni kelime ekleme sayfasından ekleyebilirsin.</p>
                </div>
            )}

            {/* Durum 2: Sonuçlar var */}
            {results.length > 0 && (
                <>
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-2">
                        {results.length} Sonuç Bulundu
                    </div>
                    {results.map((resultWord) => (
                        <div key={resultWord.id} className="flex justify-center">
                            <WordCard wordObj={resultWord} />
                        </div>
                    ))}
                </>
            )}

            {/* Durum 3: Arama kutusu boş (Başlangıç) */}
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
