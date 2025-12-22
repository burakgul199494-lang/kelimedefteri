import React, { useState } from "react"; 
import { Loader2, X, Save, Trash2, Plus, Tag, Languages } from "lucide-react";
import { useData } from "../context/DataContext";

const WORD_TYPES = [
  { value: "noun", label: "İsim" }, { value: "verb", label: "Fiil" }, { value: "adjective", label: "Sıfat" },
  { value: "adverb", label: "Zarf" }, { value: "prep", label: "Edat" }, { value: "pronoun", label: "Zamir" },
  { value: "conj", label: "Bağlaç" }, { value: "article", label: "Tanımlık" }, { value: "other", label: "Diğer" },
];

const QuickAddModal = ({ word, prefillData, onClose }) => {
  const { handleSaveNewWord, handleSaveSystemWord, handleUpdateSystemWord, isAdmin } = useData();
   
  const initialData = prefillData ? {
      ...prefillData,
      phonetic: prefillData.phonetic || "", // <--- MEVCUT VERİ VARSA ÇEK
      sentence_tr: prefillData.sentence_tr || "",
      tags: Array.isArray(prefillData.tags) ? prefillData.tags : [],
      definitions: prefillData.definitions.map(d => ({ 
          type: d.type || "noun", 
          meaning: d.meaning || "", 
          engExplanation: d.engExplanation || "", 
          trExplanation: d.trExplanation || "" 
      }))
  } : {
    word: word || "", 
    phonetic: "", // <--- YENİ EKLENDİ
    tags: [], plural: "", v2: "", v3: "", vIng: "", thirdPerson: "", advLy: "", compEr: "", superEst: "",
    definitions: [{ type: "noun", meaning: "", engExplanation: "", trExplanation: "" }], 
    sentence: "", 
    sentence_tr: "",
    source: isAdmin ? "system" : "user"
  };

  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
   
  // Manuel etiket girişi için state
  const [tagInput, setTagInput] = useState("");

  // --- MANUEL ETİKET FONKSİYONLARI ---
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) return; // Boşsa ekleme
    if (formData.tags.includes(trimmedTag)) {
        setTagInput(""); // Zaten varsa kutuyu temizle çık
        return; 
    }
    
    setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
    setTagInput(""); // Kutuyu temizle
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
          e.preventDefault(); // Formu göndermeyi engelle
          handleAddTag();
      }
  };

  // --- KAYDETME ---
  const handleSave = async () => {
    if (!formData.word || !formData.sentence) { alert("Lütfen Kelime ve Örnek Cümle alanlarını doldurun."); return; }
    
    // Temiz Veri Hazırlığı
    const cleanData = {
        ...formData,
        phonetic: formData.phonetic || "", // Boşsa boş string gitsin
    };

    setSaving(true);
    let result;
    if (prefillData && isAdmin) result = await handleUpdateSystemWord(prefillData.id, cleanData);
    else if (isAdmin) result = await handleSaveSystemWord(cleanData);
    else result = await handleSaveNewWord(cleanData);
    setSaving(false);
    if(result && result.success) { alert("Kaydedildi!"); onClose(); }
    else if(result) alert(result.message);
    else { alert("Kaydedildi!"); onClose(); }
  };

  // Tanım güncelleme yardımcıları
  const updateDef = (i, f, v) => { const n = [...formData.definitions]; n[i] = { ...n[i], [f]: v }; setFormData(p => ({ ...p, definitions: n })); };
  const addDef = () => setFormData(p => ({ ...p, definitions: [...p.definitions, { type: "noun", meaning: "", engExplanation: "", trExplanation: "" }] }));
  const removeDef = (i) => { if(formData.definitions.length > 1) setFormData(p => ({...p, definitions: p.definitions.filter((_, idx) => idx !== i)})); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg"> {prefillData ? "Kelimeyi Düzenle" : "Hızlı Kelime Ekle"} </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-4">
          
          {/* Kelime ve Fonetik Girişi */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">KELİME & OKUNUŞ</label>
            <div className="flex gap-2">
                <input 
                    value={formData.word} 
                    onChange={e => setFormData({ ...formData, word: e.target.value })} 
                    className="flex-1 p-3 border rounded-xl font-bold text-lg focus:border-indigo-500 outline-none" 
                    placeholder="Kelime..." 
                />
                
                {/* YENİ FONETİK KUTUSU */}
                <input 
                    value={formData.phonetic} 
                    onChange={e => setFormData({ ...formData, phonetic: e.target.value })} 
                    className="w-24 p-3 border rounded-xl font-serif italic text-center focus:border-indigo-500 outline-none text-slate-600" 
                    placeholder="/rʌn/" 
                />
            </div>
          </div>

          {/* --- MANUEL ETİKET ALANI --- */}
          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
              <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase">Etiketler (Manuel)</label>
              
              {/* Etiket Giriş Kutusu */}
              <div className="flex gap-2 mb-3">
                  <input 
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 p-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Etiket yaz (Örn: A1, Fiil)..."
                  />
                  <button 
                    onClick={handleAddTag}
                    className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
              </div>

              {/* Eklenen Etiketler Listesi */}
              <div className="flex flex-wrap gap-2">
                  {formData.tags.length > 0 ? (
                      formData.tags.map((tag, i) => (
                        <span key={i} className="bg-white text-indigo-600 px-2 py-1 rounded-lg text-xs font-bold shadow-sm border border-indigo-100 flex items-center gap-1 group">
                            <Tag className="w-3 h-3"/> 
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="text-indigo-300 hover:text-red-500 ml-1">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                      ))
                  ) : (
                      <span className="text-xs text-indigo-300 italic">Hiç etiket yok.</span>
                  )}
              </div>
          </div>

          {/* Fiil & İsim Detayları */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Fiil & İsim Detayları (Opsiyonel)</div>
            <div className="space-y-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Çoğul</label><input value={formData.plural} onChange={e=>setFormData({...formData, plural:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs text-slate-500 mb-1">3. Tekil</label><input value={formData.thirdPerson} onChange={e=>setFormData({...formData, thirdPerson:e.target.value})} className="w-full p-2 border rounded text-sm"/></div><div><label className="block text-xs text-slate-500 mb-1">V-ing</label><input value={formData.vIng} onChange={e=>setFormData({...formData, vIng:e.target.value})} className="w-full p-2 border rounded text-sm"/></div></div>
                <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs text-slate-500 mb-1">V2 (Past)</label><input value={formData.v2} onChange={e=>setFormData({...formData, v2:e.target.value})} className="w-full p-2 border rounded text-sm"/></div><div><label className="block text-xs text-slate-500 mb-1">V3</label><input value={formData.v3} onChange={e=>setFormData({...formData, v3:e.target.value})} className="w-full p-2 border rounded text-sm"/></div></div>
            </div>
          </div>
          
          {/* Sıfat & Zarf Detayları */}
          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
             <div className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wide">Sıfat & Zarf Detayları (Opsiyonel)</div>
             <div className="space-y-3">
                <div><label className="block text-xs text-orange-700/70 mb-1">Zarf (-ly)</label><input value={formData.advLy} onChange={e=>setFormData({...formData, advLy:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs text-orange-700/70 mb-1">Comp (-er)</label><input value={formData.compEr} onChange={e=>setFormData({...formData, compEr:e.target.value})} className="w-full p-2 border rounded text-sm"/></div><div><label className="block text-xs text-orange-700/70 mb-1">Super (-est)</label><input value={formData.superEst} onChange={e=>setFormData({...formData, superEst:e.target.value})} className="w-full p-2 border rounded text-sm"/></div></div>
             </div>
          </div>

          {/* Anlamlar */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Anlamlar</label>
            {formData.definitions.map((def, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded-xl border flex flex-col gap-2">
                <div className="flex gap-2">
                  <select value={def.type} onChange={e => updateDef(i, "type", e.target.value)} className="p-2 border rounded text-sm bg-white w-24">
                    {WORD_TYPES.map((t) => ( <option key={t.value} value={t.value}>{t.label.split(' ')[0]}</option> ))}
                  </select>
                  <input value={def.meaning} onChange={e => updateDef(i, "meaning", e.target.value)} className="flex-1 p-2 border rounded text-sm font-bold text-slate-700" placeholder="Türkçe anlam" />
                  {formData.definitions.length > 1 && <button onClick={() => removeDef(i)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
                </div>
                <input value={def.engExplanation} onChange={e => updateDef(i, "engExplanation", e.target.value)} className="w-full p-2 border rounded text-sm bg-indigo-50/50 placeholder:text-indigo-300" placeholder="İngilizce Tanım (Definition)" />
                <div className="relative">
                    <input value={def.trExplanation} onChange={e => updateDef(i, "trExplanation", e.target.value)} className="w-full p-2 pl-7 border rounded text-sm bg-green-50/50 placeholder:text-green-600/50" placeholder="Tanımın Türkçe Çevirisi" />
                    <Languages className="w-4 h-4 absolute left-2 top-2.5 text-green-600/50"/>
                </div>
              </div>
            ))}
            <button onClick={addDef} className="text-sm text-indigo-600 flex items-center gap-1 font-bold mt-2"><Plus className="w-4 h-4"/> Anlam Ekle</button>
          </div>

          {/* Örnek Cümle ve Çevirisi */}
          <div className="space-y-2">
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ÖRNEK CÜMLE</label>
                  <textarea value={formData.sentence} onChange={e => setFormData({ ...formData, sentence: e.target.value })} className="w-full p-3 border rounded-xl text-sm" placeholder="Örnek cümle..." rows={2}></textarea>
              </div>
              <div>
                  <label className="block text-xs font-bold text-indigo-500 mb-1 flex items-center gap-1"><Languages className="w-3 h-3"/> CÜMLE ÇEVİRİSİ</label>
                  <textarea value={formData.sentence_tr} onChange={e => setFormData({ ...formData, sentence_tr: e.target.value })} className="w-full p-3 border border-indigo-100 bg-indigo-50/30 rounded-xl text-sm focus:border-indigo-500 outline-none transition-colors" placeholder="Cümlenin Türkçe çevirisi..." rows={2}></textarea>
              </div>
          </div>
          
          <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center gap-2">{saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />} {prefillData ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickAddModal;
