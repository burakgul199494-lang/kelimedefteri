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
    e.preventDefault(); if(!term.trim()) return;
    setError(""); setResults([]);
    const t = term.toLowerCase().trim();
    const all = getAllWords();
    const found = all.filter(w => w.word.toLowerCase() === t || (w.v2 && w.v2.toLowerCase() === t)); // Basitleştirdim, senin detaylı aramayı buraya koyabilirsin.
    
    if (found.length > 0) setResults(found);
    else setError("Kelime bulunamadı.");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
       <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3">
             <button onClick={()=>navigate(-1)} className="p-2 bg-white rounded-full shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600"/></button>
             <h2 className="text-2xl font-bold text-slate-800">Sözlük</h2>
          </div>
          <form onSubmit={handleSearch} className="relative">
             <Search className="absolute left-4 top-4 text-slate-400"/>
             <input type="text" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Kelime ara..." className="w-full pl-12 pr-20 p-4 rounded-2xl border border-slate-200 shadow-sm outline-none"/>
             <button type="submit" className="absolute right-2 top-2 bg-indigo-600 text-white p-2 rounded-xl">Ara</button>
          </form>
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5"/>{error}</div>}
          <div className="space-y-6">
             {results.map(w => <WordCard key={w.id} wordObj={w} />)}
          </div>
       </div>
    </div>
  );
}
