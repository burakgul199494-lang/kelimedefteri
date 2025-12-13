import React, { useState } from 'react';

// Örnek Soru Havuzu (Test amaçlı)
const SAMPLE_QUESTIONS = [
  { id: 1, category: 'A1', english: 'Apple', turkish: 'Elma', options: ['Elma', 'Armut', 'Muz', 'Çilek'] },
  { id: 2, category: 'A1', english: 'Book', turkish: 'Kitap', options: ['Defter', 'Kitap', 'Kalem', 'Silgi'] },
  { id: 3, category: 'A2', english: 'Decision', turkish: 'Karar', options: ['Karar', 'Düşünce', 'Plan', 'Sonuç'] },
];

export default function App() {
  // --- STATE TANIMLARI ---
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');

  // --- OYUNU BAŞLATMA ---
  const startGame = (category) => {
    const filteredQuestions = SAMPLE_QUESTIONS.filter(q => q.category === category);
    
    if (filteredQuestions.length === 0) {
      alert("Bu kategoride soru bulunamadı.");
      return;
    }

    setSelectedCategory(category);
    setCurrentQuestions(filteredQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setGameStarted(true); // Oyun ekranını açar
  };

  // --- CEVAP KONTROL ---
  const handleAnswer = (selectedOption) => {
    const currentQuestion = currentQuestions[currentQuestionIndex];

    if (selectedOption === currentQuestion.turkish) {
      setScore(score + 10);
    }

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      alert(`Oyun Bitti! Puanın: ${score + (selectedOption === currentQuestion.turkish ? 10 : 0)}`);
      setGameStarted(false); // Ana ekrana döner
    }
  };

  // --- MANUEL ÇIKIŞ ---
  const finishGame = () => {
    setGameStarted(false); // Ana ekrana döner
    setScore(0);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden p-6">
        
        {/* GENEL BAŞLIK */}
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
          İngilizce Kelime Oyunu
        </h1>

        {/* --- EKRAN KONTROLÜ --- */}
        {!gameStarted ? (
          // 1. SEÇİM EKRANI
          <div className="space-y-4">
            <h2 className="text-xl text-center text-gray-700 font-semibold mb-4">
              Seviye Seçiniz
            </h2>
            
            <button 
              onClick={() => startGame('A1')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg shadow transition"
            >
              Seviye A1 Başlat
            </button>

            <button 
              onClick={() => startGame('A2')}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded-lg shadow transition"
            >
              Seviye A2 Başlat
            </button>
          </div>

        ) : (
          // 2. OYUN EKRANI
          <div className="space-y-6">
            
            {/* Bilgi Paneli */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
              <span className="text-sm font-bold text-gray-600">Mod: {selectedCategory}</span>
              <span className="text-sm font-bold text-blue-600">Puan: {score}</span>
            </div>

            {/* Soru */}
            <div className="text-center py-10 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-4xl font-extrabold text-gray-800">
                {currentQuestions[currentQuestionIndex]?.english}
              </p>
            </div>

            {/* Şıklar */}
            <div className="grid grid-cols-2 gap-4">
              {currentQuestions[currentQuestionIndex]?.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className="bg-white hover:bg-blue-500 hover:text-white text-gray-700 font-semibold py-3 px-2 border border-gray-300 rounded-lg shadow-sm transition"
                >
                  {option}
                </button>
              ))}
            </div>

            {/* ÇIKIŞ BUTONU */}
            <div className="mt-8 border-t pt-4">
              <button
                onClick={finishGame}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
              >
                Oyunu Bitir ve Ana Ekrana Dön
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
