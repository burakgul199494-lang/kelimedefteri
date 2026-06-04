import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { DataProvider, useData } from "./context/DataContext";

// SAYFALAR
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dictionary from "./pages/Dictionary";
import Game from "./pages/Game";
import ExerciseGame from "./pages/ExerciseGame";
import SentenceBuilderGame from "./pages/SentenceBuilderGame";
import Quiz from "./pages/Quiz";
import Quiz2 from "./pages/Quiz2";
import WritingGame2 from "./pages/WritingGame2";
import WordMatchGame from "./pages/WordMatchGame";
import WordList from "./pages/WordList";
import HardWordsGame from "./pages/HardWordsGame";
import WritingGame from "./pages/WritingGame";
import Pronunciation from "./pages/Pronunciation";
import GapFillingGame from "./pages/GapFillingGame";

// YENİ EKLENEN DEFTER SAYFASI (Dinamik Yapı)
import Notebook from "./pages/Notebook";

const AudioSilencer = () => {
  const location = useLocation();
  useEffect(() => {
    window.speechSynthesis.cancel();
  }, [location]);
  return null;
};

const PrivateRoute = ({ children }) => {
  const { user, loading } = useData();
  if (loading) return <div className="h-screen flex items-center justify-center">Yükleniyor...</div>;
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <DataProvider>
      <Router>
        <AudioSilencer />
        <Routes>
          <Route path="/login" element={<Auth />} />
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
          <Route path="/game/word-match" element={<WordMatchGame />} />
          <Route path="/hard-words" element={<HardWordsGame />} />
          <Route path="/exercise" element={<PrivateRoute><ExerciseGame /></PrivateRoute>} />
          <Route path="/gap-filling" element={<PrivateRoute><GapFillingGame /></PrivateRoute>} />
          
          {/* YENİ DEFTER SİSTEMİ ROTALARI (İki farklı amaç, tek bir dosya!) */}
          <Route path="/grammar-notes" element={
            <PrivateRoute>
              <Notebook 
                key="grammar" 
                pageTitle="Gramer Defterim" 
                dbCollection="global_grammar_notes" 
                trackingCollection="grammar_tracking" 
              />
            </PrivateRoute>
          } />

          <Route path="/stories" element={
            <PrivateRoute>
              <Notebook 
                key="stories" 
                pageTitle="Hikayeler Defteri" 
                dbCollection="global_story_notes" 
                trackingCollection="story_tracking" 
              />
            </PrivateRoute>
          } />

          {/* Tanımsız Rotaları Anasayfaya Yönlendir */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}
