import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mic,
  Square,
  Volume2,
  RefreshCw,
  Trophy,
  AlertCircle,
  StopCircle,
  Camera
} from "lucide-react";

import { extractTextFromImage } from "../services/aiService";

// 🚀 iOS tarzı profesyonel cropper (SentenceAnalysis ile birebir aynı yapı)
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

export default function Pronunciation() {
  const navigate = useNavigate();

  // --- TELAFFUZ STATE'LERİ ---
  const [text, setText] = useState("");            // okunacak cümle
  const [spokenText, setSpokenText] = useState(""); 
  const [isListening, setIsListening] = useState(false);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- KIRPMA + OCR STATE'LERİ (SentenceAnalysis ile aynı mantık) ---
  const [imgSrc, setImgSrc] = useState("");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const cropperRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Sayfadan çıkarken varsa konuşmayı durdur
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // SpeechRecognition kurulumu
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSpokenText(transcript);
        calculateScore(text, transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setFeedback({ type: "error", msg: "Anlaşılamadı." });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setFeedback({ type: "error", msg: "Tarayıcı mikrofonu desteklemiyor." });
    }
  }, [text]);

  // ----------------- FOTOĞRAF SEÇME (SentenceAnalysis ile aynı mantık) -----------------
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

  // ----------------- KIRPMA ONAY (SentenceAnalysis ile aynı, sadece setText kullanıyor) -----------------
  const handleCropConfirm = async () => {
    try {
      const cropper = cropperRef.current?.cropper;
      if (!cropper) return;

      const canvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high"
      });

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.95)
      );

      const file = new File([blob], "crop.jpg", { type: "image/jpeg" });

      setIsCropModalOpen(false);

      const textFromImg = await extractTextFromImage(file);

      if (textFromImg) {
        // SentenceAnalysis'teki gibi: önceki metne ekleyerek yazıyor
        setText((prev) => (prev ? prev + "\n" + textFromImg : textFromImg));
      }
    } catch (err) {
      console.error(err);
      alert("Kırpma sırasında hata oluştu.");
    } finally {
      setImgSrc("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ----------------- METNİ SESLİ OKUTMA -----------------
  const handleSpeak = () => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;

    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);

    window.speechSynthesis.speak(u);
  };

  const handleStopSpeak = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // ----------------- MİKROFON KONTROL -----------------
  const toggleMic = () => {
    if (!text) {
      alert("Lütfen cümle yazın veya fotoğraftan alın.");
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setSpokenText("");
      setScore(null);
      setFeedback(null);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // ----------------- PUANLAMA -----------------
  const calculateScore = (target, originalSpoken) => {
    const cleanTarget = target
      .toLowerCase()
      .replace(/[.,?!]/g, "")
      .trim()
      .split(/\s+/);

    const cleanSpoken = originalSpoken
      .toLowerCase()
      .replace(/[.,?!]/g, "")
      .trim()
      .split(/\s+/);

    let matchCount = 0;
    cleanTarget.forEach((word) => {
      if (cleanSpoken.includes(word)) matchCount++;
    });

    let calculatedScore = 0;
    if (cleanTarget.length > 0) {
      calculatedScore = Math.round((matchCount / cleanTarget.length) * 100);
    }
    if (calculatedScore > 100) calculatedScore = 100;

    setScore(calculatedScore);

    if (calculatedScore === 100)
      setFeedback({ type: "success", msg: "Mükemmel! 🎉" });
    else if (calculatedScore >= 70)
      setFeedback({ type: "success", msg: "Gayet İyi! 👍" });
    else if (calculatedScore >= 40)
      setFeedback({ type: "warning", msg: "Fena değil. 🤔" });
    else setFeedback({ type: "error", msg: "Tekrar dene. 😕" });
  };

  // ===================================================================
  //                              RENDER
  // ===================================================================
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">

        {/* Üst Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Telaffuz Koçu</h2>
        </div>

        {/* Fotoğraf Seçme Butonu (SentenceAnalysis ile aynı stil) */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Fotoğraf Çek / Yükle
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Cümle Giriş Alanı */}
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-2 uppercase">
              Okunacak Cümle
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-4 border-2 border-indigo-100 rounded-2xl text-lg font-medium text-slate-700 focus:border-indigo-500 outline-none h-32 resize-none"
              placeholder="Buraya İngilizce bir cümle yaz veya fotoğraftan al..."
            />
          </div>

          {/* Dinle / Durdur */}
          <div className="flex gap-2">
            {isSpeaking ? (
              <button
                onClick={handleStopSpeak}
                className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                <StopCircle className="w-5 h-5" />
                Durdur
              </button>
            ) : (
              <button
                onClick={handleSpeak}
                disabled={!text}
                className="w-full py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                <Volume2 className="w-5 h-5" />
                Dinle
              </button>
            )}
          </div>
        </div>

        {/* Mikrofon Alanı */}
        <div className="relative flex flex-col items-center justify-center py-6">
          {isListening && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-red-500 rounded-full animate-ping opacity-20"></div>
            </div>
          )}

          <button
            onClick={toggleMic}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform active:scale-95 ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {isListening ? (
              <Square className="w-8 h-8 fill-current" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </button>
          <p className="mt-4 text-sm text-slate-500 font-medium">
            {isListening ? "Dinliyorum... Konuşun." : "Bas ve Okumaya Başla"}
          </p>
        </div>

        {/* Sonuç Alanı */}
        {(spokenText || score !== null) && (
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
            <div className="text-center mb-4">
              <div className="text-xs font-bold text-slate-400 uppercase mb-1">
                Algılanan Ses
              </div>
              <p className="text-lg text-slate-800 italic">"{spokenText}"</p>
            </div>

            {score !== null && (
              <div
                className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
                  score >= 70
                    ? "bg-green-50 border-green-200 text-green-800"
                    : score >= 40
                    ? "bg-orange-50 border-orange-200 text-orange-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  {score >= 70 ? (
                    <Trophy className="w-8 h-8" />
                  ) : (
                    <AlertCircle className="w-8 h-8" />
                  )}

                  <div className="text-left">
                    <div className="font-bold text-2xl">%{score}</div>
                    <div className="text-xs font-bold opacity-80">
                      Doğruluk
                    </div>
                  </div>
                </div>
                <div className="text-right font-bold text-sm max-w-[120px]">
                  {feedback?.msg}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setSpokenText("");
                setScore(null);
                setIsListening(false);
              }}
              className="w-full mt-4 py-2 text-slate-400 hover:text-indigo-600 text-sm font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sonucu Temizle
            </button>
          </div>
        )}
      </div>

      {/* ===========================================================
          🚀🚀🚀   CÜMLE ANALİZİYLE AYNI iOS TARZI CROP MODAL   🚀🚀🚀
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

          {/* CROP ALANI (SentenceAnalysis ile birebir aynı ayarlar) */}
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
    </div>
  );
}
