import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { X, Save, Loader2, Languages, Wand2, Tag } from "lucide-react";
import { fetchWordAnalysisFromAI } from "../services/aiService"; // Eğer AI kullanıyorsan

const WORD_TYPES = [
  { value: "noun", label: "İsim" }, { value: "verb", label: "Fiil" }, { value: "adjective", label: "Sıfat" },
  { value: "adverb", label: "Zarf" }, { value: "prep", label: "Edat" }, { value: "pronoun", label: "Zamir" },
  { value: "conj", label: "Bağlaç" }, { value: "other", label: "Diğer" },
];

const TYPE_MAP = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf", prep: "Edat",
  pronoun: "Zamir", conj: "Bağlaç", article: "Tanımlık", other: "Diğer"
};

export default function QuickAddModal({ onClose, prefillData }) {
  const { handleSaveSystemWord, handleUpdateSystemWord } = useData();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Başlangıç verisi
  const initialData = prefillData 
    ? { 
        ...prefillData, 
        phonetic: prefillData.phonetic || "", // Eski veriler için güvenlik
        sentence_tr: prefillData.sentence_tr || "",
        definitions: (prefillData.definitions || []).map(d => ({...d}))
      }
    : {
        word: "",
        phonetic: "", // <--- YENİ ALAN
        definitions: [{ type: "noun", meaning: "", engExplanation: "" }],
        sentence: "",
        sentence_tr: "",
        tags: []
      };

  const [formData, setFormData] = useState(initialData);

  // Otomatik Etiketleme
  useEffect(() => {
      const newTags = new Set();
      formData.definitions.forEach(def => {
          const label = TYPE_MAP[def.type] || "Diğer";
          newTags.add(label);
      });
      setFormData(prev => ({ ...prev, tags: Array.from(newTags) }));
  }, [formData.definitions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.word || !formData.sentence) { 
        alert("Kelime ve Örnek Cümle zorunludur."); 
        return; 
    }
    
    setLoading(true);
    
    // Veriyi temizle
    const cleanData = {
        ...formData,
        phonetic: formData.phonetic || "",
        sentence_tr: formData.sentence_tr || ""
    };

    let res;
    if (prefillData) {
        // Güncelleme Modu
        res = await handleUpdateSystemWord(prefillData.id, cleanData);
    } else {
        // Yeni Ekleme Modu
        res = await handleSaveSystemWord(cleanData);
    }

    setLoading(false);

    if (res.success) {
        onClose(); // Pencereyi kapat
    } else {
        alert("Hata: " + res.message);
    }
  };

  const updateDef = (index, field, value) => {
      const newDefs = [...formData.definitions];
      newDefs[index] = { ...newDefs[index], [field]: value };
      setFormData({ ...formData, definitions: newDefs });
  };

  const addDef = () => {
      setFormData({ ...formData, definitions: [...formData.definitions, { type: "noun", meaning: "", engExplanation: "" }] });
  };

  const removeDef = (index) => {
      if(formData.definitions.length > 1) {
          setFormData({ ...formData, definitions: formData.definitions.filter((_, i) => i !== index) });
      }
  };

  // AI Doldurma (Opsiyonel - Eğer AI servisi varsa çalışır)
  const handleAiFill = async () => {
      if(!formData.word) return;
      setAiLoading(true);
      try {
          const data = await fetchWordAnalysisFromAI(formData.word);
          if(data) {
              setFormData(prev => ({
                  ...prev,
                  ...data,
                  phonetic: data.phonetic || prev.phonetic || "",
                  sentence_tr: data.sentence_tr || ""
              }));
          }
      } catch(e) { console.error(e); }
      setAiLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-lg text-slate-800">
                {prefillData ? "Sistem Kelimesini Düzenle" : "Hızlı Sistem Kelimesi Ekle"}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500"/>
            </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
            
            {/* 1. KELİME VE FONETİK */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kelime & Okunuş</label>
                <div className="flex gap-2">
                    <input 
                        value={formData.word}
                        onChange={(e) => setFormData({...formData, word: e.target.value})}
                        className="flex-1 p-3 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-indigo-500"
                        placeholder="Word"
                        autoFocus
                    />
                    
                    {/* YENİ FONETİK KUTUSU */}
                    <input 
                        value={formData.phonetic}
                        onChange={(e) => setFormData({...formData, phonetic: e.target.value})}
                        className="w-24 p-3 border border-slate-200 rounded-xl font-serif italic text-slate-500 text-center outline-none focus:border-indigo-500 placeholder:text-slate-300"
                        placeholder="/rʌn/"
                    />

                    {/* AI Butonu (Opsiyonel) */}
                    <button 
                        type="button" 
                        onClick={handleAiFill} 
                        disabled={aiLoading || !formData.word}
                        className="p-3 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-colors"
                        title="AI ile Doldur"
                    >
                        {aiLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Wand2 className="w-5 h-5"/>}
                    </button>
                </div>
            </div>

            {/* 2. ETİKETLER */}
            {formData.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {formData.tags.map((t,i) => (
                        <span key={i} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded flex items-center gap-1 border border-indigo-100">
                            <Tag className="w-3 h-3"/> {t}
                        </span>
                    ))}
                </div>
            )}

            {/* 3. ANLAMLAR */}
            <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase">Anlamlar</label>
                {formData.definitions.map((def, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex gap-2">
                            <select 
                                value={def.type}
                                onChange={(e) => updateDef(idx, 'type', e.target.value)}
                                className="p-2 rounded-lg border border-slate-200 text-sm bg-white outline-none"
                            >
                                {WORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <input 
                                value={def.meaning}
                                onChange={(e) => updateDef(idx, 'meaning', e.target.value)}
                                className="flex-1 p-2 rounded-lg border border-slate-200 text-sm outline-none placeholder:text-slate-400"
                                placeholder="Türkçe anlamı..."
                            />
                            {formData.definitions.length > 1 && (
                                <button type="button" onClick={() => removeDef(idx)} className="text-slate-400 hover:text-red-500 px-1">
                                    <X className="w-4 h-4"/>
                                </button>
                            )}
                        </div>
                        <input 
                            value={def.engExplanation}
                            onChange={(e) => updateDef(idx, 'engExplanation', e.target.value)}
                            className="w-full p-2 rounded-lg border border-indigo-100 bg-indigo-50/30 text-sm outline-none placeholder:text-indigo-300"
                            placeholder="İngilizce açıklama (Opsiyonel)"
                        />
                    </div>
                ))}
                <button type="button" onClick={addDef} className="text-xs font-bold text-indigo-600 hover:underline">+ Başka Anlam Ekle</button>
            </div>

            {/* 4. CÜMLELER */}
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Örnek Cümle (EN)</label>
                    <textarea 
                        value={formData.sentence}
                        onChange={(e) => setFormData({...formData, sentence: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm min-h-[60px] resize-none focus:border-indigo-500"
                        placeholder="Example sentence..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-indigo-500 uppercase mb-1 flex items-center gap-1">
                        <Languages className="w-3 h-3"/> Türkçe Çevirisi
                    </label>
                    <textarea 
                        value={formData.sentence_tr}
                        onChange={(e) => setFormData({...formData, sentence_tr: e.target.value})}
                        className="w-full p-3 border border-indigo-100 bg-indigo-50/20 rounded-xl outline-none text-sm min-h-[50px] resize-none focus:border-indigo-500"
                        placeholder="Cümlenin çevirisi..."
                    />
                </div>
            </div>

        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
            >
                İptal
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-70"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                {prefillData ? "Güncelle" : "Kaydet"}
            </button>
        </div>

      </div>
    </div>
  );
}
