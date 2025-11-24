import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Camera, Microscope, Loader2, Globe, Brain, BookOpen, Plus, Crop, Check, X, Clock, RotateCw, ZoomIn, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { fetchSentenceAnalysisFromAI, extractTextFromImage } from "../services/aiService";
import QuickAddModal from "../components/QuickAddModal";

import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const customStyles = `
  .ReactCrop { touch-action: none; user-select: none; -webkit-user-select: none; }
  .ReactCrop__crop-selection { border: 2px solid white; box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.8); }
  .ReactCrop__drag-handle::after { width: 12px; height: 12px; background-color: white; border: 1px solid rgba(0,0,0,0.1); border-radius: 50%; }
  .ReactCrop__drag-handle.ord-nw, .ReactCrop__drag-handle.ord-ne, .ReactCrop__drag-handle.ord-sw, .ReactCrop__drag-handle.ord-se { width: 30px; height: 30px; background: transparent; margin-top: -15px; margin-left: -15px; }
  .ReactCrop__drag-handle.ord-nw::after { border-radius: 0; width: 20px; height: 20px; border-top: 4px solid white; border-left: 4px solid white; background: transparent; top: 5px; left: 5px; }
  .ReactCrop__drag-handle.ord-ne::after { border-radius: 0; width: 20px; height: 20px; border-top: 4px solid white; border-right: 4px solid white; background: transparent; top: 5px; right: 5px; }
  .ReactCrop__drag-handle.ord-sw::after { border-radius: 0; width: 20px; height: 20px; border-bottom: 4px solid white; border-left: 4px solid white; background: transparent; bottom: 5px; left: 5px; }
  .ReactCrop__drag-handle.ord-se::after { border-radius: 0; width: 20px; height: 20px; border-bottom: 4px solid white; border-right: 4px solid white; background: transparent; bottom: 5px; right: 5px; }
`;

async function canvasPreview(image, crop, scale = 1, rotate = 0) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio;
  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';
  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;
  ctx.save();
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, image.naturalWidth, image.naturalHeight);
  ctx.restore();
  return new Promise((resolve) => {
    canvas.toBlob((blob) => { if (!blob) return; resolve(blob); }, 'image/jpeg', 0.95);
  });
}

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight)
}

export default function SentenceAnalysis() {
  const { customWords, dynamicSystemWords, deletedWordIds } = useData();
  const navigate = useNavigate();
  
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [quickAddWord, setQuickAddWord] = useState(null);
  
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  
  const imgRef = useRef(null);
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
      setCrop(undefined); setScale(1); setRotate(0);
      const reader = new FileReader();
      reader.addEventListener('load', () => { setImgSrc(reader.result?.toString() || ''); setIsCropModalOpen(true); });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 16 / 9));
  }

  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current) { alert("Lütfen alan seçin."); return; }
    setIsCropModalOpen(false); setOcrLoading(true);
    try {
        const blob = await canvasPreview(imgRef.current, completedCrop, scale, rotate);
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        const text = await extractTextFromImage(file);
        if (text) setAnalysisText((prev) => (prev ? prev + "\n" + text : text));
        else alert("Metin okunamadı.");
    } catch (e) { console.error(e); alert("Hata oluştu."); } 
    finally { setOcrLoading(false); if(fileInputRef.current) fileInputRef.current.value = ""; setImgSrc(""); }
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
      <style>{customStyles}</style>
      {quickAddWord && <QuickAddModal word={quickAddWord} onClose={() => setQuickAddWord(null)} />}
      <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />

      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">
             <div className="px-4 py-6 flex justify-between items-center bg-black/80 backdrop-blur-sm z-20 absolute top-0 w-full">
                <button onClick={() => { setIsCropModalOpen(false); setImgSrc(""); }} className="text-white font-medium p-2">İptal</button>
                <h3 className="text-white font-bold text-sm uppercase tracking-widest">Kırp</h3>
                <button onClick={handleCropConfirm} className="text-yellow-400 font-bold p-2">Bitti</button>
             </div>
             <div className="flex-1 flex items-center justify-center relative bg-black overflow-hidden touch-none">
                {Boolean(imgSrc) && (
                    <ReactCrop crop={crop} onChange={(_, c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} ruleOfThirds className="max-h-[70vh]">
                        <img ref={imgRef} alt="Crop" src={imgSrc} onLoad={onImageLoad} style={{ transform: `scale(${scale}) rotate(${rotate}deg)`, transition: 'transform 0.2s ease-out', maxHeight: '60vh', maxWidth: '100vw', objectFit: 'contain', touchAction: 'none' }} />
                    </ReactCrop>
                )}
             </div>
             <div className="bg-zinc-900 pb-10 pt-6 px-6 space-y-6 z-20">
                <div className="flex items-center gap-4">
                    <ZoomIn className="w-5 h-5 text-zinc-500" />
                    <input type="range" min={1} max={3} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white touch-none"/>
                </div>
                <div className="flex justify-between items-center px-4">
                    <button onClick={() => setRotate(p => p + 90)} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2"><div className="bg-zinc-800 p-3 rounded-full"><RotateCw className="w-5 h-5"/></div><span className="text-[10px] font-medium uppercase">Döndür</span></button>
                    <button onClick={() => { setScale(1); setRotate(0); }} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2"><div className="bg-zinc-800 p-3 rounded-full"><Clock className="w-5 h-5"/></div><span className="text-[10px] font-medium uppercase">Sıfırla</span></button>
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
            
            {/* --- YENİ: GRAMER KONTROL KUTUSU --- */}
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
            {/* ----------------------------------- */}

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
