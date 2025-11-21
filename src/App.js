import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
// --- GOOGLE AI IMPORT ---
import { GoogleGenerativeAI } from "@google/generative-ai"; 

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import {
  BookOpen,
  Check,
  X,
  RotateCcw,
  Trophy,
  Loader2,
  Brain,
  Home,
  Play,
  Trash2,
  ArrowLeft,
  Plus,
  Edit2,
  Save,
  AlertCircle,
  Volume2,
  LogOut,
  Globe,
  Mail,
  Lock,
  Shield,
  Search,
  HelpCircle,
  Flame,
  Book,
  Target,
  Wand2,      // Kök bulma ikonu
  Microscope, // Analiz ikonu
} from "lucide-react";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyDpdcEZIaCzf4fvnrk9LD0D6WIuXWO30NA",
  authDomain: "burak-a9c07.firebaseapp.com",
  projectId: "burak-a9c07",
  storageBucket: "burak-a9c07.firebasestorage.app",
  messagingSenderId: "922162845642",
  appId: "1:922162845642:web:75b579cbe5f46983996133",
};

// --- API KEY AYARI ---
// BURAYA GÜNCEL ŞİFREYİ YAPIŞTIR
const GEMINI_API_KEY = "AIzaSyC_ykELbAxTKg2rX4jKZnrgCjIq7SIEULs"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "burak-ingilizce-pro";

// --- ADMIN AYARLARI ---
const ADMIN_EMAILS = ["burakgul1994@outlook.com.tr"];

// --- SYSTEM WORDS ---
const WORD_TYPES = [
  { value: "noun", label: "İsim (Noun)" },
  { value: "verb", label: "Fiil (Verb)" },
  { value: "adjective", label: "Sıfat (Adjective)" },
  { value: "adverb", label: "Zarf (Adverb)" },
  { value: "prep", label: "Edat (Prep)" },
  { value: "pronoun", label: "Zamir (Pronoun)" },
  { value: "conj", label: "Bağlaç (Conj)" },
  { value: "article", label: "Tanımlık (Article)" },
  { value: "other", label: "Diğer (Other)" },
];

const WORDS_PER_SESSION = 20;

// --- ORTAK TEMİZLİK FONKSİYONU (JSON PARSER) ---
const cleanAndParseJSON = (text) => {
  try {
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Hatası:", e);
    return null; 
  }
};

// --- 1. AI İLE KELİME ANALİZİ (Türkçe Anlamlı) ---
const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a dictionary app helper. Analyze the English word: "${word}".
      
      IMPORTANT: 
      1. In the "definitions" array, the "meaning" field MUST be the TURKISH translation.
      2. The "engExplanation" field MUST be a simple English explanation.
      
      Return ONLY JSON. No markdown.
      Structure:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "sentence": "Simple A2 level sentence.",
        "definitions": [
          { "type": "noun/verb/etc", "meaning": "TURKISH TRANSLATION", "engExplanation": "Simple English explanation" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return cleanAndParseJSON(response.text());
  } catch (e) {
    console.error("Word Analysis Error:", e);
    return null;
  }
};

// --- 2. KELİME KÖKÜNÜ BULMA (Sihirli Değnek) ---
const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Find the dictionary root form (lemma) of english word: "${word}".
      Return ONLY JSON:
      { "root": "base_form", "original": "${word}", "changed": true/false }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());
    return data || { root: word, changed: false };
  } catch (e) {
    console.error("Root Error:", e);
    return { root: word, changed: false };
  }
};

