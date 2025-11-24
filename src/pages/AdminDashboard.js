import React, { useState } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Plus, Search, Edit2, Trash2 } from "lucide-react";
import QuickAddModal from "../components/QuickAddModal";

export default function AdminDashboard() {
  const { dynamicSystemWords, handleDeleteSystemWord, isAdmin } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  
  // Hangi kelime düzenleniyor? (null ise kapalı)
  const [editingItem, setEditingItem] = useState(null);
  // Yeni kelime ekleme modu açık mı?
  const [isAddingNew, setIsAddingNew] = useState(false);

  if (!isAdmin) {
      setTimeout(() => navigate("/"), 0);
      return null;
  }

  const filtered = dynamicSystemWords
     .filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
     .sort((a,b) => a.word.localeCompare(b.word));

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      
      {/* YENİ EKLEME MODU */}
      {isAddingNew && (
          <QuickAddModal 
            onClose={() => setIsAddingNew(false)} 
          />
      )}

      {/* DÜZENLEME MODU */}
      {editingItem && (
          <QuickAddModal 
            prefillData={editingItem} 
            onClose={() => setEditingItem(null)} 
          />
      )}
      
      <div className="max-w-md mx-auto">
         <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600"/></button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Shield className="w-6 h-6"/> Yönetici Paneli</h2>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h3 className="font-bold text-slate-700 mb-4">Sistem Durumu</h3>
            <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
               <span className="text-blue-800 font-medium">Toplam Sistem Kelimesi</span>
               <span className="font-bold text-blue-800">{dynamicSystemWords.length}</span>
            </div>
         </div>

         <button onClick={() => setIsAddingNew(true)} className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 mb-6">
             <Plus className="w-5 h-5"/> Yeni Sistem Kelimesi Ekle
         </button>

         <div>
             <div className="relative mb-4">
                 <Search className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/>
                 <input type="text" placeholder="Ara..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-xl outline-none"/>
             </div>
             
             <div className="space-y-2">
                 {filtered.map(item => (
                     <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                         <div>
                             <div className="font-bold text-slate-800">{item.word}</div>
                             <div className="text-xs text-slate-500">{item.definitions[0]?.meaning}</div>
                         </div>
                         
                         {/* BUTON GRUBU */}
                         <div className="flex gap-2">
                             {/* DÜZENLE BUTONU - GERİ GELDİ! */}
                             <button 
                                onClick={() => setEditingItem(item)} 
                                className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Düzenle"
                             >
                                 <Edit2 className="w-4 h-4"/>
                             </button>

                             {/* SİL BUTONU */}
                             <button 
                                onClick={() => handleDeleteSystemWord(item.id)} 
                                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                title="Sil"
                             >
                                 <Trash2 className="w-4 h-4"/>
                             </button>
                         </div>
                     </div>
                 ))}
             </div>
         </div>
      </div>
    </div>
  );
}
