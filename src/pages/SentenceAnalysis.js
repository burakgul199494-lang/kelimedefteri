import React, { useState, useRef } from "react";
import { ArrowLeft, Camera, Microscope, Loader2, Globe, Brain, BookOpen, Plus, Save, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { fetchSentenceAnalysisFromAI, extractTextFromImage, translateTextWithAI, fetchWordDetails } from "../services/aiService";
import QuickAddModal from "../components/QuickAddModal";

// DİKKAT: Kırpma kütüphanesini kaldırdık. Artık hata verme ihtimali yok.

export default function SentenceAnalysis() {
  const { 
    user, 
    customWords, 
    dynamicSystemWords, 
    deletedWordIds, 
    handleSaveNewWord,    
    handleSaveSystemWord  
  } = useData();

  const navigate = useNavigate();
  
  // ADMIN KONTROLÜ
  const ADMIN_EMAILS = ["burakgul1994@outlook.com.tr"]; 
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const [quickAddWord, setQuickAddWord] = useState(null);
  const fileInputRef = useRef(null);

  const isWordInRegistry = (wordToCheck) => {
    if (!wordToCheck) return false;
    const lower = wordToCheck.toLowerCase().trim();
    if (dynamicSystemWords?.some(sw => sw.word.toLowerCase() === lower)) return true;
    if (customWords?.some(cw => cw.word.toLowerCase() === lower && !deletedWordIds?.includes(cw.id))) return true;
    return false;
  };

  // --- RESİM YÜKLEME (Basit ve Hatasız Yöntem) ---
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    try {
      // Resmi direkt AI'ya gönderiyoruz (Kırpma yok)
      const text = await extractTextFromImage(file);
      if (text) setAnalysisText((prev) => (prev ? prev + "\n" + text : text));
      else alert("Resimden metin okunamadı.");
    } catch (error) {
      console.error(error);
      alert("OCR Hatası: " + error.message);
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- AKILLI TOPLU EKLEME (V2, V3 Dahil) ---
  const handleBulkAdd = async () => {
    if (!analysisResult?.rootWords) return;

    const saveFunction = isAdmin ? handleSaveSystemWord : handleSaveNewWord;
    const targetName = isAdmin ? "SİSTEM" : "Kişisel";

    if (!saveFunction) { alert("Kaydetme fonksiyonu bulunamadı."); return; }

    const unknownWords = analysisResult.rootWords.filter(w => !isWordInRegistry(w));

    if (unknownWords.length === 0) { alert("Eklenecek yeni kelime yok."); return; }

    if (!window.confirm(`${unknownWords.length} kelime detaylı analiz edilip ${targetName} listesine eklenecek. Biraz zaman alabilir.`)) return;

    setBulkLoading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < unknownWords.length; i++) {
        const word = unknownWords[i];
        setBulkProgress(`${i + 1} / ${unknownWords.length}`);

        // 1. DETAYLI ANALİZ
        const details = await fetchWordDetails(word);
        
        // 2. OBJE OLUŞTURMA
        const newWordObj = {
          word: word,
          sentence: details.exampleSentence || analysisText, 
          definitions: [
            {
              meaning: details.meaning,
              type: details.type || "unknown",
              engExplanation: "AI Analysis" 
            }
          ],
          v2: details.v2 || "",
          v3: details.v3 || "",
          plural: details.plural || ""
        };

        // 3. KAYDETME
        const res = await saveFunction(newWordObj);
        if (res && res.success) successCount++;

        // 4. BEKLEME (1 sn)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      alert(`${successCount} kelime başarıyla eklendi!`);
      
    } catch (error) {
      console.error(error);
      alert("Hata: " + error.message);
    } finally {
      setBulkLoading(false);
      setBulkProgress("");
    }
  };

  const handleAnalyze = async () => {
    if (!analysisText.trim()) { alert("Lütfen cümle yazın."); return; }
    setIsAnalyzing(true); setAnalysisResult(null);
    try {
      const result = await fetchSentenceAnalysisFromAI(analysisText);
      if (result) setAnalysisResult(result);
      else alert("Analiz yapılamadı.");
    } catch (error) { alert("Hata: " + error.message); } 
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center relative">
      {quickAddWord && <QuickAddModal word={quickAddWord} onClose={() => setQuickAddWord(null)} />}
      <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />

      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
             <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
             <h2 className="text-2xl font-bold text-slate-800">Cümle Analizi</h2>
          </div>
          {isAdmin && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> ADMIN</span>}
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => fileInputRef.current?.click()} disabled={ocrLoading || isAnalyzing} className="w-full mb-3 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Fotoğraf Çek / Yükle
          </button>
          <textarea value={analysisText} onChange={(e) => setAnalysisText(e.target.value)} className="w-full p-3 border border-slate-100 rounded-xl outline-none resize-none text-slate-700 min-h-[120px]" placeholder="Analiz edilecek cümleyi yaz..." />
          <div className="flex justify-end mt-2">
            <button onClick={handleAnalyze} disabled={isAnalyzing || ocrLoading} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md">
              {isAnalyzing ? <Loader2 className="animate-spin" /> : <Microscope />} Analiz Et
            </button>
          </div>
        </div>

        {analysisResult && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> Türkçe Çeviri</h3>
              <p className="text-lg text-slate-800 font-medium leading-relaxed">{analysisResult.turkishTranslation}</p>
            </div>
            <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100 shadow-sm">
               <h3 className="text-xs font-bold text-teal-500 uppercase mb-2 flex items-center gap-2"><Brain className="w-4 h-4" /> Gramer Yapısı</h3>
               <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{analysisResult.grammarAnalysis}</p>
            </div>

            {/* KELİME LİSTESİ */}
            {analysisResult.rootWords?.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><BookOpen className="w-4 h-4" /> Kelime Kökleri</h3>
                    
                    {analysisResult.rootWords.some(w => !isWordInRegistry(w)) && (
                        <button 
                          onClick={handleBulkAdd} 
                          disabled={bulkLoading}
                          className={`text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-colors ${isAdmin ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-orange-100 text-orange-600 hover:bg-orange-200"}`}
                        >
                            {bulkLoading ? (
                                <span className="flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin"/> {bulkProgress}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    {isAdmin ? <ShieldCheck className="w-3 h-3"/> : <Save className="w-3 h-3"/>}
                                    {isAdmin ? "Sisteme Ekle" : "Hepsini Ekle"}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {analysisResult.rootWords.map((word, idx) => {
                    const exists = isWordInRegistry(word);
                    return (
                      <button key={idx} onClick={() => { if (!exists) setQuickAddWord(word); }} disabled={exists} className={`px-3 py-1.5 rounded-lg font-bold text-sm border transition-all ${exists ? "bg-green-50 text-green-700 border-green-200 cursor-default" : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 cursor-pointer shadow-sm"}`}>
                        {word} {!exists && <Plus className="w-3 h-3 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <button onClick={() => setQuickAddWord("")} className="w-full bg-white text-slate-700 border-2 border-dashed border-slate-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50">
               <Plus className="w-5 h-5" /> Manuel Kelime Ekle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
