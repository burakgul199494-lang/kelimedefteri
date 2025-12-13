import React, { useState, useEffect } from 'react';

// Örnek Soru Havuzu (Normalde burası veritabanından gelebilir)
const SAMPLE_QUESTIONS = [
  { id: 1, category: 'A1', english: 'Apple', turkish: 'Elma', options: ['Elma', 'Armut', 'Muz', 'Çilek'] },
  { id: 2, category: 'A1', english: 'Book', turkish: 'Kitap', options: ['Defter', 'Kitap', 'Kalem', 'Silgi'] },
  { id: 3, category: 'A1', english: 'Cat', turkish: 'Kedi', options: ['Köpek', 'Kuş', 'Kedi', 'Balık'] },
  { id: 4, category: 'A2', english: 'Decision', turkish: 'Karar', options: ['Karar', 'Düşünce', 'Plan', 'Sonuç'] },
  { id: 5, category: 'A2', english: 'Environment', turkish: 'Çevre', options: ['Çevre', 'Doğa', 'Şehir', 'Dünya'] },
];

export default function App() {
  // --- STATE TANIMLARI ---
  const [gameStarted, setGameStarted] = useState(false); // Oyun başladı mı?
  const [currentQuestions, setCurrentQuestions] = useState([]); // Seçilen sorular
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Kaçıncı sorudayız
  const [score, setScore] = useState(0); // Puan
  const [selectedCategory, setSelectedCategory] = useState(''); // Hangi kategori seçildi

  // --- OYUNU BAŞLATMA FONKSİYONU ---
  const startGame = (category) => {
    // Seçilen kategoriye göre soruları filtrele (veya hepsini al)
    const filteredQuestions = SAMPLE_QUESTIONS.filter(q => q.category === category);
    
    // Eğer o kategoride soru yoksa uyar
    if (filteredQuestions.length === 0) {
      alert("Bu kategoride henüz soru yok.");
      return;
    }

    setSelectedCategory(category);
    setCurrentQuestions(filteredQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setGameStarted(true); // EKRANI DEĞİŞTİREN KİLİT NOKTA
  };

  // --- CEVAP KONTROL FONKSİYONU ---
  const handleAnswer = (selectedOption) => {
    const currentQuestion = currentQuestions[currentQuestionIndex];

    // Doğru cevap mı?
    if (selectedOption === currentQuestion.turkish) {
      setScore(score + 10);
      // Opsiyonel: Doğru ses efekti vs. buraya eklenebilir
    } else {
      // Opsiyonel: Yanlış ses efekti
    }

    // Sonraki soruya geç
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      // Sorular bittiyse
      alert(`Oyun Bitti! Toplam Puanın: ${score + (selectedOption === currentQuestion.turkish ? 10 : 0)}`);
      setGameStarted(false); // Ana ekrana dön
    }
  };

  // --- OYUNU MANUEL BİTİRME FONKSİYONU ---
  const finishGame = () => {
    // Burada istersen bir onay kutusu (Are you sure?) koyabilirsin.
    setGameStarted(false); // Ana ekrana (Seçim ekranına) atar
    setScore(0);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden p-6">
        
        {/* ÜST BAŞLIK */}
        <h1 className="text-3xl font-bold text-center text-indigo-600 mb-8">
          KEL UĞUR
        </h1>

        {/* --- DURUM KONTROLÜ --- */}
        {!gameStarted ? (
          // 1. DURUM: OYUN BAŞLAMADIYSA (SEÇİM EKRANI)
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl text-center text-gray-700 font-semibold mb-4">
              Bir Kategori Seç
            </h2>
            
            <button 
              onClick={() => startGame('A1')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg shadow transition transform hover:scale-105"
            >
              Seviye A1 Başlat
            </button>

            <button 
              onClick={() => startGame('A2')}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded-lg shadow transition transform hover:scale-105"
            >
              Seviye A2 Başlat
            </button>
            
            <p className="text-center text-xs text-gray-400 mt-4">
              Toplam {SAMPLE_QUESTIONS.length} soru mevcut.
            </p>
          </div>

        ) : (
          // 2. DURUM: OYUN BAŞLADIYSA (SORU EKRANI)
          <div className="space-y-6 animate-fade-in">
            
            {/* Üst Bilgi Paneli */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-sm font-bold text-gray-600">
                Mod: {selectedCategory}
              </span>
              <span className="text-sm font-bold text-indigo-600">
                Puan: {score}
              </span>
            </div>

            {/* Soru Alanı */}
            <div className="text-center py-10 bg-indigo-50 rounded-xl border-2 border-indigo-100">
              <span className="block text-sm text-gray-400 mb-2">İngilizcesi:</span>
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
                  className="bg-white hover:bg-indigo-500 hover:text-white text-gray-700 font-semibold py-3 px-2 border border-gray-300 rounded-lg shadow-sm transition duration-200"
                >
                  {option}
                </button>
              ))}
            </div>

            {/* İlerleme Çubuğu (Opsiyonel Görsel) */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }}
              ></div>
            </div>

            {/* --- BİTİR BUTONU (İsteğin üzerine eklendi) --- */}
            <div className="mt-8 border-t pt-4">
              <button
                onClick={finishGame}
                className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <span>Oyunu Bitir ve Çık</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
