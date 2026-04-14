import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useData } from "../context/DataContext";
import { ArrowLeft, Loader2, Wand2, Brain, Plus, Save, Trash2, Tag, Languages } from "lucide-react";

const WORD_TYPES = [
  { value: "noun", label: "İsim (Noun)" }, { value: "verb", label: "Fiil (Verb)" }, { value: "adjective", label: "Sıfat (Adjective)" },
  { value: "adverb", label: "Zarf (Adverb)" }, { value: "prep", label: "Edat (Prep)" }, { value: "pronoun", label: "Zamir (Pronoun)" },
  { value: "conj", label: "Bağlaç (Conj)" }, { value: "article", label: "Tanımlık (Article)" }, { value: "other", label: "Diğer (Other)" },
];

const TYPE_MAP = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf", prep: "Edat",
  pronoun: "Zamir", conj: "Bağlaç", article: "Tanımlık", other: "Diğer"
};

export default function AddWord() {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleSaveNewWord, handleUpdateWord, handleSaveSystemWord, isAdmin } = useData();

  const editingWord = location.state?.editingWord;
  const initialWord = location.state?.initialWord;
  const isEditMode = !!editingWord;

  // --- DÜZELTME BURADA YAPILDI (Güvenli Başlangıç Verisi) ---
  const initialData = editingWord
    ? { 
        ...editingWord, 
        phonetic: editingWord.phonetic || "", // <--- ESKİ KELİMELER İÇİN GÜVENLİK KONTROLÜ
        sentence_tr: editingWord.sentence_tr || "", 
        definitions: (editingWord.definitions || []).map((d) => ({ ...d })) 
      }
    : {
        word: initialWord || "",
        phonetic: "", // Varsayılan boş
        tags: [],
        plural: "", v2: "", v3: "", vIng: "", thirdPerson: "",
        advLy: "", compEr: "", superEst: "",
        definitions: [{ type: "noun", meaning: "", engExplanation: "" }],
        sentence: "",
        sentence_tr: "", 
      };

  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
 

  // Otomatik Etiket Senkronizasyonu
  useEffect(() => {
      const newTags = new Set();
      formData.definitions.forEach(def => {
          const label = TYPE_MAP[def.type] || "Diğer";
          newTags.add(label);
      });
      const newTagsArray = Array.from(newTags);
      if (JSON.stringify(newTagsArray) !== JSON.stringify(formData.tags)) {
          setFormData(prev => ({ ...prev, tags: newTagsArray }));
      }
  }, [formData.definitions]);

  useEffect(() => {
    const autoRun = async () => {
        if (initialWord && !isEditMode) {
            setRootLoading(true);
            let searchWord = initialWord;
            try {
                const rootRes = await fetchRootFromAI(initialWord);
                if (rootRes && rootRes.changed) {
                    searchWord = rootRes.root;
                    setFormData(prev => ({ ...prev, word: searchWord }));
                }
            } catch(e) { console.error(e); }
            setRootLoading(false);

            handleAIFill(); 
        }
    };
    // eslint-disable-next-line
    if(initialWord && !isEditMode) autoRun();
  }, []); 

  const handleConvertToRoot = async () => {
    if (!formData.word) return;
    setRootLoading(true);
    try {
      const result = await fetchRootFromAI(formData.word);
      if (result && result.changed) { setFormData((prev) => ({ ...prev, word: result.root })); }
    } catch (e) { console.error(e); } finally { setRootLoading(false); }
  };

  const handleAIFill = async () => {
    if (!formData.word && !initialWord) { alert("Lütfen önce bir kelime yazın!"); return; }
    const targetWord = formData.word || initialWord;
    
    setAiLoading(true);
    try {
      const data = await fetchWordAnalysisFromAI(targetWord);
      if (data) { 
          setFormData((prev) => ({ 
              ...prev, 
              ...data,
              sentence_tr: data.sentence_tr || "",
              phonetic: data.phonetic || prev.phonetic || "" // AI'dan gelirse doldur, yoksa eskisi kalsın
          })); 
      } 
      else { alert("Veri alınamadı."); }
    } catch (err) { alert("Hata: " + err.message); } finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.word || !formData.sentence) { alert("Eksik alanları doldurun."); return; }
    setSaving(true);

    if (isEditMode) {
      await handleUpdateWord(editingWord.id, formData);
      navigate(-1); 
    } else {
      const func = isAdmin ? handleSaveSystemWord : handleSaveNewWord;
      const res = await func(formData);
      if(res.success) { 
          alert("Kaydedildi!"); 
          navigate("/dictionary", { state: { addedWord: formData.word } });
      } else { alert(res.message); }
    }
    setSaving(false);
  };

  const addDefinition = () => setFormData((p) => ({ ...p, definitions: [...p.definitions, { type: "noun", meaning: "", engExplanation: "" }] }));
  const removeDefinition = (index) => { if (formData.definitions.length > 1) { setFormData((p) => ({ ...p, definitions: p.definitions.filter((_, i) => i !== index) })); } };
  const updateDefinition = (index, field, value) => { const newDefs = [...formData.definitions]; newDefs[index] = { ...newDefs[index], [field]: value }; setFormData((p) => ({ ...p, definitions: newDefs })); };

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 my-8 overflow-y-auto max-h-screen">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">{isEditMode ? "Düzenle" : (isAdmin ? "Sisteme Kelime Ekle" : "Yeni Kelime Ekle")}</h2>
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><ArrowLeft className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kelime ve Okunuş</label>
            <div className="flex gap-2">
              <input value={formData.word} onChange={(e) => setFormData({ ...formData, word: e.target.value })} className="flex-1 p-3 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500" placeholder="Örn: Run" autoFocus />
              
              {/* FONETİK INPUTU */}
              <input 
                value={formData.phonetic} 
                onChange={(e) => setFormData({ ...formData, phonetic: e.target.value })} 
                className="w-24 p-3 border border-slate-200 rounded-xl font-serif italic text-slate-500 text-center outline-none focus:border-indigo-500 placeholder:text-slate-300" 
                placeholder="/rʌn/" 
              />
              
              <button type="button" onClick={handleConvertToRoot} disabled={rootLoading || !formData.word} className="bg-orange-100 hover:bg-orange-200 text-orange-600 p-3 rounded-xl transition-colors" title="Kök Bul">{rootLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}</button>
              <button type="button" onClick={handleAIFill} disabled={aiLoading || !formData.word} className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-xl transition-colors" title="AI Doldur">{aiLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Brain className="w-5 h-5" />}</button>
            </div>
          </div>

          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
              <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase">Otomatik Etiketler</label>
              <div className="flex flex-wrap gap-2">
                  {formData.tags.length > 0 ? (
                      formData.tags.map((tag, i) => (
                          <span key={i} className="bg-white text-indigo-600 px-2 py-1 rounded-lg text-xs font-bold shadow-sm border border-indigo-100 flex items-center gap-1">
                              <Tag className="w-3 h-3"/> {tag}
                          </span>
                      ))
                  ) : (
                      <span className="text-xs text-indigo-300 italic">Tür seçimine göre oluşacak...</span>
                  )}
              </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Fiil & İsim Detayları</div><div className="space-y-3"><div><label className="block text-xs font-medium text-slate-500 mb-1">Çoğul (Plural)</label><input value={formData.plural} onChange={(e) => setFormData({ ...formData, plural: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm" /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-slate-500 mb-1">3. Tekil (He/She)</label><input value={formData.thirdPerson} onChange={(e) => setFormData({ ...formData, thirdPerson: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm" placeholder="goes" /></div><div><label className="block text-xs font-medium text-slate-500 mb-1">V-ing (Gerund)</label><input value={formData.vIng} onChange={(e) => setFormData({ ...formData, vIng: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm" placeholder="going" /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-slate-500 mb-1">V2 (Past)</label><input value={formData.v2} onChange={(e) => setFormData({ ...formData, v2: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm" placeholder="went" /></div><div><label className="block text-xs font-medium text-slate-500 mb-1">V3 (Participle)</label><input value={formData.v3} onChange={(e) => setFormData({ ...formData, v3: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm" placeholder="gone" /></div></div></div></div>
          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100"><div className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wide">Sıfat & Zarf Detayları</div><div className="space-y-3"><div><label className="block text-xs font-medium text-orange-700/70 mb-1">Zarf Hali (-ly)</label><input value={formData.advLy} onChange={(e) => setFormData({ ...formData, advLy: e.target.value })} className="w-full p-2 border border-orange-200 rounded-lg outline-none text-sm" placeholder="quickly" /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-orange-700/70 mb-1">Karşılaştırma (-er)</label><input value={formData.compEr} onChange={(e) => setFormData({ ...formData, compEr: e.target.value })} className="w-full p-2 border border-orange-200 rounded-lg outline-none text-sm" placeholder="faster" /></div><div><label className="block text-xs font-medium text-orange-700/70 mb-1">Üstünlük (-est)</label><input value={formData.superEst} onChange={(e) => setFormData({ ...formData, superEst: e.target.value })} className="w-full p-2 border border-orange-200 rounded-lg outline-none text-sm" placeholder="fastest" /></div></div></div></div>

          <div className="space-y-3"><div className="flex justify-between items-center"><label className="block text-sm font-medium text-slate-700">Anlamlar</label><button type="button" onClick={addDefinition} className="text-sm text-indigo-600 flex items-center gap-1 font-medium hover:text-indigo-800"><Plus className="w-4 h-4" /> Ekle</button></div>{formData.definitions.map((def, index) => (<div key={index} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm"><div className="flex gap-2 items-start"><div className="flex-1 space-y-2"><select value={def.type} onChange={(e) => updateDefinition(index, "type", e.target.value)} className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none bg-white">{WORD_TYPES.map((t) => ( <option key={t.value} value={t.value}>{t.label}</option> ))}</select><input value={def.meaning} onChange={(e) => updateDefinition(index, "meaning", e.target.value)} className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none placeholder:text-slate-400" placeholder="Türkçe anlam..." /></div>{formData.definitions.length > 1 && (<button type="button" onClick={() => removeDefinition(index)} className="p-2 text-slate-400 hover:text-red-500 mt-1"><Trash2 className="w-4 h-4" /></button>)}</div><input value={def.engExplanation} onChange={(e) => updateDefinition(index, "engExplanation", e.target.value)} className="w-full p-2 text-sm border border-indigo-100 bg-indigo-50/50 rounded-lg outline-none placeholder:text-slate-400" placeholder="Bu anlam için İngilizce açıklama (Opsiyonel)..." /></div>))}</div>

          <div className="space-y-3">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Örnek Cümle (İngilizce)</label>
                <textarea 
                    value={formData.sentence} 
                    onChange={(e) => setFormData({ ...formData, sentence: e.target.value })} 
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none min-h-[80px] resize-none focus:border-indigo-500 transition-colors" 
                    placeholder="Örn: I put my money in the bank." 
                />
             </div>
             
             <div>
                <label className="block text-sm font-medium text-indigo-700 mb-1 flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    Cümlenin Türkçe Çevirisi
                </label>
                <textarea 
                    value={formData.sentence_tr} 
                    onChange={(e) => setFormData({ ...formData, sentence_tr: e.target.value })} 
                    className="w-full p-3 border border-indigo-100 bg-indigo-50/30 rounded-xl outline-none min-h-[60px] resize-none focus:border-indigo-500 transition-colors text-sm" 
                    placeholder="Örn: Parayı bankaya yatırdım. (AI otomatik doldurur)" 
                />
             </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {isEditMode ? "Değişiklikleri Kaydet" : "Kelimeyi Kaydet"}</button>
        </form>
      </div>
    </div>
  );
}
