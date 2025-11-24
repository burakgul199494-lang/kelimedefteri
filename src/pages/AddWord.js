import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useData } from "../context/DataContext";
import { fetchWordAnalysisFromAI, fetchRootFromAI } from "../services/aiService";
import { ArrowLeft, Loader2, Wand2, Brain, Plus, Trash2, Save } from "lucide-react";

const WORD_TYPES = [
  { value: "noun", label: "İsim" }, { value: "verb", label: "Fiil" }, { value: "adjective", label: "Sıfat" },
  { value: "adverb", label: "Zarf" }, { value: "prep", label: "Edat" }, { value: "pronoun", label: "Zamir" },
  { value: "conj", label: "Bağlaç" }, { value: "article", label: "Tanımlık" }, { value: "other", label: "Diğer" },
];

export default function AddWord() {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleSaveNewWord, handleUpdateWord } = useData();

  // Eğer "Düzenle" butonuna basılarak gelindiyse, location.state içinde kelime verisi olur
  const editingWord = location.state?.editingWord;
  const isEditMode = !!editingWord;

  const initialData = editingWord ? {
      ...editingWord,
      definitions: editingWord.definitions.map(d => ({ type: d.type||"noun", meaning: d.meaning||"", engExplanation: d.engExplanation||"" }))
  } : {
      word: "", plural: "", v2: "", v3: "", vIng: "", thirdPerson: "",
      advLy: "", compEr: "", superEst: "",
      definitions: [{ type: "noun", meaning: "", engExplanation: "" }],
      sentence: "",
  };

  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [rootLoading, setRootLoading] = useState(false);

  const handleConvertToRoot = async () => {
      if (!formData.word) return;
      setRootLoading(true);
      try {
          const res = await fetchRootFromAI(formData.word);
          if (res && res.changed) setFormData(p => ({ ...p, word: res.root }));
      } catch (e) { console.error(e); } finally { setRootLoading(false); }
  };

  const handleAIFill = async () => {
      if (!formData.word) return alert("Kelime yazın.");
      setAiLoading(true);
      try {
          const data = await fetchWordAnalysisFromAI(formData.word);
          if (data) {
             const safeDefs = data.definitions.map(d => ({ type: d.type||"noun", meaning: d.meaning||"", engExplanation: d.engExplanation||"" }));
             setFormData(p => ({ ...p, ...data, definitions: safeDefs }));
          }
      } catch (e) { console.error(e); } finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.word || !formData.sentence) return alert("Eksik alanları doldurun.");
      setSaving(true);
      
      if (isEditMode) {
          await handleUpdateWord(editingWord.id, formData);
          navigate(-1); // Geldiği yere geri dön
      } else {
          const res = await handleSaveNewWord(formData);
          if (res.success) { alert("Eklendi!"); setFormData(initialData); } 
          else alert(res.message);
      }
      setSaving(false);
  };

  const updateDef = (i, f, v) => { const n = [...formData.definitions]; n[i] = { ...n[i], [f]: v }; setFormData(p => ({ ...p, definitions: n })); };

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex justify-center">
       <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 my-4 overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
             <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full"><ArrowLeft className="w-5 h-5"/></button>
             <h2 className="text-xl font-bold text-slate-800">{isEditMode ? "Kelime Düzenle" : "Yeni Kelime Ekle"}</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="flex gap-2">
                 <input value={formData.word} onChange={e => setFormData({ ...formData, word: e.target.value })} className="flex-1 p-3 border rounded-xl font-bold" placeholder="Kelime" autoFocus />
                 <button type="button" onClick={handleConvertToRoot} disabled={rootLoading} className="bg-orange-100 text-orange-600 p-3 rounded-xl">{rootLoading?<Loader2 className="animate-spin"/>:<Wand2/>}</button>
                 <button type="button" onClick={handleAIFill} disabled={aiLoading} className="bg-purple-600 text-white px-3 rounded-xl">{aiLoading?<Loader2 className="animate-spin"/>:<Brain/>}</button>
             </div>

             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2">
                 <div className="font-bold text-slate-400">EKSTRA FORMLAR</div>
                 <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Plural" value={formData.plural} onChange={e=>setFormData({...formData, plural:e.target.value})} className="p-1 border rounded"/>
                    <input placeholder="V2 (Past)" value={formData.v2} onChange={e=>setFormData({...formData, v2:e.target.value})} className="p-1 border rounded"/>
                    <input placeholder="V3" value={formData.v3} onChange={e=>setFormData({...formData, v3:e.target.value})} className="p-1 border rounded"/>
                    <input placeholder="V-ing" value={formData.vIng} onChange={e=>setFormData({...formData, vIng:e.target.value})} className="p-1 border rounded"/>
                 </div>
             </div>

             <div className="space-y-2">
                <label className="font-medium text-sm">Anlamlar</label>
                {formData.definitions.map((def, i) => (
                   <div key={i} className="bg-slate-50 p-2 rounded border">
                      <div className="flex gap-2 mb-2">
                         <select value={def.type} onChange={e => updateDef(i, "type", e.target.value)} className="p-1 border rounded text-sm bg-white">{WORD_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select>
                         <input value={def.meaning} onChange={e => updateDef(i, "meaning", e.target.value)} className="flex-1 p-1 border rounded text-sm" placeholder="Türkçe anlam" />
                      </div>
                      <input value={def.engExplanation} onChange={e => updateDef(i, "engExplanation", e.target.value)} className="w-full p-1 border rounded text-sm bg-indigo-50" placeholder="İngilizce Açıklama" />
                   </div>
                ))}
                <button type="button" onClick={() => setFormData(p => ({ ...p, definitions: [...p.definitions, { type: "noun", meaning: "", engExplanation: "" }] }))} className="text-sm text-indigo-600 font-bold flex gap-1"><Plus className="w-4 h-4"/> Ekle</button>
             </div>

             <textarea value={formData.sentence} onChange={e => setFormData({ ...formData, sentence: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Örnek Cümle" rows={3}/>
             <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center">{saving ? <Loader2 className="animate-spin"/> : <Save className="w-5 h-5 mr-2"/>} Kaydet</button>
          </form>
       </div>
    </div>
  );
}
