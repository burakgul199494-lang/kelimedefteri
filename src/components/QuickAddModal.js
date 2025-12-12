import React, { useState, useEffect } from "react";
import { Loader2, X, Save, Wand2, Brain } from "lucide-react";
import { useData } from "../context/DataContext";
import { fetchWordAnalysisFromAI, fetchRootFromAI } from "../services/aiService";

const QuickAddModal = ({ word, prefillData, onClose }) => {
  const { handleSaveNewWord, handleSaveSystemWord, handleUpdateSystemWord, isAdmin } = useData();

  const [formData, setFormData] = useState({
    word: word || "",
    definitions: [{ type: "noun", meaning: "", engExplanation: "", trExplanation: "" }],
    sentence: "",
    sentence_tr: "",
    tags: [],
    source: isAdmin ? "system" : "user",
  });

  const [loadingAI, setLoadingAI] = useState(false);
  const [rootLoading, setRootLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiFetched, setAiFetched] = useState(false); // 🔒 KİLİT

  // 🔒 STRICT MODE GÜVENLİ useEffect
  useEffect(() => {
    if (word && !prefillData && !aiFetched) {
      setAiFetched(true);
      handleAIFill();
    }
  }, [word, prefillData, aiFetched]);

  const handleAIFill = async () => {
    if (loadingAI) return; // 🔒 BUTON SPAM KİLİDİ
    setLoadingAI(true);

    try {
      const data = await fetchWordAnalysisFromAI(formData.word || word);
      if (data) {
        setFormData((prev) => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleConvertToRoot = async () => {
    if (!formData.word || rootLoading) return;
    setRootLoading(true);
    try {
      const result = await fetchRootFromAI(formData.word);
      if (result?.changed) setFormData((p) => ({ ...p, word: result.root }));
    } finally {
      setRootLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const result = isAdmin
      ? await handleSaveSystemWord(formData)
      : await handleSaveNewWord(formData);
    setSaving(false);
    if (result?.success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-full max-w-md">
        <div className="flex gap-2 mb-4">
          <input
            value={formData.word}
            onChange={(e) => setFormData({ ...formData, word: e.target.value })}
            className="flex-1 border p-2 rounded"
          />
          <button onClick={handleConvertToRoot}>
            {rootLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
          </button>
          <button onClick={handleAIFill}>
            {loadingAI ? <Loader2 className="animate-spin" /> : <Brain />}
          </button>
        </div>

        <button onClick={handleSave} className="w-full bg-indigo-600 text-white p-3 rounded">
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
        </button>

        <button onClick={onClose} className="mt-2 w-full text-sm text-gray-500">
          Kapat
        </button>
      </div>
    </div>
  );
};

export default QuickAddModal;
