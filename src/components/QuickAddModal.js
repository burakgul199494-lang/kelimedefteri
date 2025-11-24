import React, { useState, useEffect } from "react";
import { Loader2, X, Save, Wand2, Brain, Trash2, Plus } from "lucide-react";
import { useData } from "../context/DataContext";
import { fetchWordAnalysisFromAI, fetchRootFromAI } from "../services/aiService";

const WORD_TYPES = [
  { value: "noun", label: "İsim" }, { value: "verb", label: "Fiil" }, { value: "adjective", label: "Sıfat" },
  { value: "adverb", label: "Zarf" }, { value: "prep", label: "Edat" }, { value: "pronoun", label: "Zamir" },
  { value: "conj", label: "Bağlaç" }, { value: "article", label: "Tanımlık" }, { value: "other", label: "Diğer" },
];

const QuickAddModal = ({ word, onClose }) => {
  const { handleSaveNewWord, handleSaveSystemWord, isAdmin } = useData();
  
  const initialData = {
    word: word || "",
    plural: "", v2: "", v3: "", vIng: "", thirdPerson: "",
    advLy: "", compEr: "", superEst: "",
    definitions: [{ type: "noun", meaning: "", engExplanation: "" }],
    sentence: "",
    source: isAdmin ? "system" : "user"
  };

  const [formData, setFormData] = useState(initialData);
  const [loadingAI, setLoadingAI] = useState(false);
  const [rootLoading, setRootLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (word) handleAIFill(); }, []);

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
        setFormData(prev => ({ ...prev, ...data, definitions: safeDefinitions }));
      }
    } catch (e) { console.error(e); }
    setLoadingAI(false);
  };

  const handleSave = async () => {
    if (!formData.word || !formData.sentence) { alert("Lütfen temel alanları doldurun."); return; }
    setSaving(true);
    let result;
    if (isAdmin) result = await handleSaveSystemWord(formData);
    else result = await handleSaveNewWord(formData);
    
    setSaving(false);
    if(result && result.success) { alert("Eklendi!"); onClose(); }
    else if(result) alert(result.message);
    else { alert("Eklendi!"); onClose(); }
  };

  const updateDef = (i, f, v) => { const n = [...formData.definitions]; n[i] = { ...n[i], [f]: v }; setFormData(p => ({ ...p, definitions: n })); };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Hızlı Kelime Ekle {isAdmin && "(Sistem)"}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={formData.word} onChange={e => setFormData({ ...formData, word: e.target.value })} className="flex-1 p-3 border rounded-xl font-bold" placeholder="Kelime" />
            <button onClick={handleConvertToRoot} disabled={rootLoading} className="bg-orange-100 text-orange-600 p-3 rounded-xl">{rootLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}</button>
            <button onClick={handleAIFill} disabled={loadingAI} className="bg-purple-600 text-white px-3 rounded-xl">{loadingAI ? <Loader2 className="animate-spin" /> : <Brain />}</button>
          </div>
          
          {/* Basitleştirilmiş Fiil/Sıfat Alanları (Yer kaplamaması için accordion yapılabilir ama şimdilik açık) */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2">
             <div className="font-bold text-slate-400">EKSTRA FORMLAR (Opsiyonel)</div>
             <div className="grid grid-cols-2 gap-2">
                <input placeholder="Plural" value={formData.plural} onChange={e=>setFormData({...formData, plural:e.target.value})} className="p-1 border rounded"/>
                <input placeholder="V2 (Past)" value={formData.v2} onChange={e=>setFormData({...formData, v2:e.target.value})} className="p-1 border rounded"/>
                <input placeholder="V3" value={formData.v3} onChange={e=>setFormData({...formData, v3:e.target.value})} className="p-1 border rounded"/>
                <input placeholder="V-ing" value={formData.vIng} onChange={e=>setFormData({...formData, vIng:e.target.value})} className="p-1 border rounded"/>
             </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Anlamlar</label>
            {formData.definitions.map((def, i) => (
              <div key={i} className="bg-slate-50 p-2 rounded border">
                <div className="flex gap-2 mb-2">
                   <select value={def.type} onChange={e => updateDef(i, "type", e.target.value)} className="p-1 border rounded text-sm bg-white">{WORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                   <input value={def.meaning} onChange={e => updateDef(i, "meaning", e.target.value)} className="flex-1 p-1 border rounded text-sm" placeholder="Türkçe anlam" />
                </div>
                <input value={def.engExplanation} onChange={e => updateDef(i, "engExplanation", e.target.value)} className="w-full p-1 border rounded text-sm bg-indigo-50" placeholder="İngilizce Açıklama" />
              </div>
            ))}
            <button onClick={() => setFormData(p => ({ ...p, definitions: [...p.definitions, { type: "noun", meaning: "", engExplanation: "" }] }))} className="text-sm text-indigo-600 flex items-center gap-1 font-bold"><Plus className="w-4 h-4"/> Anlam Ekle</button>
          </div>

          <textarea value={formData.sentence} onChange={e => setFormData({ ...formData, sentence: e.target.value })} className="w-full p-3 border rounded-xl text-sm" placeholder="Örnek cümle..." rows={3}></textarea>
          
          <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />} Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickAddModal;
