import React from "react";
import { useData } from "../context/DataContext";
import { 
    CheckCircle2, Zap, BookOpen, PenTool, 
    Languages, Dumbbell, Headphones, Quote, Layout, Puzzle, Mic, X, CalendarCheck
} from "lucide-react";

export default function DailyQuests({ onClose }) {
  const { questProgress, DAILY_QUESTS_TARGETS } = useData();
  
  // Güvenlik: Veri yoksa boş obje
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

  // Hesaplamalar
  const questsWithData = quests.map(q => ({
      ...q,
      current: progress[q.id] || 0
  }));

  const completedCount = questsWithData.filter(q => q.current >= q.target).length;
  const allCompleted = questsWithData.every(q => q.current >= q.target);

  return (
    // ARKAPLAN (KARARTMA)
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
        
        {/* PENCERE (MODAL) */}
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            
            {/* BAŞLIK VE KAPAT BUTONU */}
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2 border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-xl">
                        <CalendarCheck className="w-6 h-6 text-indigo-600"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-none">Günlük Görevler</h3>
                        <span className="text-xs text-slate-400 font-medium">
                            {allCompleted ? "Tümü Tamamlandı! 🎉" : `${completedCount}/${quests.length} Tamamlandı`}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                    <X className="w-5 h-5 text-slate-500"/>
                </button>
            </div>

            {/* İÇERİK LİSTESİ */}
            <div className="space-y-4">
                {allCompleted && (
                    <div className="bg-green-50 text-green-700 text-sm font-bold p-3 rounded-xl text-center flex items-center justify-center gap-2 mb-4 animate-bounce">
                        <CheckCircle2 className="w-5 h-5"/> Harikasın! Bugünlük bu kadar.
                    </div>
                )}

                {questsWithData.map((quest) => {
                    const percent = Math.min(100, (quest.current / quest.target) * 100);
                    const isDone = quest.current >= quest.target;

                    return (
                        <div key={quest.id}>
                            <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-600">
                                <span className="flex items-center gap-2">
                                    {isDone ? <CheckCircle2 className="w-4 h-4 text-green-500"/> : quest.icon}
                                    {quest.label}
                                </span>
                                <span className={isDone ? "text-green-600 font-bold" : "text-slate-400"}>
                                    {quest.current}/{quest.target}
                                </span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-green-500" : quest.color}`} 
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* KAPAT BUTONU (ALT) */}
            <button onClick={onClose} className="w-full mt-6 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">
                Kapat
            </button>
        </div>
    </div>
  );
}