// --- 3. CÜMLE ANALİZİ (Detaylı Rapor) ---
const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Act as an expert English teacher for Turkish students. Analyze this text: "${text}"
      
      Tasks:
      1. Translate the text to Turkish naturally (Natural translation, not robotic).
      2. Analyze the grammar structure in detail (e.g., explaining tenses used and why). Write this in Turkish.
      3. Extract all words, convert them to their base/root form (lemma), remove duplicates, and remove proper names (like Alice, London).
      
      Return ONLY JSON. No markdown. Structure:
      {
        "turkishTranslation": "Doğal Türkçe çeviri buraya",
        "grammarAnalysis": "Burada geniş zaman kullanılmış çünkü... Şurada şu yapı var...",
        "rootWords": ["sit", "by", "her", "sister", "on", "bank"] 
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return cleanAndParseJSON(response.text());
  } catch (e) {
    console.error("Sentence Analysis Error:", e);
    throw e;
  }
};
export default function App() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
  }, []);

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [knownWordIds, setKnownWordIds] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [deletedWordIds, setDeletedWordIds] = useState([]);
  const [streak, setStreak] = useState(0);

  // Dinamik Sistem Kelimeleri
  const [dynamicSystemWords, setDynamicSystemWords] = useState([]);

  // Game (Flashcard) State
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [sessionStats, setSessionStats] = useState({ known: 0, learning: 0 });

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTransition, setQuizTransition] = useState(false); // Mobil düzeltme
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizIsAnswered, setQuizIsAnswered] = useState(false);

  // Dictionary State
  const [dictSearchTerm, setDictSearchTerm] = useState("");
  const [dictResults, setDictResults] = useState([]); 
  const [dictError, setDictError] = useState("");

  // Cümle Analizi State'leri
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quickAddWord, setQuickAddWord] = useState(null); // Popup kelime ekleme

  const [currentView, setCurrentView] = useState("home");
  const [editingWord, setEditingWord] = useState(null);
  const [returnView, setReturnView] = useState("unknown_list");

  const [searchKnown, setSearchKnown] = useState("");
  const [searchUnknown, setSearchUnknown] = useState("");
  const [searchTrash, setSearchTrash] = useState("");

  // Admin Arama
  const [adminSearch, setAdminSearch] = useState("");

  // --- CÜMLE ANALİZİ FONKSİYONU ---
  const handleAnalyzeSentence = async () => {
    if (!analysisText.trim()) {
        alert("Lütfen analiz edilecek bir cümle yazın.");
        return;
    }
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
        const result = await fetchSentenceAnalysisFromAI(analysisText);
        if (result) {
            setAnalysisResult(result);
        } else {
            alert("Analiz yapılamadı. Lütfen tekrar deneyin.");
        }
    } catch (error) {
        console.error(error);
        alert("Hata oluştu: " + error.message);
    } finally {
        setIsAnalyzing(false);
    }
  };

  // --- AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- DATA FETCH ---
  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchDynamicSystemWords();
    } else {
      setKnownWordIds([]);
      setCustomWords([]);
      setDeletedWordIds([]);
      setDynamicSystemWords([]);
      setStreak(0);
      setCurrentView("home");
    }
  }, [user]);

  // Quiz Temizleyici
  useEffect(() => {
    setQuizSelectedOption(null);
    setQuizIsAnswered(false);
  }, [quizIndex]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setKnownWordIds(data.known_ids || []);
        setCustomWords(data.custom_words || []);
        setDeletedWordIds(data.deleted_ids || []);

        const todayStr = new Date().toISOString().split("T")[0];
        const lastVisit = data.last_visit_date;
        let currentStreak = data.streak || 0;

        if (lastVisit !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (lastVisit === yesterdayStr) {
            currentStreak += 1;
          } else {
            currentStreak = 1;
          }
          await setDoc(userRef, { last_visit_date: todayStr, streak: currentStreak }, { merge: true });
        }
        setStreak(currentStreak);
      } else {
        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(userRef, { last_visit_date: todayStr, streak: 1 }, { merge: true });
        setStreak(1);
      }
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicSystemWords = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "artifacts", appId, "system_words"));
      const words = [];
      querySnapshot.forEach((doc) => {
        words.push({ ...doc.data(), id: doc.id, source: "system" });
      });
      setDynamicSystemWords(words);
    } catch (e) {
      console.error("Sistem kelimeleri çekilemedi:", e);
    }
  };

  // --- ADMIN ACTIONS ---
  const handleSaveSystemWord = async (wordData) => {
    try {
      const newWord = {
        word: wordData.word.trim(),
        plural: wordData.plural || "",
        v2: wordData.v2 || "",
        v3: wordData.v3 || "",
        vIng: wordData.vIng || "",
        thirdPerson: wordData.thirdPerson || "", 
        advLy: wordData.advLy || "",             
        compEr: wordData.compEr || "",            
        superEst: wordData.superEst || "",        
        definitions: wordData.definitions, 
        sentence: wordData.sentence.trim(),
        source: "system",
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "artifacts", appId, "system_words"), newWord);
      setDynamicSystemWords((prev) => [...prev, { ...newWord, id: docRef.id }]);
      return { success: true };
    } catch (e) {
      console.error("Admin kayıt hatası:", e);
      return { success: false, message: e.message };
    }
  };

  const handleUpdateSystemWord = async (id, wordData) => {
    try {
      const updatedData = {
        word: wordData.word.trim(),
        plural: wordData.plural || "",
        v2: wordData.v2 || "",
        v3: wordData.v3 || "",
        vIng: wordData.vIng || "",
        thirdPerson: wordData.thirdPerson || "", 
        advLy: wordData.advLy || "",             
        compEr: wordData.compEr || "",            
        superEst: wordData.superEst || "",        
        definitions: wordData.definitions,
        sentence: wordData.sentence.trim(),
        updatedAt: new Date(),
      };
      const docRef = doc(db, "artifacts", appId, "system_words", id);
      await updateDoc(docRef, updatedData);
      setDynamicSystemWords((prev) => prev.map((w) => (w.id === id ? { ...w, ...updatedData } : w)));
      return { success: true };
    } catch (e) {
      console.error("Güncelleme hatası:", e);
      return { success: false, message: e.message };
    }
  };

  const handleDeleteSystemWord = async (wordId) => {
    const confirm = window.confirm("Bu sistem kelimesini silmek istediğine emin misin?");
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "system_words", wordId));
      setDynamicSystemWords((prev) => prev.filter((w) => w.id !== wordId));
    } catch (e) {
      console.error("Silme hatası:", e);
      alert("Silinirken hata oluştu.");
    }
  };
  // --- HELPER ACTIONS ---
  useEffect(() => {
    if (!user || customWords.length === 0) return;
    const allBaseWords = [...dynamicSystemWords];
    const baseWordsLower = allBaseWords.map((b) => b.word.toLowerCase());
    const duplicates = customWords.filter(
      (cw) =>
        baseWordsLower.includes(cw.word.toLowerCase()) &&
        !deletedWordIds.includes(cw.id)
    );
    if (duplicates.length === 0) return;
    const moveDuplicates = async () => {
      try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const idsToAdd = duplicates.map((w) => w.id);
        await updateDoc(userRef, { deleted_ids: arrayUnion(...idsToAdd) });
        setDeletedWordIds((prev) => [...prev, ...idsToAdd]);
      } catch (e) {
        console.error("Duplicate move error:", e);
      }
    };
    moveDuplicates();
  }, [user, customWords, deletedWordIds, dynamicSystemWords]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const normalizeWord = (w) => {
    const isDynamic = dynamicSystemWords.some((d) => d.id === w.id);
    const source = w.source || (isDynamic ? "system" : "user");
    return {
      ...w,
      source,
      plural: w.plural || "",
      v2: w.v2 || "",
      v3: w.v3 || "",
      vIng: w.vIng || "",
      thirdPerson: w.thirdPerson || "", 
      advLy: w.advLy || "",             
      compEr: w.compEr || "",            
      superEst: w.superEst || "",        
      definitions: Array.isArray(w.definitions)
        ? w.definitions.map(def => ({
            ...def,
            engExplanation: def.engExplanation || "" 
          }))
        : [{ type: "other", meaning: "", engExplanation: "" }],
    };
  };

  const getAllWords = () => {
    const allSystem = [...dynamicSystemWords];
    const filteredSystem = allSystem.filter((w) => !deletedWordIds.includes(w.id));
    const filteredCustom = customWords.filter((w) => !deletedWordIds.includes(w.id));
    return [...filteredSystem, ...filteredCustom].map(normalizeWord);
  };

  const getDeletedWords = () => {
    const allSystem = [...dynamicSystemWords];
    const systemDeleted = allSystem.filter((w) => deletedWordIds.includes(w.id)).map(normalizeWord);
    const customDeleted = customWords.filter((w) => deletedWordIds.includes(w.id)).map(normalizeWord);
    return [...systemDeleted, ...customDeleted].sort((a, b) => a.word.localeCompare(b.word));
  };

  // YENİ: Kelime veritabanında var mı kontrolü (Analiz ekranı için)
  const isWordInRegistry = (wordToCheck) => {
    if (!wordToCheck) return false;
    const lower = wordToCheck.toLowerCase().trim();
    if (dynamicSystemWords.some(sw => sw.word.toLowerCase() === lower)) return true;
    if (customWords.some(cw => cw.word.toLowerCase() === lower && !deletedWordIds.includes(cw.id))) return true;
    return false;
  };

  const canRestoreWord = (word) => {
    const allWords = getAllWords();
    return !allWords.some((w) => w.word.toLowerCase() === word.word.toLowerCase());
  };

  const restoreWord = async (word) => {
    if (!canRestoreWord(word)) {
      alert("Bu kelimenin aktif bir versiyonu zaten var, tekrar yüklenemez.");
      return;
    }
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await updateDoc(userRef, { deleted_ids: arrayRemove(word.id) });
      setDeletedWordIds((prev) => prev.filter((id) => id !== word.id));
    } catch (e) {
      console.error("Restore error:", e);
    }
  };

  const permanentlyDeleteWord = async (word) => {
    if (word.source !== "user") return;
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await updateDoc(userRef, { custom_words: arrayRemove(word), deleted_ids: arrayRemove(word.id) });
      setCustomWords((prev) => prev.filter((w) => w.id !== word.id));
      setDeletedWordIds((prev) => prev.filter((id) => id !== word.id));
    } catch (e) {
      console.error("Permanent delete error:", e);
    }
  };

  // --- DICTIONARY LOGIC ---
  const handleDictionarySearch = (e) => {
    e.preventDefault();
    if (!dictSearchTerm.trim()) return;
    setDictError("");
    setDictResults([]);
    const term = dictSearchTerm.toLowerCase().trim();
    const allWords = getAllWords();
    const foundWords = allWords.filter(
      (w) =>
        w.word.toLowerCase() === term ||
        (w.v2 && w.v2.toLowerCase() === term) ||
        (w.v3 && w.v3.toLowerCase() === term) ||
        (w.vIng && w.vIng.toLowerCase() === term) ||
        (w.plural && w.plural.toLowerCase() === term) ||
        (w.thirdPerson && w.thirdPerson.toLowerCase() === term) || 
        (w.advLy && w.advLy.toLowerCase() === term) ||             
        (w.compEr && w.compEr.toLowerCase() === term) ||            
        (w.superEst && w.superEst.toLowerCase() === term)          
    );
    if (foundWords.length > 0) setDictResults(foundWords);
    else setDictError("Kelime bulunamadı. Yazım hatası olabilir veya henüz eklenmemiş.");
  };

  // --- FLASHCARD GAME LOGIC ---
  const handleStartGame = () => {
    const allWords = getAllWords();
    const unknownWords = allWords.filter((w) => !knownWordIds.includes(w.id));
    if (unknownWords.length === 0) {
      setSessionComplete(true);
      return;
    }
    const shuffled = [...unknownWords].sort(() => 0.5 - Math.random());
    setSessionWords(shuffled.slice(0, WORDS_PER_SESSION));
    setCurrentIndex(0);
    setSessionComplete(false);
    setSessionStats({ known: 0, learning: 0 });
    setSwipeDirection(null);
    setCurrentView("game");
  };

  const handleEndSessionEarly = () => {
    setSessionComplete(true);
  };

  const handleSwipe = async (direction) => {
    if (currentIndex >= sessionWords.length) return;
    const currentWord = sessionWords[currentIndex];
    setSwipeDirection(direction);
    setTimeout(async () => {
      if (direction === "right") {
        try {
          const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
          await setDoc(userRef, { known_ids: arrayUnion(currentWord.id) }, { merge: true });
          setKnownWordIds((prev) => prev.includes(currentWord.id) ? prev : [...prev, currentWord.id]);
          setSessionStats((prev) => ({ ...prev, known: prev.known + 1 }));
        } catch (e) { console.error(e); }
      } else {
        setSessionStats((prev) => ({ ...prev, learning: prev.learning + 1 }));
      }
      if (currentIndex + 1 < sessionWords.length) {
        setCurrentIndex((prev) => prev + 1);
        setSwipeDirection(null);
      } else {
        setSessionComplete(true);
        setSwipeDirection(null);
      }
    }, 300);
  };

  // --- QUIZ LOGIC ---
  const handleStartQuiz = () => {
    const allWords = getAllWords();
    const validWords = allWords.filter((w) => w.definitions && w.definitions.length > 0 && w.definitions[0].meaning.trim() !== "");
    const unknownWords = validWords.filter((w) => !knownWordIds.includes(w.id));

    if (unknownWords.length < 4) {
      alert(`Quiz başlatmak için 'Öğreneceğim Kelimeler' listesinde en az 4 kelime olmalıdır! (Şu an: ${unknownWords.length})`);
      return;
    }

    const pool = unknownWords;
    const questionCount = Math.min(20, pool.length);
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random()).slice(0, questionCount);

    const generatedQuestions = shuffledPool.map((targetWord) => {
      const correctAnswer = targetWord.definitions[0].meaning;
      const distractors = validWords.filter((w) => w.id !== targetWord.id).sort(() => 0.5 - Math.random()).slice(0, 3).map((w) => w.definitions[0].meaning);
      const options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());
      return { wordObj: targetWord, correctAnswer: correctAnswer, options: options };
    });

    setQuizQuestions(generatedQuestions);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizSelectedOption(null);
    setQuizIsAnswered(false);
    setSessionComplete(false);
    setCurrentView("quiz");
  };

  // --- QUIZ ANSWER HANDLER (GEÇİŞ EFEKTİ - KESİN ÇÖZÜM) ---
  const handleQuizAnswer = (selectedOption) => {
    if (quizIsAnswered) return;
    setQuizIsAnswered(true);
    setQuizSelectedOption(selectedOption);
    const currentQuestion = quizQuestions[quizIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    if (isCorrect) setQuizScore((prev) => prev + 5);

    setTimeout(() => {
      setQuizTransition(true); // Ekranı geçici temizle
      setTimeout(() => {
        setQuizSelectedOption(null);
        setQuizIsAnswered(false);
        if (quizIndex + 1 < quizQuestions.length) {
          setQuizIndex((prev) => prev + 1);
        } else {
          setCurrentView("quiz_result");
        }
        setQuizTransition(false); // Ekranı geri getir
      }, 100);
    }, 1000);
  };

  // --- CRUD WORDS ---
  const handleSaveNewWord = async (wordData) => {
    const allWords = getAllWords();
    const normalizedInput = wordData.word.toLowerCase().trim();
    const exists = allWords.find((w) => w.word.toLowerCase() === normalizedInput);
    if (exists) return { success: false, message: "Bu kelime zaten listenizde mevcut!" };

    const newWord = {
      id: Date.now(),
      word: wordData.word.trim(),
      plural: wordData.plural || "",
      v2: wordData.v2 || "",
      v3: wordData.v3 || "",
      vIng: wordData.vIng || "",
      thirdPerson: wordData.thirdPerson || "", 
      advLy: wordData.advLy || "",             
      compEr: wordData.compEr || "",            
      superEst: wordData.superEst || "",        
      definitions: wordData.definitions,
      sentence: wordData.sentence.trim(),
      source: "user",
    };
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await setDoc(userRef, { custom_words: arrayUnion(newWord) }, { merge: true });
      setCustomWords((prev) => [...prev, newWord]);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: "Kaydetme hatası oluştu." };
    }
  };

  const handleDeleteWord = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await setDoc(userRef, { deleted_ids: arrayUnion(wordId), known_ids: arrayRemove(wordId) }, { merge: true });
      setDeletedWordIds((prev) => prev.includes(wordId) ? prev : [...prev, wordId]);
      setKnownWordIds((prev) => prev.filter((id) => id !== wordId));
    } catch (e) {
      console.error("Silme hatası:", e);
    }
  };

  const handleUpdateWord = async (originalId, newData) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      const isCustom = customWords.find((w) => w.id === originalId);
      const isKnown = knownWordIds.includes(originalId);

      if (isCustom) {
        const updatedWord = {
          ...isCustom, ...newData,
          plural: newData.plural || "", v2: newData.v2 || "", v3: newData.v3 || "",
          vIng: newData.vIng || "", thirdPerson: newData.thirdPerson || "",
          advLy: newData.advLy || "", compEr: newData.compEr || "", superEst: newData.superEst || "",
          source: isCustom.source || "user",
        };
        await updateDoc(userRef, { custom_words: arrayRemove(isCustom) });
        await updateDoc(userRef, { custom_words: arrayUnion(updatedWord) });
        setCustomWords((prev) => prev.map((w) => (w.id === originalId ? updatedWord : w)));
      } else {
        await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
        const newCustomWord = {
          id: Date.now(), word: newData.word,
          plural: newData.plural || "", v2: newData.v2 || "", v3: newData.v3 || "",
          vIng: newData.vIng || "", thirdPerson: newData.thirdPerson || "",
          advLy: newData.advLy || "", compEr: newData.compEr || "", superEst: newData.superEst || "",
          definitions: newData.definitions, sentence: newData.sentence, source: "user",
        };
        await setDoc(userRef, { custom_words: arrayUnion(newCustomWord) }, { merge: true });
        setDeletedWordIds((prev) => [...prev, originalId]);
        setCustomWords((prev) => [...prev, newCustomWord]);
        if (isKnown) {
          await updateDoc(userRef, { known_ids: arrayRemove(originalId) });
          await updateDoc(userRef, { known_ids: arrayUnion(newCustomWord.id) });
          setKnownWordIds((prev) => prev.filter((id) => id !== originalId).concat(newCustomWord.id));
        }
      }
      setEditingWord(null);
    } catch (e) {
      console.error("Update Error", e);
    }
  };

  const handleRemoveFromKnown = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await updateDoc(userRef, { known_ids: arrayRemove(wordId) });
      setKnownWordIds((prev) => prev.filter((id) => id !== wordId));
    } catch (e) { console.error(e); }
  };

  const handleGoHome = () => {
    setCurrentView("home");
    setSessionComplete(false);
    setEditingWord(null);
    setDictSearchTerm("");
    setDictResults([]);
    setDictError("");
    setQuizQuestions([]);
    setAnalysisResult(null);
    setAnalysisText("");
  };

  const resetProfileToDefaults = async () => {
    const confirm1 = window.confirm("Profilini sıfırlamak istediğine emin misin? Tüm ilerlemen silinecek.");
    if (!confirm1) return;
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      const todayStr = new Date().toISOString().split("T")[0];
      await setDoc(userRef, { known_ids: [], custom_words: [], deleted_ids: [], streak: 1, last_visit_date: todayStr });
      setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); setStreak(1);
      alert("Profil başarıyla sıfırlandı!");
      handleGoHome();
    } catch (e) { console.error("Reset error:", e); }
  };

  const getShortTypeLabel = (typeKey) => {
    const map = { noun: "n.", verb: "v.", adjective: "adj.", adverb: "adv.", prep: "prep.", pronoun: "pron.", conj: "conj.", article: "art.", other: "other" };
    return map[typeKey] || "";
  };

  const renderSourceBadge = (source) => {
    const isSystem = source === "system";
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isSystem ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
        {isSystem ? "Sistem" : "Kullanıcı"}
      </span>
    );
  };
