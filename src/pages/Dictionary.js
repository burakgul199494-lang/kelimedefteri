import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import WordCard2 from "../components/WordCard2";
import { ArrowLeft, Search, X, BookOpen, AlertCircle, ArrowDownCircle, PlusCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
// ✅ 1. IMPORT EKLENDİ
import QuickAddModal from "../components/QuickAddModal"; 

export default function Dictionary() {
  const { getAllWords, isAdmin } = useData(); 
  const navigate = useNavigate();
  const location = useLocation();
  
  const [term, setTerm] = useState(location.state?.addedWord || "");
  const [results, setResults] = useState([]);
  const [debouncedTerm, setDebouncedTerm] = useState(term);
  const [visibleCount, setVisibleCount] = useState(50);
  const PER_PAGE = 50;

  // ✅ 2. MODAL STATE'İ
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const cleanTerm = debouncedTerm ? debouncedTerm.toLowerCase().trim() : "";
    
    if (!cleanTerm) {
        setResults([]);
        return;
    }

    const allWords = getAllWords();
    
    const filtered = allWords.filter(item => {
        if (!item) return false;
        
        const wordText = item.word ? item.word.toLowerCase() : "";
        const definitions = item.definitions || [];

        if (wordText.includes(cleanTerm)) return true;
        if (definitions.some(d => d.meaning && d.meaning.toLowerCase().includes(cleanTerm))) return true;
        if (item.v2?.toLowerCase().includes(cleanTerm)) return true;
        if (item.v3?.toLowerCase().includes(cleanTerm)) return true;
        if (item.vIng?.toLowerCase().includes(cleanTerm)) return true;
        if (item.plural?.toLowerCase().includes(cleanTerm)) return true;
        if (item.thirdPerson?.toLowerCase().includes(cleanTerm)) return true;
        
        return false;
    }).sort((a, b) => {
        const aWord = a.word ? a.word.toLowerCase() : "";
        const bWord = b.word ? b.word.toLowerCase() : "";
        
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

  }, [debouncedTerm, getAllWords]);

  const handleClear = () => {
      setTerm("");
      setResults([]);
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PER_PAGE);
  };

  // ✅ 3. MODAL KAPANDIĞINDA
  const handleModalClose = () => {
      setShowQuickAdd(false); 
      setDebouncedTerm(term); // Listeyi yenile
  };

  const displayedResults = results.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center relative">
      
      {/* ✅ 4. MODAL BURADA VE SAĞLAM BİR YAPIYLA ÇAĞRILIYOR */}
      {showQuickAdd && isAdmin && (
          <QuickAddModal 
              onClose={handleModalClose}
              // 👇 İŞTE ÇÖZÜM BURASI: Eksik veri göndermiyoruz, her şeyi gönderiyoruz.
              prefillData={{ 
                  id: null,  // ID yok (Bu sayede Yeni Kayıt olduğunu anlar)
                  word: term, 
                  definitions: [{ meaning: "", type: "noun" }], // HATA VERMEMESİ İÇİN
                  tags: [], // INDEXOF HATASINI ÖNLEMEK İÇİN
                  phonetic: "",
                  sentence: "",
                  v2: "", v3: "", vIng: "", plural: "", thirdPerson: "",
                  advLy: "", compEr: "", superEst: ""
              }} 
          />
      )}

      <div className="w-full max-w-md space-y-6">
        
        <div className="sticky top-0 bg-slate-50 py-2 z-20 flex items-center gap-3 mb-2">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Sözlük</h2>
        </div>

        <div className="relative group z-10">
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
            <button onClick={handleClear} className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            
            {/* BULUNAMADI & ADMİN EKLEME BUTONU */}
            {debouncedTerm && results.length === 0 && (
                <div className="text-center text-slate-400 mt-4 flex flex-col items-center gap-3">
                    <div className="flex flex-col items-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                        <p>Sözlükte bulunamadı.</p>
                    </div>

                    {/* ✅ 5. SADECE ADMIN GÖRÜR - MODALI AÇAR */}
                    {isAdmin && (
                        <button 
                            onClick={() => setShowQuickAdd(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                        >
                            <PlusCircle className="w-5 h-5"/>
                            "{term}" Kelimesini Ekle
                        </button>
                    )}
                </div>
            )}

            {displayedResults.length > 0 && (
                <>
                    <div className="text-center text-sm font-bold text-slate-400 uppercase tracking-wider">
                        {results.length} Sonuç Bulundu
                    </div>
                    
                    {displayedResults.map((resultWord) => (
                        <div key={resultWord.id} className="flex justify-center">
                            <WordCard2 wordObj={resultWord} />
                        </div>
                    ))}

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
