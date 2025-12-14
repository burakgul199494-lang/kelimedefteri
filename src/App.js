import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"; // 🔥 useLocation eklendi
import { DataProvider, useData } from "./context/DataContext";

// SAYFALAR (Importlar aynı)
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dictionary from "./pages/Dictionary";
import Game from "./pages/Game";
import SentenceBuilderGame from "./pages/SentenceBuilderGame";
import Quiz from "./pages/Quiz";
import Quiz2 from "./pages/Quiz2"; // <-- 1. BU SATIRI EKLE (YENİ)
import WritingGame2 from "./pages/WritingGame2";
import WordList from "./pages/WordList";
import AddWord from "./pages/AddWord";
import AdminDashboard from "./pages/AdminDashboard";
import WritingGame from "./pages/WritingGame"; 
import Pronunciation from "./pages/Pronunciation"; 
import GapFillingGame from "./pages/GapFillingGame"; 

// --- SES SUSTURUCU BİLEŞEN (YENİ) ---
const AudioSilencer = () => {
  const location = useLocation();
  useEffect(() => {
    // Sayfa (lokasyon) her değiştiğinde konuşmayı iptal et
    window.speechSynthesis.cancel();
  }, [location]);
  return null;
};

const PrivateRoute = ({ children }) => {
  const { user, loading } = useData();
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold text-indigo-600">Yükleniyor...</div>;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useData();
  if (loading) return <div>Yükleniyor...</div>;
  return (user && isAdmin) ? children : <Navigate to="/" />;
};

export default function App() {
  
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
  }, []);

  return (
    <DataProvider>
      <Router>
        {/* 🔥 Ses Susturucuyu Router içine ekledik */}
        <AudioSilencer /> 
        
        <Routes>
          <Route path="/login" element={<Auth />} />

          {/* Korumalı Rotalar */}
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/dictionary" element={<PrivateRoute><Dictionary /></PrivateRoute>} />
          
          <Route path="/game" element={<PrivateRoute><Game /></PrivateRoute>} />
          <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
            <Route path="/quiz2" element={<PrivateRoute><Quiz2 /></PrivateRoute>} />
          <Route path="/writing" element={<PrivateRoute><WritingGame /></PrivateRoute>} />
          
          <Route path="/pronunciation" element={<PrivateRoute><Pronunciation /></PrivateRoute>} />

            <Route path="/game/sentence-builder" element={<SentenceBuilderGame />} />
            <Route path="/writing2" element={<WritingGame2 />} />
          
          <Route path="/list/:type" element={<PrivateRoute><WordList /></PrivateRoute>} />
          
          <Route path="/add-word" element={<AdminRoute><AddWord /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          <Route path="/gap-filling" element={<PrivateRoute><GapFillingGame /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}
