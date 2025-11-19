import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
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
  BookOpen, Check, X, RotateCcw, Trophy, Loader2, Brain, Home, Play, Trash2,
  ArrowLeft, Plus, Edit2, Save, AlertCircle, Volume2, LogOut, Globe, Mail,
  Lock, Flag, Shield, Search, HelpCircle
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "burak-ingilizce-pro";

// --- ADMIN AYARLARI ---
const ADMIN_EMAILS = ["burakgul1994@outlook.com.tr"];

// --- SYSTEM WORDS ---
const BASE_WORD_LIST = [];

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
  const [dynamicSystemWords, setDynamicSystemWords] = useState([]);

  // Game States
  const [sessionWords, setSessionWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [sessionStats, setSessionStats] = useState({ known: 0, learning: 0 });

  // Quiz States
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizStats, setQuizStats] = useState({ correct: 0, wrong: 0 });
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const [currentView, setCurrentView] = useState("home");
  const [editingWord, setEditingWord] = useState(null);
  const [returnView, setReturnView] = useState("unknown_list");

  const [searchKnown, setSearchKnown] = useState("");
  const [searchUnknown, setSearchUnknown] = useState("");
  const [searchTrash, setSearchTrash] = useState("");
  const [adminSearch, setAdminSearch] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) setIsAdmin(true);
      else setIsAdmin(false);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) { fetchUserData(); fetchDynamicSystemWords(); }
    else { setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); setDynamicSystemWords([]); setCurrentView("home"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setKnownWordIds(data.known_ids || []); setCustomWords(data.custom_words || []); setDeletedWordIds(data.deleted_ids || []);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchDynamicSystemWords = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "artifacts", appId, "system_words"));
      const words = [];
      querySnapshot.forEach((doc) => words.push({ ...doc.data(), id: doc.id, source: "system" }));
      setDynamicSystemWords(words);
    } catch (e) { console.error(e); }
  };
  const handleSaveSystemWord = async (wordData) => {
    try {
      const newWord = {
        word: wordData.word.trim(), plural: wordData.plural || "", v2: wordData.v2 || "", v3: wordData.v3 || "",
        definitions: wordData.definitions, sentence: wordData.sentence.trim(), source: "system", createdAt: new Date()
      };
      const docRef = await addDoc(collection(db, "artifacts", appId, "system_words"), newWord);
      setDynamicSystemWords(prev => [...prev, { ...newWord, id: docRef.id }]);
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  };

  const handleUpdateSystemWord = async (id, wordData) => {
    try {
      const updatedData = {
        word: wordData.word.trim(), plural: wordData.plural || "", v2: wordData.v2 || "", v3: wordData.v3 || "",
        definitions: wordData.definitions, sentence: wordData.sentence.trim(), updatedAt: new Date()
      };
      const docRef = doc(db, "artifacts", appId, "system_words", id);
      await updateDoc(docRef, updatedData);
      setDynamicSystemWords(prev => prev.map(w => w.id === id ? { ...w, ...updatedData } : w));
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  };

  const handleDeleteSystemWord = async (wordId) => {
    if (!window.confirm("Silmek istediğine emin misin?")) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "system_words", wordId));
      setDynamicSystemWords((prev) => prev.filter((w) => w.id !== wordId));
    } catch (e) { alert("Hata oluştu."); }
  };

  useEffect(() => {
    if (!user || customWords.length === 0) return;
    const allBaseWords = [...dynamicSystemWords];
    const baseWordsLower = allBaseWords.map((b) => b.word.toLowerCase());
    const duplicates = customWords.filter((cw) => baseWordsLower.includes(cw.word.toLowerCase()) && !deletedWordIds.includes(cw.id));
    if (duplicates.length === 0) return;
    const moveDuplicates = async () => {
      try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const idsToAdd = duplicates.map((w) => w.id);
        await updateDoc(userRef, { deleted_ids: arrayUnion(...idsToAdd) });
        setDeletedWordIds((prev) => [...prev, ...idsToAdd]);
      } catch (e) { console.error(e); }
    };
    moveDuplicates();
  }, [user, customWords, deletedWordIds, dynamicSystemWords]);

  const handleLogout = async () => { await signOut(auth); };
  const speak = (text, e) => {
    if (e) e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US"; utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const normalizeWord = (w) => {
    const isDynamic = dynamicSystemWords.some((d) => d.id === w.id);
    const source = w.source || (isDynamic ? "system" : "user");
    return { ...w, source, plural: w.plural || "", v2: w.v2 || "", v3: w.v3 || "", definitions: Array.isArray(w.definitions) ? w.definitions : [{ type: "other", meaning: "" }] };
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

  const canRestoreWord = (word) => { const allWords = getAllWords(); return !allWords.some((w) => w.word.toLowerCase() === word.word.toLowerCase()); };
  const restoreWord = async (word) => {
    if (!canRestoreWord(word)) { alert("Bu kelime zaten var."); return; }
    try { const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress"); await updateDoc(userRef, { deleted_ids: arrayRemove(word.id) }); setDeletedWordIds((prev) => prev.filter((id) => id !== word.id)); } catch (e) { console.error(e); }
  };
  const permanentlyDeleteWord = async (word) => {
    if (word.source !== "user") return;
    try { const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress"); await updateDoc(userRef, { custom_words: arrayRemove(word), deleted_ids: arrayRemove(word.id) }); setCustomWords((prev) => prev.filter((w) => w.id !== word.id)); setDeletedWordIds((prev) => prev.filter((id) => id !== word.id)); } catch (e) { console.error(e); }
  };

  const handleStartGame = () => {
    const allWords = getAllWords();
    const unknownWords = allWords.filter((w) => !knownWordIds.includes(w.id));
    if (unknownWords.length === 0) { setSessionComplete(true); return; }
    const shuffled = [...unknownWords].sort(() => 0.5 - Math.random());
    setSessionWords(shuffled.slice(0, WORDS_PER_SESSION));
    setCurrentIndex(0); setSessionComplete(false); setSessionStats({ known: 0, learning: 0 });
    setSwipeDirection(null); setCurrentView("game");
  };

  const startQuiz = () => {
    const allWords = getAllWords();
    if (allWords.length < 4) { alert("Test için en az 4 kelime gerekli!"); return; }
    setQuizStats({ correct: 0, wrong: 0 }); generateQuizQuestion(allWords); setCurrentView("quiz");
  };

  const generateQuizQuestion = (wordsSource) => {
    setQuizAnswered(false); setSelectedOption(null);
    const target = wordsSource[Math.floor(Math.random() * wordsSource.length)];
    const others = wordsSource.filter(w => w.id !== target.id);
    const distractors = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [target, ...distractors].sort(() => 0.5 - Math.random());
    setQuizQuestion({ target, options });
  };

  const handleQuizAnswer = (optionId) => {
    if (quizAnswered) return;
    setQuizAnswered(true); setSelectedOption(optionId);
    if (optionId === quizQuestion.target.id) { speak("Correct!"); setQuizStats(prev => ({ ...prev, correct: prev.correct + 1 })); }
    else { speak("Wrong"); setQuizStats(prev => ({ ...prev, wrong: prev.wrong + 1 })); }
  };

  const nextQuizQuestion = () => { generateQuizQuestion(getAllWords()); };
  const handleEndSessionEarly = () => { setSessionComplete(true); };
  const handleSwipe = async (direction) => {
    if (currentIndex >= sessionWords.length) return;
    const currentWord = sessionWords[currentIndex];
    setSwipeDirection(direction);
    setTimeout(async () => {
      if (direction === "right") {
        try { const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress"); await setDoc(userRef, { known_ids: arrayUnion(currentWord.id) }, { merge: true }); setKnownWordIds((prev) => [...prev, currentWord.id]); setSessionStats((prev) => ({ ...prev, known: prev.known + 1 })); } catch (e) {}
      } else { setSessionStats((prev) => ({ ...prev, learning: prev.learning + 1 })); }
      if (currentIndex + 1 < sessionWords.length) { setCurrentIndex(prev => prev + 1); setSwipeDirection(null); } else { setSessionComplete(true); setSwipeDirection(null); }
    }, 300);
  };

  const handleSaveNewWord = async (wordData) => {
    const allWords = getAllWords();
    const exists = allWords.find((w) => w.word.toLowerCase() === wordData.word.toLowerCase().trim());
    if (exists) return { success: false, message: "Bu kelime zaten mevcut!" };
    const newWord = { id: Date.now(), word: wordData.word.trim(), plural: wordData.plural || "", v2: wordData.v2 || "", v3: wordData.v3 || "", definitions: wordData.definitions, sentence: wordData.sentence.trim(), source: "user" };
    try { const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress"); await setDoc(userRef, { custom_words: arrayUnion(newWord) }, { merge: true }); setCustomWords((prev) => [...prev, newWord]); return { success: true }; } catch (e) { return { success: false, message: "Hata oluştu." }; }
  };

  const handleDeleteWord = async (wordId) => {
    try { const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress"); await setDoc(userRef, { deleted_ids: arrayUnion(wordId), known_ids: arrayRemove(wordId) }, { merge: true }); setDeletedWordIds((prev) => [...prev, wordId]); setKnownWordIds((prev) => prev.filter((id) => id !== wordId)); } catch (e) { console.error(e); }
  };

  const handleUpdateWord = async (originalId, newData) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      const isCustom = customWords.find((w) => w.id === originalId);
      const isKnown = knownWordIds.includes(originalId);
      const newCustomWord = { ...newData, id: isCustom ? isCustom.id : Date.now(), source: "user" };
      if (isCustom) { await updateDoc(userRef, { custom_words: arrayRemove(isCustom) }); await updateDoc(userRef, { custom_words: arrayUnion(newCustomWord) }); setCustomWords(prev => prev.map(w => w.id === originalId ? newCustomWord : w)); }
      else { await setDoc(userRef, { deleted_ids: arrayUnion(originalId), custom_words: arrayUnion(newCustomWord) }, { merge: true }); setDeletedWordIds(p => [...p, originalId]); setCustomWords(p => [...p, newCustomWord]); if (isKnown) { await updateDoc(userRef, { known_ids: arrayRemove(originalId) }); await updateDoc(userRef, { known_ids: arrayUnion(newCustomWord.id) }); setKnownWordIds(p => p.filter(id => id !== originalId).concat(newCustomWord.id)); } }
      setEditingWord(null);
    } catch (e) { console.error(e); }
  };

  const handleRemoveFromKnown = async (wordId) => { try { const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress"); await updateDoc(userRef, { known_ids: arrayRemove(wordId) }); setKnownWordIds((prev) => prev.filter((id) => id !== wordId)); } catch (e) { console.error(e); } };
  const handleGoHome = () => { setCurrentView("home"); setSessionComplete(false); setEditingWord(null); };
  const resetProfileToDefaults = async () => { if (!window.confirm("Tüm ilerlemen silinecek. Emin misin?")) return; try { const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress"); await setDoc(userRef, { known_ids: [], custom_words: [], deleted_ids: [] }); setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); alert("Sıfırlandı."); } catch (e) { console.error(e); } };
  const getShortTypeLabel = (typeKey) => { const map = { noun: "n.", verb: "v.", adjective: "adj.", adverb: "adv.", prep: "prep.", pronoun: "pron.", conj: "conj.", article: "art.", other: "other" }; return map[typeKey] || ""; };
  const renderSourceBadge = (source) => <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${source === "system" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>{source === "system" ? "Sistem" : "Kullanıcı"}</span>;
const AuthScreen = () => {
    const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
    const login = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, pass); } catch (e) { alert(e.message); } };
    const google = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { alert(e.message); } };
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-sm">
          <div className="text-center mb-8"><div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3"><Brain className="text-white" /></div><h1 className="text-2xl font-bold">Burak İngilizce</h1></div>
          <button onClick={google} className="w-full bg-white border p-3 rounded-xl mb-4 font-bold flex justify-center gap-2"><Globe className="text-blue-500" /> Google ile Gir</button>
          <form onSubmit={login} className="space-y-3">
            <input className="w-full p-3 border rounded-xl" type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input className="w-full p-3 border rounded-xl" type="password" placeholder="Şifre" onChange={e => setPass(e.target.value)} />
            <button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold">Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center">Yükleniyor...</div>;
  if (!user) return <AuthScreen />;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (currentView === "admin_dashboard" && isAdmin) {
    const filtered = dynamicSystemWords.filter(w => w.word.toLowerCase().includes(adminSearch.toLowerCase())).sort((a, b) => a.word.localeCompare(b.word));
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6"><button onClick={handleGoHome} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft /></button><h2 className="font-bold text-xl flex items-center gap-2"><Shield /> Admin Paneli</h2></div>
          <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-blue-100"><div className="text-blue-800 font-bold text-lg text-center">{dynamicSystemWords.length} Kelime</div><div className="text-center text-xs text-slate-400">Sistemde kayıtlı</div></div>
          <button onClick={() => { setEditingWord(null); setCurrentView("add_system_word"); }} className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl mb-6 flex justify-center gap-2 hover:bg-slate-900"><Plus /> Yeni Kelime Ekle</button>
          <div className="relative mb-4"><Search className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" /><input type="text" placeholder="Ara..." value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} className="w-full pl-10 p-3 rounded-xl border outline-none focus:border-slate-400" /></div>
          <div className="space-y-2">
            {filtered.map(w => (
              <div key={w.id} className="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm">
                <div><div className="font-bold text-slate-800">{w.word}</div><div className="text-xs text-slate-500">{w.definitions[0]?.meaning}</div></div>
                <div className="flex gap-2"><button onClick={() => { setEditingWord(w); setCurrentView("add_system_word"); }} className="p-2 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100"><Edit2 size={16} /></button><button onClick={() => handleDeleteSystemWord(w.id)} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button></div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-center text-slate-400 p-4">Sonuç yok.</div>}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === "add_system_word" && isAdmin) {
    const isEdit = !!editingWord;
    const FormComponent = () => {
      const [form, setForm] = useState(isEdit ? { ...editingWord } : { word: "", plural: "", v2: "", v3: "", definitions: [{ type: "noun", meaning: "" }], sentence: "" });
      const [err, setErr] = useState("");
      const save = async (e) => {
        e.preventDefault();
        if (!form.word || !form.sentence) return setErr("Eksik bilgi.");
        const exists = dynamicSystemWords.some(w => w.word.toLowerCase() === form.word.toLowerCase().trim() && (!isEdit || w.id !== editingWord.id));
        if (exists) return setErr("Bu kelime zaten var!");
        if (isEdit) await handleUpdateSystemWord(editingWord.id, form); else await handleSaveSystemWord(form);
        setEditingWord(null); setCurrentView("admin_dashboard");
      };
      return (
        <div className="min-h-screen bg-slate-800 p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg">{isEdit ? "Düzenle" : "Ekle"}</h2><button onClick={() => { setEditingWord(null); setCurrentView("admin_dashboard") }}><X /></button></div>
            {err && <div className="bg-red-50 text-red-600 p-2 rounded mb-2 text-sm">{err}</div>}
            <form onSubmit={save} className="space-y-3">
              <input value={form.word} onChange={e => setForm({ ...form, word: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Kelime" />
              <div className="flex gap-2"><input value={form.v2} onChange={e => setForm({ ...form, v2: e.target.value })} className="w-1/2 p-2 border rounded" placeholder="V2" /><input value={form.v3} onChange={e => setForm({ ...form, v3: e.target.value })} className="w-1/2 p-2 border rounded" placeholder="V3" /></div>
              {form.definitions.map((d, i) => (<div key={i} className="flex gap-2"><input value={d.meaning} onChange={e => { const n = [...form.definitions]; n[i].meaning = e.target.value; setForm({ ...form, definitions: n }) }} className="w-full p-2 border rounded" placeholder="Anlam" /></div>))}
              <textarea value={form.sentence} onChange={e => setForm({ ...form, sentence: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Cümle" />
              <button className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">Kaydet</button>
            </form>
          </div>
        </div>
      )
    };
    return <FormComponent />;
  }

  if (currentView === "add_word" || currentView === "edit_word") {
    const isEdit = currentView === "edit_word";
    const FormComponent = () => {
      const [form, setForm] = useState(isEdit && editingWord ? normalizeWord(editingWord) : { word: "", plural: "", v2: "", v3: "", definitions: [{ type: "noun", meaning: "" }], sentence: "" });
      const save = async (e) => {
        e.preventDefault();
        if (isEdit) await handleUpdateWord(editingWord.id, form); else await handleSaveNewWord(form);
        setEditingWord(null); setCurrentView(returnView);
      };
      return (
        <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between mb-4"><h2 className="font-bold">{isEdit ? "Düzenle" : "Ekle"}</h2><button onClick={() => { setEditingWord(null); setCurrentView(returnView) }}><X /></button></div>
            <form onSubmit={save} className="space-y-3">
              <input value={form.word} onChange={e => setForm({ ...form, word: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Kelime" />
              <div className="flex gap-2"><input value={form.v2} onChange={e => setForm({ ...form, v2: e.target.value })} className="w-1/2 p-2 border rounded" placeholder="V2" /><input value={form.v3} onChange={e => setForm({ ...form, v3: e.target.value })} className="w-1/2 p-2 border rounded" placeholder="V3" /></div>
              {form.definitions.map((d, i) => (<div key={i} className="flex gap-2"><input value={d.meaning} onChange={e => { const n = [...form.definitions]; n[i].meaning = e.target.value; setForm({ ...form, definitions: n }) }} className="w-full p-2 border rounded" placeholder="Anlam" /></div>))}
              <textarea value={form.sentence} onChange={e => setForm({ ...form, sentence: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Cümle" />
              <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Kaydet</button>
            </form>
          </div>
        </div>
      )
    };
    return <FormComponent />
  }

  if (currentView === "quiz" && quizQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-4">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-8"><button onClick={handleGoHome} className="p-2 bg-white rounded-full border shadow-sm"><X size={20} className="text-slate-500" /></button><div className="flex gap-4 font-bold"><div className="text-green-600 flex items-center gap-1"><Check size={18} /> {quizStats.correct}</div><div className="text-red-500 flex items-center gap-1"><X size={18} /> {quizStats.wrong}</div></div></div>
          <div className="bg-white p-8 rounded-3xl shadow-lg text-center mb-6 border-2 border-indigo-50"><span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 block">Bu kelimenin anlamı ne?</span><h1 className="text-4xl font-extrabold text-slate-800 mb-4">{quizQuestion.target.word}</h1><button onClick={() => speak(quizQuestion.target.word)} className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200"><Volume2 size={24} /></button></div>
          <div className="grid grid-cols-1 gap-3 mb-6">
            {quizQuestion.options.map((option) => {
              let btnClass = "bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-300";
              if (quizAnswered) { if (option.id === quizQuestion.target.id) btnClass = "bg-green-100 border-2 border-green-500 text-green-800"; else if (option.id === selectedOption && option.id !== quizQuestion.target.id) btnClass = "bg-red-100 border-2 border-red-500 text-red-800"; else btnClass = "bg-slate-50 border-slate-100 text-slate-400 opacity-50"; }
              return (<button key={option.id} onClick={() => handleQuizAnswer(option.id)} disabled={quizAnswered} className={`p-4 rounded-xl font-bold text-lg transition-all text-left flex items-center justify-between ${btnClass}`}><span>{option.definitions[0].meaning}</span>{quizAnswered && option.id === quizQuestion.target.id && <Check size={20} />}{quizAnswered && option.id === selectedOption && option.id !== quizQuestion.target.id && <X size={20} />}</button>);
            })}
          </div>
          {quizAnswered && <button onClick={nextQuizQuestion} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2">Sonraki Soru <ArrowLeft className="rotate-180" /></button>}
        </div>
      </div>
    );
  }

  if (currentView === "home") {
    const allWords = getAllWords();
    const progressPercentage = (knownWordIds.length / allWords.length) * 100 || 0;
    const remainingCount = allWords.length - knownWordIds.length;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6">
        <div className="w-full max-w-md space-y-8 mt-4">
          <div className="text-center relative">
            <button onClick={resetProfileToDefaults} className="absolute left-0 top-0 p-2 bg-white border rounded-full"><RotateCcw size={18} /></button>
            <button onClick={handleLogout} className="absolute right-0 top-0 p-2 bg-white border rounded-full"><LogOut size={18} /></button>
            <div className="flex justify-center mb-4"><div className="bg-indigo-600 p-4 rounded-2xl shadow-lg rotate-3"><Brain className="w-12 h-12 text-white" /></div></div>
            <h1 className="text-3xl font-bold text-slate-800">Burak İngilizce</h1>
            <p className="text-slate-500">Merhaba, {user.email}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border"><div className="flex justify-between items-end mb-2"><span className="text-sm text-slate-500">İlerleme</span><span className="text-2xl font-bold text-indigo-600">%{progressPercentage.toFixed(1)}</span></div><div className="w-full bg-slate-100 h-3 rounded-full mb-4"><div className="bg-indigo-600 h-3 rounded-full" style={{ width: `${progressPercentage}%` }}></div></div><div className="flex text-sm"><div className="flex-1 text-center border-r"><b>{knownWordIds.length}</b><br />Öğrenilen</div><div className="flex-1 text-center"><b>{remainingCount}</b><br />Kalan</div></div></div>
          <div className="space-y-3">
            {isAdmin && <button onClick={() => setCurrentView("admin_dashboard")} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl shadow flex items-center justify-between px-6"><div className="flex gap-3 items-center"><Shield className="w-5 h-5 text-yellow-400" /> Admin Paneli</div></button>}
            <button onClick={handleStartGame} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-between px-6"><div className="flex gap-3 items-center"><div className="bg-white/20 p-2 rounded-lg"><Play className="w-6 h-6" /></div> <div className="text-left"><div className="text-lg">Kart Oyunu</div><div className="text-xs opacity-80">Ezber modu</div></div></div><ArrowLeft className="rotate-180 opacity-60" /></button>
            <button onClick={startQuiz} className="w-full bg-violet-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-between px-6"><div className="flex gap-3 items-center"><div className="bg-white/20 p-2 rounded-lg"><HelpCircle className="w-6 h-6" /></div> <div className="text-left"><div className="text-lg">Kelime Testi</div><div className="text-xs opacity-80">Çoktan seçmeli</div></div></div><ArrowLeft className="rotate-180 opacity-60" /></button>
            <button onClick={() => { setEditingWord(null); setReturnView("home"); setCurrentView("add_word"); }} className="w-full bg-white border-2 border-dashed border-slate-300 text-slate-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2"><Plus /> Kelime Ekle</button>
            <div className="grid grid-cols-2 gap-3"><button onClick={() => setCurrentView("unknown_list")} className="bg-white border font-bold py-4 rounded-xl flex flex-col items-center"><BookOpen className="text-orange-500 mb-1" /><span className="text-sm">Liste</span></button><button onClick={() => setCurrentView("known_list")} className="bg-white border font-bold py-4 rounded-xl flex flex-col items-center"><Check className="text-green-600 mb-1" /><span className="text-sm">Öğrendiğim</span></button></div>
            <button onClick={() => setCurrentView("trash")} className="w-full bg-white border py-3 rounded-xl text-slate-600 font-bold flex justify-center gap-2"><Trash2 className="text-red-500" /> Çöp Kutusu</button>
          </div>
        </div>
      </div>
    );
  }

  const ListComponent = ({ listType }) => {
    const allWords = getAllWords();
    let listData = [];
    let title = "";
    let searchVal = listType === "known" ? searchKnown : (listType === "trash" ? searchTrash : searchUnknown);
    let setSearchVal = listType === "known" ? setSearchKnown : (listType === "trash" ? setSearchTrash : setSearchUnknown);
    if (listType === "known") { listData = allWords.filter(w => knownWordIds.includes(w.id)); title = `Öğrendiğim (${listData.length})`; }
    else if (listType === "trash") { listData = getDeletedWords(); title = `Silinen (${listData.length})`; }
    else { listData = allWords.filter(w => !knownWordIds.includes(w.id)); title = `Öğreneceğim (${listData.length})`; }
    const filtered = listData.filter(w => w.word.toLowerCase().includes(searchVal.toLowerCase())).sort((a, b) => a.word.localeCompare(b.word));
    const getBadge = (source) => <span className={`text-[10px] px-2 rounded-full ${source === "system" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>{source === "system" ? "Sistem" : "Kullanıcı"}</span>;
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4 sticky top-0 bg-slate-50 py-2 z-10"><button onClick={handleGoHome} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft /></button><h2 className="text-xl font-bold">{title}</h2></div>
          <input type="text" placeholder="Ara..." value={searchVal} onChange={(e) => setSearchVal(e.target.value)} className="w-full p-3 mb-4 bg-white border rounded-xl outline-none" />
          <div className="space-y-3">
            {filtered.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1"><div className="flex items-center gap-2 flex-wrap mb-1"><span className="text-lg font-bold">{item.word}</span>{getBadge(item.source)}<button onClick={(e) => speak(item.word, e)} className="p-1 text-indigo-500 bg-indigo-50 rounded-full"><Volume2 size={16} /></button></div><div className="text-sm text-slate-700">{item.definitions[0].meaning}</div></div>
                  <div className="flex flex-col gap-1 ml-2">
                    {listType !== "trash" && item.source === "user" && <button onClick={() => { setEditingWord(item); setReturnView(listType === "known" ? "known_list" : "unknown_list"); setCurrentView("edit_word"); }} className="p-2 text-blue-400"><Edit2 size={16} /></button>}
                    {listType === "known" && <button onClick={() => handleRemoveFromKnown(item.id)} className="p-2 text-amber-500"><RotateCcw size={16} /></button>}
                    {listType === "trash" && canRestoreWord(item) && <button onClick={() => restoreWord(item)} className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Geri Al</button>}
                    {listType !== "trash" && item.source === "user" && <button onClick={() => handleDeleteWord(item.id)} className="p-2 text-red-400"><X size={16} /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (currentView === "known_list") return <ListComponent listType="known" />;
  if (currentView === "unknown_list") return <ListComponent listType="unknown" />;
  if (currentView === "trash") return <ListComponent listType="trash" />;

  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Oturum Bitti</h2>
          <div className="flex justify-center gap-8 my-6"><div><div className="text-3xl font-bold text-green-600">{sessionStats.known}</div><div className="text-sm">Öğrendim</div></div><div><div className="text-3xl font-bold text-orange-500">{sessionStats.learning}</div><div className="text-sm">Tekrar</div></div></div>
          <button onClick={handleStartGame} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mb-3">Yeni Oyun</button>
          <button onClick={handleGoHome} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl">Ana Sayfa</button>
        </div>
      </div>
    )
  }

  if (currentView === "game") {
    const currentCard = sessionWords[currentIndex];
    const gameProgress = (currentIndex / sessionWords.length) * 100;
    return (
      <div className="flex flex-col min-h-screen bg-slate-100 overflow-hidden">
        <div className="bg-white p-4"><div className="max-w-md mx-auto"><div className="bg-slate-200 h-2 rounded-full"><div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${gameProgress}%` }}></div></div></div></div>
        <div className="flex-1 flex items-center justify-center p-4 relative">
          {currentCard && (
            <div className={`relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center transition-all duration-300 ${swipeDirection === "left" ? "-translate-x-24 opacity-0" : ""} ${swipeDirection === "right" ? "translate-x-24 opacity-0" : ""}`}>
              <div className="flex justify-center gap-2 mb-2"><span className="text-xs font-bold text-slate-400">KELİME</span> {renderSourceBadge(currentCard.source)}</div>
              <h2 className="text-5xl font-extrabold text-slate-800 mb-6">{currentCard.word} <button onClick={() => speak(currentCard.word)}><Volume2 className="inline w-6 h-6 text-indigo-600" /></button></h2>
              <div className="space-y-4"><div className="bg-indigo-50 p-4 rounded-xl"><p className="text-2xl font-medium text-indigo-900">{currentCard.definitions[0].meaning}</p></div><div className="bg-slate-50 p-4 rounded-xl italic text-slate-600">"{currentCard.sentence}"</div></div>
            </div>
          )}
        </div>
        <div className="pb-10 px-6 max-w-md mx-auto w-full flex gap-4"><button onClick={() => handleSwipe("left")} disabled={!!swipeDirection} className="flex-1 bg-white border-2 border-orange-100 text-orange-500 font-bold py-4 rounded-xl shadow-sm">Öğreniyorum</button><button onClick={() => handleSwipe("right")} disabled={!!swipeDirection} className="flex-1 bg-white border-2 border-green-100 text-green-600 font-bold py-4 rounded-xl shadow-sm">Biliyorum</button></div>
        <button onClick={handleEndSessionEarly} className="pb-4 text-center text-slate-400 text-sm">Bitir</button>
      </div>
    )
  }

  return <div>Yükleniyor...</div>;
}
