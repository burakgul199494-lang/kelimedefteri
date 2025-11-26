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
  Camera,
  Check,
  X,
  RotateCw
} from "lucide-react";

import { extractTextFromImage } from "../services/aiService";

// --- iOS CROP ---
import { Cropper } from "react-cropper";
import "cropperjs/dist/cropper.css";

export default function Pronunciation() {
  const navigate = useNavigate();

  // --- STATE ---
  const [text, setText] = useState(""); // okunacak cümle
  const [spokenText, setSpokenText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- OCR + Crop states ---
  const [imgSrc, setImgSrc] = useState("");
  const [isCropOpen, setIsCropOpen] = useState(false);
  const cropperRef = useRef(null);
  const fileInputRef = useRef(null);

  const recognitionRef = useRef(null);

  // --- Sayfadan çıkınca konuşmayı durdur ---
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // --- SpeechRecognition Kurulumu ---
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setFeedback({ type: "error", msg: "Tarayıcı mikrofonu desteklemiyor." });
      return;
    }

    recognitionRef.current = new SR();
    recognitionRef.current.lang = "en-US";
    recognitionRef.current.interimResults = false;
    recognitionRef.current.continuous = false;

    recognitionRef.current.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setSpokenText(transcript);
      calculateScore(text, transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = () => {
      setFeedback({ type: "error", msg: "Anlaşılamadı." });
      setIsListening(false);
    };

    recognitionRef.current.onend = () => setIsListening(false);
  }, [text]);

  // --- OCR için resim seç ---
  const handleSelectImage = (e) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      setImgSrc(reader.result.toString());
      setIsCropOpen(true);
    };

    reader.readAsDataURL(file);
  };

  // --- OCR CROP ONAY ---
  const handleCropConfirm = async () => {
    try {
      const cropper = cropperRef.current.cropper;

      const croppedCanvas = cropper.getCroppedCanvas({
        width: 1200,
        height: 1200,
        fillColor: "#fff"
      });

      croppedCanvas.toBlob(async (blob) => {
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });

        const rawText = await extractTextFromImage(file);

        if (rawText) setText(rawText);
        else alert("Metin okunamadı.");

        setIsCropOpen(false);
        setImgSrc("");
        fileInputRef.current.value = "";
      });
    } catch (e) {
      console.error(e);
      alert("Kırpma hatası.");
    }
  };

  // --- Sesli Okuma ---
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

  // --- Mikrofon ---
  const toggleMic = () => {
    if (!text) {
      alert("Lütfen cümle yazın veya fotoğraftan alın.");
      return;
    }

    window.speechSynthesis.cancel();

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setSpokenText("");
      setScore(null);
      setFeedback(null);

      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // --- PUANLAMA ---
  const calculateScore = (target, spoken) => {
    const tWords = target.toLowerCase().replace(/[.,?!]/g, "").split(/\s+/);
    const sWords = spoken.toLowerCase().replace(/[.,?!]/g, "").split(/\s+/);

    let match = 0;
    tWords.forEach((w) => {
      if (sWords.includes(w)) match++;
    });

    let sc = Math.round((match / tWords.length) * 100);

    if (sc > 100) sc = 100;

    setScore(sc);

    if (sc === 100) setFeedback({ type: "success", msg: "Mükemmel! 🎉" });
    else if (sc >= 70) setFeedback({ type: "success", msg: "Gayet iyi! 👍" });
    else if (sc >= 40) setFeedback({ type: "warning", msg: "Fena değil 🤔" });
    else setFeedback({ type: "error", msg: "Tekrar dene 😕" });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">

        {/* ÜST BAR */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-200 rounded-full bg-white shadow-sm"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Telaffuz Koçu</h2>
        </div>

        {/* FOTO YÜKLE */}
        <button
          onClick={() => fileInputRef.current.click()}
          className="w-full bg-slate-100 hover:bg-slate-200 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-slate-600"
        >
          <Camera className="w-5 h-5" />
          Fotoğraftan Metin Al
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleSelectImage}
          className="hidden"
        />

        {/* CROP MODAL */}
        {isCropOpen && (
          <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            <div className="flex justify-between items-center text-white px-4 py-4">
              <button onClick={() => setIsCropOpen(false)}>İptal</button>
              <span className="text-sm font-bold">Kırp</span>
              <button onClick={handleCropConfirm} className="text-yellow-300">
                Bitti
              </button>
            </div>

            <div className="flex-1">
              <Cropper
                src={imgSrc}
                ref={cropperRef}
                style={{ height: "100%", width: "100%" }}
                zoomTo={0.5}
                initialAspectRatio={NaN}
                guides={true}
                movable={true}
                scalable={true}
                zoomable={true}
                responsive={true}
                autoCropArea={0.8}
                viewMode={1}
              />
            </div>

            <div className="bg-zinc-900 text-white text-center py-4">
              <button
                onClick={() =>
                  cropperRef.current.cropper.rotate(90)
                }
                className="text-white flex items-center justify-center gap-2 mx-auto"
              >
                <RotateCw /> Döndür
              </button>
            </div>
          </div>
        )}

        {/* CÜMLE GİRİŞ */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-4 border-2 border-indigo-100 rounded-2xl text-lg font-medium text-slate-700 focus:border-indigo-500 h-32 resize-none"
          placeholder="Oku veya fotoğraftan al..."
        />

        {/* OKUMA BUTONU */}
        {isSpeaking ? (
          <button
            onClick={handleStopSpeak}
            className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <StopCircle /> Durdur
          </button>
        ) : (
          <button
            onClick={handleSpeak}
            className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Volume2 /> Dinle
          </button>
        )}

        {/* MİKROFON */}
        <div className="flex flex-col items-center py-6">
          <button
            onClick={toggleMic}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl ${
              isListening ? "bg-red-500 animate-pulse" : "bg-indigo-600"
            }`}
          >
            {isListening ? <Square className="w-8 h-8" /> : <Mic className="w-10 h-10" />}
          </button>

          <p className="mt-4 text-sm text-slate-500">
            {isListening ? "Dinliyorum..." : "Bas ve konuş"}
          </p>
        </div>

        {/* SONUÇ */}
        {(spokenText || score !== null) && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200">
            <div className="text-center mb-4">
              <div className="text-xs text-slate-400 uppercase font-bold">Algılanan Ses</div>
              <p className="text-lg italic text-slate-800">"{spokenText}"</p>
            </div>

            {/* PUAN */}
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
                <div>
                  <div className="font-bold text-2xl">%{score}</div>
                  <div className="text-xs font-bold opacity-70">Doğruluk</div>
                </div>
              </div>
              <div className="text-sm font-bold max-w-[120px] text-right">
                {feedback?.msg}
              </div>
            </div>

            <button
              onClick={() => {
                setSpokenText("");
                setScore(null);
              }}
              className="w-full mt-4 text-sm font-bold text-slate-500 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sonucu Temizle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
