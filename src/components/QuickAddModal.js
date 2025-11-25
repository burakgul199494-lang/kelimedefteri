import React, { useState, useEffect } from "react";
import { Loader2, X, Save, Wand2, Brain, Trash2, Plus, Tag } from "lucide-react";
import { useData } from "../context/DataContext";
import { fetchWordAnalysisFromAI, fetchRootFromAI } from "../services/aiService";

const WORD_TYPES = [
  { value: "noun", label: "İsim" }, { value: "verb", label: "Fiil" }, { value: "adjective", label: "Sıfat" },
  { value: "adverb", label: "Zarf" }, { value: "prep", label: "Edat" }, { value: "pronoun", label: "Zamir" },
  { value: "conj", label: "Bağlaç" }, { value: "article", label: "Tanımlık" }, { value: "other", label: "Diğer" },
];

const QuickAddModal = ({ word, prefillData, onClose }) => {
  const { handleSaveNewWord, handleSaveSystemWord, handleUpdateSystemWord, isAdmin } = useData();
  
  const initialData = prefillData ? {
      ...prefillData,
      tags: Array.isArray(prefillData.tags) ? prefillData.tags : [], // GÜVENLİK: Dizi kontrolü
      definitions: prefillData.definitions.map(d => ({
          type: d.type || "noun",
          meaning: d.meaning || "",
          engExplanation: d.engExplanation || ""
      }))
  } : {
    word: word || "",
    tags: [], // Varsayılan boş liste
    plural: "", v2: "", v3: "", vIng: "", thirdPerson: "",
    advLy: "", compEr: "", superEst: "",
    definitions: [{ type: "noun", meaning: "", engExplanation: "" }],
    sentence: "",
    source: isAdmin ? "system" : "user"
  };

  const [formData, setFormData] = useState(initialData);
  const [tagInput, setTagInput] = useState(""); // Etiket girişi için
  const [loadingAI, setLoadingAI] = useState(false);
  const [rootLoading, setRootLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (word && !prefillData) handleAIFill(); }, []);

  const handleConvertToRoot = async () => {
    if (!formData.word) return;
    setRootLoading(true);
    try {
      const result = await fetchRootFromAI(formData.word);
      if (result && result.changed) setFormData(prev => ({ ...prev, word: result.root }));
    } catch (e) { console.error(e); } finally { setRootLoading(false); }
  };

  const handleAIFill = async () => {
    setLoadingAI(true);
    try {
      const data = await fetchWordAnalysisFromAI(formData.word);
      if (data) {
        const safeDefinitions = Array.isArray(data.definitions)
          ? data.definitions.map(d => ({ type: d.type || "noun", meaning: d.meaning || "", engExplanation: d.engExplanation || "" }))
          : [{ type: "noun", meaning: "", engExplanation: "" }];
        
        // GÜVENLİK: Gelen tags verisi dizi mi kontrol et
        const safeTags = Array.isArray(data.tags) ? data.tags : [];

        setFormData(prev => ({ ...prev, ...data, tags: safeTags, definitions: safeDefinitions }));
      }
    } catch (e) { console.error(e); }
    setLoadingAI(false);
  };

  // Etiket Ekleme
  const addTag = (e) => {
      e.preventDefault(); // Form submit olmasın diye
      if(tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
          setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
          setTagInput("");
      }
  };

  // Etiket Silme
  const removeTag = (tagToRemove) => {
      setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const handleSave = async () => {
    if (!formData.word || !formData.sentence) { alert("Lütfen temel alanları doldurun."); return; }
    setSaving(true);
    
    let result;
    if (prefillData && isAdmin) {
        result = await handleUpdateSystemWord(prefillData.id, formData);
    } else if (isAdmin) {
        result = await handleSaveSystemWord(formData);
    } else {
        result = await handleSaveNewWord(formData);
    }
    
    setSaving(false);
    if(result && result.success) { alert("İşlem Başarılı!"); onClose(); }
    else if(result) alert(result.message);
    else { alert("Başarılı!"); onClose(); }
  };

  const updateDef = (i, f, v) => { const n = [...formData.definitions]; n[i] = { ...n[i], [f]: v }; setFormData(p => ({ ...p, definitions: n })); };
  const addDef = () => setFormData(p => ({ ...p, definitions: [...p.definitions, { type: "noun", meaning: "", engExplanation: "" }] }));
  const removeDef = (i) => { if(formData.definitions.length > 1) setFormData(p => ({...p, definitions: p.definitions.filter((_, idx) => idx !== i)})); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg"> {prefillData ? "Kelimeyi Düzenle" : "Hızlı Kelime Ekle"} </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={formData.word} onChange={e => setFormData({ ...formData, word: e.target.value })} className="flex-1 p-3 border rounded-xl font-bold" placeholder="Kelime" />
            <button onClick={handleConvertToRoot} disabled={rootLoading} className="bg-orange-100 text-orange-600 p-3 rounded-xl">{rootLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}</button>
            <button onClick={handleAIFill} disabled={loadingAI} className="bg-purple-600 text-white px-3 rounded-xl">{loadingAI ? <Loader2 className="animate-spin" /> : <Brain />}</button>
          </div>

          {/* --- YENİ EKLENEN ETİKET BÖLÜMÜ --- */}
          <div>
              <div className="flex gap-2 mb-2">
                  <input 
                    value={tagInput} 
                    onChange={(e) => setTagInput(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && addTag(e)} // Enter ile ekleme
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-sm" 
                    placeholder="Etiket (Örn: Yiyecek)" 
                  />
                  <button onClick={addTag} className="bg-slate-800 text-white px-3 rounded-lg"><Plus className="w-4 h-4"/></button>
              </div>
              <div className="flex flex-wrap gap-2">
                  {/* Güvenli Map Kullanımı */}
                  {(Array.isArray(formData.tags) ? formData.tags : []).map((tag, i) => (
                      <span key={i} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-100">
                          {tag} 
                          <button onClick={() => removeTag(tag)}><X className="w-3 h-3 hover:text-red-500"/></button>
                      </span>
                  ))}
              </div>
          </div>
          {/* ----------------------------------- */}
          
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
             <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Fiil & İsim Detayları</div>
             <div className="space-y-3">
               <div><label className="block text-xs text-slate-500 mb-1">Çoğul</label><input value={formData.plural} onChange={e=>setFormData({...formData, plural:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
               <div className="grid grid-cols-2 gap-2">
                   <div><label className="block text-xs text-slate-500 mb-1">3. Tekil</label><input value={formData.thirdPerson} onChange={e=>setFormData({...formData, thirdPerson:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                   <div><label className="block text-xs text-slate-500 mb-1">V-ing</label><input value={formData.vIng} onChange={e=>setFormData({...formData, vIng:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
               </div>
               <div className="grid grid-cols-2 gap-2">
                   <div><label className="block text-xs text-slate-500 mb-1">V2 (Past)</label><input value={formData.v2} onChange={e=>setFormData({...formData, v2:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                   <div><label className="block text-xs text-slate-500 mb-1">V3</label><input value={formData.v3} onChange={e=>setFormData({...formData, v3:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
               </div>
             </div>
          </div>

          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
             <div className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wide">Sıfat & Zarf Detayları</div>
             <div className="space-y-3">
               <div><label className="block text-xs text-orange-700/70 mb-1">Zarf (-ly)</label><input value={formData.advLy} onChange={e=>setFormData({...formData, advLy:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
               <div className="grid grid-cols-2 gap-2">
                   <div><label className="block text-xs text-orange-700/70 mb-1">Comp (-er)</label><input value={formData.compEr} onChange={e=>setFormData({...formData, compEr:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                   <div><label className="block text-xs text-orange-700/70 mb-1">Super (-est)</label><input value={formData.superEst} onChange={e=>setFormData({...formData, superEst:e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
               </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Anlamlar</label>
            {formData.definitions.map((def, i) => (
              <div key={i} className="bg-slate-50 p-2 rounded border flex flex-col gap-2">
                <div className="flex gap-2">
                   <select value={def.type} onChange={e => updateDef(i, "type", e.target.value)} className="p-1 border rounded text-sm bg-white w-20">{WORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label.split(' ')[0]}</option>)}</select>
                   <input value={def.meaning} onChange={e => updateDef(i, "meaning", e.target.value)} className="flex-1 p-1 border rounded text-sm" placeholder="Türkçe anlam" />
                   {formData.definitions.length > 1 && <button onClick={() => removeDef(i)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
                </div>
                <input value={def.engExplanation} onChange={e => updateDef(i, "engExplanation", e.target.value)} className="w-full p-1 border rounded text-sm bg-indigo-50" placeholder="İngilizce Açıklama" />
              </div>
            ))}
            <button onClick={addDef} className="text-sm text-indigo-600 flex items-center gap-1 font-bold"><Plus className="w-4 h-4"/> Anlam Ekle</button>
          </div>

          <textarea value={formData.sentence} onChange={e => setFormData({ ...formData, sentence: e.target.value })} className="w-full p-3 border rounded-xl text-sm" placeholder="Örnek cümle..." rows={3}></textarea>
          
          <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />} {prefillData ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickAddModal;
