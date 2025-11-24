import React, { useState } from "react";
import { useData } from "../context/DataContext";
import WordCard from "../components/WordCard";
import { ArrowLeft, Search, X, AlertCircle, Book } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dictionary() {
  const { getAllWords } = useData();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!term.trim()) return;

    setError("");
    setResults([]);

    const searchTerm = term.toLowerCase().trim();
    const allWords = getAllWords();

    const foundWords = allWords.filter(
      (w) =>
        w.word.toLowerCase() === searchTerm ||
        (w.v2 && w.v2.toLowerCase() === searchTerm) ||
        (w.v3 && w.v3.toLowerCase() === searchTerm) ||
        (w.vIng && w.vIng.toLowerCase() === searchTerm) ||
        (w.plural && w.plural.toLowerCase() === searchTerm) ||
        (w.thirdPerson && w.thirdPerson.toLowerCase() === searchTerm)
    );

    if (foundWords.length > 0) {
      setResults(foundWords);
    } else {
      setError("Kelime bulunamadı. Yazım hatası olabilir veya henüz eklenmemiş.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Sözlük</h2>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-4 text-slate-400" />
          <input
            type="text"
            placeholder="Kelime ara (İngilizce)..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full pl-12 pr-20 p-4 rounded-2xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            autoFocus
          />
          <div className="absolute right-2 top-2 flex gap-1">
            {term && (
              <button
                type="button"
                onClick={() => { setTerm(""); setResults([]); setError(""); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button type="submit" className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors">Ara</button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center text-sm text-slate-500">{results.length} sonuç bulundu:</div>
            {results.map((resultWord) => (
              <div key={resultWord.id} className="flex justify-center">
                <WordCard wordObj={resultWord} />
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !error && (
          <div className="text-center text-slate-400 mt-10">
            <Book className="w-20 h-20 mx-auto mb-4 opacity-20" />
            <p>Aramak istediğin kelimeyi yaz.</p>
          </div>
        )}
      </div>
    </div>
  );
}
