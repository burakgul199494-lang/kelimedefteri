import React, { useState, useEffect, useRef } from "react";
import { Volume2, Square, RotateCw, Quote } from "lucide-react";

export default function WordCard({ wordObj, onSwipeLeft, onSwipeRight }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [playingText, setPlayingText] = useState(null);

  const [touchStartX, setTouchStartX] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false); 
  const isDragging = useRef(false);

  useEffect(() => {
    window.speechSynthesis.cancel();
    setPlayingText(null);
    setIsFlipped(false);
    setIsAnimatingOut(false); 
    setSwipeOffset(0); 
  }, [wordObj]);

  const handleBlur = (e) => {
      if (e && e.currentTarget) e.currentTarget.blur();
  };

  const toggleSpeak = (e, text) => {
    e.stopPropagation();
    handleBlur(e); 

    if (!text) return;

    if (playingText === text) {
      window.speechSynthesis.cancel();
      setPlayingText(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingText(null);
      utterance.onerror = () => setPlayingText(null);
      window.speechSynthesis.speak(utterance);
      setPlayingText(text);
    }
  };

  const handleTouchStart = (e) => {
    if (isAnimatingOut) return; 
    setTouchStartX(e.targetTouches[0].clientX);
    isDragging.current = false;
  };

  const handleTouchMove = (e) => {
    if (touchStartX === null || isAnimatingOut) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStartX;
    setSwipeOffset(diff);

    if (Math.abs(diff) > 10) {
        isDragging.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartX || isAnimatingOut) return;

    const SWIPE_THRESHOLD = 100; 
    const SCREEN_WIDTH = window.innerWidth;

    if (swipeOffset > SWIPE_THRESHOLD && onSwipeRight) {
        setIsAnimatingOut(true);
        setSwipeOffset(SCREEN_WIDTH); 
        
        // 🔥 BEKLEME SÜRESİ YARIYA İNDİRİLDİ (150ms)
        setTimeout(() => {
            onSwipeRight(wordObj);
        }, 150); 
    } 
    else if (swipeOffset < -SWIPE_THRESHOLD && onSwipeLeft) {
        setIsAnimatingOut(true);
        setSwipeOffset(-SCREEN_WIDTH); 
        
        // 🔥 BEKLEME SÜRESİ YARIYA İNDİRİLDİ (150ms)
        setTimeout(() => {
            onSwipeLeft(wordObj);
        }, 150);
    }
    else {
        setSwipeOffset(0);
    }

    setTouchStartX(null);
    setTimeout(() => {
        isDragging.current = false;
    }, 50);
  };

  const handleFlip = () => {
      if (isDragging.current || isAnimatingOut) return; 
      setIsFlipped(!isFlipped);
  };

  const mainDefinition = wordObj.definitions && wordObj.definitions[0];

  return (
    <div 
      onClick={handleFlip} 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
          WebkitTapHighlightColor: 'transparent', 
          outline: 'none',
          transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)`,
          // 🔥 ANİMASYON SÜRESİ HIZLANDIRILDI (0.2s)
          transition: touchStartX !== null ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
          opacity: isAnimatingOut ? 0 : Math.max(0.3, 1 - Math.abs(swipeOffset) / (window.innerWidth / 1.5))
      }}
      className="w-full cursor-pointer font-sans [perspective:1000px] touch-pan-y relative z-10"
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent !important; }
        @media (hover: hover) {
            .audio-btn-hero:hover { background-color: white !important; color: #4f46e5 !important; }
            .audio-btn-light:hover { background-color: #e0e7ff !important; color: #4338ca !important; }
        }
        .card-btn { transition: all 0.2s ease; }
      `}</style>

      <div className="relative w-full transition-all duration-500 ease-in-out [transform-style:preserve-3d]">
        <div 
          className={`
            w-full bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 
            transition-all duration-500 ease-in-out [backface-visibility:hidden]
            ${isFlipped 
                ? "absolute top-0 left-0 opacity-0 pointer-events-none [transform:rotateY(180deg)]" 
                : "relative opacity-100 z-10 [transform:rotateY(0deg)] min-h-[400px]"
            }
          `}
        >
          <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 p-6 flex flex-col items-center justify-center min-h-[160px] text-center shrink-0">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            {wordObj.tags && Array.isArray(wordObj.tags) && wordObj.tags.length > 0 && (
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-20 max-w-[80px]">
                    {wordObj.tags.map((tag, i) => (
                        <span key={i} className="text-[9px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-sm truncate max-w-full">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="relative z-10 w-full flex items-center justify-center gap-4 mt-2"> 
              <div className="flex flex-col items-center">
                  <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-md break-words">
                    {wordObj.word}
                  </h1>
                  {wordObj.phonetic && (
                    <span className="text-indigo-200 font-serif italic text-lg mt-1 tracking-wide">
                        /{wordObj.phonetic.replace(/\//g, '')}/
                    </span>
                  )}
              </div>
              <button
                onClick={(e) => toggleSpeak(e, wordObj.word)}
                className="audio-btn-hero card-btn flex items-center justify-center p-3 bg-white/20 text-white rounded-full backdrop-blur-md active:scale-90 shrink-0 focus:outline-none focus:ring-0 ml-2"
              >
                {playingText === wordObj.word ? <Square className="w-6 h-6 fill-current" /> : <Volume2 className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-6 gap-5 bg-slate-50/50 justify-center">
            {mainDefinition && (
              <div className={`relative p-5 rounded-2xl border bg-white border-indigo-100 shadow-sm`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
                    Definition
                  </span>
                  <button
                    onClick={(e) => toggleSpeak(e, mainDefinition.engExplanation)}
                    className={`audio-btn-light card-btn flex items-center justify-center p-2 rounded-full focus:outline-none focus:ring-0 ${
                      playingText === mainDefinition.engExplanation ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-500'
                    }`}
                  >
                    {playingText === mainDefinition.engExplanation ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-slate-700 font-medium text-lg leading-relaxed">
                  "{mainDefinition.engExplanation || 'No definition.'}"
                </p>
              </div>
            )}

            <div className="relative bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm group/sentence flex items-center gap-4">
               <div className="shrink-0 self-start mt-1">
                <Quote className="w-5 h-5 text-indigo-200 fill-indigo-50"/>
               </div>
               <div className="flex-1">
                 <p className="text-slate-600 italic text-base leading-relaxed font-medium">
                   "{wordObj.sentence}"
                 </p>
               </div>
               <button
                 onClick={(e) => toggleSpeak(e, wordObj.sentence)}
                 className={`audio-btn-light card-btn flex items-center justify-center shrink-0 p-2 rounded-full focus:outline-none focus:ring-0 ${
                   playingText === wordObj.sentence ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-500'
                 }`}
               >
                 {playingText === wordObj.sentence ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
               </button>
            </div>
          </div>

          <div className="py-3 bg-white border-t border-slate-100 flex justify-center items-center text-xs text-slate-400 font-semibold gap-1 mt-auto rounded-b-3xl">
            <RotateCw className="w-3 h-3 animate-spin-slow" />
            <span>Türkçesi için dokun</span>
          </div>
        </div>

        <div 
          className={`
            w-full bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-700
            transition-all duration-500 ease-in-out [backface-visibility:hidden]
            ${isFlipped 
                ? "relative opacity-100 z-10 [transform:rotateY(0deg)] min-h-[400px]" 
                : "absolute top-0 left-0 opacity-0 pointer-events-none [transform:rotateY(-180deg)]"
            }
          `}
        >
          <div className="p-6 bg-slate-800 border-b border-slate-700/50 text-center shrink-0">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2 block">Türkçe Karşılığı</span>
            <div className="w-12 h-1 bg-indigo-500 mx-auto rounded-full"></div>
          </div>

          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center gap-6">
             {mainDefinition && (
               <div>
                  <h3 className="text-3xl font-bold text-white mb-3">
                    {mainDefinition.meaning}
                  </h3>
                  {mainDefinition.trExplanation && (
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto border-t border-slate-700 pt-3">
                      {mainDefinition.trExplanation}
                    </p>
                   )}
               </div>
             )}
          </div>

          <div className="bg-slate-800/50 p-6 backdrop-blur-sm border-t border-slate-700 mt-auto">
            {wordObj.sentence_tr && (
               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative">
                 <div className="absolute -top-2.5 left-4 bg-slate-700 px-2 py-0.5 rounded text-[10px] text-indigo-300 font-bold uppercase">Çeviri</div>
                 <p className="text-slate-300 italic text-sm">"{wordObj.sentence_tr}"</p>
               </div>
            )}
             <div className="mt-4 flex justify-center items-center text-xs text-slate-500 font-semibold gap-1">
                <RotateCw className="w-3 h-3" />
                <span>İngilizceye dön</span>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
