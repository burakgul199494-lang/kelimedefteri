import React, { useState } from "react";
import { X, Check, X as XIcon, Calendar as CalIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "../context/DataContext";

export default function CalendarModal({ onClose }) {
  const { questHistory, DAILY_QUESTS_TARGETS } = useData();

  // Gerçek "Bugün" (Sabit kalır)
  const realToday = new Date();
  
  // Takvimde görüntülenen Ay/Yıl (Değişebilir)
  const [viewDate, setViewDate] = useState(new Date());

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0 = Ocak

  // Ay değiştirme fonksiyonu
  const changeMonth = (offset) => {
      const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
      setViewDate(newDate);
  };

  // Ayın ismini al (Örn: "Aralık")
  const monthName = viewDate.toLocaleDateString("tr-TR", { month: "long" });

  // Ayın kaç çektiğini bul
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Ayın ilk günü haftanın kaçıncı günü? (Pazartesi'den başlatmak için ayar)
  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  // Takvim kutucuklarını oluştur
  const days = [];
  
  // 1. Boşlukları doldur
  for (let i = 0; i < startOffset; i++) {
      days.push({ type: "empty", key: `empty-${i}` });
  }

  // 2. Günleri doldur
  for (let d = 1; d <= daysInMonth; d++) {
      // Veritabanı anahtarı formatı: YYYY-MM-DD (Yerel saat farkını yoksayarak string oluşturma)
      // Ay +1 çünkü getMonth() 0 indeksli
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // Bu gün, gerçek hayattaki bugün mü?
      const isToday = 
          d === realToday.getDate() && 
          currentMonth === realToday.getMonth() && 
          currentYear === realToday.getFullYear();

      // Gelecek bir gün mü? (Görüntülenen ay/yıl ile gerçek bugünü kıyasla)
      const checkDate = new Date(currentYear, currentMonth, d);
      const isFuture = checkDate > realToday; // Saat farkını önemsememek için basit kıyaslama yeterli olabilir ama setHours daha garanti.
      checkDate.setHours(0,0,0,0);
      const realTodayZero = new Date(realToday);
      realTodayZero.setHours(0,0,0,0);
      const isFutureDay = checkDate.getTime() > realTodayZero.getTime();

      // Geçmiş veri kontrolü
      const dayData = questHistory[dateStr];
      const progress = dayData?.progress || {};

      // DİNAMİK KONTROL: Tüm hedefler tutturuldu mu?
      const isAllDone = Object.keys(DAILY_QUESTS_TARGETS).every(key => {
          const currentVal = progress[key] || 0;
          const targetVal = DAILY_QUESTS_TARGETS[key];
          return currentVal >= targetVal;
      });
      
      // Kaçırılan gün mü? (Gelecek değil + Bugün Değil + Tamamlanmamış)
      // Not: Eğer o gün için HİÇ veri yoksa (dayData undefined) ve geçmişse, gri kalabilir veya kırmızı olabilir.
      // Şu anki mantık: Veri varsa ve eksikse kırmızı. Hiç girmemişse gri.
      // Eğer "Hiç girmediği günleri de başarısız say" istersen `&& dayData` kısmını kaldırabilirsin.
      const isMissed = !isFutureDay && !isToday && dayData && !isAllDone;

      days.push({ 
          type: "day", 
          dayNum: d, 
          dateStr, 
          isToday, 
          isFuture: isFutureDay,
          isAllDone, 
          isMissed,
          hasData: !!dayData
      });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        
        {/* Başlık ve Navigasyon */}
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl">
                    <CalIcon className="w-6 h-6 text-indigo-600"/>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-none capitalize">
                        {monthName} {currentYear}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">Günlük Takip</span>
                </div>
            </div>
            
            {/* Ay Değiştirme Butonları */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600">
                    <ChevronLeft className="w-5 h-5"/>
                </button>
                <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600">
                    <ChevronRight className="w-5 h-5"/>
                </button>
            </div>

            <button onClick={onClose} className="p-2 ml-2 bg-slate-100 rounded-full hover:bg-slate-200">
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
                            aspect-square rounded-xl flex items-center justify-center text-sm font-bold relative border transition-all select-none
                            ${item.isToday ? "border-indigo-500 ring-2 ring-indigo-100 bg-white text-indigo-700 z-10" : "border-slate-100 bg-slate-50 text-slate-400"}
                            ${!item.isToday && item.isAllDone ? "bg-green-100 border-green-200 text-green-700" : ""}
                            ${item.isMissed ? "bg-red-50 border-red-100 text-red-400" : ""}
                            ${item.isFuture ? "opacity-40" : ""}
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
