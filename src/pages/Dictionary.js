import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import WordCard2 from "../components/WordCard2";
import QuickAddModal from "../components/QuickAddModal";
import { ArrowLeft, Search, X, AlertCircle, ArrowDownCircle, Plus, CopyPlus, BookOpen } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// İngilizce Alfabe Dizisi
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Dictionary() {
  const { getAllWords, isAdmin } = useData(); 
  const navigate = useNavigate();
  const location = useLocation();
  
  const [term, setTerm] = useState(location.state?.addedWord || "");
  const [debouncedTerm, setDebouncedTerm] = useState(term);
  
  // YENİ: Harf seçimi için state (Varsayılan: A)
  const [activeLetter, setActiveLetter] = useState("A");

  const [results, setResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const PER_PAGE = 50;

  // Gecikmeli Arama (Debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  // Ana Filtreleme Mantığı (Harf Modu vs Arama Modu)
  useEffect(() => {
    const cleanTerm = debouncedTerm.toLowerCase().trim();
    const allWords = getAllWords();
    
    // EĞER ARAMA KUTUSU BOŞSA: HARFE GÖRE FİLTRELE
    if (!cleanTerm) {
        const filteredByLetter = allWords
            .filter(item => item.word.toLowerCase().startsWith(activeLetter.toLowerCase()))
            .sort((a, b) => a.word.localeCompare(b.word));
        
        setResults(filteredByLetter);
        setVisibleCount(PER_PAGE);
        return;
    }

    // EĞER ARAMA YAPILIYORSA: TÜM SÖZLÜKTE ARA
    const filtered = allWords.filter(item => {
        if (item.word.toLowerCase().includes(cleanTerm)) return true;
        if (item.definitions.some(d => d.meaning.toLowerCase().includes(cleanTerm))) return true;
        if (item.v2?.toLowerCase().includes(cleanTerm)) return true;
        if (item.v3?.toLowerCase().includes(cleanTerm)) return true;
        if (item.vIng?.toLowerCase().includes(cleanTerm)) return true;
        if (item.plural?.toLowerCase().includes(cleanTerm)) return true;
        if (item.thirdPerson?.toLowerCase().includes(cleanTerm)) return true;
        return false;
    }).sort((a, b) => {
        const aWord = a.word.toLowerCase();
        const bWord = b.word.toLowerCase();
        
        if (aWord === cleanTerm && bWord !== cleanTerm) return -1;
        if (bWord === cleanTerm && aWord !== cleanTerm) return 1;
        
        const aStarts = aWord.startsWith(cleanTerm);
        const bStarts = bWord.startsWith(cleanTerm);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;
        return aWord.localeCompare(bWord);
    });

    setResults(filtered);
    setVisibleCount(PER_PAGE);

  }, [debouncedTerm, activeLetter, getAllWords]);

  const handleClear = () => {
      setTerm("");
      // Arama silinince sonuçları boşaltmak yerine useEffect'in Harf moduna geçmesini bekliyoruz
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PER_PAGE);
  };

  const handleSuccess = () => {
      setShowQuickAdd(false);
      const currentTerm = term;
      setTerm(""); 
      setTimeout(() => setTerm(currentTerm), 50);
  };

  const displayedResults = results.slice(0, visibleCount);
  const cleanSearch = debouncedTerm.toLowerCase().trim();
  const exactMatchFound = results.some(r => r.word.toLowerCase() === cleanSearch);

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">

      {showQuickAdd && (
        <QuickAddModal 
            initialWord={term}
            onClose={() => setShowQuickAdd(false)} 
            onSuccess={handleSuccess}
        />
      )}

      <div className="w-full max-w-md space-y-4">
        
        {/* Üst Bar */}
        <div className="sticky top-0 bg-slate-50 py-2 z-20 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Sözlük</h2>
        </div>

        {/* Arama Kutusu */}
        <div className="relative group z-10">
          <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Kelime veya anlam ara..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full pl-12 pr-12 p-4 rounded-2xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
          />
          {term && (
            <button onClick={handleClear} className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* YENİ: Alfabe Fihristi (Sadece Arama Yapılmıyorken Görünür) */}
        {!debouncedTerm && (
            <div className="flex overflow-x-auto gap-2 py-2 pb-4 scrollbar-hide">
                {alphabet.map(letter => (
                    <button
                        key={letter}
                        onClick={() => {
                            setActiveLetter(letter);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`shrink-0 w-10 h-10 rounded-full font-black text-sm flex items-center justify-center transition-all duration-300 shadow-sm
                            ${activeLetter === letter 
                                ? 'bg-indigo-600 text-white shadow-indigo-200 scale-110' 
                                : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                            }
                        `}
                    >
                        {letter}
                    </button>
                ))}
            </div>
        )}

        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            
            {/* 1. HİÇ SONUÇ YOKSA */}
            {results.length === 0 && (
              <div className="text-center text-slate-400 mt-10 space-y-3 bg-white p-6 rounded-2xl border border-dashed border-slate-200">
                {debouncedTerm ? (
                    <>
                        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-400"/>
                        <p className="font-medium text-slate-500">Sözlükte bulunamadı.</p>
                    </>
                ) : (
                    <>
                        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-400"/>
                        <p className="font-medium text-slate-500">"{activeLetter}" harfi ile başlayan kelime henüz eklenmemiş.</p>
                    </>
                )}
              </div>
            )}

            {/* 2. ADMİN EKLEME BUTONU (Sadece arama yapılıyorsa görünsün) */}
            {isAdmin && debouncedTerm && (
                <button
                    onClick={() => setShowQuickAdd(true)}
                    className={`
                        w-full py-3 border-2 border-dashed rounded-xl font-bold transition flex items-center justify-center gap-2
                        ${exactMatchFound 
                            ? "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100" 
                            : "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100" 
                        }
                    `}
                >
                    {exactMatchFound ? <CopyPlus className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                    {exactMatchFound 
                        ? `"${term}" için YENİ ANLAM Ekle` 
                        : `"${term}" kelimesini Ekle`
                    }
                </button>
            )}

            {/* 3. SONUÇ LİSTESİ */}
            {displayedResults.length > 0 && (
                <>
                    <div className="text-center text-xs font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 py-1.5 px-4 rounded-full w-max mx-auto border border-indigo-100">
                        {debouncedTerm ? "Arama Sonuçları: " : `${activeLetter} Harfi: `} {results.length} Kelime
                    </div>
                    
                    {displayedResults.map((resultWord) => (
                        <div key={resultWord.id} className="flex justify-center">
                            <WordCard2 wordObj={resultWord} />
                        </div>
                    ))}

                    {visibleCount < results.length && (
                        <button 
                            onClick={handleLoadMore}
                            className="w-full py-4 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors shadow-sm"
                        >
                            <ArrowDownCircle className="w-5 h-5"/>
                            Daha Fazla Göster ({results.length - visibleCount} kaldı)
                        </button>
                    )}
                </>
            )}

        </div>
      </div>
    </div>
  );
}
