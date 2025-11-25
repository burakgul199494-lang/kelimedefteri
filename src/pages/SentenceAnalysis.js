import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Camera,
  Microscope,
  Loader2,
  Globe,
  Brain,
  BookOpen,
  Plus,
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

// 🚀 YENİ: iOS tarzı profesyonel cropper
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

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

  const cropperRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Fotoğraf seçme
  const handleImageSelect = (e) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result.toString());
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Kırpma Onaylama
  const handleCropConfirm = async () => {
    try {
      const cropper = cropperRef.current?.cropper;

      const canvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high"
      });

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.95)
      );

      const file = new File([blob], "crop.jpg", { type: "image/jpeg" });

      setIsCropModalOpen(false);
      setOcrLoading(true);

      const text = await extractTextFromImage(file);

      if (text) {
        setAnalysisText((prev) => (prev ? prev + "\n" + text : text));
      }
    } catch (err) {
      console.error(err);
      alert("Kırpma sırasında hata oluştu.");
    } finally {
      setOcrLoading(false);
      setImgSrc("");
      if (fileInputRef.current) fileInputRef.current.value = "";
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

      {/* QUICK ADD MODAL */}
      {quickAddWord && (
        <QuickAddModal word={quickAddWord} onClose={() => setQuickAddWord(null)} />
      )}

      {/* HIDDEN INPUT */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />

      {/* ===========================================================
          🚀🚀🚀   YENİ iOS TARZI CROP MODAL   🚀🚀🚀
          =========================================================== */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">

          {/* ÜST BAR */}
          <div className="px-4 py-6 flex justify-between items-center bg-black/70 backdrop-blur-md absolute top-0 w-full z-20">
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

          {/* CROP ALANI */}
          <div className="flex-1 flex items-center justify-center overflow-hidden bg-black">
            <Cropper
              src={imgSrc}
              ref={cropperRef}
              style={{ height: "100%", width: "100%" }}
              viewMode={1}
              dragMode="move"
              background={false}
              responsive={true}
              autoCropArea={0.8}

              movable={true}
              zoomable={true}
              zoomOnTouch={true}
              zoomOnWheel={true}

              cropBoxMovable={true}
              cropBoxResizable={true}

              minCropBoxWidth={50}
              minCropBoxHeight={50}

              guides={true}
            />
          </div>
        </div>
      )}

      {/* =========================================================== */}





      {/* --------------------------------- PAGE --------------------------------- */}
      <div className="w-full max-w-lg space-y-6">

        {/* BACK + TITLE */}
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
            {ocrLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
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




        {/* --- ANALİZ SONUÇLARI --- */}
        {analysisResult && (
          <div className="space-y-6">

            {/* --- Hata Tespiti --- */}
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

            {/* --- Çeviri --- */}
            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-200 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-500 uppercase mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Türkçe Çeviri
              </h3>
              <p className="text-lg text-slate-800 whitespace-pre-line">
                {analysisResult.turkishTranslation}
              </p>
            </div>

            {/* --- Özet --- */}
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

            {/* --- Yanlış Kullanım --- */}
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

            {/* --- Cümle Yapısı (SVO) --- */}
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

            {/* --- Stil Analizi --- */}
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

            {/* --- Kök Kelimeler (Sözlük entegrasyonu bozulmadı) --- */}
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
                        {!exists && <Plus className="w-3 h-3 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- Manuel Ekle --- */}
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
