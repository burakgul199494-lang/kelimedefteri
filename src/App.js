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
  Wand2, // <-- YENİ İKON EKLENDİ
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

// --- YARDIMCI FONKSİYON: AI İLE KELİME ANALİZİ ---
const fetchWordAnalysisFromAI = async (word) => {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are a dictionary assistant used in a vocabulary learning app. Analyze the English word "${word}".
    Return ONLY a raw JSON object (no markdown formatting, no backticks) with the following structure suited for a Turkish learner.
    
    Rules:
    1. "word": The word itself (capitalized correctly).
    2. "sentence": A simple, clear A2-B1 level example sentence containing the word.
    3. "plural": If noun, provide plural form. Else empty string.
    4. "v2", "v3", "vIng", "thirdPerson": If verb, provide these forms. Else empty strings.
    5. "advLy": If adjective/adverb has a typical -ly adverb form, provide it. Else empty.
    6. "compEr", "superEst": If adjective/adverb has comparative/superlative forms, provide them. Else empty.
    7. "definitions": Array of definitions. Each object: { "type": "noun/verb/etc", "meaning": "Turkish meaning", "engExplanation": "Simple English explanation" }.

    Structure:
    {
      "word": "${word}",
      "plural": "",
      "v2": "",
      "v3": "",
      "vIng": "",
      "thirdPerson": "",
      "advLy": "",
      "compEr": "",
      "superEst": "",
      "sentence": "",
      "definitions": [
        {
          "type": "noun",
          "meaning": "",
          "engExplanation": ""
        }
      ]
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text();
  
  text = text.replace(/```json|```/g, "").trim();
  
  return JSON.parse(text);
};

// --- YARDIMCI FONKSİYON: KELİME KÖKÜNÜ BULMA (YENİ) ---
const fetchRootFromAI = async (word) => {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are a linguistic expert. Identify the dictionary root form (lemma) of the English word "${word}".
    If the word is already in its base form, return it as is.
    
    Examples:
    "sitting" -> "sit"
    "better" -> "good"
    "apples" -> "apple"
    "quickly" -> "quick"
    "went" -> "go"

    Return ONLY a raw JSON object:
    {
      "root": "the_root_word",
      "original": "${word}",
      "changed": true/false (true if root is different from original)
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Root fetch error", e);
    return { root: word, changed: false };
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
  const [quizTransition, setQuizTransition] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizIsAnswered, setQuizIsAnswered] = useState(false);

  // Dictionary State
  const [dictSearchTerm, setDictSearchTerm] = useState("");
  const [dictResults, setDictResults] = useState([]); 
  const [dictError, setDictError] = useState("");

  const [currentView, setCurrentView] = useState("home");
  const [editingWord, setEditingWord] = useState(null);
  const [returnView, setReturnView] = useState("unknown_list");

  const [searchKnown, setSearchKnown] = useState("");
  const [searchUnknown, setSearchUnknown] = useState("");
  const [searchTrash, setSearchTrash] = useState("");

  // Admin Arama
  const [adminSearch, setAdminSearch] = useState("");

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

  // --- DATA FETCH & STREAK LOGIC ---
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

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "vocab_game",
        "progress"
      );
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
          await setDoc(
            userRef,
            {
              last_visit_date: todayStr,
              streak: currentStreak,
            },
            { merge: true }
          );
        }
        setStreak(currentStreak);
      } else {
        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(
          userRef,
          {
            last_visit_date: todayStr,
            streak: 1,
          },
          { merge: true }
        );
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
      const querySnapshot = await getDocs(
        collection(db, "artifacts", appId, "system_words")
      );
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
      const docRef = await addDoc(
        collection(db, "artifacts", appId, "system_words"),
        newWord
      );
      setDynamicSystemWords((prev) => [
        ...prev,
        { ...newWord, id: docRef.id },
      ]);
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
      setDynamicSystemWords((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updatedData } : w))
      );
      return { success: true };
    } catch (e) {
      console.error("Güncelleme hatası:", e);
      return { success: false, message: e.message };
    }
  };

  const handleDeleteSystemWord = async (wordId) => {
    const confirm = window.confirm(
      "Bu sistem kelimesini silmek istediğine emin misin? Herkesten silinecek."
    );
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
        const userRef = doc(
          db,
          "artifacts",
          appId,
          "users",
          user.uid,
          "vocab_game",
          "progress"
        );
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
    const filteredSystem = allSystem.filter(
      (w) => !deletedWordIds.includes(w.id)
    );
    const filteredCustom = customWords.filter(
      (w) => !deletedWordIds.includes(w.id)
    );
    return [...filteredSystem, ...filteredCustom].map(normalizeWord);
  };

  const getDeletedWords = () => {
    const allSystem = [...dynamicSystemWords];
    const systemDeleted = allSystem
      .filter((w) => deletedWordIds.includes(w.id))
      .map(normalizeWord);
    const customDeleted = customWords
      .filter((w) => deletedWordIds.includes(w.id))
      .map(normalizeWord);
    return [...systemDeleted, ...customDeleted].sort((a, b) =>
      a.word.localeCompare(b.word)
    );
  };

  const canRestoreWord = (word) => {
    const allWords = getAllWords();
    const existsActive = allWords.some(
      (w) => w.word.toLowerCase() === word.word.toLowerCase()
    );
    return !existsActive;
  };

  const restoreWord = async (word) => {
    if (!canRestoreWord(word)) {
      alert("Bu kelimenin aktif bir versiyonu zaten var, tekrar yüklenemez.");
      return;
    }
    try {
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "vocab_game",
        "progress"
      );
      await updateDoc(userRef, { deleted_ids: arrayRemove(word.id) });
      setDeletedWordIds((prev) => prev.filter((id) => id !== word.id));
    } catch (e) {
      console.error("Restore error:", e);
    }
  };

  const permanentlyDeleteWord = async (word) => {
    if (word.source !== "user") return;
    try {
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "vocab_game",
        "progress"
      );
      await updateDoc(userRef, {
        custom_words: arrayRemove(word),
        deleted_ids: arrayRemove(word.id),
      });
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

    if (foundWords.length > 0) {
      setDictResults(foundWords);
    } else {
      setDictError(
        "Kelime bulunamadı. Yazım hatası olabilir veya henüz eklenmemiş."
      );
    }
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
    const selected = shuffled.slice(0, WORDS_PER_SESSION);
    setSessionWords(selected);
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
          const userRef = doc(
            db,
            "artifacts",
            appId,
            "users",
            user.uid,
            "vocab_game",
            "progress"
          );
          await setDoc(
            userRef,
            { known_ids: arrayUnion(currentWord.id) },
            { merge: true }
          );
          setKnownWordIds((prev) =>
            prev.includes(currentWord.id) ? prev : [...prev, currentWord.id]
          );
          setSessionStats((prev) => ({ ...prev, known: prev.known + 1 }));
        } catch (e) {
          console.error(e);
        }
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
    
    // 1. Sistemde anlamı girilmiş TÜM kelimeler
    const validWords = allWords.filter(
      (w) =>
        w.definitions &&
        w.definitions.length > 0 &&
        w.definitions[0].meaning.trim() !== ""
    );

    // 2. Sadece ÖĞRENECEĞİM (Bilinmeyen) kelimeler
    const unknownWords = validWords.filter((w) => !knownWordIds.includes(w.id));

    if (unknownWords.length < 4) {
      alert(
        `Quiz başlatmak için 'Öğreneceğim Kelimeler' listesinde en az 4 kelime olmalıdır! (Şu an: ${unknownWords.length})`
      );
      return;
    }

    const pool = unknownWords;

    const questionCount = Math.min(20, pool.length);
    const shuffledPool = [...pool]
      .sort(() => 0.5 - Math.random())
      .slice(0, questionCount);

    const generatedQuestions = shuffledPool.map((targetWord) => {
      const correctAnswer = targetWord.definitions[0].meaning;
      const distractors = validWords
        .filter((w) => w.id !== targetWord.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((w) => w.definitions[0].meaning);

      const options = [...distractors, correctAnswer].sort(
        () => 0.5 - Math.random()
      );

      return {
        wordObj: targetWord,
        correctAnswer: correctAnswer,
        options: options,
      };
    });

    setQuizQuestions(generatedQuestions);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizSelectedOption(null);
    setQuizIsAnswered(false);
    setSessionComplete(false);
    setCurrentView("quiz");
  };

  const handleQuizAnswer = (selectedOption) => {
    if (quizIsAnswered) return;

    setQuizIsAnswered(true);
    setQuizSelectedOption(selectedOption);

    const currentQuestion = quizQuestions[quizIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswer;

    if (isCorrect) {
      setQuizScore((prev) => prev + 5);
    }

    setTimeout(() => {
      // 1. Önce ekranı geçici olarak "yok et" (Transition moduna al)
      setQuizTransition(true);

      // 2. Kısa bir süre sonra verileri güncelle ve ekranı geri getir
      setTimeout(() => {
        setQuizSelectedOption(null);
        setQuizIsAnswered(false);
        
        if (quizIndex + 1 < quizQuestions.length) {
          setQuizIndex((prev) => prev + 1);
        } else {
          setCurrentView("quiz_result");
        }
        
        // 3. Ekranı tekrar görünür yap
        setQuizTransition(false);
      }, 100); // 100 milisaniyelik temizlik molası
      
    }, 1000);
  };

  // --- CRUD WORDS ---
  const handleSaveNewWord = async (wordData) => {
    const allWords = getAllWords();
    const normalizedInput = wordData.word.toLowerCase().trim();
    const exists = allWords.find(
      (w) => w.word.toLowerCase() === normalizedInput
    );
    if (exists)
      return { success: false, message: "Bu kelime zaten listenizde mevcut!" };

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
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "vocab_game",
        "progress"
      );
      await setDoc(
        userRef,
        { custom_words: arrayUnion(newWord) },
        { merge: true }
      );
      setCustomWords((prev) => [...prev, newWord]);
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: "Kaydetme hatası oluştu." };
    }
  };

  const handleDeleteWord = async (wordId) => {
    try {
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "vocab_game",
        "progress"
      );
      await setDoc(
        userRef,
        { deleted_ids: arrayUnion(wordId), known_ids: arrayRemove(wordId) },
        { merge: true }
      );
      setDeletedWordIds((prev) =>
        prev.includes(wordId) ? prev : [...prev, wordId]
      );
      setKnownWordIds((prev) => prev.filter((id) => id !== wordId));
    } catch (e) {
      console.error("Silme hatası:", e);
    }
  };

  const handleUpdateWord = async (originalId, newData) => {
    try {
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "vocab_game",
        "progress"
      );
      const isCustom = customWords.find((w) => w.id === originalId);
      const isKnown = knownWordIds.includes(originalId);

      if (isCustom) {
        const updatedWord = {
          ...isCustom,
          ...newData,
          plural: newData.plural || "",
          v2: newData.v2 || "",
          v3: newData.v3 || "",
          vIng: newData.vIng || "",
          thirdPerson: newData.thirdPerson || "", 
          advLy: newData.advLy || "",             
          compEr: newData.compEr || "",            
          superEst: newData.superEst || "",        
          source: isCustom.source || "user",
        };
        await updateDoc(userRef, { custom_words: arrayRemove(isCustom) });
        await updateDoc(userRef, { custom_words: arrayUnion(updatedWord) });
        setCustomWords((prev) =>
          prev.map((w) => (w.id === originalId ? updatedWord : w))
        );
      } else {
        await setDoc(
          userRef,
          { deleted_ids: arrayUnion(originalId) },
          { merge: true }
        );
        const newCustomWord = {
          id: Date.now(),
          word: newData.word,
          plural: newData.plural || "",
          v2: newData.v2 || "",
          v3: newData.v3 || "",
          vIng: newData.vIng || "",
          thirdPerson: newData.thirdPerson || "", 
          advLy: newData.advLy || "",             
          compEr: newData.compEr || "",            
          superEst: newData.superEst || "",        
          definitions: newData.definitions,
          sentence: newData.sentence,
          source: "user",
        };
        await setDoc(
          userRef,
          { custom_words: arrayUnion(newCustomWord) },
          { merge: true }
        );
        setDeletedWordIds((prev) => [...prev, originalId]);
        setCustomWords((prev) => [...prev, newCustomWord]);
        if (isKnown) {
          await updateDoc(userRef, { known_ids: arrayRemove(originalId) });
          await updateDoc(userRef, {
            known_ids: arrayUnion(newCustomWord.id),
          });
          setKnownWordIds((prev) =>
            prev.filter((id) => id !== originalId).concat(newCustomWord.id)
          );
        }
      }
      setEditingWord(null);
    } catch (e) {
      console.error("Update Error", e);
    }
  };

  const handleRemoveFromKnown = async (wordId) => {
    try {
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "vocab_game",
        "progress"
      );
      await updateDoc(userRef, { known_ids: arrayRemove(wordId) });
      setKnownWordIds((prev) => prev.filter((id) => id !== wordId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoHome = () => {
    setCurrentView("home");
    setSessionComplete(false);
    setEditingWord(null);
    setDictSearchTerm("");
    setDictResults([]);
    setDictError("");
    setQuizQuestions([]);
  };

  const resetProfileToDefaults = async () => {
    const confirm1 = window.confirm(
      "Profilini sıfırlamak istediğine emin misin? Bu işlem tüm kelime ilerlemelerini ve kendi eklediğin kelimeleri temizler."
    );
    if (!confirm1) return;
    const confirm2 = window.confirm(
      "Bu işlem GERİ ALINAMAZ. Kesin olarak sıfırlamak istiyor musun?"
    );
    if (!confirm2) return;
    try {
      const userRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "vocab_game",
        "progress"
      );
      const todayStr = new Date().toISOString().split("T")[0];
      await setDoc(userRef, {
        known_ids: [],
        custom_words: [],
        deleted_ids: [],
        streak: 1,
        last_visit_date: todayStr,
      });
      setKnownWordIds([]);
      setCustomWords([]);
      setDeletedWordIds([]);
      setStreak(1);
      alert("Profil başarıyla sıfırlandı!");
      handleGoHome();
    } catch (e) {
      console.error("Reset error:", e);
      alert("Sıfırlama yapılırken bir hata oluştu.");
    }
  };

  const getShortTypeLabel = (typeKey) => {
    const map = {
      noun: "n.",
      verb: "v.",
      adjective: "adj.",
      adverb: "adv.",
      prep: "prep.",
      pronoun: "pron.",
      conj: "conj.",
      article: "art.",
      other: "other",
    };
    return map[typeKey] || "";
  };

  const renderSourceBadge = (source) => {
    const isSystem = source === "system";
    return (
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
          isSystem
            ? "bg-blue-100 text-blue-600"
            : "bg-orange-100 text-orange-600"
        }`}
      >
        {isSystem ? "Sistem" : "Kullanıcı"}
      </span>
    );
  };
// --- CARD COMPONENT ---
  const WordCard = ({ wordObj }) => {
    return (
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 text-center border border-slate-100">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
            Kelime
          </span>
          {renderSourceBadge(wordObj.source)}
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <h2 className="text-4xl font-extrabold text-slate-800 break-words">
            {wordObj.word}
          </h2>
          <button
            onClick={() => speak(wordObj.word)}
            className="p-3 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors"
            title="Kelimeyi Oku"
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4 text-left">
          {wordObj.definitions.map((def, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border ${
                idx === 0
                  ? "bg-indigo-50 border-indigo-100"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
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
                      <p className={`text-sm italic font-medium ${idx === 0 ? 'text-indigo-500' : 'text-slate-500'}`}>
                          "{def.engExplanation}"
                      </p>
                  </div>
              )}
            </div>
          ))}

          {/* DİL BİLGİSİ DETAYLARI - FİİLLER */}
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

          {/* DİL BİLGİSİ DETAYLARI - SIFAT/ZARF */}
          {(wordObj.advLy || wordObj.compEr || wordObj.superEst) && (
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-left space-y-1.5 mt-2">
                  <div className="text-[10px] uppercase tracking-wide text-orange-400 font-bold mb-1">Sıfat & Zarf Halleri</div>
                  <div className="text-sm text-slate-700 space-y-1">
                      {wordObj.advLy && <div><span className="font-semibold text-slate-900">Zarf (-ly):</span> {wordObj.advLy}</div>}
                      {wordObj.compEr && <div><span className="font-semibold text-slate-900">Comp (-er):</span> {wordObj.compEr}</div>}
                      {wordObj.superEst && <div><span className="font-semibold text-slate-900">Super (-est):</span> {wordObj.superEst}</div>}
                  </div>
              </div>
          )}

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">
                Örnek Cümle
                </div>
                <button 
                    onClick={(e) => speak(wordObj.sentence, e)}
                    className="p-1.5 bg-white text-indigo-500 rounded-full hover:bg-indigo-100 hover:text-indigo-700 border border-slate-200 transition-colors"
                    title="Cümleyi Oku"
                >
                    <Volume2 className="w-4 h-4" />
                </button>
            </div>
            <div className="text-base text-slate-600 italic space-y-1">
              {wordObj.sentence.split("\n").map((line, idx) => (
                <p key={idx}>"{line}"</p>
              ))}
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
      e.preventDefault();
      setError("");
      setLoadingAuth(true);
      try {
        if (isLogin) await signInWithEmailAndPassword(auth, email, password);
        else await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setError(
          err.message.includes("auth")
            ? "Giriş hatası. Bilgileri kontrol et."
            : err.message
        );
      } finally {
        setLoadingAuth(false);
      }
    };

    const handleGoogle = async () => {
      setError("");
      setLoadingAuth(true);
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } catch (err) {
        setError(err.message);
        setLoadingAuth(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg">
              <Brain className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">
              Kelime Defteri'ne Hoşgeldiniz
            </h1>
            <p className="text-slate-500">Kelimelerini kaybetme.</p>
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleGoogle}
            className="w-full bg-white border border-slate-200 font-bold py-3 rounded-xl mb-4 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <Globe className="w-5 h-5 text-blue-500" /> Google ile Gir
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-slate-400 text-xs uppercase font-bold">
              veya
            </span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="email"
                placeholder="E-posta"
                className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="password"
                placeholder="Şifre"
                className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              disabled={loadingAuth}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl"
            >
              {loadingAuth ? (
                <Loader2 className="animate-spin mx-auto" />
              ) : isLogin ? (
                "Giriş Yap"
              ) : (
                "Kayıt Ol"
              )}
            </button>
          </form>
          <p
            className="text-center mt-6 text-sm text-slate-500 cursor-pointer hover:text-indigo-600"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Hesap oluştur" : "Giriş yap"}
          </p>
        </div>
      </div>
    );
  };

  if (authLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 text-slate-600">
        <Loader2 className="w-10 h-10 animate-spin mr-2" />
        <span className="text-lg font-medium">Başlatılıyor...</span>
      </div>
    );
  if (!user) return <AuthScreen />;
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 text-slate-600">
        <Loader2 className="w-10 h-10 animate-spin mr-2" />
        <span className="text-lg font-medium">Veriler Yükleniyor...</span>
      </div>
    );

  // --- ADMIN DASHBOARD ---
  if (currentView === "admin_dashboard" && isAdmin) {
    const totalSystemWords = dynamicSystemWords.length;
    const filteredSystemWords = dynamicSystemWords
      .filter((w) =>
        w.word.toLowerCase().includes(adminSearch.toLowerCase())
      )
      .sort((a, b) => a.word.localeCompare(b.word));
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleGoHome}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-6 h-6 text-slate-800" /> Yönetici Paneli
            </h2>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h3 className="font-bold text-slate-700 mb-4">Sistem Durumu</h3>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-blue-800 font-medium">
                  Toplam Sistem Kelimesi
                </span>
                <span className="font-bold text-blue-800">
                  {totalSystemWords}
                </span>
              </div>
              <div className="text-xs text-slate-400 text-center pt-2">
                * Bu kelimeler tüm kullanıcılar tarafından görülür.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingWord(null);
              setCurrentView("add_system_word");
            }}
            className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-colors shadow-lg flex items-center justify-center gap-2 mb-6"
          >
            <Plus className="w-5 h-5" /> Yeni Sistem Kelimesi Ekle
          </button>
          <div>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              Sistem Kelimeleri Listesi ({filteredSystemWords.length})
            </h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Sistem kelimelerinde ara..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="w-full pl-10 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 transition-colors"
              />
            </div>
            {dynamicSystemWords.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-sm bg-slate-100 rounded-xl border border-dashed border-slate-300">
                <p>Henüz hiç sistem kelimesi yok.</p>
                <p className="text-xs mt-1">Yukarıdaki butondan eklemeye başla.</p>
              </div>
            ) : filteredSystemWords.length === 0 ? (
              <div className="text-center p-4 text-slate-400 text-sm bg-slate-50 rounded-xl">
                Aranan kelime bulunamadı.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSystemWords.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        {item.word}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.definitions[0]?.meaning}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingWord(item);
                          setCurrentView("add_system_word");
                        }}
                        className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSystemWord(item.id)}
                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN: ADD / EDIT SYSTEM WORD ---
  if (currentView === "add_system_word" && isAdmin) {
    const isEditMode = !!editingWord;
    const initialData = isEditMode
      ? {
          word: editingWord.word,
          plural: editingWord.plural || "",
          v2: editingWord.v2 || "",
          v3: editingWord.v3 || "",
          vIng: editingWord.vIng || "",
          thirdPerson: editingWord.thirdPerson || "", 
          advLy: editingWord.advLy || "",             
          compEr: editingWord.compEr || "",            
          superEst: editingWord.superEst || "",        
          definitions: editingWord.definitions.map(d => ({...d, engExplanation: d.engExplanation || ""})),
          sentence: editingWord.sentence,
        }
      : {
          word: "",
          plural: "",
          v2: "",
          v3: "",
          vIng: "",
          thirdPerson: "",
          advLy: "",
          compEr: "",
          superEst: "",
          definitions: [{ type: "noun", meaning: "", engExplanation: "" }],
          sentence: "",
        };

    const FormComponent = () => {
      const [formData, setFormData] = useState(initialData);
      const [error, setError] = useState("");
      const [saving, setSaving] = useState(false);
      // --- AI LOADING STATES ---
      const [aiLoading, setAiLoading] = useState(false);
      const [rootLoading, setRootLoading] = useState(false); // <-- YENİ

      const addDefinition = () =>
        setFormData((prev) => ({
          ...prev,
          definitions: [
            ...prev.definitions,
            { type: "noun", meaning: "", engExplanation: "" },
          ],
        }));
      const removeDefinition = (index) => {
        if (formData.definitions.length === 1) return;
        setFormData((prev) => ({
          ...prev,
          definitions: prev.definitions.filter((_, i) => i !== index),
        }));
      };
      const updateDefinition = (index, field, value) => {
        const newDefs = [...formData.definitions];
        newDefs[index] = { ...newDefs[index], [field]: value };
        setFormData((prev) => ({ ...prev, definitions: newDefs }));
      };

      // --- YENİ: KÖK BULMA ---
      const handleConvertToRoot = async () => {
          if (!formData.word) return;
          setRootLoading(true);
          try {
              const result = await fetchRootFromAI(formData.word);
              if (result.changed) {
                  setFormData(prev => ({ ...prev, word: result.root }));
              }
          } catch (e) {
              console.error(e);
          } finally {
              setRootLoading(false);
          }
      };

      // --- AI HANDLER ---
      const handleAIFill = async () => {
        if (!formData.word) {
            alert("Lütfen önce bir kelime yazın!");
            return;
        }
        setAiLoading(true);
        setError("");
        try {
            const data = await fetchWordAnalysisFromAI(formData.word);
            setFormData((prev) => ({
                ...prev,
                word: data.word, 
                plural: data.plural || "",
                v2: data.v2 || "",
                v3: data.v3 || "",
                vIng: data.vIng || "",
                thirdPerson: data.thirdPerson || "",
                advLy: data.advLy || "",
                compEr: data.compEr || "",
                superEst: data.superEst || "",
                sentence: data.sentence || "",
                definitions: data.definitions.map(def => ({
                    type: def.type || "noun",
                    meaning: def.meaning || "",
                    engExplanation: def.engExplanation || ""
                }))
            }));
        } catch (err) {
            setError("AI Hatası: " + err.message);
        } finally {
            setAiLoading(false);
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.word || !formData.sentence) {
          setError("Lütfen kelime ve örnek cümleyi doldurun.");
          return;
        }
        const hasEmptyDef = formData.definitions.some((d) => !d.meaning.trim());
        if (hasEmptyDef) {
          setError("Lütfen tüm anlamları doldurun.");
          return;
        }
        if (
          !isEditMode ||
          (isEditMode &&
            formData.word.toLowerCase() !== editingWord.word.toLowerCase())
        ) {
          const normalizedInput = formData.word.toLowerCase().trim();
          const exists = dynamicSystemWords.some(
            (w) =>
              w.word.toLowerCase() === normalizedInput &&
              (!isEditMode || w.id !== editingWord.id)
          );
          if (exists) {
            setError("Bu kelime sistemde zaten kayıtlı!");
            return;
          }
        }
        setSaving(true);
        let result;
        if (isEditMode)
          result = await handleUpdateSystemWord(editingWord.id, formData);
        else result = await handleSaveSystemWord(formData);
        setSaving(false);
        if (result.success) {
          alert(
            isEditMode
              ? "Kelime güncellendi!"
              : "Kelime başarıyla eklendi!"
          );
          setEditingWord(null);
          setCurrentView("admin_dashboard");
        } else {
          setError(result.message);
        }
      };

      return (
        <div className="min-h-screen bg-slate-800 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 my-8 overflow-y-auto max-h-screen">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />{" "}
                {isEditMode ? "Kelime Düzenle" : "Sistem Kelimesi Ekle"}
              </h2>
              <button
                onClick={() => {
                  setEditingWord(null);
                  setCurrentView("admin_dashboard");
                }}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg mb-4 text-xs border border-yellow-200">
              Dikkat: Yapacağınız değişiklikler <b>tüm kullanıcılarda</b> anında
              görünecektir.
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* KELİME, KÖK BUL VE AI BUTONU (ADMIN) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kelime
                </label>
                <div className="flex gap-2">
                    <input
                    type="text"
                    value={formData.word}
                    onChange={(e) =>
                        setFormData({ ...formData, word: e.target.value })
                    }
                    className="flex-1 p-3 border border-slate-200 rounded-xl outline-none"
                    placeholder="Örn: Bank"
                    />
                    {/* KÖK BULMA BUTONU */}
                    <button
                      type="button"
                      onClick={handleConvertToRoot}
                      disabled={rootLoading || !formData.word}
                      className="bg-orange-100 hover:bg-orange-200 text-orange-600 p-3 rounded-xl transition-colors disabled:opacity-50"
                      title="Kelimeyi Yalın Hâle (Kök) Çevir"
                    >
                      {rootLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Wand2 className="w-5 h-5" />
                      )}
                    </button>
                    {/* AI BUTONU */}
                    <button
                        type="button"
                        onClick={handleAIFill}
                        disabled={aiLoading || !formData.word}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
                        title="AI ile Doldur"
                    >
                        {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  İpucu: "Running" yazıp <Wand2 className="w-3 h-3 inline"/> ikonuna basarsan "Run" olur.
                </p>
              </div>

              {/* GRUP 1: İSİM VE FİİL DETAYLARI */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Fiil & İsim Detayları</div>
                  <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Çoğul (Plural)
                        </label>
                        <input
                          type="text"
                          value={formData.plural}
                          onChange={(e) =>
                            setFormData({ ...formData, plural: e.target.value })
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">3. Tekil (He/She/It)</label>
                             <input type="text" value={formData.thirdPerson} onChange={(e) => setFormData({ ...formData, thirdPerson: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm" placeholder="goes"/>
                          </div>
                          <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">V-ing (Gerund)</label>
                             <input type="text" value={formData.vIng} onChange={(e) => setFormData({ ...formData, vIng: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm" placeholder="going"/>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">V2 (Past)</label>
                          <input
                            type="text"
                            value={formData.v2}
                            onChange={(e) =>
                              setFormData({ ...formData, v2: e.target.value })
                            }
                            className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm"
                            placeholder="went"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">V3 (Participle)</label>
                          <input
                            type="text"
                            value={formData.v3}
                            onChange={(e) =>
                              setFormData({ ...formData, v3: e.target.value })
                            }
                            className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm"
                            placeholder="gone"
                          />
                        </div>
                      </div>
                  </div>
              </div>

              {/* GRUP 2: SIFAT VE ZARF DETAYLARI (YENİ) */}
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <div className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wide">Sıfat & Zarf Detayları</div>
                  <div className="space-y-3">
                      <div>
                          <label className="block text-xs font-medium text-orange-700/70 mb-1">Zarf Hali (-ly)</label>
                          <input type="text" value={formData.advLy} onChange={(e) => setFormData({ ...formData, advLy: e.target.value })} className="w-full p-2 border border-orange-200 rounded-lg outline-none text-sm" placeholder="quickly"/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                             <label className="block text-xs font-medium text-orange-700/70 mb-1">Karşılaştırma (-er)</label>
                             <input type="text" value={formData.compEr} onChange={(e) => setFormData({ ...formData, compEr: e.target.value })} className="w-full p-2 border border-orange-200 rounded-lg outline-none text-sm" placeholder="faster"/>
                          </div>
                          <div>
                             <label className="block text-xs font-medium text-orange-700/70 mb-1">Üstünlük (-est)</label>
                             <input type="text" value={formData.superEst} onChange={(e) => setFormData({ ...formData, superEst: e.target.value })} className="w-full p-2 border border-orange-200 rounded-lg outline-none text-sm" placeholder="fastest"/>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-slate-700">
                    Anlamlar
                  </label>
                  <button
                    type="button"
                    onClick={addDefinition}
                    className="text-sm text-indigo-600 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Ekle
                  </button>
                </div>
                {formData.definitions.map((def, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100"
                  >
                    <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                        <select
                            value={def.type}
                            onChange={(e) =>
                            updateDefinition(index, "type", e.target.value)
                            }
                            className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none bg-white"
                        >
                            {WORD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={def.meaning}
                            onChange={(e) =>
                            updateDefinition(index, "meaning", e.target.value)
                            }
                            className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none"
                            placeholder="Türkçe anlam..."
                        />
                        </div>
                        {formData.definitions.length > 1 && (
                        <button
                            type="button"
                            onClick={() => removeDefinition(index)}
                            className="p-2 text-slate-400 hover:text-red-500 mt-1"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        )}
                    </div>
                    <input
                        type="text"
                        value={def.engExplanation}
                        onChange={(e) =>
                            updateDefinition(index, "engExplanation", e.target.value)
                        }
                        className="w-full p-2 text-sm border border-indigo-100 bg-indigo-50/50 rounded-lg outline-none placeholder:text-slate-400"
                        placeholder="Bu anlam için İngilizce açıklama (Opsiyonel)..."
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Örnek Cümle
                </label>
                <textarea
                  value={formData.sentence}
                  onChange={(e) =>
                    setFormData({ ...formData, sentence: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none h-24 resize-none"
                  placeholder="Örn: I put my money in the bank."
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}{" "}
                {isEditMode ? "Güncelle" : "Sisteme Kaydet"}
              </button>
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
    const normalizedEditWord =
      isEditMode && editingWord ? normalizeWord(editingWord) : null;
    const initialData = normalizedEditWord
      ? {
          word: normalizedEditWord.word,
          plural: normalizedEditWord.plural || "",
          v2: normalizedEditWord.v2 || "",
          v3: normalizedEditWord.v3 || "",
          vIng: normalizedEditWord.vIng || "",
          thirdPerson: normalizedEditWord.thirdPerson || "", 
          advLy: normalizedEditWord.advLy || "",             
          compEr: normalizedEditWord.compEr || "",            
          superEst: normalizedEditWord.superEst || "",        
          definitions: normalizedEditWord.definitions.map(d => ({...d, engExplanation: d.engExplanation || ""})),
          sentence: normalizedEditWord.sentence,
        }
      : {
          word: "",
          plural: "",
          v2: "",
          v3: "",
          vIng: "",
          thirdPerson: "",
          advLy: "",
          compEr: "",
          superEst: "",
          definitions: [{ type: "noun", meaning: "", engExplanation: "" }],
          sentence: "",
        };

    const FormComponent = () => {
      const [formData, setFormData] = useState(initialData);
      const [error, setError] = useState("");
      const [saving, setSaving] = useState(false);
      // --- AI LOADING ---
      const [aiLoading, setAiLoading] = useState(false);
      const [rootLoading, setRootLoading] = useState(false); // <-- YENİ

      const addDefinition = () =>
        setFormData((prev) => ({
          ...prev,
          definitions: [
            ...prev.definitions,
            { type: "noun", meaning: "", engExplanation: "" },
          ],
        }));
      const removeDefinition = (index) => {
        if (formData.definitions.length === 1) return;
        setFormData((prev) => ({
          ...prev,
          definitions: prev.definitions.filter((_, i) => i !== index),
        }));
      };
      const updateDefinition = (index, field, value) => {
        const newDefs = [...formData.definitions];
        newDefs[index] = { ...newDefs[index], [field]: value };
        setFormData((prev) => ({ ...prev, definitions: newDefs }));
      };

      // --- YENİ: KÖK BULMA (USER) ---
      const handleConvertToRoot = async () => {
          if (!formData.word) return;
          setRootLoading(true);
          try {
              const result = await fetchRootFromAI(formData.word);
              if (result.changed) {
                  setFormData(prev => ({ ...prev, word: result.root }));
              }
          } catch (e) {
              console.error(e);
          } finally {
              setRootLoading(false);
          }
      };

      // --- AI HANDLER (USER) ---
      const handleAIFill = async () => {
        if (!formData.word) {
            alert("Lütfen önce bir kelime yazın!");
            return;
        }
        setAiLoading(true);
        setError("");
        try {
            const data = await fetchWordAnalysisFromAI(formData.word);
            setFormData((prev) => ({
                ...prev,
                word: data.word,
                plural: data.plural || "",
                v2: data.v2 || "",
                v3: data.v3 || "",
                vIng: data.vIng || "",
                thirdPerson: data.thirdPerson || "",
                advLy: data.advLy || "",
                compEr: data.compEr || "",
                superEst: data.superEst || "",
                sentence: data.sentence || "",
                definitions: data.definitions.map(def => ({
                    type: def.type || "noun",
                    meaning: def.meaning || "",
                    engExplanation: def.engExplanation || ""
                }))
            }));
        } catch (err) {
            setError("AI Hatası: " + err.message);
        } finally {
            setAiLoading(false);
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.word || !formData.sentence) {
          setError("Lütfen kelime ve örnek cümleyi doldurun.");
          return;
        }
        const hasEmptyDef = formData.definitions.some(
          (d) => !d.meaning.trim()
        );
        if (hasEmptyDef) {
          setError(
            "Lütfen tüm anlam alanlarını doldurun veya boş olanları silin."
          );
          return;
        }
        setSaving(true);
        if (isEditMode) {
          await handleUpdateWord(editingWord.id, formData);
          setSaving(false);
          setCurrentView(returnView);
        } else {
          const result = await handleSaveNewWord(formData);
          setSaving(false);
          if (result.success) {
            alert("Kelime başarıyla eklendi!");
            setFormData({
              word: "",
              plural: "",
              v2: "",
              v3: "",
              vIng: "",
              thirdPerson: "",
              advLy: "",
              compEr: "",
              superEst: "",
              definitions: [{ type: "noun", meaning: "", engExplanation: "" }],
              sentence: "",
            });
            setError("");
          } else {
            setError(result.message);
          }
        }
      };

      return (
        <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 my-8 overflow-y-auto max-h-screen">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {isEditMode ? "Kelimeyi Düzenle" : "Yeni Kelime Ekle"}
              </h2>
              <button
                onClick={() =>
                  isEditMode
                    ? setCurrentView(returnView)
                    : handleGoHome()
                }
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* KELİME, KÖK BUL VE AI BUTONU (USER) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  İngilizce Kelime
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={formData.word}
                        onChange={(e) =>
                        setFormData({ ...formData, word: e.target.value })
                        }
                        className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder="Örn: Bank"
                        autoFocus
                    />
                    {/* YENİ: KÖK BULMA BUTONU */}
                    <button
                      type="button"
                      onClick={handleConvertToRoot}
                      disabled={rootLoading || !formData.word}
                      className="bg-orange-100 hover:bg-orange-200 text-orange-600 p-3 rounded-xl transition-colors disabled:opacity-50"
                      title="Kelimeyi Yalın Hâle (Kök) Çevir"
                    >
                      {rootLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Wand2 className="w-5 h-5" />
                      )}
                    </button>

                    {/* AI BUTONU */}
                    <button
                        type="button"
                        onClick={handleAIFill}
                        disabled={aiLoading || !formData.word}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded-xl font-bold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Yapay Zeka ile Doldur"
                    >
                        {aiLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                        <>
                            <Brain className="w-5 h-5" />
                            <span className="hidden sm:inline">AI Doldur</span>
                        </>
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  İpucu: "Running" yazıp <Wand2 className="w-3 h-3 inline"/> ikonuna basarsan "Run" olur.
                </p>
              </div>

              {/* GRUP 1: İSİM VE FİİL DETAYLARI */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Fiil & İsim Detayları</div>
                  <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Çoğul (Plural)
                        </label>
                        <input
                          type="text"
                          value={formData.plural}
                          onChange={(e) =>
                            setFormData({ ...formData, plural: e.target.value })
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm"
                          placeholder="cars, cities"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">3. Tekil (He/She/It)</label>
                             <input type="text" value={formData.thirdPerson} onChange={(e) => setFormData({ ...formData, thirdPerson: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm" placeholder="goes"/>
                          </div>
                          <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">V-ing (Gerund)</label>
                             <input type="text" value={formData.vIng} onChange={(e) => setFormData({ ...formData, vIng: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm" placeholder="going"/>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">V2 (Past)</label>
                          <input
                            type="text"
                            value={formData.v2}
                            onChange={(e) =>
                              setFormData({ ...formData, v2: e.target.value })
                            }
                            className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm"
                            placeholder="went"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">V3 (Participle)</label>
                          <input
                            type="text"
                            value={formData.v3}
                            onChange={(e) =>
                              setFormData({ ...formData, v3: e.target.value })
                            }
                            className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm"
                            placeholder="gone"
                          />
                        </div>
                      </div>
                  </div>
              </div>

              {/* GRUP 2: SIFAT VE ZARF DETAYLARI (YENİ) */}
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <div className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wide">Sıfat & Zarf Detayları</div>
                  <div className="space-y-3">
                      <div>
                          <label className="block text-xs font-medium text-orange-700/70 mb-1">Zarf Hali (-ly)</label>
                          <input type="text" value={formData.advLy} onChange={(e) => setFormData({ ...formData, advLy: e.target.value })} className="w-full p-2 border border-orange-200 rounded-lg outline-none text-sm" placeholder="quickly"/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                             <label className="block text-xs font-medium text-orange-700/70 mb-1">Karşılaştırma (-er)</label>
                             <input type="text" value={formData.compEr} onChange={(e) => setFormData({ ...formData, compEr: e.target.value })} className="w-full p-2 border border-orange-200 rounded-lg outline-none text-sm" placeholder="faster"/>
                          </div>
                          <div>
                             <label className="block text-xs font-medium text-orange-700/70 mb-1">Üstünlük (-est)</label>
                             <input type="text" value={formData.superEst} onChange={(e) => setFormData({ ...formData, superEst: e.target.value })} className="w-full p-2 border border-orange-200 rounded-lg outline-none text-sm" placeholder="fastest"/>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-slate-700">
                    Anlamlar
                  </label>
                  <button
                    type="button"
                    onClick={addDefinition}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Anlam Ekle
                  </button>
                </div>
                {formData.definitions.map((def, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100"
                  >
                    <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                        <select
                            value={def.type}
                            onChange={(e) =>
                            updateDefinition(index, "type", e.target.value)
                            }
                            className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none bg-white"
                        >
                            {WORD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={def.meaning}
                            onChange={(e) =>
                            updateDefinition(index, "meaning", e.target.value)
                            }
                            className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none"
                            placeholder="Türkçe anlamı..."
                        />
                        </div>
                        {formData.definitions.length > 1 && (
                        <button
                            type="button"
                            onClick={() => removeDefinition(index)}
                            className="p-2 text-slate-400 hover:text-red-500 mt-1"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        )}
                    </div>
                    <input
                        type="text"
                        value={def.engExplanation}
                        onChange={(e) =>
                            updateDefinition(index, "engExplanation", e.target.value)
                        }
                        className="w-full p-2 text-sm border border-indigo-100 bg-indigo-50/50 rounded-lg outline-none placeholder:text-slate-400"
                        placeholder="Bu anlam için İngilizce açıklama (Opsiyonel)..."
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Örnek Cümle
                </label>
                <textarea
                  value={formData.sentence}
                  onChange={(e) =>
                    setFormData({ ...formData, sentence: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none h-24 resize-none"
                  placeholder="Örn: I went to the bank."
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}{" "}
                {isEditMode ? "Değişiklikleri Kaydet" : "Kelimeyi Kaydet"}
              </button>
            </form>
          </div>
        </div>
      );
    };
    return <FormComponent />;
  }

  // --- LIST VIEWS ---
  if (
    currentView === "known_list" ||
    currentView === "unknown_list" ||
    currentView === "trash"
  ) {
    const isKnown = currentView === "known_list";
    const isTrash = currentView === "trash";
    const allWords = isTrash ? getDeletedWords() : getAllWords();
    let filteredWords = [];

    if (isTrash) {
      filteredWords = allWords.filter((w) =>
        w.word.toLowerCase().includes(searchTrash.toLowerCase())
      );
    } else if (isKnown) {
      filteredWords = allWords
        .filter((w) => knownWordIds.includes(w.id))
        .filter((w) =>
          w.word.toLowerCase().includes(searchKnown.toLowerCase())
        );
    } else {
      filteredWords = allWords
        .filter((w) => !knownWordIds.includes(w.id))
        .filter((w) =>
          w.word.toLowerCase().includes(searchUnknown.toLowerCase())
        );
    }

    filteredWords.sort((a, b) => a.word.localeCompare(b.word));
    const title = isKnown
      ? "Öğrendiğim Kelimeler"
      : isTrash
      ? "Silinen Kelimeler"
      : "Öğreneceğim Kelimeler";
    const searchVal = isKnown
      ? searchKnown
      : isTrash
      ? searchTrash
      : searchUnknown;
    const setSearch = isKnown
      ? setSearchKnown
      : isTrash
      ? setSearchTrash
      : setSearchUnknown;

    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4 sticky top-0 bg-slate-50 py-2 z-10">
            <button
              onClick={handleGoHome}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">
              {title} ({filteredWords.length})
            </h2>
          </div>
          <input
            type="text"
            placeholder="Kelime ara..."
            value={searchVal}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl outline-none"
          />

          {filteredWords.length === 0 ? (
            <div className="text-center text-slate-400 mt-20">
              {isTrash ? (
                <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
              ) : isKnown ? (
                <Check className="w-16 h-16 mx-auto mb-4 opacity-20" />
              ) : (
                <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              )}
              <p>
                {isTrash
                  ? "Çöp kutusu boş."
                  : isKnown
                  ? "Henüz hiç kelime öğrenmedin."
                  : "Harika! Tüm kelimeleri öğrendin."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWords.map((item) => {
                const canRestore = isTrash ? canRestoreWord(item) : false;
                const isUser = item.source === "user";
                return (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-lg font-bold text-slate-800">
                            {item.word}
                          </span>
                          {renderSourceBadge(item.source)}
                          {!isTrash && (
                            <button
                              onClick={(e) => speak(item.word, e)}
                              className="p-1 text-indigo-400 hover:text-indigo-600 bg-indigo-50 rounded-full"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {/* LİSTE GÖRÜNÜMÜNDE ANLAMLAR */}
                        {item.definitions.map((def, idx) => (
                            <div key={idx} className="mb-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold text-slate-400 w-8 text-right shrink-0">
                                        {getShortTypeLabel(def.type)}
                                    </span>
                                    <span className="text-sm text-slate-700 font-medium">
                                        {def.meaning}
                                    </span>
                                </div>
                                {def.engExplanation && (
                                    <div className="ml-10 text-[10px] text-indigo-400 italic">"{def.engExplanation}"</div>
                                )}
                            </div>
                        ))}

                        {/* LİSTE GÖRÜNÜMÜ DETAYLARI */}
                        {(item.plural || item.v2 || item.v3 || item.vIng || item.thirdPerson) && (
                          <div className="mt-2 text-xs text-slate-600 space-y-1 bg-slate-50 p-2 rounded-lg">
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {item.plural && <div><span className="font-semibold">Pl:</span> {item.plural}</div>}
                                {item.thirdPerson && <div><span className="font-semibold">3rd:</span> {item.thirdPerson}</div>}
                                {item.v2 && <div><span className="font-semibold">V2:</span> {item.v2}</div>}
                                {item.v3 && <div><span className="font-semibold">V3:</span> {item.v3}</div>}
                                {item.vIng && <div><span className="font-semibold">Ing:</span> {item.vIng}</div>}
                            </div>
                          </div>
                        )}

                        {(item.advLy || item.compEr || item.superEst) && (
                          <div className="mt-1 text-xs text-slate-600 space-y-1 bg-orange-50 p-2 rounded-lg">
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {item.advLy && <div><span className="font-semibold">Ly:</span> {item.advLy}</div>}
                                {item.compEr && <div><span className="font-semibold">Comp:</span> {item.compEr}</div>}
                                {item.superEst && <div><span className="font-semibold">Super:</span> {item.superEst}</div>}
                            </div>
                          </div>
                        )}

                        {/* LİSTE GÖRÜNÜMÜNDE CÜMLE + SES */}
                        {!isTrash && (
                          <div className="mt-2 pt-2 border-t border-slate-50 flex gap-2 items-start group">
                            <button 
                                onClick={(e) => speak(item.sentence, e)}
                                className="shrink-0 p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                                title="Cümleyi Oku"
                            >
                                <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="text-xs text-slate-400 italic leading-relaxed py-0.5">
                                "{item.sentence}"
                            </div>
                          </div>
                        )}

                        {isTrash && !canRestore && (
                          <div className="text-[10px] text-slate-400 italic mt-1">
                            Bu kelimenin aktif bir versiyonu zaten var
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        {isTrash ? (
                          <div className="flex flex-col items-end gap-2">
                            {canRestore && (
                              <button
                                onClick={() => restoreWord(item)}
                                className="px-3 py-1 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 text-xs font-semibold"
                              >
                                Geri Yükle
                              </button>
                            )}
                            {isUser && (
                              <button
                                onClick={() => permanentlyDeleteWord(item)}
                                className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-xs font-semibold"
                              >
                                Tamamen Sil
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {item.source === "user" && (
                              <button
                                onClick={() => {
                                  setEditingWord(item);
                                  setReturnView(currentView);
                                  setCurrentView("edit_word");
                                }}
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {isKnown ? (
                              <button
                                onClick={() =>
                                  handleRemoveFromKnown(item.id)
                                }
                                className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                              >
                                <RotateCcw className="w-5 h-5" />
                              </button>
                            ) : null}
                            {item.source === "user" && (
                              <button
                                onClick={() => handleDeleteWord(item.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- DICTIONARY VIEW ---
  if (currentView === "dictionary") {
    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-md space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={handleGoHome} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm">
                        <ArrowLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800">Sözlük</h2>
                </div>

                <form onSubmit={handleDictionarySearch} className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Kelime ara (İngilizce)..." 
                        value={dictSearchTerm}
                        onChange={(e) => setDictSearchTerm(e.target.value)}
                        className="w-full pl-12 p-4 rounded-2xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        autoFocus
                    />
                    <button type="submit" className="absolute right-2 top-2 bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors">
                        Ara
                    </button>
                </form>

                {dictError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        {dictError}
                    </div>
                )}

                {/* ÇOKLU SONUÇ LİSTELEME */}
                {dictResults.length > 0 && (
                    <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                          <div className="text-center text-sm text-slate-500">
                            {dictResults.length} sonuç bulundu:
                          </div>
                          {dictResults.map((resultWord) => (
                             <div key={resultWord.id} className="flex justify-center">
                                 <WordCard wordObj={resultWord} />
                             </div>
                          ))}
                    </div>
                )}

                {dictResults.length === 0 && !dictError && (
                    <div className="text-center text-slate-400 mt-10">
                        <Book className="w-20 h-20 mx-auto mb-4 opacity-20" />
                        <p>Aramak istediğin kelimeyi yaz.</p>
                    </div>
                )}
            </div>
        </div>
    )
  }

  // --- QUIZ VIEW (KESİN ÇÖZÜM - GEÇİŞ EFEKTİ İLE) ---
  if (currentView === "quiz") {
      // Eğer geçiş yapılıyorsa (soru değişiyorsa) ekrana yükleniyor simgesi koy.
      // Bu işlem eski butonları DOM'dan tamamen siler.
      if (quizTransition) {
          return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
          );
      }

      const currentQuestion = quizQuestions[quizIndex];
      const progress = ((quizIndex + 1) / quizQuestions.length) * 100;

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
            <div className="w-full max-w-md space-y-6 mt-4">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <button onClick={handleGoHome} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="font-bold text-indigo-600">
                        Soru {quizIndex + 1} / {quizQuestions.length}
                    </div>
                    <div className="flex items-center gap-1 bg-amber-100 text-amber-600 px-2 py-1 rounded-lg font-bold text-sm">
                        <Trophy className="w-4 h-4" /> {quizScore}
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-500 ease-out" style={{width: `${progress}%`}}></div>
                </div>

                {/* Question Card */}
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 text-center space-y-6 mt-6 animate-in fade-in zoom-in duration-300">
                    <div className="inline-block bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Bu kelimenin anlamı nedir?
                    </div>
                    <h2 className="text-4xl font-extrabold text-slate-800">{currentQuestion.wordObj.word}</h2>
                    <button onClick={() => speak(currentQuestion.wordObj.word)} className="mx-auto p-2 bg-slate-50 rounded-full text-indigo-500 hover:bg-indigo-50 transition-colors">
                        <Volume2 className="w-6 h-6" />
                    </button>
                </div>

                {/* Options */}
                <div className="space-y-3 mt-6">
                    {currentQuestion.options.map((option, idx) => {
                        let btnClass = "w-full p-4 rounded-xl text-left font-medium border-2 transition-all active:scale-95 shadow-sm ";
                        
                        if (quizIsAnswered) {
                            if (option === currentQuestion.correctAnswer) {
                                btnClass += "bg-green-100 border-green-500 text-green-700";
                            } else if (option === quizSelectedOption) {
                                btnClass += "bg-red-100 border-red-500 text-red-700";
                            } else {
                                btnClass += "bg-white border-slate-100 text-slate-400 opacity-50";
                            }
                        } else {
                            btnClass += "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";
                        }

                        return (
                            <button 
                                key={idx} 
                                onClick={() => handleQuizAnswer(option)}
                                disabled={quizIsAnswered}
                                className={btnClass}
                            >
                                {option}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
      )
  }

  // --- QUIZ RESULT VIEW ---
  if (currentView === "quiz_result") {
      const maxScore = quizQuestions.length * 5;
      const successRate = (quizScore / maxScore) * 100;
      let message = "Daha çok çalışmalısın.";
      if (successRate > 50) message = "Fena değil!";
      if (successRate > 80) message = "Harika iş!";

      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
              <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
                    <div className="inline-block p-4 rounded-full bg-yellow-100 text-yellow-500 mb-2">
                        <Trophy className="w-12 h-12" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Test Tamamlandı!</h2>
                        <p className="text-slate-500">{message}</p>
                    </div>

                    <div className="py-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-sm text-slate-400 uppercase font-bold tracking-wider">Toplam Puan</div>
                        <div className="text-5xl font-extrabold text-indigo-600 mt-2">{quizScore}</div>
                        <div className="text-xs text-slate-400 mt-1">/ {maxScore}</div>
                    </div>

                    <button onClick={handleGoHome} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                        Ana Sayfaya Dön
                    </button>
                    <button onClick={handleStartQuiz} className="w-full bg-white text-slate-600 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                        Tekrar Dene
                    </button>
              </div>
          </div>
      )
  }

  // --- SESSION COMPLETE ---
  if (sessionComplete) {
    const allWords = getAllWords();
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          {allWords.length - knownWordIds.length === 0 ? (
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          ) : (
            <BookOpen className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {allWords.length - knownWordIds.length === 0
              ? "Tebrikler!"
              : "Oturum Tamamlandı"}
          </h2>
          {allWords.length - knownWordIds.length === 0 ? (
            <p className="text-slate-600 mb-6">Tüm kelimeleri öğrendin!</p>
          ) : (
            <>
              <div className="flex justify-center gap-8 my-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {sessionStats.known}
                  </div>
                  <div className="text-sm text-slate-500">Öğrendim</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">
                    {sessionStats.learning}
                  </div>
                  <div className="text-sm text-slate-500">Çalışmalıyım</div>
                </div>
              </div>
              <p className="text-slate-600 mb-6">
                Kalan kelime: {allWords.length - knownWordIds.length}
              </p>
            </>
          )}
          <button
            onClick={handleStartGame}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <RotateCcw className="w-5 h-5" /> Yeni Oturum Başlat
          </button>
          <button
            onClick={handleGoHome}
            className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" /> Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  // --- GAME VIEW ---
  if (currentView === "game") {
    const currentCard = sessionWords[currentIndex];
    const gameProgress =
      sessionWords.length === 0
        ? 0
        : (currentIndex / sessionWords.length) * 100;

    return (
      <div className="flex flex-col min-h-screen bg-slate-100 overflow-hidden">
        <div className="bg-white shadow-sm p-4 z-10">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
              <button
                onClick={handleGoHome}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
              <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                {currentIndex + 1} / {sessionWords.length}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${gameProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 relative">
          {currentCard && (
            <div
              className={`relative w-full max-w-sm transition-all duration-300 transform ${
                swipeDirection === "left"
                  ? "-translate-x-24 -rotate-6 opacity-0"
                  : ""
              } ${
                swipeDirection === "right"
                  ? "translate-x-24 rotate-6 opacity-0"
                  : ""
              }`}
            >
              <WordCard wordObj={currentCard} />
            </div>
          )}
        </div>
        <div className="pb-10 px-6 max-w-md mx-auto w-full">
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleSwipe("left")}
              disabled={!!swipeDirection}
              className="flex-1 bg-white border-2 border-orange-100 hover:bg-orange-50 text-orange-500 font-bold py-4 px-6 rounded-2xl shadow-sm active:scale-95 transition-all flex flex-col items-center gap-1"
            >
              <div className="p-3 bg-orange-100 rounded-full mb-1">
                <X className="w-6 h-6" />
              </div>
              <span>Öğreniyorum</span>
              <span className="text-xs opacity-60 font-normal">(Sol)</span>
            </button>
            <button
              onClick={() => handleSwipe("right")}
              disabled={!!swipeDirection}
              className="flex-1 bg-white border-2 border-green-100 hover:bg-green-50 text-green-600 font-bold py-4 px-6 rounded-2xl shadow-sm active:scale-95 transition-all flex flex-col items-center gap-1"
            >
              <div className="p-3 bg-green-100 rounded-full mb-1">
                <Check className="w-6 h-6" />
              </div>
              <span>Biliyorum</span>
              <span className="text-xs opacity-60 font-normal">(Sağ)</span>
            </button>
          </div>
          <button
            onClick={handleEndSessionEarly}
            className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-medium mx-auto"
          >
            <Target className="w-4 h-4" /> Pes Et ve Bitir
          </button>
        </div>
      </div>
    );
  }

  // --- HOME ---
  if (currentView === "home") {
    const allWords = getAllWords();
    const progressPercentage =
      (knownWordIds.length / allWords.length) * 100 || 0;
    const remainingCount = allWords.length - knownWordIds.length;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
        <div className="w-full max-w-md space-y-6 mt-2">
          
          {/* 1. YENİ ÜST BAR: Butonlar artık burada ve içerikle çakışmaz */}
          <div className="flex justify-between items-center w-full px-1">
            <button
              onClick={resetProfileToDefaults}
              className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 transition-transform active:scale-95 flex items-center gap-2"
              title="Varsayılan Ayarlara Dön"
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 transition-transform active:scale-95 flex items-center gap-2"
              title="Çıkış Yap"
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* 2. HEADER ALANI (Logo ve Seri) - Artık yukarıdan bağımsız */}
          <div className="text-center relative">
            <div className="flex justify-center mb-4 relative mt-4">
              <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg transform rotate-3 relative z-10">
                <Brain className="w-12 h-12 text-white" />
              </div>

              {/* Seri Göstergesi */}
              <div className="absolute -right-6 -top-2 flex flex-col items-center z-20">
                <div className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded-full shadow-lg border-2 border-white">
                  <Flame className="w-4 h-4 fill-white" />
                  <span className="font-bold text-sm">{streak}</span>
                </div>
                <span className="text-xs font-bold text-orange-600 mt-1 bg-orange-100 px-2 rounded-full">
                  Günlük Seri
                </span>
              </div>
            </div>

            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              Kelime Defteri
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              Merhaba, <span className="font-medium text-indigo-600">{user.displayName || user.email}</span>
            </p>
          </div>

          {/* İLERLEME KARTI */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium text-slate-500">
                Genel İlerleme
              </span>
              <span className="text-2xl font-bold text-indigo-600">
                %{progressPercentage.toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <div className="text-center p-2 flex-1 border-r border-slate-100">
                <div className="font-bold text-slate-800">
                  {knownWordIds.length}
                </div>
                <div className="text-slate-400">Öğrenilen</div>
              </div>
              <div className="text-center p-2 flex-1">
                <div className="font-bold text-slate-800">
                  {remainingCount}
                </div>
                <div className="text-slate-400">Kalan</div>
              </div>
            </div>
          </div>

          {/* MENÜ BUTONLARI */}
          <div className="space-y-3 pb-8">
            {isAdmin && (
              <button
                onClick={() => setCurrentView("admin_dashboard")}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Shield className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-base">Admin Paneli</div>
                    <div className="text-xs text-slate-400 font-normal">
                      Sistem yönetimi
                    </div>
                  </div>
                </div>
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleStartGame}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95 flex flex-col items-center gap-2 text-center"
              >
                <div className="bg-white/20 p-2 rounded-full">
                  <Play className="w-6 h-6" fill="currentColor" />
                </div>
                <span className="text-sm">
                  Yeni Oyun
                  <br />
                  Başlat
                </span>
              </button>

              <button
                onClick={() => setCurrentView("dictionary")}
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 px-4 rounded-xl shadow-md shadow-sky-200 transition-all active:scale-95 flex flex-col items-center gap-2 text-center"
              >
                <div className="bg-white/20 p-2 rounded-full">
                  <Book className="w-6 h-6" />
                </div>
                <span className="text-sm">
                  Sözlükte
                  <br />
                  Ara
                </span>
              </button>
            </div>

            <button
              onClick={handleStartQuiz}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-6 rounded-xl shadow-md shadow-amber-200 transition-all active:scale-95 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-lg">Kelime Testi (Quiz)</div>
                  <div className="text-xs text-amber-100 font-normal">
                    Soru - Cevap Modu
                  </div>
                </div>
              </div>
              <ArrowLeft className="w-5 h-5 rotate-180 opacity-60" />
            </button>

            <button
              onClick={() => {
                setEditingWord(null);
                setReturnView("home");
                setCurrentView("add_word");
              }}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border-2 border-dashed border-slate-300 font-bold py-4 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-base">Yeni Kelime Ekle</div>
                  <div className="text-xs text-slate-400 font-normal">
                    Kendi kelimelerini oluştur
                  </div>
                </div>
              </div>
              <Plus className="w-5 h-5 opacity-40" />
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCurrentView("unknown_list")}
                className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-bold py-4 px-4 rounded-xl transition-all active:scale-95 flex flex-col items-center gap-2 text-center"
              >
                <div className="bg-orange-100 p-2 rounded-full text-orange-500">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-sm">
                  Öğreneceğim
                  <br />
                  Kelimeler
                </span>
              </button>
              <button
                onClick={() => setCurrentView("known_list")}
                className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-bold py-4 px-4 rounded-xl transition-all active:scale-95 flex flex-col items-center gap-2 text-center"
              >
                <div className="bg-green-100 p-2 rounded-full text-green-600">
                  <Check className="w-5 h-5" />
                </div>
                <span className="text-sm">
                  Öğrendiğim
                  <br />
                  Kelimeler
                </span>
              </button>
            </div>

            <button
              onClick={() => setCurrentView("trash")}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full text-red-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Silinen Kelimeler</div>
                  <div className="text-xs text-slate-400 font-normal">
                    Çöp kutusundan geri yükle
                  </div>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 rotate-180 opacity-40" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- FALLBACK VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Bir Şeyler Ters Gitti
        </h1>
        <p className="text-slate-500 mb-4">
          Sayfa yüklenemedi veya geçersiz bir durum oluştu.
        </p>
        <button
          onClick={handleGoHome}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}


