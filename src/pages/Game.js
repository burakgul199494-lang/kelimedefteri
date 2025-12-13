import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import WordCard from "../components/WordCard";
import { ThumbsUp, ThumbsDown, ArrowLeft, Trophy, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Game() {
  const { learningQueue, getAllWords, handleSmartLearn, addToKnown } = useData();
  const navigate = useNavigate();

  const [currentWord, setCurrentWord] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  
  // "Tamamen Biliyorum" onay penceresi için state
  const [showMasterModal, setShowMasterModal] = useState(false);

  useEffect(() => {
    loadNextCard();
  }, [learningQueue]);

  const loadNextCard = () => {
    const all = getAllWords();
    const now = new Date();
    
    // Zamanı gelmiş kartları bul
    const dueItems = learningQueue.filter(item => {
        const reviewDate = new Date(item.nextReview);
        return reviewDate <= now;
    });

    if (dueItems.length === 0) {
        setFinished(true);
        setCurrentWord(null);
        return;
    }

    // İlk sıradakini al
    const nextItem = dueItems[0];
    const wordObj = all.find(w => String(w.id) === String(nextItem.wordId));
    
    if (wordObj) {
        setCurrentWord(wordObj);
        setIsFlipped(false);
        setFinished(false);
    } else {
        // Kelime silinmişse kuyruktan temizlemek gerekebilir ama şimdilik pas geçiyoruz
        setFinished(true);
    }
  };

  const handleResponse = async (action) => {
    if (!currentWord) return;
    await handleSmartLearn(currentWord.id, action);
    // State güncellemesi useEffect ile tetiklenip yeni kartı yükleyecek
  };

  // --- YENİ: Tamamen Biliyorum Fonksiyonu ---
  const handleMastery = async () => {
    if (!currentWord) return;
    // Direkt öğrenilenlere ekle (spaced repetition döngüsünden çıkar)
    await addToKnown(currentWord.id);
    setShowMasterModal(false);
    // useEffect yeni kartı otomatik yükleyecek
  };

  if (finished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm w-full bg-white p-8 rounded-3xl shadow-xl">
           <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Trophy className="w-12 h-12 text-green-600" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800">Harikasın! 🎉</h2>
           <p className="text-slate-500">Şu an için çalışman gereken tüm kelimeleri bitirdin.</p>
           <button onClick={() => navigate("/")} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all">
             Ana Sayfaya Dön
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 relative">
      
      {/* Üst Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <button onClick={() => navigate("/")} className="p-2 bg-white rounded-full shadow-sm text-slate-600 hover:bg-slate-100">
           <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-slate-400 text-sm uppercase tracking-wider">Flash Kart</span>
        <div className="w-10"></div>
      </div>

      {/* Kart Alanı */}
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
         {currentWord && (
            <div onClick={() => setIsFlipped(!isFlipped)} className="cursor-pointer perspective-1000 transition-transform active:scale-95 duration-200">
               {/* WordCard bileşeni zaten kart görünümünü hallediyor */}
               {/* Burada WordCard'ın "ön yüzü" ve "arka yüzü" mantığını WordCard içinde mi yoksa burada mı yönettiğimize göre değişir.
                   Senin WordCard bileşenin tek parça olduğu için direkt gösteriyoruz. 
                   Kullanıcı karta tıklayınca detayların açılması WordCard içindeki yapıya bağlı olabilir.
                   Ancak "Biliyorum/Bilmiyorum" oyunu için genelde kelime görünür, tıklayınca anlamı görünür.
                   Senin mevcut WordCard yapın her şeyi gösteriyor olabilir.
                   Biz burada basitçe WordCard'ı gösteriyoruz.
               */}
               <WordCard wordObj={currentWord} />
               
               {!isFlipped && (
                   <p className="text-center text-slate-400 text-xs mt-2 animate-pulse">
                      (Kartın detaylarını incele)
                   </p>
               )}
            </div>
         )}
      </div>

      {/* Butonlar */}
      <div className="w-full max-w-md mt-6 space-y-4 pb-8">
         <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); handleResponse("forgot"); }} 
              className="bg-rose-100 text-rose-600 border-2 border-rose-200 p-4 rounded-2xl flex flex-col items-center gap-2 font-bold hover:bg-rose-200 transition-colors active:scale-95"
            >
               <ThumbsDown className="w-6 h-6" />
               <span>Bilmiyorum</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); handleResponse("know"); }} 
              className="bg-green-100 text-green-600 border-2 border-green-200 p-4 rounded-2xl flex flex-col items-center gap-2 font-bold hover:bg-green-200 transition-colors active:scale-95"
            >
               <ThumbsUp className="w-6 h-6" />
               <span>Biliyorum</span>
            </button>
         </div>

         {/* --- YENİ: Tamamen Biliyorum Butonu --- */}
         <button 
            onClick={() => setShowMasterModal(true)}
            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 text-sm font-semibold py-2 transition-colors"
         >
            <CheckCircle2 className="w-4 h-4" />
            Bu kelimeyi tamamen biliyorum, bir daha sorma.
         </button>
      </div>

      {/* --- MODAL: Tamamen Biliyorum Onayı --- */}
      {showMasterModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Emin misin?</h3>
                    <p className="text-sm text-slate-500 mt-2">
                        <strong>"{currentWord?.word}"</strong> kelimesini "Öğrenilenler" listesine taşıyacağım. Aralıklı tekrar sistemiyle bir daha karşına çıkmayacak.
                    </p>
                </div>
                <div className="flex gap-3 mt-2">
                    <button 
                        onClick={() => setShowMasterModal(false)}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                    >
                        İptal
                    </button>
                    <button 
                        onClick={handleMastery}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
                    >
                        Evet, Biliyorum
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
