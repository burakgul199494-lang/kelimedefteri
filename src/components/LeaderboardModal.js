import React from "react";
import { X, Trophy, Medal, User } from "lucide-react";
import { useData } from "../context/DataContext";

export default function LeaderboardModal({ onClose }) {
  const { leaderboardData, user } = useData();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-0 overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Başlık Kısmı */}
        <div className="bg-indigo-600 p-6 text-white relative">
            <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-white/20 rounded-full hover:bg-white/30"><X className="w-5 h-5"/></button>
            <div className="flex justify-center mb-2">
                <div className="bg-yellow-400 p-3 rounded-full shadow-lg"><Trophy className="w-8 h-8 text-yellow-900"/></div>
            </div>
            <h2 className="text-2xl font-bold text-center">Liderlik Tablosu</h2>
            <p className="text-indigo-200 text-center text-sm">En çok çalışanlar</p>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {leaderboardData.length === 0 ? (
                <div className="text-center text-slate-400 py-10">Henüz veri yok.</div>
            ) : (
                leaderboardData.map((item, index) => {
                    const isMe = item.id === user?.uid;
                    let rankIcon = <span className="font-bold text-slate-400 w-6 text-center">{index + 1}</span>;
                    
                    if (index === 0) rankIcon = <Medal className="w-6 h-6 text-yellow-500"/>;
                    if (index === 1) rankIcon = <Medal className="w-6 h-6 text-slate-400"/>;
                    if (index === 2) rankIcon = <Medal className="w-6 h-6 text-amber-600"/>;

                    return (
                        <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100"}`}>
                            <div className="flex items-center justify-center w-8">{rankIcon}</div>
                            <div className="bg-slate-100 p-2 rounded-full"><User className="w-4 h-4 text-slate-500"/></div>
                            <div className="flex-1">
                                <div className={`font-bold text-sm ${isMe ? "text-indigo-700" : "text-slate-700"}`}>{item.displayName} {isMe && "(Sen)"}</div>
                            </div>
                            <div className="font-bold text-indigo-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100">{item.score} P</div>
                        </div>
                    );
                })
            )}
        </div>
      </div>
    </div>
  );
}
