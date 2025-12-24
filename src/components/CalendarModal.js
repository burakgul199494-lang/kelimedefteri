import React from "react";
import { X, Check, X as XIcon, Calendar as CalIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "../context/DataContext";

export default function CalendarModal({ onClose }) {
  const { questHistory, DAILY_QUESTS_TARGETS } = useData();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0 = Ocak, 11 = Aralık

  // Ayın ismini al (Örn: "Aralık")
  const monthName = today.toLocaleDateString("tr-TR", { month: "long" });

  // Ayın kaç çektiğini bul
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Ayın ilk günü haftanın kaçıncı günü? (0: Pazar, 1: Pzt ... 6: Cmt)
  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  // Pazartesi(1) ile başlaması için ayarlama (Pazar 0 ise 6 yap, diğerlerini 1 azalt)
  // TR Takvimi: Pzt(0), Sal(1)... Pazar(6) mantığına çeviriyoruz
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  // Takvim kutucuklarını oluştur
  const days = [];
  
  // 1. Boşlukları doldur (Ayın 1'inden önceki günler)
  for (let i = 0; i < startOffset; i++) {
      days.push({ type: "empty", key: `empty-${i}` });
  }

  // 2. Günleri doldur
  for (let d = 1; d <= daysInMonth; d++) {
      // Tarih formatı: YYYY-MM-DD (Tek haneli aylara/günlere 0 ekle)
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const isToday = d === today.getDate();
      const isFuture = d > today.getDate();

      // Geçmiş veri kontrolü
      const dayData = questHistory[dateStr];
      const progress = dayData?.progress || {};

      // Görevler tamamlandı mı?
      const isFlashcardDone = (progress.flashcard || 0) >= DAILY_QUESTS_TARGETS.flashcard;
      const isQuizDone = (progress.quiz || 0) >= DAILY_QUESTS_TARGETS.quiz;
      const isWritingDone = (progress.writing || 0) >= DAILY_QUESTS_TARGETS.writing;
      
      const isAllDone = isFlashcardDone && isQuizDone && isWritingDone;
      
      // Eğer geçmiş bir günse ve veri varsa ama tamamlanmamışsa -> Başarısız (X)
      // Eğer veri hiç yoksa -> Nötr
      const isMissed = !isFuture && !isToday && dayData && !isAllDone;

      days.push({ 
          type: "day", 
          dayNum: d, 
          dateStr, 
          isToday, 
          isFuture,
          isAllDone,
          isMissed,
          hasData: !!dayData
      });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        
        {/* Başlık */}
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-xl">
                    <CalIcon className="w-6 h-6 text-indigo-600"/>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-none">{monthName} {currentYear}</h3>
                    <span className="text-xs text-slate-400 font-medium">Günlük Takip</span>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-500"/>
            </button>
        </div>

        {/* Gün İsimleri */}
        <div className="grid grid-cols-7 gap-2 mb-2">
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(d => (
                <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
        </div>

        {/* Takvim Grid */}
        <div className="grid grid-cols-7 gap-2">
            {days.map((item) => {
                if (item.type === "empty") {
                    return <div key={item.key} className="aspect-square"></div>;
                }

                return (
                    <div 
                        key={item.dateStr} 
                        className={`
                            aspect-square rounded-xl flex items-center justify-center text-sm font-bold relative border transition-all
                            ${item.isToday ? "border-indigo-500 ring-2 ring-indigo-100 bg-white text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-400"}
                            ${item.isAllDone ? "bg-green-100 border-green-200 text-green-700" : ""}
                            ${item.isMissed ? "bg-red-50 border-red-100 text-red-400" : ""}
                        `}
                    >
                        {item.dayNum}
                        
                        {/* İkonlar */}
                        {item.isAllDone && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                <Check className="w-2 h-2"/>
                            </div>
                        )}
                        {item.isMissed && (
                            <div className="absolute -bottom-1 -right-1 bg-red-400 text-white rounded-full p-0.5 shadow-sm">
                                <XIcon className="w-2 h-2"/>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        
        {/* Açıklama */}
        <div className="mt-6 flex gap-3 text-[10px] justify-center text-slate-500 font-medium">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>Tamamlandı</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>Eksik</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 border-2 border-indigo-500 rounded-full"></div>Bugün</div>
        </div>

      </div>
    </div>
  );
}
