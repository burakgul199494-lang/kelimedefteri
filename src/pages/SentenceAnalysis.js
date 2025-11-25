import React, { useState, useRef } from "react";
import { ArrowLeft, Camera, Microscope, Loader2, Globe, Brain, BookOpen, Plus, RotateCw, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { fetchSentenceAnalysisFromAI, extractTextFromImage } from "../services/aiService";
import QuickAddModal from "../components/QuickAddModal";

// YENİ: PROFESYONEL KIRPMA KÜTÜPHANESİ
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css"; // CSS dosyasını unutma!

export default function SentenceAnalysis() {
  const { customWords, dynamicSystemWords, deletedWordIds } = useData();
  const navigate = useNavigate();
  
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [quickAddWord, setQuickAddWord] = useState(null);
  
  // --- CROP STATE'LERİ ---
  const [imgSrc, setImgSrc] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const cropperRef = useRef(null); // Cropper'a erişmek için ref
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
        setIsCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  // --- KIRPMA İŞLEMİNİ TAMAMLA ---
  const handleCropConfirm = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setIsCropModalOpen(false); 
    setOcrLoading(true);
    
    try {
        // Cropper.js kendi içinde resmi oluşturur, biz sadece blob istiyoruz.
        cropper.getCroppedCanvas().toBlob(async (blob) => {
            if (!blob) { alert("Kırpma hatası."); setOcrLoading(false); return; }
            const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
            const text = await extractTextFromImage(file);
            if (text) setAnalysisText((prev) => (prev ? prev + "\n" + text : text));
            else alert("Metin okunamadı.");
            
            setOcrLoading(false); 
            if(fileInputRef.current) fileInputRef.current.value = ""; 
            setImgSrc(null); 
        }, 'image/jpeg');

    } catch (e) { 
        console.error(e); alert("Hata oluştu."); setOcrLoading(false);
    }
  };

  // Döndürme Fonksiyonları
  const rotateLeft = () => cropperRef.current?.cropper.rotate(-90);
  const rotateRight = () => cropperRef.current?.cropper.rotate(90);
  const resetCropper = () => cropperRef.current?.cropper.reset();


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

      {/* --- YENİ CROP MODAL (REACT-CROPPER) --- */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">
             
             {/* Üst Bar */}
             <div className="px-4 py-4 flex justify-between items-center bg-black/80 backdrop-blur-sm z-20">
                <button onClick={() => { setIsCropModalOpen(false); setImgSrc(null); }} className="text-white font-medium p-2">İptal</button>
                <h3 className="text-white font-bold text-sm uppercase tracking-widest">Düzenle</h3>
                <button onClick={handleCropConfirm} className="bg-yellow-500 text-black px-4 py-1.5 rounded-full font-bold text-sm">Bitti</button>
             </div>

             {/* Orta Alan (Cropper JS) */}
             <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden p-4">
                <Cropper
                    ref={cropperRef}
                    style={{ height: "100%", width: "100%" }}
                    zoomTo={0.5}
                    initialAspectRatio={NaN} // Serbest seçim için NaN
                    aspectRatio={NaN}
                    preview=".img-preview"
                    src={imgSrc}
                    viewMode={1} // Resmi kutu içinde tut
                    minCropBoxHeight={10}
                    minCropBoxWidth={10}
                    background={false}
                    responsive={true}
                    autoCropArea={1}
                    checkOrientation={false}
                    guides={true}
                    dragMode="move" // İlk açılışta taşıma modu
                />
             </div>

             {/* Alt Kontroller */}
             <div className="bg-zinc-900 pb-8 pt-4 px-6 flex justify-around items-center z-20 safe-area-bottom">
                <button onClick={rotateLeft} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2">
                    <RotateCcw className="w-6 h-6"/>
                    <span className="text-[10px]">Sola</span>
                </button>
                <button onClick={resetCropper} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2">
                    <div className="bg-zinc-800 px-4 py-2 rounded-full font-bold text-xs">SIFIRLA</div>
                </button>
                <button onClick={rotateRight} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors p-2">
                    <RotateCw className="w-6 h-6"/>
                    <span className="text-[10px]">Sağa</span>
                </button>
             </div>
        </div>
      )}

      {/* --- ANA EKRAN (Değişmedi) --- */}
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
              <h3 className="text-xs font-bold text-teal-600 uppercase mb-3 flex items-center gap-2"><Brain className="w-4 h-4" /> Analiz Özeti</h3>
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
          </div>
        )}
      </div>
    </div>
  );
}
