import React from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { Brain, Flame, LogOut, Play, Book, Microscope, Plus, RotateCcw, Check, BookOpen, Trash2, HelpCircle } from "lucide-react";

export default function Home() {
  const { user, knownWordIds, getAllWords, streak } = useData();
  const navigate = useNavigate();
  const allWords = getAllWords();
  const progress = (knownWordIds.length / allWords.length) * 100 || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
       <div className="w-full max-w-md space-y-6 mt-2">
          {/* Header */}
          <div className="flex justify-between items-center w-full px-1">
             <button className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200"><RotateCcw size={18} /></button>
             <button onClick={()=>auth.signOut()} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 hover:text-red-500"><LogOut size={18} /></button>
          </div>
          
          <div className="text-center relative mt-4">
             <div className="flex justify-center mb-4 relative">
                <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg transform rotate-3"><Brain className="w-12 h-12 text-white" /></div>
                <div className="absolute -right-6 -top-2 flex flex-col items-center"><div className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded-full shadow-lg border-2 border-white"><Flame className="w-4 h-4 fill-white" /><span className="font-bold text-sm">{streak}</span></div></div>
             </div>
             <h1 className="text-3xl font-extrabold text-slate-800">Kelime Defteri</h1>
             <p className="text-slate-500 mt-2 text-sm">Merhaba, <span className="font-medium text-indigo-600">{user.displayName || user.email}</span></p>
          </div>

          {/* Progress Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-end mb-2"><span className="text-sm font-medium text-slate-500">Genel İlerleme</span><span className="text-2xl font-bold text-indigo-600">%{progress.toFixed(1)}</span></div>
             <div className="w-full bg-slate-100 rounded-full h-3 mb-4"><div className="bg-indigo-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }}></div></div>
             <div className="flex justify-between text-sm"><div className="text-center flex-1 border-r"><div className="font-bold">{knownWordIds.length}</div><div>Öğrenilen</div></div><div className="text-center flex-1"><div className="font-bold">{allWords.length - knownWordIds.length}</div><div>Kalan</div></div></div>
          </div>

          {/* Menü */}
          <div className="grid grid-cols-2 gap-3">
             <button onClick={()=>navigate("/game")} className="bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-md flex flex-col items-center gap-2"><Play className="w-6 h-6"/> Yeni Oyun</button>
             <button onClick={()=>navigate("/dictionary")} className="bg-sky-500 text-white font-bold py-4 rounded-xl shadow-md flex flex-col items-center gap-2"><Book className="w-6 h-6"/> Sözlük</button>
          </div>
          <button onClick={()=>navigate("/analysis")} className="w-full bg-teal-600 text-white font-bold py-4 px-6 rounded-xl shadow-md flex items-center justify-between"><div className="flex items-center gap-3"><Microscope className="w-6 h-6"/> <span>AI Cümle Analizi</span></div></button>
          <button onClick={()=>navigate("/add-word")} className="w-full bg-white text-slate-700 border-2 border-dashed border-slate-300 font-bold py-4 px-6 rounded-xl flex items-center justify-between"><div className="flex items-center gap-3"><Plus className="text-blue-600 w-6 h-6"/> <span>Yeni Kelime Ekle</span></div></button>
          
          <div className="grid grid-cols-2 gap-3">
             <button onClick={()=>navigate("/list/unknown")} className="bg-white border-2 border-slate-200 font-bold py-4 rounded-xl flex flex-col items-center gap-2"><BookOpen className="text-orange-500 w-5 h-5"/> Öğreneceğim</button>
             <button onClick={()=>navigate("/list/known")} className="bg-white border-2 border-slate-200 font-bold py-4 rounded-xl flex flex-col items-center gap-2"><Check className="text-green-600 w-5 h-5"/> Öğrendiğim</button>
          </div>
       </div>
    </div>
  );
}
