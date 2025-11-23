import React, { useState, useRef, useCallback } from "react";
import { ArrowLeft, Camera, Microscope, Loader2, Globe, Brain, BookOpen, Plus, Check, X, ZoomIn, RectangleHorizontal, Square, RectangleVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { fetchSentenceAnalysisFromAI, extractTextFromImage } from "../services/aiService";
import QuickAddModal from "../components/QuickAddModal";
import Cropper from "react-easy-crop";

export default function SentenceAnalysis() {
  const { customWords, dynamicSystemWords, deletedWordIds } = useData();
  const navigate = useNavigate();
  
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [quickAddWord, setQuickAddWord] = useState(null);
  const fileInputRef = useRef(null);

  // --- Kırpma (Crop) State'leri ---
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(16 / 9); // Varsayılan: Geniş (Cümle için)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const isWordInRegistry = (wordToCheck) => {
    if (!wordToCheck) return false;
    const lower = wordToCheck.toLowerCase().trim();
    if (dynamicSystemWords.some(sw => sw.word.toLowerCase() === lower)) return true;
    if (customWords.some(cw => cw.word.toLowerCase() === lower && !deletedWordIds.includes(cw.id))) return true;
    return false;
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Lütfen geçerli bir resim seçin."); return; }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result);
      setZoom(1);
      setAspect(16/9); // Açılışta cümle modunda başla
    });
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndAnalyze = async () => {
    try {
      setOcrLoading(true);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      setImageSrc(null); 
      const text = await extractTextFromImage(croppedImageBlob);
      if (text) setAnalysisText((prev) => (prev ? prev + "\n" + text : text));
      else alert("Resimden metin okunamadı.");
    } catch (e) {
      console.error(e);
      alert("Kırpma veya okuma hatası oluştu.");
    } finally {
      setOcrLoading(false);
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

      {/* --- KIRPMA MODALI (Overlay) --- */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">
          <div className="relative flex-1 bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              objectFit="contain"
              maxZoom={5} // Daha detaylı zoom için artırıldı
            />
          </div>
          
          <div className="bg-slate-900 p-4 pb-8 space-y-4">
             {/* ORAN SEÇİM BUTONLARI */}
             <div className="flex justify-center gap-2 mb-2">
                <button onClick={() => setAspect(16/5)} className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-bold ${aspect === 16/5 ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-300"}`}>
                   <RectangleHorizontal className="w-5 h-5" /> Yatay (Satır)
                </button>
                <button onClick={() => setAspect(16/9)} className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-bold ${aspect === 16/9 ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-300"}`}>
                   <RectangleHorizontal className="w-5 h-5 scale-y-150" /> Geniş
                </button>
                <button onClick={() => setAspect(1)} className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-bold ${aspect === 1 ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-300"}`}>
                   <Square className="w-5 h-5" /> Kare
                </button>
                <button onClick={() => setAspect(9/16)} className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[10px] font-bold ${aspect === 9/16 ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-300"}`}>
                   <RectangleVertical className="w-5 h-5" /> Dikey
                </button>
             </div>

             {/* ZOOM SLIDER */}
             <div className="flex items-center gap-4 px-2">
               <ZoomIn className="text-slate-400 w-4 h-4" />
               <input
                 type="range"
                 value={zoom}
                 min={1}
                 max={5} // Daha hassas zoom
                 step={0.1}
                 onChange={(e) => setZoom(e.target.value)}
                 className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-teal-500"
               />
             </div>

             {/* AKSİYON BUTONLARI */}
             <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => setImageSrc(null)}
                  className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700"
                >
                   <X className="w-5 h-5"/> İptal
                </button>
                <button 
                  onClick={handleCropAndAnalyze}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-900/50"
                >
                   <Check className="w-5 h-5"/> Kırp ve Tara
                </button>
             </div>
          </div>
        </div>
      )}

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
            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> Türkçe Çeviri</h3>
              <p className="text-lg text-slate-800 font-medium leading-relaxed">{analysisResult.turkishTranslation}</p>
            </div>
            <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100 shadow-sm">
              <h3 className="text-xs font-bold text-teal-500 uppercase mb-2 flex items-center gap-2"><Brain className="w-4 h-4" /> Gramer Yapısı</h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{analysisResult.grammarAnalysis}</p>
            </div>
            {analysisResult.rootWords?.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Kelime Kökleri</h3>
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

// --- YARDIMCI ---
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Canvas is empty")); return; }
      resolve(blob);
    }, "image/jpeg");
  });
}
