import React from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { Trophy, BookOpen, Layers, Hourglass, ArrowRight, Play } from "lucide-react";

export default function Home() {
  const { getAllWords, knownWordIds, learningQueue } = useData();
  const navigate = useNavigate();

  const allWords = getAllWords();
  const totalWords = allWords.length;

  // --- HESAPLAMALAR ---
  
  // 1. Öğrenilenler (Biliyorum dediklerin)
  const learnedCount = knownWordIds.length;

  // 2. Beklemede Olanlar (Sıraya alınmış ama tekrar zamanı henüz GELMEMİŞ olanlar)
  // learningQueue içindeki kelimelerden, nextReview tarihi şu andan büyük olanlar.
  const now = new Date();
  const waitingCount = learningQueue.filter(item => new Date(item.nextReview) > now).length;

  // 3. Öğreneceğim (Kalan)
  // Toplamdan (Bildiğim + Beklemede) olanları çıkarırsak havuzda kalanları buluruz.
  // Not: learningQueue'de olup zamanı gelmiş olanlar da "aktif" havuz sayılır, 
  // ama basitlik olsun diye: Bilinmeyenler - Bekleyenler formülü daha temizdir.
  // Daha net bir mantık: (Tümü) - (Bildiklerim) - (Bekleyenler)
  const remainingCount = totalWords - learnedCount - waitingCount;

  // Yüzde Hesabı (İlerleme çubuğu için - Sadece öğrenilen baz alınır)
  const progressPercent = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;

  // --- KART BİLEŞENİ (Tıklanabilir) ---
  const StatCard = ({ title, count, icon: Icon, color, link, desc }) => (
    <div 
      onClick={() => navigate(link)}
      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group cursor-pointer transition-all hover:shadow-md hover:border-slate-200 active:scale-95"
    >
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        <Icon className="w-16 h-16" />
      </div>
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
             <Icon className={`w-5 h-5 ${color.replace("text-", "text-")}`} /> 
             {/* Not: Tailwind class yapısı gereği color prop'unu text-color olarak gönderiyoruz */}
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        </div>
        <div>
           <div className="text-3xl font-black text-slate-800">{count}</div>
           <div className="text-[10px] text-slate-400 font-medium mt-1">{desc}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      
      {/* Üst Header Alanı */}
      <div className="bg-white px-6 pt-12 pb-8 rounded-b-[40px] shadow-sm border-b border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Hoş Geldin! 👋</h1>
            <p className="text-slate-500 text-sm font-medium">Bugün kelime hazineni genişlet.</p>
          </div>
          <div className="bg-indigo-50 p-2 rounded-full border border-indigo-100">
            <Trophy className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        {/* Ana İlerleme Çubuğu */}
        <div className="bg-slate-100 rounded-full h-4 w-full overflow-hidden flex">
          <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
          <span>Başlangıç</span>
          <span>%{progressPercent} Tamamlandı</span>
        </div>
      </div>

      {/* İstatistik Kartları (Navigasyon) */}
      <div className="px-6 -mt-6">
        <div className="grid grid-cols-2 gap-3">
            
            {/* 1. Kalan (Öğreneceğim) */}
            <StatCard 
              title="Öğreneceğim" 
              count={remainingCount} 
              icon={Layers} 
              color="text-blue-600"
              link="/words/unknown"
              desc="Çalışılacak Kelimeler"
            />

            {/* 2. Öğrenilen */}
            <StatCard 
              title="Öğrenilen" 
              count={learnedCount} 
              icon={Trophy} 
              color="text-green-600"
              link="/words/known"
              desc="Ezberlediğin Kelimeler"
            />
        </div>

        {/* 3. Beklemede (Tam Genişlik) */}
        <div className="mt-3">
             <div 
                onClick={() => navigate("/words/waiting")}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
             >
                <div className="flex items-center gap-4">
                    <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
                        <Hourglass className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-800">{waitingCount}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Tekrar Bekleyenler</div>
                    </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
             </div>
        </div>
      </div>

      {/* Ana Aksiyon Butonları */}
      <div className="px-6 mt-8 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">Çalışma Alanı</h3>
        
        {/* Kelime Kartları */}
        <button 
          onClick={() => navigate("/flashcard")}
          className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-indigo-200 transition-all group active:scale-[0.98]"
        >
           <div className="bg-indigo-100 p-3 rounded-xl">
             <BookOpen className="w-6 h-6 text-indigo-600" />
           </div>
           <div className="flex-1 text-left">
             <div className="font-bold text-lg text-slate-800">Kelime Kartları</div>
             <div className="text-sm text-slate-500">Kartları kaydırarak çalış.</div>
           </div>
           <div className="bg-slate-50 p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
              <Play className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 fill-current" />
           </div>
        </button>

        {/* Yazma Alıştırması */}
        <button 
          onClick={() => navigate("/writing-game")}
          className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-purple-200 transition-all group active:scale-[0.98]"
        >
           <div className="bg-purple-100 p-3 rounded-xl">
             <Layers className="w-6 h-6 text-purple-600" />
           </div>
           <div className="flex-1 text-left">
             <div className="font-bold text-lg text-slate-800">Yazma Testi</div>
             <div className="text-sm text-slate-500">Kelimeleri yazarak pekiştir.</div>
           </div>
           <div className="bg-slate-50 p-2 rounded-full group-hover:bg-purple-50 transition-colors">
              <Play className="w-4 h-4 text-slate-400 group-hover:text-purple-600 fill-current" />
           </div>
        </button>
      </div>

    </div>
  );
}
