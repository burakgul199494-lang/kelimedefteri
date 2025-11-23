import React, { useState, useEffect } from "react";
import { Loader2, X, Save, Wand2, Brain, Trash2, Plus, Tag } from "lucide-react";
import { useData } from "../context/DataContext";
import { fetchWordAnalysisFromAI, fetchRootFromAI } from "../services/aiService";

const WORD_TYPES = [ { value: "noun", label: "İsim" }, { value: "verb", label: "Fiil" }, { value: "adjective", label: "Sıfat" }, { value: "adverb", label: "Zarf" }, { value: "prep", label: "Edat" }, { value: "pronoun", label: "Zamir" }, { value: "conj", label: "Bağlaç" }, { value: "article", label: "Tanımlık" }, { value: "other", label: "Diğer" }, ];

const QuickAddModal = ({ word, prefillData, onClose }) => {
  const { handleSaveNewWord, handleSaveSystemWord, handleUpdateSystemWord, isAdmin } = useData();
  
  const initialData = prefillData ? {
      ...prefillData,
      category: prefillData.category || "",
      definitions: prefillData.definitions.map(d => ({ type: d.type || "noun", meaning: d.meaning || "", engExplanation: d.engExplanation || "" }))
  } : {
    word: word || "", category: "",
    plural: "", v2: "", v3: "", vIng: "", thirdPerson: "", advLy: "", compEr: "", superEst: "",
    definitions: [{ type: "noun", meaning: "", engExplanation: "" }], sentence: "", source: isAdmin ? "system" : "user"
  };

  const [formData, setFormData] = useState(initialData);
  const [loadingAI, setLoadingAI] = useState(false);
  const [rootLoading, setRootLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (word && !prefillData) handleAIFill(); }, []);

  const handleConvertToRoot = async () => {
    if (!formData.word) return; setRootLoading(true);
    try { const res = await fetchRootFromAI(formData.word); if (res && res.changed) setFormData(p => ({ ...p, word: res.root })); } catch (e) {} finally { setRootLoading(false); }
  };

  const handleAIFill = async () => {
    setLoadingAI(true);
    try {
      const data = await fetchWordAnalysisFromAI(formData.word);
      if (data) {
        const safeDefs = data.definitions?.map(d => ({ type: d.type||"noun", meaning: d.meaning||"", engExplanation: d.engExplanation||"" })) || [{type:"noun",meaning:"",engExplanation:""}];
        setFormData(p => ({ ...p, ...data, category: data.category || "Genel", definitions: safeDefs }));
      }
    } catch (e) {} setLoadingAI(false);
  };

  const handleSave = async () => {
    if (!formData.word || !formData.sentence) return alert("Eksik alanlar.");
    setSaving(true);
    let result;
    if (prefillData && isAdmin) result = await handleUpdateSystemWord(prefillData.id, formData);
    else if (isAdmin) result = await handleSaveSystemWord(formData);
    else result = await handleSaveNewWord(formData);
    setSaving(false);
    if(result && result.success) { alert("Başarılı!"); onClose(); } else alert(result?.message || "Hata");
  };

  const updateDef = (i, f, v) => { const n = [...formData.definitions]; n[i] = { ...n[i], [f]: v }; setFormData(p => ({ ...p, definitions: n })); };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{prefillData ? "Düzenle" : "Hızlı Ekle"}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={formData.word} onChange={e => setFormData({ ...formData, word: e.target.value })} className="flex-1 p-3 border rounded-xl font-bold" placeholder="Kelime" />
            <button onClick={handleConvertToRoot} disabled={rootLoading} className="bg-orange-100 text-orange-600 p-3 rounded-xl">{rootLoading?<Loader2 className="animate-spin"/>:<Wand2/>}</button>
            <button onClick={handleAIFill} disabled={loadingAI} className="bg-purple-600 text-white px-3 rounded-xl">{loadingAI?<Loader2 className="animate-spin"/>:<Brain/>}</button>
          </div>

          {/* KATEGORİ ALANI */}
          <div className="relative">
             <Tag className="absolute left-3 top-3 text-slate-400 w-4 h-4"/>
             <input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full pl-9 p-2 border border-slate-200 rounded-xl text-sm bg-slate-50" placeholder="Kategori (AI doldurur)" />
          </div>

          {/* GRİ KUTU */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2">
             <div className="font-bold text-slate-400">FİİL & İSİM</div>
             <div><label className="text-slate-500">Çoğul</label><input value={formData.plural} onChange={e=>setFormData({...formData, plural:e.target.value})} className="w-full p-1 border rounded"/></div>
             <div className="grid grid-cols-2 gap-2">
                <div><label className="text-slate-500">3. Tekil</label><input value={formData.thirdPerson} onChange={e=>setFormData({...formData, thirdPerson:e.target.value})} className="w-full p-1 border rounded"/></div>
                <div><label className="text-slate-500">V-ing</label><input value={formData.vIng} onChange={e=>setFormData({...formData, vIng:e.target.value})} className="w-full p-1 border rounded"/></div>
                <div><label className="text-slate-500">V2</label><input value={formData.v2} onChange={e=>setFormData({...formData, v2:e.target.value})} className="w-full p-1 border rounded"/></div>
                <div><label className="text-slate-500">V3</label><input value={formData.v3} onChange={e=>setFormData({...formData, v3:e.target.value})} className="w-full p-1 border rounded"/></div>
             </div>
          </div>

          {/* TURUNCU KUTU */}
          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs space-y-2">
             <div className="font-bold text-orange-400">SIFAT & ZARF</div>
             <div className="grid grid-cols-3 gap-2">
                <div><label className="text-orange-700">Zarf</label><input value={formData.advLy} onChange={e=>setFormData({...formData, advLy:e.target.value})} className="w-full p-1 border rounded"/></div>
                <div><label className="text-orange-700">Comp</label><input value={formData.compEr} onChange={e=>setFormData({...formData, compEr:e.target.value})} className="w-full p-1 border rounded"/></div>
                <div><label className="text-orange-700">Super</label><input value={formData.superEst} onChange={e=>setFormData({...formData, superEst:e.target.value})} className="w-full p-1 border rounded"/></div>
             </div>
          </div>

          <div className="space-y-2">
            {formData.definitions.map((def, i) => (
              <div key={i} className="bg-slate-50 p-2 rounded border flex flex-col gap-2">
                <div className="flex gap-2">
                   <select value={def.type} onChange={e => updateDef(i, "type", e.target.value)} className="p-1 border rounded text-sm w-20">{WORD_TYPES.map(t=><option key={t.value} value={t.value}>{t.label.split(' ')[0]}</option>)}</select>
                   <input value={def.meaning} onChange={e => updateDef(i, "meaning", e.target.value)} className="flex-1 p-1 border rounded text-sm" placeholder="Türkçe anlam" />
                   {formData.definitions.length>1 && <button onClick={()=>setFormData(p=>({...p, definitions: p.definitions.filter((_,x)=>x!==i)}))} className="text-slate-400"><Trash2 className="w-4 h-4"/></button>}
                </div>
                <input value={def.engExplanation} onChange={e => updateDef(i, "engExplanation", e.target.value)} className="w-full p-1 border rounded text-sm bg-indigo-50" placeholder="İngilizce Açıklama" />
              </div>
            ))}
            <button onClick={()=>setFormData(p=>({...p, definitions:[...p.definitions, {type:"noun",meaning:"",engExplanation:""}]}))} className="text-sm text-indigo-600 font-bold flex gap-1"><Plus className="w-4 h-4"/> Ekle</button>
          </div>

          <textarea value={formData.sentence} onChange={e => setFormData({ ...formData, sentence: e.target.value })} className="w-full p-3 border rounded-xl text-sm" placeholder="Örnek cümle..." rows={3}></textarea>
          <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center gap-2">{saving ? <Loader2 className="animate-spin"/> : <Save className="w-5 h-5"/>} {prefillData ? "Güncelle" : "Kaydet"}</button>
        </div>
      </div>
    </div>
  );
};

export default QuickAddModal;
