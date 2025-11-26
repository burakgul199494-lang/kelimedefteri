import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ZoomIn,
  RotateCw,
  Clock
} from "lucide-react";

import Cropper from "react-easy-crop";
import { extractTextFromImage } from "../services/aiService";

// --------------------------------------
// CROP HELPERS
// --------------------------------------
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

// --------------------------------------
// MAIN COMPONENT
// --------------------------------------
export default function Pronunciation() {
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ---- CROP STATES ----
  const [imgSrc, setImgSrc] = useState("");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = useRef(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // ---- MICROPHONE ----
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

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
        setFeedback({ type: "error", msg: "Mikrofon hatası" });
      };

      recognitionRef.current.onend = () => setIsListening(false);
    } else {
      setFeedback({ type: "error", msg: "Tarayıcı desteklemiyor" });
    }
  }, [text]);

  // ---- OCR IMAGE SELECT ----
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

  // ---- OCR CROP CONFIRM ----
  const handleCropConfirm = async () => {
    if (!croppedAreaPixels) return alert("Alan seçmelisin!");

    try {
      const blob = await getCroppedImg(imgSrc, croppedAreaPixels, rotation);
      const file = new File([blob], "crop.jpg", { type: "image/jpeg" });

      const ocrText = await extractTextFromImage(file);

      if (ocrText) {
        setText(ocrText);
      } else {
        alert("Metin okunamadı.");
      }
    } catch {
      alert("OCR sırasında hata oluştu.");
    }

    setIsCropModalOpen(false);
    setImgSrc("");
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
  };

  // ---- TEXT-TO-SPEECH ----
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

  // ---- MIC ----
  const toggleMic = () => {
    if (!text) {
      alert("Önce bir cümle gir.");
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

  // ---- SCORE ----
  const calculateScore = (target, spoken) => {
    const cleanT = target.toLowerCase().replace(/[.,?!]/g, "").split(/\s+/);
    const cleanS = spoken.toLowerCase().replace(/[.,?!]/g, "").split(/\s+/);

    let m = 0;
    cleanT.forEach((w) => {
      if (cleanS.includes(w)) m++;
    });

    let s = Math.round((m / cleanT.length) * 100);
    if (s > 100) s = 100;

    setScore(s);

    if (s === 100) setFeedback({ msg: "Mükemmel! 🎉" });
    else if (s >= 70) setFeedback({ msg: "Gayet iyi! 👍" });
    else if (s >= 40) setFeedback({ msg: "Fena değil 🤔" });
    else setFeedback({ msg: "Tekrar dene 😕" });
  };

  // --------------------------------------
  // RENDER
  // --------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">

        {/* BACK */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 bg-white rounded-full shadow-sm"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Telaffuz Koçu</h2>
        </div>

        {/* OCR BUTTON */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageSelect}
          accept="image/*"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-slate-100 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-200"
        >
          📸 Fotoğraf Çek / Yükle
        </button>

        {/* TEXT BOX */}
        <div className="bg-white p-6 rounded-3xl shadow border">
          <label className="block text-sm font-bold text-slate-500 mb-2">
            Okunacak Cümle
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-4 border rounded-2xl text-lg h-32 resize-none"
            placeholder="Buraya İngilizce bir cümle yaz..."
          />
        </div>

        {/* SPEAK BUTTONS */}
        <div className="flex gap-2">
          {isSpeaking ? (
            <button
              onClick={handleStopSpeak}
              className="w-full py-3 bg-red-100 text-red-600 rounded-xl font-bold"
            >
              <StopCircle className="w-5 h-5 inline mr-1" />
              Durdur
            </button>
          ) : (
            <button
              onClick={handleSpeak}
              className="w-full py-3 bg-indigo-100 text-indigo-700 rounded-xl font-bold"
            >
              <Volume2 className="w-5 h-5 inline mr-1" />
              Dinle
            </button>
          )}
        </div>

        {/* MIC */}
        <div className="flex flex-col items-center py-6">
          <button
            onClick={toggleMic}
            className={`w-20 h-20 rounded-full text-white shadow-xl ${
              isListening ? "bg-red-500 animate-pulse" : "bg-indigo-600"
            }`}
          >
            {isListening ? (
              <Square className="w-8 h-8 mx-auto" />
            ) : (
              <Mic className="w-10 h-10 mx-auto" />
            )}
          </button>
          <p className="mt-3 text-sm text-slate-600">
            {isListening ? "Dinliyorum..." : "Başlamak için bas"}
          </p>
        </div>

        {/* RESULT */}
        {(spokenText || score !== null) && (
          <div className="bg-white p-6 rounded-3xl shadow border">
            <p className="text-sm text-slate-400 font-bold uppercase mb-1">
              Algılanan:
            </p>
            <p className="text-lg italic mb-4">"{spokenText}"</p>

            {score !== null && (
              <div
                className={`p-4 rounded-xl border-2 ${
                  score >= 70
                    ? "bg-green-50 border-green-200 text-green-800"
                    : score >= 40
                    ? "bg-orange-50 border-orange-200 text-orange-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div className="text-2xl font-bold">%{score}</div>
                <div className="text-sm opacity-80">{feedback?.msg}</div>
              </div>
            )}

            <button
              onClick={() => {
                setSpokenText("");
                setScore(null);
              }}
              className="w-full mt-4 text-slate-500 text-sm font-bold"
            >
              <RefreshCw className="w-4 h-4 inline mr-1" />
              Temizle
            </button>
          </div>
        )}
      </div>

      {/* CROP MODAL */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* TOP BAR */}
          <div className="px-4 py-6 flex justify-between items-center bg-black/70 absolute top-0 w-full z-20">
            <button
              onClick={() => setIsCropModalOpen(false)}
              className="text-white"
            >
              İptal
            </button>
            <h3 className="text-white font-bold text-sm">Kırp</h3>
            <button
              onClick={handleCropConfirm}
              className="text-yellow-400 font-bold"
            >
              Bitti
            </button>
          </div>

          {/* CROP AREA */}
          <div className="flex-1 flex items-center justify-center bg-black">
            <Cropper
              image={imgSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              showGrid={true}
            />
          </div>

          {/* BOTTOM BAR */}
          <div className="bg-zinc-900 px-6 pt-6 pb-10 space-y-6">
            <div className="flex items-center gap-4">
              <ZoomIn className="w-5 h-5 text-zinc-400" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex flex-col items-center text-zinc-300"
              >
                <RotateCw />
                <span className="text-xs mt-1">Döndür</span>
              </button>

              <button
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setCrop({ x: 0, y: 0 });
                }}
                className="flex flex-col items-center text-zinc-300"
              >
                <Clock />
                <span className="text-xs mt-1">Sıfırla</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
