import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db, appId } from "../services/firebase";
import { 
  X, BarChart2, Calendar, 
  HelpCircle, Languages, Edit, Headphones, Quote, Layout, Puzzle, Mic, Play
} from "lucide-react";

export default function StatisticsModal({ onClose }) {
  const { user, getCurrentWeekKey } = useData();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bu haftanın verilerini çek
  useEffect(() => {
    if (!user) return;
    const weekKey = getCurrentWeekKey(); 
    
    // Veritabanından bu haftanın istatistiklerini dinle
    const statsRef = doc(db, "artifacts", appId, "weekly_stats", weekKey, "user_activities", user.uid);

    const unsub = onSnapshot(statsRef, (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data());
      } else {
        setStats({});
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user, getCurrentWeekKey]);

  // İstatistik Satırı Bileşeni
  const StatRow = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
        <span className="font-bold text-slate-700">{label}</span>
      </div>
      <div className="text-lg font-black text-slate-800">{value || 0}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Başlık */}
        <div className="bg-slate-800 p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-white">
            <BarChart2 className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold">Haftalık Rapor</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* İçerik */}
        <div className="p-5 overflow-y-auto space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <Calendar className="w-4 h-4" />
                <span>Bu Hafta (Pzt - Paz)</span>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400">Veriler Yükleniyor...</div>
            ) : (
                <div className="grid gap-3">
                    <StatRow icon={HelpCircle} label="Quiz Çözülen" value={stats?.quiz} color="bg-amber-500" />
                    <StatRow icon={Languages} label="Ters Quiz" value={stats?.reverse_quiz} color="bg-emerald-500" />
                    <StatRow icon={Play} label="Flash Kart" value={stats?.flashcard} color="bg-indigo-600" />
                    <StatRow icon={Edit} label="Yazma Testi" value={stats?.writing} color="bg-purple-600" />
                    <StatRow icon={Headphones} label="Dinle & Yaz" value={stats?.listening} color="bg-pink-600" />
                    <StatRow icon={Quote} label="Boşluk Doldurma" value={stats?.gap_filling} color="bg-cyan-600" />
                    <StatRow icon={Layout} label="Cümle Kurma" value={stats?.sentence_builder} color="bg-teal-600" />
                    <StatRow icon={Puzzle} label="Eşleştirme" value={stats?.word_match} color="bg-orange-500" />
                    <StatRow icon={Mic} label="Telaffuz" value={stats?.pronunciation} color="bg-rose-500" />
                </div>
            )}

            {!loading && Object.keys(stats || {}).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                    Henüz bu hafta bir aktivite yok. <br/> Haydi başlayalım!
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
