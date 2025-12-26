import React, { useState, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import WordCard from "../components/WordCard"; // Flashcard bileşenini çağırıyoruz
import { X, CheckCircle2, ArrowRight, AlertTriangle, Home, Trash2 } from "lucide-react";

export default function HardWordsGame() {
  const { getAllWords, clearMistake } = useData();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- 1. ZOR KELİMELERİ FİLTRELE ---
  // Kural: Hata sayısı 2 ve üzeri olanlar
  const hardWords = useMemo(() => {
    return getAllWords().filter(w => (w.mistakeCount || 0) >= 2);
  }, [getAllWords]);

  // --- 2. KELİME SİLME FONKSİYONU (Öğrendim) ---
  const handleRemove = async () => {
    const currentWord = hardWords[currentIndex];
    if (currentWord) {
      await clearMistake(currentWord.id);
      
      // Eğer son kelimeyi sildiysek ve liste boşalmadıysa index'i ayarla
      if (currentIndex >= hardWords.length - 1) {
          setCurrentIndex(Math.max(0, hardWords.length - 2)); 
      }
    }
  };

  // --- 3. SIRADAKİ KELİME (Kalsın) ---
  const handleNext = () => {
    if (currentIndex < hardWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Liste sonuna geldiyse başa dön
      setCurrentIndex(0);
    }
  };

  // --- 4. HİÇ ZOR KELİME YOKSA ---
  if (hardWords.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-green-100 p-6 rounded-full mb-6 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tebrikler!</h2>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto">
            Şu an seni zorlayan hiç kelime yok. Oyunlarda hata yaptıkça burası dolacaktır.
        </p>
        <button 
            onClick={() => navigate("/")} 
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-transform active:scale-95"
        >
            <Home className="w-5 h-5"/> Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  const currentWord = hardWords[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      
      {/* ÜST BAR */}
      <div className="w-full max-w-sm flex justify-between items-center mt-4 mb-6">
        <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100">
            <X className="w-6 h-6 text-slate-400" />
        </button>
        <div className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold border border-red-200">
            <AlertTriangle className="w-4 h-4" />
            <span>Zorlananlar: {hardWords.length}</span>
        </div>
        <div className="w-10"></div> {/* Dengeleyici boşluk */}
      </div>

      {/* --- FLASHCARD ALANI --- */}
      {/* Mevcut WordCard bileşeni kullanılıyor, böylece tasarım tutarlı olur */}
      <div className="w-full max-w-sm perspective-1000 mb-6">
         {/* Key ekleyerek her değişimde yeniden render olmasını sağlıyoruz */}
         <WordCard key={currentWord.id} wordObj={currentWord} />
      </div>

      {/* --- KONTROL BUTONLARI --- */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-4">
        
        {/* BUTON 1: LİSTEDEN SİL (Hatasını Sıfırla) */}
        <button 
            onClick={handleRemove}
            className="flex flex-col items-center justify-center gap-1 bg-green-100 border-2 border-green-200 text-green-700 p-4 rounded-2xl hover:bg-green-200 active:scale-95 transition-all shadow-sm"
        >
            <Trash2 className="w-6 h-6 mb-1"/>
            <span className="font-bold text-sm">Listeden Sil</span>
            <span className="text-[10px] opacity-70">Artık öğrendim</span>
        </button>

        {/* BUTON 2: SIRADAKİ (Listede Kalsın) */}
        <button 
            onClick={handleNext}
            className="flex flex-col items-center justify-center gap-1 bg-white border-2 border-slate-200 text-slate-600 p-4 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
        >
            <ArrowRight className="w-6 h-6 mb-1"/>
            <span className="font-bold text-sm">Sıradaki</span>
            <span className="text-[10px] opacity-70">Listede kalsın</span>
        </button>

      </div>
      
      {/* Hata Sayacı Bilgisi (Footer) */}
      <div className="mt-6 text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full">
          Bu kelimede toplam <strong className="text-red-500">{currentWord.mistakeCount}</strong> kez hata yaptın.
      </div>

    </div>
  );
}
