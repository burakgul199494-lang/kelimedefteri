import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import WordCard2 from "../components/WordCard2";
import { ArrowLeft, Search, X, BookOpen, AlertCircle, ArrowDownCircle, PlusCircle, Save, Check } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Dictionary() {
  // isAdmin ve handleSaveSystemWord'ü buradan çekiyoruz
  const { getAllWords, isAdmin, handleSaveSystemWord } = useData(); 
  const navigate = useNavigate();
  const location = useLocation();
  
  const [term, setTerm] = useState(location.state?.addedWord || "");
  const [results, setResults] = useState([]);
  const [debouncedTerm, setDebouncedTerm] = useState(term);
  const [visibleCount, setVisibleCount] = useState(50);
  const PER_PAGE = 50;

  // --- YENİ: MODAL STATE'LERİ ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
      word: "",
      meaning: "",
      type: "noun",
      sentence: ""
  });

  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedTerm(term);
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const cleanTerm = debouncedTerm.toLowerCase().trim();
    
    if (!cleanTerm) {
        setResults([]);
        return;
    }

    const allWords = getAllWords();
    
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

  }, [debouncedTerm, getAllWords]);

  const handleClear = () => {
      setTerm("");
      setResults([]);
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PER_PAGE);
  };

  // --- YENİ: MODAL AÇMA FONKSİYONU ---
  const openAddModal = () => {
      setAddForm({
          word: term, // Aranan kelimeyi otomatik doldur
          meaning: "",
          type: "noun",
          sentence: ""
      });
      setShowAddModal(true);
  };

  // --- YENİ: KAYDETME FONKSİYONU ---
  const handleSaveWord = async () => {
      if (!addForm.word || !addForm.meaning) {
          alert("Kelime ve Anlam zorunludur!");
          return;
      }

      const newWordData = {
          word: addForm.word,
          definitions: [{
              type: addForm.type,
              meaning: addForm.meaning,
              engExplanation: "",
              trExplanation: ""
          }],
          sentence: addForm.sentence,
          sentence_tr: "",
          // Diğer boş alanlar context içinde zaten dolduruluyor
      };

      const result = await handleSaveSystemWord(newWordData);

      if (result.success) {
          // Modal'ı kapat
          setShowAddModal(false);
          // Arama kutusunu eklenen kelimeye eşitle (Listeyi tetikler)
          setTerm(addForm.word); 
          // Hemen tetiklenmesi için debounce beklemeden state güncelle
          setDebouncedTerm(addForm.word); 
          alert("Eklendi! 🎉");
      } else {
          alert(result.message);
      }
  };

  const displayedResults = results.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center relative">
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

                    {/* SADECE ADMIN GÖRÜR - DİREKT MODAL AÇAR */}
                    {isAdmin && (
                        <button 
                            onClick={openAddModal}
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

      {/* --- MİNİ QUICK ADD MODAL (SAYFA İÇİ) --- */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800">Hızlı Ekle</h3>
                      <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5 text-slate-500"/></button>
                  </div>
                  
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Kelime</label>
                          <input 
                              value={addForm.word} 
                              onChange={e => setAddForm({...addForm, word: e.target.value})}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                      </div>
                      
                      <div className="flex gap-2">
                          <div className="flex-1">
                              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Tür</label>
                              <select 
                                  value={addForm.type} 
                                  onChange={e => setAddForm({...addForm, type: e.target.value})}
                                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none"
                              >
                                  <option value="noun">İsim</option>
                                  <option value="verb">Fiil</option>
                                  <option value="adjective">Sıfat</option>
                                  <option value="adverb">Zarf</option>
                                  <option value="other">Diğer</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Türkçesi</label>
                          <input 
                              value={addForm.meaning} 
                              onChange={e => setAddForm({...addForm, meaning: e.target.value})}
                              placeholder="Örn: Okul"
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Örnek Cümle (Opsiyonel)</label>
                          <input 
                              value={addForm.sentence} 
                              onChange={e => setAddForm({...addForm, sentence: e.target.value})}
                              placeholder="Örn: I go to school."
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                      </div>

                      <button 
                          onClick={handleSaveWord}
                          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-2"
                      >
                          <Save className="w-5 h-5"/> Kaydet ve Gör
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
