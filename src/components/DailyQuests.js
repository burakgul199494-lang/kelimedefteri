import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { 
    CheckCircle2, Zap, BookOpen, PenTool, ChevronDown, ChevronUp,
    Languages, Dumbbell, Headphones, Quote, Layout, Puzzle, Mic
} from "lucide-react";

export default function DailyQuests() {
  const { questProgress, DAILY_QUESTS_TARGETS } = useData();
  
  const [isOpen, setIsOpen] = useState(true);

  // Güvenlik
  const progress = questProgress || {};

  const quests = [
    { 
        id: "flashcard", 
        label: "Kelime Çalış", 
        icon: <Zap className="w-4 h-4 text-yellow-500" />,
        target: DAILY_QUESTS_TARGETS.flashcard,
        color: "bg-yellow-500"
    },
    { 
        id: "quiz", 
        label: "Quiz", 
        icon: <BookOpen className="w-4 h-4 text-amber-500" />,
        target: DAILY_QUESTS_TARGETS.quiz,
        color: "bg-amber-500"
    },
    { 
        id: "quiz2", 
        label: "Ters Quiz", 
        icon: <Languages className="w-4 h-4 text-emerald-500" />,
        target: DAILY_QUESTS_TARGETS.quiz2,
        color: "bg-emerald-500"
    },
    { 
        id: "exercise", 
        label: "Egzersiz Modu", 
        icon: <Dumbbell className="w-4 h-4 text-slate-500" />,
        target: DAILY_QUESTS_TARGETS.exercise,
        color: "bg-slate-500"
    },
    { 
        id: "writing", 
        label: "Yazma", 
        icon: <PenTool className="w-4 h-4 text-purple-500" />,
        target: DAILY_QUESTS_TARGETS.writing,
        color: "bg-purple-500"
    },
    { 
        id: "writing2", 
        label: "Dinle Yaz", 
        icon: <Headphones className="w-4 h-4 text-pink-500" />,
        target: DAILY_QUESTS_TARGETS.writing2,
        color: "bg-pink-500"
    },
    { 
        id: "gap_filling", 
        label: "Boşluk Doldurma", 
        icon: <Quote className="w-4 h-4 text-cyan-500" />,
        target: DAILY_QUESTS_TARGETS.gap_filling,
        color: "bg-cyan-500"
    },
    { 
        id: "sentence_builder", 
        label: "Cümle Kurma", 
        icon: <Layout className="w-4 h-4 text-teal-500" />,
        target: DAILY_QUESTS_TARGETS.sentence_builder,
        color: "bg-teal-500"
    },
    { 
        id: "word_match", 
        label: "Eşleştirme", 
        icon: <Puzzle className="w-4 h-4 text-orange-500" />,
        target: DAILY_QUESTS_TARGETS.word_match,
        color: "bg-orange-500"
    },
    { 
        id: "pronunciation", 
        label: "Telaffuz", 
        icon: <Mic className="w-4 h-4 text-rose-500" />,
        target: DAILY_QUESTS_TARGETS.pronunciation,
        color: "bg-rose-500"
    }
  ];

  // Her görev için mevcut değeri çek ve tamamlanma durumunu hesapla
  const questsWithData = quests.map(q => ({
      ...q,
      current: progress[q.id] || 0
  }));

  const completedCount = questsWithData.filter(q => q.current >= q.target).length;
  const allCompleted = questsWithData.every(q => q.current >= q.target);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full mb-6 overflow-hidden transition-all">
        
        {/* --- BAŞLIK --- */}
        <div 
            onClick={() => setIsOpen(!isOpen)}
            className="flex justify-between items-center p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors"
        >
            <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    📅 Günlük Görevler
                </h3>
                
                {!isOpen && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${allCompleted ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {allCompleted ? "Tamamlandı! 🎉" : `${completedCount}/${quests.length} Yapıldı`}
                    </span>
                )}
            </div>

            <div className="text-slate-400">
                {isOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
            </div>
        </div>

        {/* --- İÇERİK --- */}
        {isOpen && (
            <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {allCompleted && (
                    <div className="bg-green-50 text-green-700 text-sm font-bold p-2 rounded-xl text-center mb-2 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4"/> Tüm görevler tamamlandı! Harikasın!
                    </div>
                )}

                {questsWithData.map((quest) => {
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
