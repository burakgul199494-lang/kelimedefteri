import React, { useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Camera,
  Microscope,
  Loader2,
  Globe,
  Brain,
  BookOpen,
  Plus,
  Check,
  X,
  Clock,
  RotateCw,
  ZoomIn,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";

import {
  fetchSentenceAnalysisFromAI,
  extractTextFromImage
} from "../services/aiService";

import QuickAddModal from "../components/QuickAddModal";

// iOS tarzı Cropper
import Cropper from "react-easy-crop";


// --- iOS CROP HELPER ---
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
    image.crossOrigin = "anonymous";
    image.src = url;
  });

const degToRad = (deg) => (deg * Math.PI) / 180;

function getRotatedSize(width, height, rotationRad) {
  return {
    width:
      Math.abs(Math.cos(rotationRad) * width) +
      Math.abs(Math.sin(rotationRad) * height),
    height:
      Math.abs(Math.sin(rotationRad) * width) +
      Math.abs(Math.cos(rotationRad) * height)
  };
}

async function getCroppedImg(src, pixelCrop, rotation = 0) {
  const image = await createImage(src);
  const rotRad = degToRad(rotation);

  const { width: bBoxWidth, height: bBoxHeight } = getRotatedSize(
    image.width,
    image.height,
    rotRad
  );

  const tempCanvas = document.createElement("canvas");
  const tctx = tempCanvas.getContext("2d");
  tempCanvas.width = bBoxWidth;
  tempCanvas.height = bBoxHeight;

  tctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  tctx.rotate(rotRad);
  tctx.drawImage(image, -image.width / 2, -image.height / 2);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    tempCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
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

  const [imgSrc, setImgSrc] = useState("");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // crop states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const fileInputRef = useRef(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Kelime sözlükte var mı kontrolü
  const isWordInRegistry = (wordToCheck) => {
    if (!wordToCheck) return false;

    let lower = wordToCheck.toLowerCase().trim();
    lower = lower.replace(/'s$/, "").replace(/[^a-z]/g, "");

    if (dynamicSystemWords.some((sw) => sw.word.toLowerCase().trim() === lower))
      return true;

    if (
      customWords.some(
        (cw) =>
          cw.word.toLowerCase().trim() === lower &&
          !deletedWordIds.includes(cw.id)
      )
    )
      return true;

    return false;
  };



  // resim seçme
  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImgSrc(reader.result.toString());
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // kırpma onaylama
  const handleCropConfirm = async () => {
    if (!croppedAreaPixels) {
      alert("Lütfen alan seçin.");
      return;
    }

    setIsCropModalOpen(false);
    setOcrLoading(true);

    try {
      const blob = await getCroppedImg(imgSrc, croppedAreaPixels, rotation);
      const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });

      const text = await extractTextFromImage(file);

      if (text) {
        setAnalysisText((prev) => (prev ? prev + "\n" + text : text));
      } else {
        alert("Metin okunamadı.");
      }
    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setImgSrc("");
      setCroppedAreaPixels(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    }
  };



  // ANALİZ
  const handleAnalyze = async () => {
    if (!analysisText.trim()) {
      alert("Lütfen cümle yazın.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await fetchSentenceAnalysisFromAI(analysisText);
      setAnalysisResult(result);
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };





  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center relative">

      {quickAddWord && (
        <QuickAddModal word={quickAddWord} onClose={() => setQuickAddWord(null)} />
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />



      {/* --- CROP MODAL --- */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* ÜST BAR */}
          <div className="px-4 py-6 flex justify-between items-center bg-black/80 backdrop-blur-sm absolute top-0 w-full z-20">
            <button
              onClick={() => {
                setIsCropModalOpen(false);
                setImgSrc("");
              }}
              className="text-white font-medium p-2"
            >
              İptal
            </button>

            <h3 className="text-white font-bold text-sm uppercase tracking-widest">
              Kırp
            </h3>

            <button
              onClick={handleCropConfirm}
              className="text-yellow-400 font-bold p-2"
            >
              Bitti
            </button>
          </div>

          {/* GÖRSEL */}
          <div className="flex-1 flex items-center justify-center relative bg-black overflow-hidden">
            {imgSrc && (
              <Cropper
                image={imgSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                zoomWithScroll={true}
                restrictPosition={false}
                showGrid={true}
              />
            )}
          </div>

          {/* ALT BAR */}
          <div className="bg-zinc-900 pb-10 pt-6 px-6 space-y-6">
            {/* ZOOM */}
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

            {/* BUTONLAR */}
            <div className="flex justify-between items-center px-4">
              <button
                onClick={() => setRotation((p) => (p + 90) % 360)}
                className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white"
              >
                <div className="bg-zinc-800 p-3 rounded-full">
                  <RotateCw className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase">Döndür</span>
              </button>

              <button
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setCrop({ x: 0, y: 0 });
                }}
                className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white"
              >
                <div className="bg-zinc-800 p-3 rounded-full">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase">Sıfırla</span>
              </button>
            </div>
          </div>
        </div>
      )}






      {/* ---- SAYFA ---- */}
      <div className="w-full max-w-lg space-y-6">

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>

          <h2 className="text-2xl font-bold text-slate-800">Cümle Analizi</h2>
        </div>




        {/* --- CÜMLE GİRİŞ --- */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={ocrLoading || isAnalyzing}
            className="w-full mb-3 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          >
            {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            Fotoğraf Çek / Yükle
          </button>

          <textarea
            value={analysisText}
            onChange={(e) => setAnalysisText(e.target.value)}
            className="w-full p-3 border border-slate-100 rounded-xl outline-none min-h-[120px]"
            placeholder="Analiz edilecek cümleyi yaz..."
          />

          <div className="flex justify-end mt-2">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || ocrLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md"
            >
              {isAnalyzing ? <Loader2 className="animate-spin" /> : <Microscope />}
              Analiz Et
            </button>
          </div>
        </div>






        {/* ANALİZ SONUÇLARI */}
        {analysisResult && (
          <div className="space-y-6">

            {/* --- GRAMMAR HATASI --- */}
            {analysisResult.correction?.hasError && (
              <div className="bg-red-50 p-5 rounded-2xl border border-red-200 shadow-sm">
                <h3 className="text-xs font-bold text-red-600 uppercase mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Gramer Hatası
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-400 line-through text-lg">
                    <X className="w-5 h-5" />
                    <span>{analysisText}</span>
                  </div>

                  <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{analysisResult.correction.corrected}</span>
                  </div>

                  <p className="text-sm text-red-700 bg-red-100/50 p-2 rounded-lg">
                    <strong>Neden?</strong> {analysisResult.correction.explanation}
                  </p>
                </div>
              </div>
            )}





            {/* --- TÜRKÇE ÇEVİRİ --- */}
            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-200 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-500 uppercase mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Türkçe Çeviri
              </h3>
              <p className="text-lg text-slate-800 whitespace-pre-line">
                {analysisResult.turkishTranslation}
              </p>
            </div>




            {/* --- ANALİZ ÖZETİ --- */}
            <div className="bg-teal-50 p-5 rounded-2xl border border-teal-200 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-teal-200">
                <h3 className="text-xs font-bold text-teal-600 uppercase flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Analiz Özeti
                </h3>

                {analysisResult.detectedTense && (
                  <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold">
                    {analysisResult.detectedTense}
                  </span>
                )}
              </div>

              <ul className="space-y-2">
                {analysisResult.simplePoints?.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-teal-600 font-bold">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>




            {/* --- USAGE ANALİZİ --- */}
            {analysisResult.usage?.hasMistake && (
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 shadow-sm">
                <h3 className="text-xs font-bold text-orange-600 uppercase mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Yanlış Kullanım Analizi
                </h3>

                <p className="text-sm text-orange-700 mb-2">
                  <strong>Yanlış:</strong> {analysisResult.usage.wrong}
                </p>

                <p className="text-sm text-green-700 mb-2">
                  <strong>Doğru:</strong> {analysisResult.usage.correct}
                </p>

                <p className="text-sm text-orange-700 bg-orange-100/50 p-2 rounded-lg">
                  {analysisResult.usage.explanation}
                </p>
              </div>
            )}




            {/* --- CÜMLE YAPISI (SVO) --- */}
            {(analysisResult.structure.subject ||
              analysisResult.structure.verb ||
              analysisResult.structure.object) && (
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 shadow-sm">
                <h3 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Cümle Yapısı Analizi
                </h3>

                <p className="text-sm text-slate-800">
                  <strong>Özne:</strong> {analysisResult.structure.subject}
                </p>

                <p className="text-sm text-slate-800">
                  <strong>Fiil:</strong> {analysisResult.structure.verb}
                </p>

                <p className="text-sm text-slate-800 mb-2">
                  <strong>Nesne:</strong> {analysisResult.structure.object}
                </p>

                {analysisResult.structure.phrases?.length > 0 && (
                  <div className="bg-white p-3 rounded-xl border border-blue-100">
                    <h4 className="text-xs font-bold text-blue-500 mb-1">
                      Ek Bilgiler (Phrases)
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.structure.phrases.map((ph, idx) => (
                        <li key={idx} className="text-sm text-slate-700">
                          • {ph}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}




            {/* --- STİL ANALİZİ --- */}
            {analysisResult.style?.hasIssue && (
              <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200 shadow-sm">
                <h3 className="text-xs font-bold text-purple-600 uppercase mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Stil Analizi
                </h3>

                <p className="text-sm text-purple-800 mb-2">
                  <strong>Öneri:</strong> {analysisResult.style.suggestion}
                </p>

                <p className="text-sm text-purple-700 bg-purple-100/50 p-2 rounded-lg">
                  {analysisResult.style.explanation}
                </p>
              </div>
            )}




            {/* --- KÖK KELİMELER (MEVCUT SİSTEMİN) --- */}
            {analysisResult.rootWords?.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Kelime Kökleri
                </h3>

                <div className="flex flex-wrap gap-2">
                  {analysisResult.rootWords.map((word, idx) => {
                    const exists = isWordInRegistry(word);

                    return (
                      <button
                        key={idx}
                        onClick={() => !exists && setQuickAddWord(word)}
                        disabled={exists}
                        className={`px-3 py-1.5 rounded-lg font-bold text-sm border ${
                          exists
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        }`}
                      >
                        {word}
                        {!exists && (
                          <Plus className="w-3 h-3 inline ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- MANUEL EKLE --- */}
            <button
              onClick={() => setQuickAddWord("")}
              className="w-full bg-white text-slate-700 border-2 border-dashed border-slate-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50"
            >
              <Plus className="w-5 h-5" /> Manuel Kelime Ekle
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
