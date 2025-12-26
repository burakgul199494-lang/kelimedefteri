import React, { useState, useMemo, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import WordCard from "../components/WordCard"; 
import { X, CheckCircle2, ArrowRight, Trash2, Home, LogOut, AlertTriangle, Flame, AlertOctagon } from "lucide-react";

export default function HardWordsGame() {
  const { getAllWords, clearMistake } = useData();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- 1. ZOR KELİMELERİ FİLTRELE ---
  // Hata sayısı 4 ve üzeri olanları öne (başa) alarak sıralıyoruz ki önce en zoru gör.
  const hardWords = useMemo(() => {
    return getAllWords()
        .filter(w => (w.mistakeCount || 0) >= 2)
        .sort((a, b) => b.mistakeCount - a.mistakeCount); // Çok hata yapan en üstte
  }, [getAllWords]);

  // --- ⚠️ CRASH ÖNLEYİCİ ---
  useEffect(() => {
    if (currentIndex >= hardWords.length && hardWords.length > 0) {
        setCurrentIndex(0); 
    }
  }, [hardWords.length, currentIndex]);

  // --- 2. KELİME SİLME ---
  const handleRemove = async () => {
    const currentWord = hardWords[currentIndex];
    if (currentWord) {
      await clearMistake(currentWord.id);
    }
  };

  // --- 3. SIRADAKİ ---
  const handleNext = () => {
    if (currentIndex < hardWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0); 
    }
  };

  // --- 4. RENK VE ETİKET BELİRLEME MANTIĞI ---
  const getDifficultyBadge = (count) => {
      if (count >= 4) {
          return {
              text: "Çok Zorlandıkların",
              style: "bg-red-100 text-red-700 border-red-200",
              icon: <Flame className="w-4 h-4 fill-red-500 text-red-600" />
          };
      } else if (count === 3) {
          return {
              text: "Orta Seviye",
              style: "bg-orange-100 text-orange-700 border-orange-200",
              icon: <AlertOctagon className="w-4 h-4" />
          };
      } else {
          // Count == 2
          return {
              text: "Hata Yaptıkların",
              style: "bg-yellow-100 text-yellow-700 border-yellow-200",
              icon: <AlertTriangle className="w-4 h-4" />
          };
      }
  };

  // --- 5. LİSTE BOŞSA ---
  if (hardWords.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-green-100 p-6 rounded-full mb-6 animate-in zoom-in">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tebrikler!</h2>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto">
            Zorlandığın tüm kelimeleri temizledin. Harika gidiyorsun!
        </p>
        <button 
            onClick={() => navigate("/")} 
            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
        >
            <Home className="w-5 h-5"/> Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  const currentWord = hardWords[currentIndex];
  // Güvenlik: Render anında veri yoksa boş dön
  if (!currentWord) return <div className="min-h-screen bg-slate-50"/>;

  // Mevcut kelimenin durumuna göre rozet bilgisini al
  const badge = getDifficultyBadge(currentWord.mistakeCount);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 relative">
      
      {/* ÜST BİLGİ ÇUBUĞU */}
      <div className="w-full max-w-sm flex justify-between items-center mt-2 mb-4">
        <div className="text-sm font-bold text-slate-400">
            {currentIndex + 1} / {hardWords.length}
        </div>
        
        {/* 🔥 DİNAMİK ROZET BURADA 🔥 */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${badge.style} transition-colors duration-300`}>
            {badge.icon}
            <span>{badge.text} ({currentWord.mistakeCount})</span>
        </div>
      </div>

      {/* --- FLASHCARD ALANI --- */}
      <div className="w-full max-w-sm flex-1 flex items-center justify-center mb-6 perspective-1000">
         <WordCard key={currentWord.id} wordObj={currentWord} />
      </div>

      {/* --- KONTROL BUTONLARI --- */}
      <div className="w-full max-w-sm space-y-3 mb-6">
        
        <button 
            onClick={handleRemove}
            className="w-full bg-green-500 text-white p-4 rounded-2xl shadow-md flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-green-600"
        >
            <Trash2 className="w-6 h-6"/>
            <div className="text-left">
                <div className="font-bold text-lg leading-none">Öğrendim, Listeden Sil</div>
                <div className="text-xs text-green-100 opacity-90">Hatasız biliyorum</div>
            </div>
        </button>

        <button 
            onClick={handleNext}
            className="w-full bg-white border-2 border-slate-200 text-slate-600 p-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-50"
        >
            <span className="font-bold">Sıradaki Kelime</span>
            <ArrowRight className="w-5 h-5"/>
        </button>

      </div>

      {/* --- BİTİR VE ÇIK --- */}
      <button 
        onClick={() => navigate("/")}
        className="text-slate-400 hover:text-red-500 font-medium text-sm flex items-center gap-2 px-4 py-2 rounded-lg transition-colors mb-2"
      >
        <LogOut className="w-4 h-4" />
        Çalışmayı Bitir
      </button>

    </div>
  );
}
