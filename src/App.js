import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider, useData } from "./context/DataContext";

// SAYFALAR
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dictionary from "./pages/Dictionary";
import SentenceAnalysis from "./pages/SentenceAnalysis";
import Game from "./pages/Game";
import Quiz from "./pages/Quiz";
import WordList from "./pages/WordList";
import AddWord from "./pages/AddWord";
import AdminDashboard from "./pages/AdminDashboard";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useData();
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold text-indigo-600">Yükleniyor...</div>;
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Auth />} />

          {/* Korumalı Rotalar */}
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/dictionary" element={<PrivateRoute><Dictionary /></PrivateRoute>} />
          <Route path="/analysis" element={<PrivateRoute><SentenceAnalysis /></PrivateRoute>} />
          <Route path="/game" element={<PrivateRoute><Game /></PrivateRoute>} />
          <Route path="/quiz" element={<PrivateRoute><Quiz /></PrivateRoute>} />
          
          {/* Liste ve Ekleme Sayfaları */}
          <Route path="/list/:type" element={<PrivateRoute><WordList /></PrivateRoute>} />
          <Route path="/add-word" element={<PrivateRoute><AddWord /></PrivateRoute>} />
          
          {/* Admin */}
          <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}
