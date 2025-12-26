import React, { useState, useMemo, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import WordCard from "../components/WordCard"; 
import { 
  X, CheckCircle2, ArrowRight, ArrowLeft, Trash2, Home, LogOut, 
  AlertTriangle, Flame, AlertOctagon, Check, Layers 
} from "lucide-react";

export default function HardWordsGame() {
  const { getAllWords, clearMistake } = useData();
  const navigate = useNavigate();
  
  // --- STATE'LER ---
  const [selectedLevel, setSelectedLevel] = useState(null); 
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- 1. TÜM ZOR KELİMELERİ ÇEK ---
  const allHardWords = useMemo(() => {
    return getAllWords().filter(w => (w.mistakeCount || 0) >= 2);
  }, [getAllWords]);

  // --- 2. KATEGORİLERE AYIR ---
  const categories = useMemo(() => {
      return {
          low: allHardWords.filter(w => w.mistakeCount === 2),      
          mid: allHardWords.filter(w => w.mistakeCount === 3),      
          high: allHardWords.filter(w => w.mistakeCount >= 4)       
      };
  }, [allHardWords]);

  // --- 3. ŞU AN OYNANAN LİSTEYİ BELİRLE ---
  const currentList = useMemo(() => {
      if (!selectedLevel) return [];
      return categories[selectedLevel] || [];
  }, [selectedLevel, categories]);

  // --- ⚠️ CRASH ÖNLEYİCİ ---
  useEffect(() => {
    if (currentList.length > 0 && currentIndex >= currentList.length) {
        setCurrentIndex(Math.max(0, currentList.length - 1));
    }
  }, [currentList.length, currentIndex]);

  // --- 4. KELİME SİLME ---
  const handleRemove = async () => {
    const currentWord = currentList[currentIndex];
    if (currentWord) {
      await clearMistake(currentWord.id);
    }
  };

  // --- 5. İLERİ / GERİ FONKSİYONLARI ---
  const handleNextOrFinish = () => {
    if (currentIndex < currentList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setSelectedLevel(null);
      setCurrentIndex(0);
    }
  };

  const handlePrevious = () => {
      if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
      }
  };

  // ==========================================
  // MOD 1: MENÜ EKRANI (Seçim Yap)
  // ==========================================
  if (!selectedLevel) {
      const totalCount = allHardWords.length;

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            
            {/* BAŞLIK ALANI */}
            <div className="w-full max-w-sm text-center mb-8">
                <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                    <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-black text-slate-800">Nereye Odaklanalım?</h1>
                <p className="text-slate-500 mt-2">Toplam <span className="font-bold text-red-600">{totalCount}</span> kelimede hata yaptın.</p>
            </div>

            {/* KATEGORİ BUTONLARI */}
            <div className="w-full max-w-sm space-y-4">
                
                {/* 1. SEVİYE: ÇOK ZORLANDIKLARIM (4+ Hata) */}
                <button 
                    onClick={() => { setSelectedLevel('high'); setCurrentIndex(0); }}
                    disabled={categories.high.length === 0}
                    className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-95
                        ${categories.high.length > 0 
                            ? "bg-white border-red-100 hover:border-red-300 hover:bg-red-50 shadow-md cursor-pointer" 
                            : "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed grayscale"}`}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 p-3 rounded-xl text-red-600"><Flame className="w-6 h-6"/></div>
                        <div className="text-left">
                            <div className="font-bold text-slate-800 text-lg">Çok Zorlandıklarım</div>
                            <div className="text-xs text-slate-400 font-medium">4+ kez hata yapılanlar</div>
                        </div>
                    </div>
                    <div className="text-2xl font-black text-red-600">{categories.high.length}</div>
                </button>

                {/* 2. SEVİYE: ORTA SEVİYE (3 Hata) */}
                <button 
                    onClick={() => { setSelectedLevel('mid'); setCurrentIndex(0); }}
                    disabled={categories.mid.length === 0}
                    className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-95
                        ${categories.mid.length > 0 
                            ? "bg-white border-orange-100 hover:border-orange-300 hover:bg-orange-50 shadow-md cursor-pointer" 
                            : "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed grayscale"}`}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-100 p-3 rounded-xl text-orange-600"><AlertOctagon className="w-6 h-6"/></div>
                        <div className="text-left">
                            <div className="font-bold text-slate-800 text-lg">Orta Seviye</div>
                            <div className="text-xs text-slate-400 font-medium">3 kez hata yapılanlar</div>
                        </div>
                    </div>
                    <div className="text-2xl font-black text-orange-600">{categories.mid.length}</div>
                </button>

                {/* 3. SEVİYE: HATA YAPTIKLARIM (2 Hata) */}
                <button 
                    onClick={() => { setSelectedLevel('low'); setCurrentIndex(0); }}
                    disabled={categories.low.length === 0}
                    className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-95
                        ${categories.low.length > 0 
                            ? "bg-white border-yellow-100 hover:border-yellow-300 hover:bg-yellow-50 shadow-md cursor-pointer" 
                            : "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed grayscale"}`}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-yellow-100 p-3 rounded-xl text-yellow-600"><AlertTriangle className="w-6 h-6"/></div>
                        <div className="text-left">
                            <div className="font-bold text-slate-800 text-lg">Hata Yaptıklarım</div>
                            <div className="text-xs text-slate-400 font-medium">2 kez hata yapılanlar</div>
                        </div>
                    </div>
                    <div className="text-2xl font-black text-yellow-600">{categories.low.length}</div>
                </button>

            </div>

            {/* ANA SAYFAYA DÖN */}
            <button 
                onClick={() => navigate("/")} 
                className="mt-8 text-slate-400 font-bold flex items-center gap-2 hover:text-slate-600 transition-colors"
            >
                <Home className="w-5 h-5" /> Ana Sayfaya Dön
            </button>
        </div>
      );
  }

  // ==========================================
  // MOD 2: OYUN EKRANI (Seçilen Kategori)
  // ==========================================
  
  if (currentList.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-green-100 p-6 rounded-full mb-6 animate-in zoom-in">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bu Seviye Temiz!</h2>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                Bu kategorideki tüm hatalı kelimeleri temizledin.
            </p>
            <button 
                onClick={() => setSelectedLevel(null)} 
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
            >
                <Layers className="w-5 h-5"/> Menüye Dön
            </button>
        </div>
      );
  }

  const currentWord = currentList[currentIndex];
  if (!currentWord) return <div className="min-h-screen bg-slate-50"/>;

  // Başlık Rengi Belirle
  let headerColor = "bg-slate-100 text-slate-600";
  let headerText = "Çalışma";
  if (selectedLevel === 'high') { headerColor = "bg-red-100 text-red-700 border-red-200"; headerText = "Çok Zorlandıklarım"; }
  if (selectedLevel === 'mid') { headerColor = "bg-orange-100 text-orange-700 border-orange-200"; headerText = "Orta Seviye"; }
  if (selectedLevel === 'low') { headerColor = "bg-yellow-100 text-yellow-700 border-yellow-200"; headerText = "Hata Yaptıklarım"; }

  const isLastCard = currentIndex === currentList.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 relative">
      
      {/* ÜST BİLGİ */}
      <div className="w-full max-w-sm flex justify-between items-center mt-2 mb-4">
        <button onClick={() => setSelectedLevel(null)} className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
        </button>
        
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${headerColor}`}>
            {headerText} ({currentIndex + 1} / {currentList.length})
        </div>

        <div className="w-9"></div> {/* Dengeleyici */}
      </div>

      {/* FLASHCARD */}
      <div className="w-full max-w-sm flex-1 flex items-center justify-center mb-6 perspective-1000">
         <WordCard key={currentWord.id} wordObj={currentWord} />
      </div>

      {/* KONTROL BUTONLARI (YENİ DÜZEN) */}
      <div className="w-full max-w-sm space-y-3 mb-6">
        
        {/* NAVİGASYON SATIRI (GERİ + İLERİ) */}
        <div className="flex items-center gap-3">
            
            {/* GERİ BUTONU: Sadece 2. karttan itibaren görünür */}
            {currentIndex > 0 && (
                <button 
                    onClick={handlePrevious} 
                    className="bg-white border-2 border-slate-200 text-slate-500 p-4 rounded-2xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all animate-in fade-in slide-in-from-right-2"
                    title="Önceki"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
            )}

            {/* İLERİ / BİTİR BUTONU (Esnek Genişlik) */}
            <button 
                onClick={handleNextOrFinish}
                className={`flex-1 p-4 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all 
                    ${isLastCard 
                        ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                        : "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50" 
                    }`}
            >
                <span className="font-bold text-lg">
                    {isLastCard ? "Bu Turu Bitir" : "Sıradaki Kelime"}
                </span>
                {isLastCard ? <Check className="w-6 h-6" /> : <ArrowRight className="w-6 h-6"/>}
            </button>
        </div>

        {/* 2. HATADAN ÇIKAR BUTONU */}
        <button 
            onClick={handleRemove}
            className="w-full bg-green-100 border-2 border-green-200 text-green-700 p-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-green-200"
        >
            <Trash2 className="w-5 h-5"/>
            <div className="text-left">
                <div className="font-bold text-base leading-none">Hata Yaptıklarımdan Çıkar</div>
            </div>
        </button>

      </div>

      {/* MENÜYE DÖN */}
      <button 
        onClick={() => setSelectedLevel(null)}
        className="text-slate-400 hover:text-indigo-500 font-medium text-sm flex items-center gap-2 px-4 py-2 rounded-lg transition-colors mb-2"
      >
        <Layers className="w-4 h-4" />
        Menüye Dön
      </button>

    </div>
  );
}
