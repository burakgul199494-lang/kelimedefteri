import React, { useState, useRef } from "react";
import { ArrowLeft, Camera, Microscope, Loader2, Globe, Brain, BookOpen, Plus, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { fetchSentenceAnalysisFromAI, extractTextFromImage } from "../services/aiService";
import QuickAddModal from "../components/QuickAddModal";

// YENİ KÜTÜPHANE
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css'; 

export default function SentenceAnalysis() {
  const { customWords, dynamicSystemWords, deletedWordIds } = useData();
  const navigate = useNavigate();
  
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRootWord, setSelectedRootWord] = useState(null);

  const [imgSrc, setImgSrc] = useState("");
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const fileInputRef = useRef(null);

  const handleAnalyze = async () => {
    if (!analysisText.trim()) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await fetchSentenceAnalysisFromAI(analysisText);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      setError("Analiz sırasında bir hata oluştu.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isWordInRegistry = (wordToCheck) => {
    if (!wordToCheck) return false;
    const lower = wordToCheck.toLowerCase().trim();
    if (dynamicSystemWords.some(sw => sw.word.toLowerCase() === lower)) return true;
    if (customWords.some(cw => cw.word.toLowerCase() === lower && !deletedWordIds.includes(cw.id))) return true;
    return false;
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); 
      const reader = new FileReader();
      reader.addEventListener("load", () => setImgSrc(reader.result?.toString() || ""));
      reader.readAsDataURL(e.target.files[0]);
      setIsCropping(true); 
      setAnalysisText("");
      setAnalysisResult(null);
      setError(null);
      setCroppedImageBlob(null);
    }
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        16 / 9, 
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  };

  const handleExtractFromImage = async () => {
    setIsImageLoading(true);
    try {
      let blobToSend = null;
      if (imgRef.current && crop) {
        blobToSend = await getCroppedImgBlob(imgRef.current, crop);
      }
      if (blobToSend) {
        const fakeFile = new File([blobToSend], "cropped.jpg", { type: "image/jpeg" });
        const text = await extractTextFromImage(fakeFile);
        setAnalysisText(text);
        setIsCropping(false);
        setImgSrc("");
        setCrop(undefined);
        setCroppedImageBlob(null);
      }
    } catch (e) {
      console.error(e);
      setError("Görselden metin çıkarılırken hata oluştu.");
    } finally {
      setIsImageLoading(false);
    }
  };

  const resetImage = () => {
    setImgSrc("");
    setCrop(undefined);
    setCroppedImageBlob(null);
    setIsCropping(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openAddModal = (word) => {
    setSelectedRootWord(word);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setSelectedRootWord(null);
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ÜST BAR */}
      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Geri</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Microscope className="w-4 h-4" />
            <span>Cümle Analizi</span>
          </div>
        </div>
      </div>

      {/* ANA İÇERİK */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* GÖRSEL / METİN GİRİŞİ */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Sol: Metin giriş alanı */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-800">Cümle Girişi</h2>
              </div>
              <span className="text-[11px] text-slate-400">
                İngilizce cümleyi yaz veya görselden al
              </span>
            </div>
            <textarea
              value={analysisText}
              onChange={(e) => setAnalysisText(e.target.value)}
              className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none"
              placeholder="Analiz edilecek cümleyi yaz..."
            />
            <div className="flex justify-between items-center pt-1">
              <span className="text-[11px] text-slate-400">
                Karışık, uzun cümleler yazabilirsin. Kökleri & grameri çıkaralım.
              </span>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !analysisText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Microscope className="w-4 h-4" />
                )}
                Analiz Et
              </button>
            </div>
          </div>

          {/* Sağ: Görselden metin alma */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-800">Görselden Metin</h2>
              </div>
              <span className="text-[11px] text-slate-400">Kitap / ekran fotoğrafı</span>
            </div>

            {!imgSrc && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-6 hover:border-emerald-400 hover:bg-emerald-50/40 transition"
              >
                <Camera className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">
                  Ekran görüntüsü veya kitap sayfası yükle
                </span>
                <span className="text-[10px] text-slate-400">
                  JPG / PNG desteklenir
                </span>
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {imgSrc && (
              <div className="space-y-2">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    aspect={16 / 9}
                    keepSelection
                  >
                    <img
                      ref={imgRef}
                      src={imgSrc}
                      alt="Seçilen görsel"
                      onLoad={onImageLoad}
                      className="max-h-64 object-contain mx-auto"
                    />
                  </ReactCrop>
                </div>
                <div className="flex justify-between gap-2 pt-1">
                  <button
                    onClick={resetImage}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    <X className="w-3 h-3" />
                    Temizle
                  </button>
                  <button
                    onClick={handleExtractFromImage}
                    disabled={isImageLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isImageLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                    Metni Al
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HATA */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        {/* ANALİZ SONUÇLARI */}
        {analysisResult && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {/* Türkçe Çeviri */}
            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Türkçe Çeviri
              </h3>
              <p className="text-lg text-slate-800 font-medium leading-relaxed">
                {analysisResult.turkishTranslation}
              </p>
            </div>

            {/* Gramer Yapısı */}
            <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100 shadow-sm">
              <h3 className="text-xs font-bold text-teal-500 uppercase mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" /> Gramer Yapısı
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {analysisResult.grammarAnalysis}
              </p>
            </div>

            {/* Kök Kelimeler */}
            {analysisResult.rootWords?.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Kelime Kökleri
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.rootWords.map((word, idx) => {
                    const exists = isWordInRegistry(word);
                    return (
                      <button
                        key={idx}
                        onClick={() => { if (!exists) openAddModal(word); }}
                        className={
                          "inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition " +
                          (exists
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default"
                            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100")
                        }
                      >
                        {exists ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        <span>{word}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KELİME EKLE MODAL */}
      {showAddModal && selectedRootWord && (
        <QuickAddModal
          initialWord={selectedRootWord}
          onClose={closeAddModal}
        />
      )}
    </div>
  );
}

// Yardımcı: Canvas'tan kırpılmış blob üret
function getCroppedImgBlob(image, crop) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { 
        reject(new Error('Canvas is empty')); 
        return; 
      }
      resolve(blob);
    }, 'image/jpeg', 1);
  });
}
