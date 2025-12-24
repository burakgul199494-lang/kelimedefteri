import React from "react";
import { X, Check, X as XIcon, Calendar as CalIcon } from "lucide-react";
import { useData } from "../context/DataContext";

export default function CalendarModal({ onClose }) {
  const { questHistory, DAILY_QUESTS_TARGETS } = useData();

  // Son 30 günü oluştur
  const days = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      
      // O günün verisi var mı?
      const dayData = questHistory[dateStr];
      const progress = dayData?.progress || {};
      
      // Görevler tamamlandı mı kontrolü
      const isFlashcardDone = (progress.flashcard || 0) >= DAILY_QUESTS_TARGETS.flashcard;
      const isQuizDone = (progress.quiz || 0) >= DAILY_QUESTS_TARGETS.quiz;
      const isWritingDone = (progress.writing || 0) >= DAILY_QUESTS_TARGETS.writing;
      
      // O gün için kayıt var mı ve hepsi tamam mı?
      const isAllDone = dayData && isFlashcardDone && isQuizDone && isWritingDone;
      const isToday = i === 0;
      
      // Gelecek günler değil, sadece geçmiş ve bugün
      days.push({
          date: d,
          dayNum: d.getDate(),
          dateStr,
          isAllDone,
          hasData: !!dayData,
          isToday
      });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CalIcon className="w-6 h-6 text-indigo-600"/> Görev Takvimi
            </h3>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-500"/>
            </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(d => (
                <div key={d} className="text-center text-xs font-bold text-slate-400">{d}</div>
            ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
                <div 
                    key={day.dateStr} 
                    className={`
                        aspect-square rounded-xl flex items-center justify-center text-sm font-bold relative border
                        ${day.isToday ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-100"}
                        ${day.isAllDone ? "bg-green-100 text-green-700" : day.hasData ? "bg-red-50 text-red-400" : "bg-slate-50 text-slate-300"}
                    `}
                >
                    {day.dayNum}
                    {day.isAllDone && <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5"><Check className="w-2 h-2"/></div>}
                    {!day.isAllDone && day.hasData && !day.isToday && <div className="absolute -bottom-1 -right-1 bg-red-400 text-white rounded-full p-0.5"><XIcon className="w-2 h-2"/></div>}
                </div>
            ))}
        </div>
        
        <div className="mt-6 flex gap-4 text-xs justify-center">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 rounded-full border border-green-200"></div> Tamamlandı</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 rounded-full border border-red-200"></div> Eksik</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-50 rounded-full border border-slate-200"></div> Veri Yok</div>
        </div>

      </div>
    </div>
  );
}
