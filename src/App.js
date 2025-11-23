import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider, useData } from "./context/DataContext";

// Sayfalar
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dictionary from "./pages/Dictionary";
import SentenceAnalysis from "./pages/SentenceAnalysis"; // Dosyayı oluşturup içini doldurduğunu varsayıyorum
// Game, Quiz, AddWord sayfalarını da aynı mantıkla oluşturup import etmelisin.

// Korumalı Rota (Login kontrolü)
const PrivateRoute = ({ children }) => {
  const { user, loading } = useData();
  if (loading) return <div className="h-screen flex items-center justify-center">Yükleniyor...</div>;
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Auth />} />
          
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/dictionary" element={<PrivateRoute><Dictionary /></PrivateRoute>} />
          <Route path="/analysis" element={<PrivateRoute><SentenceAnalysis /></PrivateRoute>} />
          {/* Diğer sayfalar için de route ekle: */}
          {/* <Route path="/game" element={<PrivateRoute><Game /></PrivateRoute>} /> */}
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}
