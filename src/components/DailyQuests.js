import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { CheckCircle2, Zap, BookOpen, PenTool, ChevronDown, ChevronUp } from "lucide-react";

export default function DailyQuests() {
  const { questProgress, DAILY_QUESTS_TARGETS } = useData();
  
  // Kutunun açık/kapalı durumu (Varsayılan: true/açık)
  const [isOpen, setIsOpen] = useState(true);

  // Güvenlik: questProgress undefined gelirse boş obje varsay
  const progress = questProgress || { flashcard: 0, quiz: 0, writing: 0 };

  const quests = [
    { 
        id: "flashcard", 
        label: "15 Kelime Çalış", 
        icon: <Zap className="w-4 h-4 text-yellow-500" />,
        current: progress.flashcard || 0,
        target: DAILY_QUESTS_TARGETS.flashcard,
        color: "bg-yellow-500"
    },
    { 
        id: "quiz", 
        label: "2 Quiz Tamamla", 
        icon: <BookOpen className="w-4 h-4 text-blue-500" />,
        current: progress.quiz || 0,
        target: DAILY_QUESTS_TARGETS.quiz,
        color: "bg-blue-500"
    },
    { 
        id: "writing", 
        label: "1 Egzersiz Yap", 
        icon: <PenTool className="w-4 h-4 text-purple-500" />,
        current: progress.writing || 0,
        target: DAILY_QUESTS_TARGETS.writing,
        color: "bg-purple-500"
    }
  ];

  const completedCount = quests.filter(q => q.current >= q.target).length;
  const allCompleted = quests.every(q => q.current >= q.target);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full mb-6 overflow-hidden transition-all">
        
        {/* --- BAŞLIK KISMI (HER ZAMAN GÖRÜNÜR) --- */}
        <div 
            onClick={() => setIsOpen(!isOpen)}
            className="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors"
        >
            <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    📅 Günlük Görevler
                </h3>
                
                {/* Kapalıyken Özet Bilgi Göster */}
                {!isOpen && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${allCompleted ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {allCompleted ? "Tamamlandı! 🎉" : `${completedCount}/${quests.length} Yapıldı`}
                    </span>
                )}
            </div>

            {/* Ok İkonu */}
            <div className="text-slate-400">
                {isOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
            </div>
        </div>

        {/* --- İÇERİK KISMI (SADECE AÇIKKEN GÖRÜNÜR) --- */}
        {isOpen && (
            <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Hepsi bitince çıkan tebrik mesajı */}
                {allCompleted && (
                    <div className="bg-green-50 text-green-700 text-sm font-bold p-2 rounded-xl text-center mb-2 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4"/> Tüm görevler tamamlandı! Harikasın!
                    </div>
                )}

                {quests.map((quest) => {
                    const percent = Math.min(100, (quest.current / quest.target) * 100);
                    const isDone = quest.current >= quest.target;

                    return (
                        <div key={quest.id}>
                            <div className="flex justify-between text-xs mb-1 font-medium text-slate-600">
                                <span className="flex items-center gap-1.5">
                                    {isDone ? <CheckCircle2 className="w-4 h-4 text-green-500"/> : quest.icon}
                                    {quest.label}
                                </span>
                                <span className={isDone ? "text-green-600" : "text-slate-400"}>
                                    {quest.current}/{quest.target}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-green-500" : quest.color}`} 
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
}
