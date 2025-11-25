import React, { useState, useRef, useCallback } from "react";
import { ArrowLeft, Camera, Microscope, Loader2, Globe, Brain, BookOpen, Plus, Crop, Check, X, Clock, RotateCw, ZoomIn, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { fetchSentenceAnalysisFromAI, extractTextFromImage } from "../services/aiService";
import QuickAddModal from "../components/QuickAddModal";

// YENİ KÜTÜPHANE
import Cropper from 'react-easy-crop';

// --- YARDIMCI: RESMİ DÖNÜŞTÜRME VE KIRPMA (MATH LOGIC) ---
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Bu fonksiyon, react-easy-crop'tan gelen veriyi (pixelCrop) alır
 * ve canvas üzerinde döndürülmüş/kırpılmış resmi oluşturur.
 */
async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // Canvas boyutunu döndürme işlemine göre ayarla (siyah kenarlar olmasın diye)
  canvas.width = safeArea;
  canvas.height = safeArea;

  // Döndürme işlemi
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // Resmi merkeze çiz
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  // Kırpma boyutuna göre canvas'ı yeniden boyutlandır
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}

export default function SentenceAnalysis() {
  const { customWords, dynamicSystemWords, deletedWordIds } = useData();
  const navigate = useNavigate();
  
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [quickAddWord, setQuickAddWord] = useState(null);
  
  // --- YENİ CROP STATE'LERİ ---
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 }); // Panning (Kaydırma) için
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  
  const fileInputRef = useRef(null);

  const isWordInRegistry = (wordToCheck) => {
    if (!wordToCheck) return false;
    const lower = wordToCheck.toLowerCase().trim();
    if (dynamicSystemWords.some(sw => sw.word.toLowerCase() === lower)) return true;
    if (customWords.some(cw => cw.word.toLowerCase() === lower && !deletedWordIds.includes(cw.id))) return true;
    return false;
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setZoom(1);
        setRotation(0);
        setCrop({ x: 0, y: 0 });
        setIsCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels || !imgSrc) return;
    
    setIsCropModalOpen(false); 
    setOcrLoading(true);
    
    try {
        const blob = await getCroppedImg(imgSrc, croppedAreaPixels, rotation);
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        const text = await extractTextFromImage(file);
        if (text) setAnalysisText((prev) => (prev ? prev + "\n" + text : text));
        else alert("Metin okunamadı.");
    } catch (e) { 
        console.error(e); alert("Hata oluştu."); 
    } finally { 
        setOcrLoading(false); 
        if(fileInputRef.current) fileInputRef.current.value = ""; 
        setImgSrc(null); 
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

      {/* --- YENİ CROP MODAL (REACT-EASY-CROP) --- */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">
             
             {/* Üst Bar */}
             <div className="px-4 py-6 flex justify-between items-center bg-black/80 backdrop-blur-sm z-20 absolute top-0 w-full">
                <button onClick={() => { setIsCropModalOpen(false); setImgSrc(null); }} className="text-white font-medium p-2">İptal</button>
                <h3 className="text-white font-bold text-sm uppercase tracking-widest">Düzenle</h3>
                <button onClick={handleCropConfirm} className="text-yellow-400 font-bold p-2">Bitti</button>
             </div>

             {/* Orta Alan (Cropper) */}
             <div className="flex-1 relative bg-black">
                <Cropper
                    image={imgSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={16 / 9} // İstersen bunu kaldırıp serbest seçim yapabilirsin
                    onCropChange={setCrop}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    objectFit="contain" // Resmi sığdır
                />
             </div>

             {/* Alt Kontroller */}
             <div className="bg-zinc-900 pb-10 pt-6 px-6 space-y-6 z-20">
                
                {/* Zoom Slider */}
                <div className="flex items-center gap-4">
                    <ZoomIn className="w-5 h-5 text-zinc-500" />
                    <input 
                        type="range" 
                        min={1} 
                        max={3} 
                        step={0.1} 
                        value={zoom} 
                        onChange={(e) => setZoom(Number(e.target.value))} 
                        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                </div>

                {/* Butonlar */}
                <div className="flex justify-between items-center px-4">
                    <button onClick={() => setRotation(r => r + 90)} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2">
                        <div className="bg-zinc-800 p-3 rounded-full"><RotateCw className="w-5 h-5"/></div>
                        <span className="text-[10px] font-medium uppercase">Döndür</span>
                    </button>
                    
                    <button onClick={() => { setZoom(1); setRotation(0); setCrop({ x: 0, y: 0 }); }} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2">
                        <div className="bg-zinc-800 p-3 rounded-full"><Clock className="w-5 h-5"/></div>
                        <span className="text-[10px] font-medium uppercase">Sıfırla</span>
                    </button>
                </div>
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
            
            {/* HATA KUTUSU */}
            {analysisResult.correction?.hasError && (
                <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm">
                    <h3 className="text-xs font-bold text-red-500 uppercase mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4"/> Gramer Hatası Tespit Edildi
                    </h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-400 line-through decoration-2 text-lg">
                            <X className="w-5 h-5 shrink-0"/>
                            <span>{analysisText}</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
                            <CheckCircle2 className="w-5 h-5 shrink-0"/>
                            <span>{analysisResult.correction.corrected}</span>
                        </div>
                        <p className="text-sm text-red-600 mt-2 bg-red-100/50 p-2 rounded-lg">
                            <span className="font-bold">Neden?</span> {analysisResult.correction.explanation}
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> Türkçe Çeviri</h3>
              <p className="text-lg text-slate-800 font-medium leading-relaxed">{analysisResult.turkishTranslation}</p>
            </div>
            <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-teal-100 pb-2">
                 <h3 className="text-xs font-bold text-teal-600 uppercase flex items-center gap-2"><Brain className="w-4 h-4" /> Analiz Özeti</h3>
                 {analysisResult.detectedTense && (
                    <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3"/> {analysisResult.detectedTense}
                    </span>
                 )}
              </div>
              <ul className="space-y-2">
                {analysisResult.simplePoints?.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                        <span className="text-teal-500 font-bold">•</span>
                        <span>{point}</span>
                    </li>
                ))}
              </ul>
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
