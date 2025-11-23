import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useData } from "../context/DataContext";
import { fetchWordAnalysisFromAI, fetchRootFromAI } from "../services/aiService";
import { ArrowLeft, Loader2, Wand2, Brain, Plus, Save, Trash2, Tag } from "lucide-react";

const WORD_TYPES = [
  { value: "noun", label: "İsim (Noun)" }, { value: "verb", label: "Fiil (Verb)" },
  { value: "adjective", label: "Sıfat (Adjective)" }, { value: "adverb", label: "Zarf (Adverb)" },
  { value: "prep", label: "Edat (Prep)" }, { value: "pronoun", label: "Zamir (Pronoun)" },
  { value: "conj", label: "Bağlaç (Conj)" }, { value: "article", label: "Tanımlık (Article)" },
  { value: "other", label: "Diğer (Other)" },
];

export default function AddWord() {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleSaveNewWord, handleUpdateWord } = useData();
  const editingWord = location.state?.editingWord;
  const isEditMode = !!editingWord;

  const initialData = editingWord ? {
      ...editingWord,
      category: editingWord.category || "", // Kategori varsa al
      definitions: (editingWord.definitions || []).map((d) => ({ type: d.type || "noun", meaning: d.meaning || "", engExplanation: d.engExplanation || "" })),
  } : {
      word: "", category: "", // Yeni alan
      plural: "", v2: "", v3: "", vIng: "", thirdPerson: "", advLy: "", compEr: "", superEst: "",
      definitions: [{ type: "noun", meaning: "", engExplanation: "" }], sentence: "",
  };

  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [rootLoading, setRootLoading] = useState(false);

  const handleConvertToRoot = async () => {
    if (!formData.word) return;
    setRootLoading(true);
    try {
      const result = await fetchRootFromAI(formData.word);
      if (result && result.changed) setFormData((prev) => ({ ...prev, word: result.root }));
    } catch (e) { console.error(e); } finally { setRootLoading(false); }
  };

  const handleAIFill = async () => {
    if (!formData.word) return alert("Kelime yazın!");
    setAiLoading(true);
    try {
      const data = await fetchWordAnalysisFromAI(formData.word);
      if (data) {
        const safeDefinitions = Array.isArray(data.definitions)
          ? data.definitions.map((d) => ({ type: d.type || "noun", meaning: d.meaning || "", engExplanation: d.engExplanation || "" }))
          : [{ type: "noun", meaning: "", engExplanation: "" }];
        
        // Kategoriyi de otomatik dolduruyoruz
        setFormData((prev) => ({ ...prev, ...data, category: data.category || "Genel", definitions: safeDefinitions }));
      }
    } catch (err) { alert("AI Hatası."); } finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.word || !formData.sentence) return alert("Eksik alanlar var.");
    setSaving(true);
    if (isEditMode) {
      await handleUpdateWord(editingWord.id, formData);
      navigate(-1);
    } else {
      const res = await handleSaveNewWord(formData);
      if (res.success) { alert("Eklendi!"); setFormData({ ...initialData, category: "" }); } 
      else alert(res.message);
    }
    setSaving(false);
  };

  const updateDefinition = (i, f, v) => { const n = [...formData.definitions]; n[i] = { ...n[i], [f]: v }; setFormData((p) => ({ ...p, definitions: n })); };
  const addDefinition = () => setFormData((p) => ({ ...p, definitions: [...p.definitions, { type: "noun", meaning: "", engExplanation: "" }] }));
  const removeDefinition = (i) => { if (formData.definitions.length > 1) setFormData((p) => ({ ...p, definitions: p.definitions.filter((_, idx) => idx !== i) })); };

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 my-4 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-xl font-bold text-slate-800">{isEditMode ? "Düzenle" : "Kelime Ekle"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input value={formData.word} onChange={(e) => setFormData({ ...formData, word: e.target.value })} className="flex-1 p-3 border rounded-xl font-bold" placeholder="Kelime" autoFocus />
            <button type="button" onClick={handleConvertToRoot} disabled={rootLoading} className="bg-orange-100 text-orange-600 p-3 rounded-xl">{rootLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}</button>
            <button type="button" onClick={handleAIFill} disabled={aiLoading} className="bg-purple-600 text-white px-3 rounded-xl">{aiLoading ? <Loader2 className="animate-spin" /> : <Brain />}</button>
          </div>

          {/* YENİ KATEGORİ ALANI */}
          <div className="relative">
             <Tag className="absolute left-3 top-3 text-slate-400 w-4 h-4"/>
             <input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full pl-9 p-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white transition-colors" placeholder="Kategori (Örn: Hayvanlar, Teknoloji) - AI otomatik doldurur" />
          </div>

          {/* FİİL DETAYLARI */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2">
            <div className="font-bold text-slate-400">FİİL & İSİM DETAYLARI</div>
            <div><label className="block text-slate-500 mb-1">Çoğul</label><input value={formData.plural} onChange={(e) => setFormData({ ...formData, plural: e.target.value })} className="w-full p-2 border rounded" /></div>
            <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-slate-500 mb-1">3. Tekil</label><input value={formData.thirdPerson} onChange={(e) => setFormData({ ...formData, thirdPerson: e.target.value })} className="w-full p-2 border rounded" placeholder="goes"/></div>
                <div><label className="block text-slate-500 mb-1">V-ing</label><input value={formData.vIng} onChange={(e) => setFormData({ ...formData, vIng: e.target.value })} className="w-full p-2 border rounded" placeholder="going"/></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-slate-500 mb-1">V2</label><input value={formData.v2} onChange={(e) => setFormData({ ...formData, v2: e.target.value })} className="w-full p-2 border rounded" placeholder="went"/></div>
                <div><label className="block text-slate-500 mb-1">V3</label><input value={formData.v3} onChange={(e) => setFormData({ ...formData, v3: e.target.value })} className="w-full p-2 border rounded" placeholder="gone"/></div>
            </div>
          </div>

          {/* SIFAT DETAYLARI */}
          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-xs space-y-2">
            <div className="font-bold text-orange-400">SIFAT & ZARF</div>
            <div><label className="block text-orange-700/70 mb-1">Zarf (-ly)</label><input value={formData.advLy} onChange={(e) => setFormData({ ...formData, advLy: e.target.value })} className="w-full p-2 border rounded" /></div>
            <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-orange-700/70 mb-1">Comp (-er)</label><input value={formData.compEr} onChange={(e) => setFormData({ ...formData, compEr: e.target.value })} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-orange-700/70 mb-1">Super (-est)</label><input value={formData.superEst} onChange={(e) => setFormData({ ...formData, superEst: e.target.value })} className="w-full p-2 border rounded" /></div>
            </div>
          </div>

          {/* ANLAMLAR */}
          <div className="space-y-2">
            <label className="font-medium text-sm">Anlamlar</label>
            {formData.definitions.map((def, i) => (
              <div key={i} className="bg-slate-50 p-2 rounded border flex flex-col gap-2">
                <div className="flex gap-2">
                   <select value={def.type} onChange={(e) => updateDefinition(i, "type", e.target.value)} className="p-1 border rounded text-sm bg-white w-20">{WORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label.split(' ')[0]}</option>)}</select>
                   <input value={def.meaning} onChange={(e) => updateDefinition(i, "meaning", e.target.value)} className="flex-1 p-1 border rounded text-sm" placeholder="Türkçe anlam" />
                   {formData.definitions.length > 1 && <button type="button" onClick={() => removeDefinition(i)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                </div>
                <input value={def.engExplanation} onChange={(e) => updateDefinition(i, "engExplanation", e.target.value)} className="w-full p-1 border rounded text-sm bg-indigo-50" placeholder="İngilizce Açıklama" />
              </div>
            ))}
            <button type="button" onClick={addDefinition} className="text-sm text-indigo-600 flex items-center gap-1 font-bold"><Plus className="w-4 h-4" /> Ekle</button>
          </div>

          <textarea value={formData.sentence} onChange={(e) => setFormData({ ...formData, sentence: e.target.value })} className="w-full p-3 border rounded-xl text-sm" placeholder="Örnek Cümle" rows={3} />
          <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center">{saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5 mr-2" />} Kaydet</button>
        </form>
      </div>
    </div>
  );
}
