// SADECE BU IMPORT'LARI EKLE:
import LeaderboardModal from "../components/LeaderboardModal";
import { Trophy } from "lucide-react";

// ... 

export default function Home() {
  // ...
  const [showLeaderboard, setShowLeaderboard] = useState(false); // STATE EKLENDİ

  return (
    <div className="...">
      {/* MODALLAR */}
      {showProfileModal && <ProfileModal user={user} onClose={() => setShowProfileModal(false)} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />} {/* BU SATIR EKLENDİ */}

      <div className="...">
        
        {/* Üst Bar */}
        <div className="flex justify-between items-center w-full px-1">
          <div className="flex gap-2">
             <button onClick={() => setShowProfileModal(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600"><Settings size={18} /></button>
             
             {/* YENİ: LİDERLİK BUTONU */}
             <button onClick={() => setShowLeaderboard(true)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-yellow-500">
                <Trophy size={18} />
             </button>

             <button onClick={handleReset} ... ><RotateCcw size={18} /></button>
          </div>
          {/* ... */}