// --- CARD COMPONENT ---
  const WordCard = ({ wordObj }) => {
    return (
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 text-center border border-slate-100">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Kelime</span>
          {renderSourceBadge(wordObj.source)}
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <h2 className="text-4xl font-extrabold text-slate-800 break-words">{wordObj.word}</h2>
          <button onClick={() => speak(wordObj.word)} className="p-3 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors" title="Kelimeyi Oku">
            <Volume2 className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4 text-left">
          {wordObj.definitions.map((def, idx) => (
            <div key={idx} className={`p-3 rounded-xl border ${idx === 0 ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100"}`}>
              <div className="flex items-center gap-2 mb-1">
                 <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${idx === 0 ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                   {getShortTypeLabel(def.type)}
                 </span>
                 <span className={`font-bold text-lg ${idx===0 ? 'text-indigo-900' : 'text-slate-700'}`}>
                   {def.meaning}
                 </span>
              </div>
              {def.engExplanation && (
                  <div className="mt-1 pl-2 border-l-2 border-indigo-200/50">
                      <p className={`text-sm italic font-medium ${idx === 0 ? 'text-indigo-500' : 'text-slate-500'}`}>"{def.engExplanation}"</p>
                  </div>
              )}
            </div>
          ))}
          {(wordObj.plural || wordObj.v2 || wordObj.v3 || wordObj.vIng || wordObj.thirdPerson) && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left space-y-1.5 mt-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-1">Fiil & İsim Çekimleri</div>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                  {wordObj.plural && <div><span className="font-semibold text-slate-900">Plural:</span> {wordObj.plural}</div>}
                  {wordObj.thirdPerson && <div><span className="font-semibold text-slate-900">3rd P:</span> {wordObj.thirdPerson}</div>}
                  {wordObj.v2 && <div><span className="font-semibold text-slate-900">V2:</span> {wordObj.v2}</div>}
                  {wordObj.v3 && <div><span className="font-semibold text-slate-900">V3:</span> {wordObj.v3}</div>}
                  {wordObj.vIng && <div><span className="font-semibold text-slate-900">V-ing:</span> {wordObj.vIng}</div>}
              </div>
            </div>
          )}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Örnek Cümle</div>
                <button onClick={(e) => speak(wordObj.sentence, e)} className="p-1.5 bg-white text-indigo-500 rounded-full hover:bg-indigo-100 border border-slate-200 transition-colors">
                    <Volume2 className="w-4 h-4" />
                </button>
            </div>
            <div className="text-base text-slate-600 italic space-y-1">
              {wordObj.sentence.split("\n").map((line, idx) => (<p key={idx}>"{line}"</p>))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- AUTH SCREEN ---
  const AuthScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loadingAuth, setLoadingAuth] = useState(false);

    const handleAuth = async (e) => {
      e.preventDefault(); setError(""); setLoadingAuth(true);
      try {
        if (isLogin) await signInWithEmailAndPassword(auth, email, password);
        else await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) { setError(err.message); } finally { setLoadingAuth(false); }
    };

    const handleGoogle = async () => {
      setError(""); setLoadingAuth(true);
      try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { setError(err.message); setLoadingAuth(false); }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg">
              <Brain className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Kelime Atölye'sine Hoşgeldiniz</h1>
            <p className="text-slate-500">Kelimelerini kaybetme.</p>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">{error}</div>}
          <button onClick={handleGoogle} className="w-full bg-white border border-slate-200 font-bold py-3 rounded-xl mb-4 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
            <Globe className="w-5 h-5 text-blue-500" /> Google ile Gir
          </button>
          <div className="flex items-center gap-4 mb-4"><div className="h-px bg-slate-200 flex-1"></div><span className="text-slate-400 text-xs uppercase font-bold">veya</span><div className="h-px bg-slate-200 flex-1"></div></div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input type="email" placeholder="E-posta" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input type="password" placeholder="Şifre" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button disabled={loadingAuth} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">
              {loadingAuth ? <Loader2 className="animate-spin mx-auto" /> : isLogin ? "Giriş Yap" : "Kayıt Ol"}
            </button>
          </form>
          <p className="text-center mt-6 text-sm text-slate-500 cursor-pointer hover:text-indigo-600" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Hesap oluştur" : "Giriş yap"}
          </p>
        </div>
      </div>
    );
  };

  if (authLoading) return <div className="flex items-center justify-center h-screen bg-slate-100"><Loader2 className="w-10 h-10 animate-spin" /></div>;
  if (!user) return <AuthScreen />;
  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-100"><Loader2 className="w-10 h-10 animate-spin" /></div>;

  // --- QUICK ADD MODAL (Hızlı Ekleme) ---
  const QuickAddModal = () => {
    const initialData = {
        word: quickAddWord || "", plural: "", v2: "", v3: "", vIng: "", thirdPerson: "", advLy: "", compEr: "", superEst: "",
        definitions: [{ type: "noun", meaning: "", engExplanation: "" }], sentence: "", source: isAdmin ? "system" : "user"
    };
    const [formData, setFormData] = useState(initialData);
    const [loadingAI, setLoadingAI] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { if(quickAddWord) handleAIFill(); }, []); 

    const handleAIFill = async () => {
        setLoadingAI(true);
        try {
            const data = await fetchWordAnalysisFromAI(formData.word);
            if(data) {
                setFormData(prev => ({...prev, ...data, definitions: data.definitions.map(d => ({...d, engExplanation: d.engExplanation || ""})) }));
            }
        } catch(e) { console.error(e); }
        setLoadingAI(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if(!formData.word || !formData.sentence) { alert("Eksik alanları doldurun."); return; }
        setSaving(true);
        if(isAdmin) await handleSaveSystemWord(formData);
        else await handleSaveNewWord(formData);
        setSaving(false);
        setQuickAddWord(null); 
    };

    const updateDef = (i, f, v) => {
        const n = [...formData.definitions]; n[i] = {...n[i], [f]: v}; setFormData({...formData, definitions: n});
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Hızlı Kelime Ekle</h3>
                    <button onClick={() => setQuickAddWord(null)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
                </div>
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input value={formData.word} onChange={e=>setFormData({...formData, word: e.target.value})} className="flex-1 p-3 border rounded-xl font-bold" />
                        <button onClick={handleAIFill} disabled={loadingAI} className="bg-purple-600 text-white px-3 rounded-xl">
                            {loadingAI ? <Loader2 className="animate-spin"/> : <Brain/>}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {formData.definitions.map((def, i) => (
                            <div key={i} className="p-2 bg-slate-50 border rounded-lg">
                                <input placeholder="Türkçe Anlam" value={def.meaning} onChange={e=>updateDef(i, 'meaning', e.target.value)} className="w-full p-2 border rounded mb-1 text-sm"/>
                                <input placeholder="İngilizce Açıklama" value={def.engExplanation} onChange={e=>updateDef(i, 'engExplanation', e.target.value)} className="w-full p-2 border rounded text-xs"/>
                            </div>
                        ))}
                        <button onClick={()=>setFormData(p=>({...p, definitions:[...p.definitions, {type:"noun", meaning:"", engExplanation:""}]}))} className="text-xs text-indigo-600 font-bold">+ Anlam Ekle</button>
                    </div>
                    <textarea value={formData.sentence} onChange={e=>setFormData({...formData, sentence:e.target.value})} className="w-full p-3 border rounded-xl text-sm" placeholder="Örnek cümle..." rows={2}></textarea>
                    <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center gap-2">
                        {saving ? <Loader2 className="animate-spin"/> : <Save className="w-5 h-5"/>} Kaydet ve Kapat
                    </button>
                </div>
            </div>
        </div>
    );
  };

  // --- ADMIN DASHBOARD ---
  if (currentView === "admin_dashboard" && isAdmin) {
    const filteredSystemWords = dynamicSystemWords.filter((w) => w.word.toLowerCase().includes(adminSearch.toLowerCase())).sort((a, b) => a.word.localeCompare(b.word));
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={handleGoHome} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Shield className="w-6 h-6 text-slate-800" /> Yönetici Paneli</h2>
          </div>
          <button onClick={() => { setEditingWord(null); setCurrentView("add_system_word"); }} className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-colors shadow-lg flex items-center justify-center gap-2 mb-6">
            <Plus className="w-5 h-5" /> Yeni Sistem Kelimesi Ekle
          </button>
          <div>
            <h3 className="font-bold text-slate-700 mb-3">Sistem Kelimeleri ({filteredSystemWords.length})</h3>
            <input type="text" placeholder="Ara..." value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl outline-none" />
            <div className="space-y-2">
                {filteredSystemWords.map((item) => (
                  <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                    <div><div className="font-bold text-slate-800">{item.word}</div><div className="text-xs text-slate-500">{item.definitions[0]?.meaning}</div></div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingWord(item); setCurrentView("add_system_word"); }} className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteSystemWord(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN: ADD / EDIT SYSTEM WORD ---
  if (currentView === "add_system_word" && isAdmin) {
    const isEditMode = !!editingWord;
    const initialData = isEditMode ? { ...editingWord, definitions: editingWord.definitions.map(d => ({...d, engExplanation: d.engExplanation || ""})) } : { word: "", plural: "", v2: "", v3: "", vIng: "", thirdPerson: "", advLy: "", compEr: "", superEst: "", definitions: [{ type: "noun", meaning: "", engExplanation: "" }], sentence: "" };

    const FormComponent = () => {
      const [formData, setFormData] = useState(initialData);
      const [saving, setSaving] = useState(false);
      const [aiLoading, setAiLoading] = useState(false);
      const [rootLoading, setRootLoading] = useState(false);

      const handleConvertToRoot = async () => {
          if (!formData.word) return;
          setRootLoading(true);
          try {
              const result = await fetchRootFromAI(formData.word);
              if (result.changed) setFormData(prev => ({ ...prev, word: result.root }));
          } catch (e) { console.error(e); } finally { setRootLoading(false); }
      };

      const handleAIFill = async () => {
        if (!formData.word) return;
        setAiLoading(true);
        try {
            const data = await fetchWordAnalysisFromAI(formData.word);
            if(data) setFormData((prev) => ({ ...prev, ...data, definitions: data.definitions.map(def => ({...def, engExplanation: def.engExplanation || ""})) }));
        } catch (err) { alert("AI Hatası: " + err.message); } finally { setAiLoading(false); }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        if (isEditMode) await handleUpdateSystemWord(editingWord.id, formData);
        else await handleSaveSystemWord(formData);
        setSaving(false);
        setEditingWord(null); setCurrentView("admin_dashboard");
      };

      const addDefinition = () => setFormData((p) => ({ ...p, definitions: [...p.definitions, { type: "noun", meaning: "", engExplanation: "" }] }));
      const updateDefinition = (i, f, v) => { const n = [...formData.definitions]; n[i] = { ...n[i], [f]: v }; setFormData((p) => ({ ...p, definitions: n })); };

      return (
        <div className="min-h-screen bg-slate-800 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 my-8 overflow-y-auto max-h-screen">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">{isEditMode ? "Kelime Düzenle" : "Sistem Kelimesi Ekle"}</h2>
              <button onClick={() => { setEditingWord(null); setCurrentView("admin_dashboard"); }} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                  <input type="text" value={formData.word} onChange={(e) => setFormData({ ...formData, word: e.target.value })} className="flex-1 p-3 border rounded-xl" placeholder="Kelime" />
                  <button type="button" onClick={handleConvertToRoot} disabled={rootLoading || !formData.word} className="bg-orange-100 text-orange-600 p-3 rounded-xl">
                      {rootLoading ? <Loader2 className="animate-spin"/> : <Wand2/>}
                  </button>
                  <button type="button" onClick={handleAIFill} disabled={aiLoading || !formData.word} className="bg-purple-600 text-white px-3 rounded-xl">
                      {aiLoading ? <Loader2 className="animate-spin"/> : <Brain/>}
                  </button>
              </div>
              {/* (Detay alanları kısaltıldı, önceki kodun aynısı) */}
              <div className="space-y-2">
                  {formData.definitions.map((def, i) => (
                      <div key={i} className="p-2 bg-slate-50 border rounded-lg">
                          <input value={def.meaning} onChange={e=>updateDefinition(i, 'meaning', e.target.value)} className="w-full p-2 border rounded mb-1" placeholder="Anlam"/>
                          <input value={def.engExplanation} onChange={e=>updateDefinition(i, 'engExplanation', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Açıklama"/>
                      </div>
                  ))}
                  <button type="button" onClick={addDefinition} className="text-indigo-600 text-sm font-bold">+ Anlam Ekle</button>
              </div>
              <textarea value={formData.sentence} onChange={e=>setFormData({...formData, sentence:e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Cümle" />
              <button type="submit" disabled={saving} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl">{saving ? <Loader2 className="animate-spin mx-auto"/> : "Kaydet"}</button>
            </form>
          </div>
        </div>
      );
    };
    return <FormComponent />;
  }
      // --- ADD / EDIT FORM (USER) ---
  if (currentView === "add_word" || currentView === "edit_word") {
    const isEditMode = currentView === "edit_word";
    const initialData = isEditMode && editingWord ? { ...editingWord, definitions: editingWord.definitions.map(d => ({...d, engExplanation: d.engExplanation || ""})) } : { word: "", plural: "", v2: "", v3: "", vIng: "", thirdPerson: "", advLy: "", compEr: "", superEst: "", definitions: [{ type: "noun", meaning: "", engExplanation: "" }], sentence: "" };

    const FormComponent = () => {
      const [formData, setFormData] = useState(initialData);
      const [saving, setSaving] = useState(false);
      const [aiLoading, setAiLoading] = useState(false);
      const [rootLoading, setRootLoading] = useState(false);

      const handleConvertToRoot = async () => {
          if (!formData.word) return;
          setRootLoading(true);
          try {
              const result = await fetchRootFromAI(formData.word);
              if (result.changed) setFormData(prev => ({ ...prev, word: result.root }));
          } catch (e) { console.error(e); } finally { setRootLoading(false); }
      };

      const handleAIFill = async () => {
        if (!formData.word) return;
        setAiLoading(true);
        try {
            const data = await fetchWordAnalysisFromAI(formData.word);
            if(data) setFormData((prev) => ({ ...prev, ...data, definitions: data.definitions.map(def => ({...def, engExplanation: def.engExplanation || ""})) }));
        } catch (err) { alert("AI Hatası: " + err.message); } finally { setAiLoading(false); }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.word || !formData.sentence) return;
        setSaving(true);
        if (isEditMode) { await handleUpdateWord(editingWord.id, formData); setCurrentView(returnView); }
        else { await handleSaveNewWord(formData); alert("Eklendi!"); setFormData({ word: "", plural: "", v2: "", v3: "", vIng: "", thirdPerson: "", advLy: "", compEr: "", superEst: "", definitions: [{ type: "noun", meaning: "", engExplanation: "" }], sentence: "" }); }
        setSaving(false);
      };

      const addDefinition = () => setFormData((p) => ({ ...p, definitions: [...p.definitions, { type: "noun", meaning: "", engExplanation: "" }] }));
      const updateDefinition = (i, f, v) => { const n = [...formData.definitions]; n[i] = { ...n[i], [f]: v }; setFormData((p) => ({ ...p, definitions: n })); };
      const removeDefinition = (i) => { if(formData.definitions.length > 1) setFormData(p => ({...p, definitions: p.definitions.filter((_, idx) => idx !== i)})); };

      return (
        <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 my-8 overflow-y-auto max-h-screen">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">{isEditMode ? "Kelimeyi Düzenle" : "Yeni Kelime Ekle"}</h2>
              <button onClick={() => isEditMode ? setCurrentView(returnView) : handleGoHome()} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                  <input value={formData.word} onChange={(e) => setFormData({ ...formData, word: e.target.value })} className="flex-1 p-3 border rounded-xl" placeholder="Kelime" autoFocus />
                  <button type="button" onClick={handleConvertToRoot} disabled={rootLoading} className="bg-orange-100 text-orange-600 p-3 rounded-xl">{rootLoading ? <Loader2 className="animate-spin"/> : <Wand2/>}</button>
                  <button type="button" onClick={handleAIFill} disabled={aiLoading} className="bg-purple-600 text-white px-3 rounded-xl">{aiLoading ? <Loader2 className="animate-spin"/> : <Brain/>}</button>
              </div>
              <div className="space-y-2">
                  {formData.definitions.map((def, i) => (
                      <div key={i} className="p-2 bg-slate-50 border rounded-lg">
                          <input value={def.meaning} onChange={e=>updateDefinition(i, 'meaning', e.target.value)} className="w-full p-2 border rounded mb-1" placeholder="Anlam"/>
                          <button type="button" onClick={()=>removeDefinition(i)} className="text-xs text-red-500">Sil</button>
                      </div>
                  ))}
                  <button type="button" onClick={addDefinition} className="text-indigo-600 text-sm font-bold">+ Anlam</button>
              </div>
              <textarea value={formData.sentence} onChange={e=>setFormData({...formData, sentence:e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Cümle"/>
              <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">{saving ? <Loader2 className="animate-spin mx-auto"/> : "Kaydet"}</button>
            </form>
          </div>
        </div>
      );
    };
    return <FormComponent />;
  }

  // --- SENTENCE ANALYSIS VIEW (GÜNCELLENMİŞ - MODAL VE RENK) ---
  if (currentView === "sentence_analysis") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center relative">
        {quickAddWord !== null && <QuickAddModal />}
        <div className="w-full max-w-lg space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { handleGoHome(); setAnalysisResult(null); setAnalysisText(""); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
            <h2 className="text-2xl font-bold text-slate-800">Cümle Analizi</h2>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <textarea value={analysisText} onChange={(e) => setAnalysisText(e.target.value)} className="w-full p-3 border-0 outline-none resize-none text-slate-700 min-h-[100px]" placeholder="Cümle yaz..." />
            <div className="flex justify-end mt-2"><button onClick={handleAnalyzeSentence} disabled={isAnalyzing} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">{isAnalyzing ? <Loader2 className="animate-spin"/> : <Microscope/>} Analiz Et</button></div>
          </div>
          {analysisResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                <h3 className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2"><Globe className="w-4 h-4" /> Türkçe Çeviri</h3>
                <p className="text-lg text-slate-800 font-medium leading-relaxed">{analysisResult.turkishTranslation}</p>
              </div>
              <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100 shadow-sm">
                <h3 className="text-xs font-bold text-teal-500 uppercase mb-2 flex items-center gap-2"><Brain className="w-4 h-4" /> Gramer Yapısı</h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{analysisResult.grammarAnalysis}</p>
              </div>
              {analysisResult.rootWords?.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Kelime Kökleri (Eksikleri Ekle)</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.rootWords.map((word, idx) => {
                        const exists = isWordInRegistry(word);
                        return (
                            <button key={idx} onClick={() => { if (!exists) setQuickAddWord(word); }} disabled={exists} className={`px-3 py-1.5 rounded-lg font-bold text-sm border transition-all ${exists ? "bg-green-50 text-green-700 border-green-200 cursor-default" : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 cursor-pointer shadow-sm"}`}>
                                {word} {!exists && <Plus className="w-3 h-3 inline ml-1"/>}
                            </button>
                        )
                    })}
                  </div>
                </div>
              )}
              <div className="pt-2">
                <button onClick={() => setQuickAddWord("")} className="w-full bg-white hover:bg-slate-50 text-slate-700 border-2 border-dashed border-slate-300 font-bold py-4 px-6 rounded-xl flex items-center justify-between group">
                  <div className="flex items-center gap-3"><div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Plus className="w-6 h-6" /></div><div className="text-left"><div className="text-base">Manuel Kelime Ekle</div></div></div><Plus className="w-5 h-5 opacity-40" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- LIST & DICTIONARY & OTHER VIEWS ---
  if (currentView === "known_list" || currentView === "unknown_list" || currentView === "trash") {
    const isKnown = currentView === "known_list"; const isTrash = currentView === "trash";
    const allWords = isTrash ? getDeletedWords() : getAllWords();
    let filteredWords = allWords.filter(w => w.word.toLowerCase().includes((isKnown ? searchKnown : isTrash ? searchTrash : searchUnknown).toLowerCase()));
    if(!isTrash) filteredWords = filteredWords.filter(w => isKnown ? knownWordIds.includes(w.id) : !knownWordIds.includes(w.id));
    
    return (
      <div className="min-h-screen bg-slate-50 p-4"><div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4 sticky top-0 bg-slate-50 py-2 z-10">
            <button onClick={handleGoHome} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600"/></button>
            <h2 className="text-xl font-bold text-slate-800">{isKnown ? "Öğrendiklerim" : isTrash ? "Çöp" : "Öğreneceklerim"} ({filteredWords.length})</h2>
          </div>
          <input className="w-full p-3 mb-4 bg-white border rounded-xl" placeholder="Ara..." onChange={e => isKnown ? setSearchKnown(e.target.value) : isTrash ? setSearchTrash(e.target.value) : setSearchUnknown(e.target.value)}/>
          <div className="space-y-3">
              {filteredWords.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-2">
                      <div className="flex justify-between">
                          <div>
                              <div className="flex items-center gap-2"><span className="font-bold text-lg">{item.word}</span><button onClick={()=>speak(item.word)}><Volume2 className="w-4 h-4 text-indigo-500"/></button></div>
                              <div className="text-sm text-slate-600">{item.definitions[0]?.meaning}</div>
                          </div>
                          <div className="flex gap-1">
                              {isTrash ? <button onClick={()=>restoreWord(item)} className="text-green-600 bg-green-100 px-2 rounded text-xs">Geri Al</button> : <>
                                {item.source === "user" && <button onClick={()=>{setEditingWord(item); setCurrentView("edit_word");}} className="p-2 text-blue-500"><Edit2 className="w-4 h-4"/></button>}
                                {isKnown && <button onClick={()=>handleRemoveFromKnown(item.id)} className="p-2 text-amber-500"><RotateCcw className="w-4 h-4"/></button>}
                                {item.source === "user" && <button onClick={()=>handleDeleteWord(item.id)} className="p-2 text-red-500"><X className="w-4 h-4"/></button>}
                              </>}
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div></div>
    );
  }

  if (currentView === "dictionary") {
    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center"><div className="w-full max-w-md space-y-6">
            <div className="flex items-center gap-3"><button onClick={handleGoHome} className="p-2 bg-white rounded-full"><ArrowLeft className="w-6 h-6"/></button><h2 className="text-2xl font-bold">Sözlük</h2></div>
            <form onSubmit={handleDictionarySearch} className="relative"><input className="w-full pl-4 p-4 rounded-xl border" placeholder="Ara..." value={dictSearchTerm} onChange={e=>setDictSearchTerm(e.target.value)} /><button className="absolute right-2 top-2 bg-indigo-600 text-white p-2 rounded-lg">Ara</button></form>
            {dictResults.map(res => <div key={res.id} className="flex justify-center"><WordCard wordObj={res}/></div>)}
        </div></div>
    )
  }

  // --- QUIZ VIEW (MOBİL DÜZELTİLMİŞ) ---
  if (currentView === "quiz") {
      if (quizTransition) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600"/></div>;
      const q = quizQuestions[quizIndex];
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4"><div className="w-full max-w-md space-y-6 mt-4">
            <div className="flex justify-between items-center"><button onClick={handleGoHome}><X className="w-6 h-6 text-slate-400"/></button><div className="font-bold text-indigo-600">Soru {quizIndex+1}/{quizQuestions.length}</div><div className="bg-amber-100 text-amber-600 px-2 py-1 rounded font-bold">{quizScore}</div></div>
            <div className="bg-white p-8 rounded-3xl shadow-lg text-center"><h2 className="text-4xl font-extrabold">{q.wordObj.word}</h2></div>
            <div className="space-y-3">
                {q.options.map((opt, i) => (
                    <button key={idx} onClick={()=>handleQuizAnswer(opt)} disabled={quizIsAnswered} className={`w-full p-4 rounded-xl border-2 font-bold ${quizIsAnswered ? (opt===q.correctAnswer ? "bg-green-100 border-green-500" : opt===quizSelectedOption ? "bg-red-100 border-red-500" : "bg-white opacity-50") : "bg-white hover:bg-indigo-50"}`}>{opt}</button>
                ))}
            </div>
        </div></div>
      )
  }

  if (currentView === "quiz_result") return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-6"><Trophy className="w-16 h-16 mx-auto text-yellow-500"/><h2 className="text-3xl font-bold">Bitti! Puan: {quizScore}</h2><button onClick={handleGoHome} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Tamam</button></div></div>;

  if (sessionComplete) return <div className="min-h-screen flex items-center justify-center text-center"><div className="bg-white p-8 rounded-xl shadow-xl space-y-4"><h2 className="text-2xl font-bold">Oturum Bitti!</h2><button onClick={handleStartGame} className="w-full bg-blue-600 text-white py-3 rounded-xl">Tekrar</button><button onClick={handleGoHome} className="w-full border py-3 rounded-xl">Çıkış</button></div></div>;

  if (currentView === "game") {
    const card = sessionWords[currentIndex];
    return (
      <div className="flex flex-col min-h-screen bg-slate-100 overflow-hidden"><div className="bg-white shadow p-4 z-10"><div className="max-w-md mx-auto flex justify-between"><button onClick={handleGoHome}><X/></button><span>{currentIndex+1}/{sessionWords.length}</span></div></div>
        <div className="flex-1 flex items-center justify-center p-4 relative">{card && <div className={`transition-all duration-300 transform ${swipeDirection==="left" ? "-translate-x-24 rotate-6 opacity-0" : swipeDirection==="right" ? "translate-x-24 rotate-6 opacity-0" : ""}`}><WordCard wordObj={card}/></div>}</div>
        <div className="pb-10 px-6 max-w-md mx-auto w-full flex gap-4 justify-center"><button onClick={()=>handleSwipe("left")} className="flex-1 bg-white border-2 border-orange-100 text-orange-500 py-4 rounded-2xl">Öğreniyorum</button><button onClick={()=>handleSwipe("right")} className="flex-1 bg-white border-2 border-green-100 text-green-600 py-4 rounded-2xl">Biliyorum</button></div>
      </div>
    );
  }

  // --- HOME VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
      <div className="w-full max-w-md space-y-6 mt-2">
        <div className="flex justify-between w-full px-1">
            <button onClick={resetProfileToDefaults} className="p-2.5 bg-white rounded-xl shadow-sm border"><RotateCcw size={18}/></button>
            <button onClick={handleLogout} className="p-2.5 bg-white rounded-xl shadow-sm border"><LogOut size={18}/></button>
        </div>
        <div className="text-center relative">
            <div className="bg-indigo-600 w-16 h-16 mx-auto rounded-2xl flex items-center justify-center rotate-3 shadow-lg mb-4"><Brain className="text-white w-8 h-8"/></div>
            <h1 className="text-3xl font-extrabold text-slate-800">Kelime Atölyesi</h1>
            <p className="text-slate-500">Merhaba, {user?.displayName || user?.email}</p>
        </div>
        <div className="space-y-3 pb-8">
            {isAdmin && <button onClick={()=>setCurrentView("admin_dashboard")} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Shield/> Admin</button>}
            <div className="grid grid-cols-2 gap-3">
                <button onClick={handleStartGame} className="bg-indigo-600 text-white font-bold py-4 rounded-xl flex flex-col items-center"><Play className="mb-1"/> Yeni Oyun</button>
                <button onClick={()=>setCurrentView("dictionary")} className="bg-sky-500 text-white font-bold py-4 rounded-xl flex flex-col items-center"><Book className="mb-1"/> Sözlük</button>
            </div>
            <button onClick={()=>setCurrentView("sentence_analysis")} className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl flex items-center justify-between px-6"><div className="flex items-center gap-3"><Microscope/><div><div className="text-lg text-left">AI Cümle Analizi</div><div className="text-xs text-teal-100 font-normal text-left">Gramer & Hata Kontrolü</div></div></div><ArrowLeft className="rotate-180"/></button>
            <button onClick={handleStartQuiz} className="w-full bg-amber-500 text-white font-bold py-4 rounded-xl flex items-center justify-between px-6"><div className="flex items-center gap-3"><HelpCircle/><div><div className="text-lg text-left">Quiz</div><div className="text-xs text-amber-100 font-normal text-left">Soru - Cevap</div></div></div><ArrowLeft className="rotate-180"/></button>
            <button onClick={()=>{setEditingWord(null); setReturnView("home"); setCurrentView("add_word");}} className="w-full bg-white border-2 border-dashed border-slate-300 text-slate-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2"><Plus/> Yeni Kelime Ekle</button>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setCurrentView("unknown_list")} className="bg-white border py-4 rounded-xl text-orange-500 font-bold">Öğreneceklerim</button>
                <button onClick={()=>setCurrentView("known_list")} className="bg-white border py-4 rounded-xl text-green-600 font-bold">Öğrendiklerim</button>
            </div>
            <button onClick={()=>setCurrentView("trash")} className="w-full bg-white border py-3 rounded-xl text-slate-400 flex items-center justify-center gap-2"><Trash2 size={16}/> Çöp Kutusu</button>
        </div>
      </div>
    </div>
  );
}
