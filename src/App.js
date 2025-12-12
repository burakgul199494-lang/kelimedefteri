import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider, useData } from "./context/DataContext";

// SAYFALAR
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dictionary from "./pages/Dictionary";
// SentenceAnalysis importu KALDIRILDI
import Game from "./pages/Game";
import Quiz from "./pages/Quiz";
import WordList from "./pages/WordList";
import AddWord from "./pages/AddWord";
import AdminDashboard from "./pages/AdminDashboard";
import WritingGame from "./pages/WritingGame"; 
import Pronunciation from "./pages/Pronunciation"; 
import GapFillingGame from "./pages/GapFillingGame"; 

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
        <Routes>
          <Route path="/login" element={<Auth />} />

          {/* Korumalı Rotalar */}
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/dictionary" element={<PrivateRoute><Dictionary /></PrivateRoute>} />
          
          {/* Analysis Rotası KALDIRILDI */}
          
          {/* Oyunlar ve Araçlar */}
          <Route path="/game" element={<PrivateRoute><Game /></PrivateRoute>} />
          <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
          <Route path="/writing" element={<PrivateRoute><WritingGame /></PrivateRoute>} />
          
          <Route path="/pronunciation" element={<PrivateRoute><Pronunciation /></PrivateRoute>} />
          
          {/* Liste Sayfaları */}
          <Route path="/list/:type" element={<PrivateRoute><WordList /></PrivateRoute>} />
          
          {/* SADECE ADMIN */}
          <Route path="/add-word" element={<AdminRoute><AddWord /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          <Route path="/gap-filling" element={<PrivateRoute><GapFillingGame /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}
