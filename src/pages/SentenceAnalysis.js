import React, { useState, useRef } from "react";
import { ArrowLeft, Camera, Microscope, Loader2, Globe, Brain, BookOpen, Plus, Check, X, Save } from "lucide-react"; // Save ikonu eklendi
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { fetchSentenceAnalysisFromAI, extractTextFromImage, translateTextWithAI } from "../services/aiService"; // translateTextWithAI eklendi
import QuickAddModal from "../components/QuickAddModal";

// Kırpma Kütüphanesi
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css'; 

export default function SentenceAnalysis() {
  // DİKKAT: addWord fonksiyonunu context'ten çekiyoruz
  const { customWords, dynamicSystemWords, deletedWordIds, addWord } = useData(); 
  const navigate = useNavigate();
  
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  
  // Toplu Ekleme State'i
  const [bulkLoading, setBulkLoading] = useState(false);

  const [quickAddWord, setQuickAddWord] = useState(null);
  const fileInputRef = useRef(null);

  // --- Kırpma State'leri ---
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  const isWordInRegistry = (wordToCheck) => {
    if (!wordToCheck) return false;
    const lower = wordToCheck.toLowerCase().trim();
    if (dynamicSystemWords.some(sw => sw.word.toLowerCase() === lower)) return true;
    if (customWords.some(cw => cw.word.toLowerCase() === lower && !deletedWordIds.includes(cw.id))) return true;
    return false;
  };

  // --- TOPLU EKLEME FONKSİYONU ---
  const handleBulkAdd = async () => {
    if (!analysisResult?.rootWords) return;

    // Sadece kayıtlı olmayanları bul
    const unknownWords = analysisResult.rootWords.filter(w => !isWordInRegistry(w));

    if (unknownWords.length === 0) {
      alert("Eklenecek yeni kelime yok.");
      return;
    }

    if (!window.confirm(`${unknownWords.length} adet kelime sözlüğe eklenecek. Onaylıyor musunuz?`)) return;

    setBulkLoading(true);
    let successCount = 0;

    try {
      // Kelimeleri sırayla işle (Promise.all kullanmadık ki API limitine takılmasın)
      for (const word of unknownWords) {
        // 1. Kelimenin basit çevirisini al
        const translation = await translateTextWithAI(word);
        
        // 2. Standart kelime objesi oluştur
        const newWordObj = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          word: word, // Kelimenin kendisi
          sentence: analysisText, // Şu anki analiz edilen cümleyi örnek cümle yapıyoruz
          definitions: [
            {
              meaning: translation || "Çeviri Bulunamadı",
              type: "unknown", // Türünü sonradan düzeltebilirsin
              engExplanation: `Added from sentence analysis.` 
            }
          ],
          source: "analysis_bulk", // Kaynak takibi için
          createdAt: new Date(),
          stats: { learned: false, correctCount: 0, wrongCount: 0 }
        };

        // 3. Context üzerinden kaydet (addWord fonksiyonunun var olduğunu varsayıyoruz)
        if (addWord) {
            await addWord(newWordObj);
            successCount++;
        } else {
            console.error("addWord fonksiyonu DataContext içinde bulunamadı!");
        }
      }
      alert(`${successCount} kelime başarıyla eklendi!`);
    } catch (error) {
      console.error(error);
      alert("Toplu ekleme sırasında bir hata oluştu.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); 
      const reader = new FileReader();
      reader.addEventListener("load", () => setImgSrc(reader.result));
      reader.readAsDataURL(e.target.files[0]);
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    const cropConfig = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height),
      width, height
    );
    setCrop(cropConfig);
  }

  const handleCropAndAnalyze = async () => {
    if (!completedCrop || !imgRef.current) { alert("Lütfen bir alan seçin."); return; }
    try {
      setOcrLoading(true);
      const blob = await getCroppedImg(imgRef.current, completedCrop);
      setImgSrc(null);
      const text = await extractTextFromImage(blob);
      if (text) setAnalysisText((prev) => (prev ? prev + "\n" + text : text));
      else alert("Metin okunamadı.");
    } catch (e) { console.error(e); alert("Hata oluştu."); } 
    finally { setOcrLoading(false); }
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

      {/* --- KIRPMA MODALI --- */}
      {imgSrc && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[70vh] overflow-auto bg-black border border-slate-700 rounded-lg">
             <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)}>
                <img ref={imgRef} src={imgSrc} alt="Crop me" onLoad={onImageLoad} style={{ maxWidth: '100%', maxHeight: '60vh' }} />
             </ReactCrop>
          </div>
          <div className="flex gap-4 w-full max-w-xs mt-6">
             <button onClick={() => setImgSrc(null)} className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"><X className="w-5 h-5"/> İptal</button>
             <button onClick={handleCropAndAnalyze} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Check className="w-5 h-5"/> Seç ve Tara</button>
          </div>
        </div>
      )}

      {/* --- ANA EKRAN --- */}
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
          <h2 className="text-2xl font-bold text-slate-800">Cümle Analizi</h2>
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
            {/* ... Diğer Analiz Sonuçları (Çeviri, Gramer vs.) ... */}
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
                    
                    {/* YENİ EKLENEN TOPLU KAYDET BUTONU */}
                    {analysisResult.rootWords.some(w => !isWordInRegistry(w)) && (
                        <button 
                          onClick={handleBulkAdd} 
                          disabled={bulkLoading}
                          className="text-[10px] bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full font-bold hover:bg-orange-200 flex items-center gap-1 transition-colors"
                        >
                            {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}
                            Hepsini Ekle
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

// --- YARDIMCI (Canvas) ---
function getCroppedImg(image, crop) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width, crop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => { if (!blob) { reject(new Error('Canvas is empty')); return; } resolve(blob); }, 'image/jpeg', 1);
  });
}
