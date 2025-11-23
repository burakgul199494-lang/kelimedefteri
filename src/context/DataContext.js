import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { auth, db, appId, ADMIN_EMAILS } from "../services/firebase";

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Veri State'leri
  const [knownWordIds, setKnownWordIds] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [deletedWordIds, setDeletedWordIds] = useState([]);
  const [dynamicSystemWords, setDynamicSystemWords] = useState([]);
  const [streak, setStreak] = useState(0);

  // Auth Dinleme
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(currentUser && ADMIN_EMAILS.includes(currentUser.email));
      if (!currentUser) {
        setLoading(false);
        // Reset
        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); setDynamicSystemWords([]); setStreak(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // Veri Çekme (User Değişince)
  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchDynamicSystemWords();
    }
  }, [user]);

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
        
        // Streak Mantığı
        const todayStr = new Date().toISOString().split("T")[0];
        const lastVisit = data.last_visit_date;
        let currentStreak = data.streak || 0;
        if (lastVisit !== todayStr) {
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split("T")[0];
            currentStreak = (lastVisit === yesterdayStr) ? currentStreak + 1 : 1;
            await setDoc(userRef, { last_visit_date: todayStr, streak: currentStreak }, { merge: true });
        }
        setStreak(currentStreak);
      } else {
        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(userRef, { last_visit_date: todayStr, streak: 1 }, { merge: true });
        setStreak(1);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchDynamicSystemWords = async () => {
    try {
      const qs = await getDocs(collection(db, "artifacts", appId, "system_words"));
      const words = [];
      qs.forEach((doc) => words.push({ ...doc.data(), id: doc.id, source: "system" }));
      setDynamicSystemWords(words);
    } catch (e) { console.error(e); }
  };

  // --- CRUD İşlemleri ---
  const addWord = async (wordData) => {
    // Backend'e ekleme mantığı
    const newWord = { ...wordData, id: Date.now(), source: "user" };
    try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        await setDoc(userRef, { custom_words: arrayUnion(newWord) }, { merge: true });
        setCustomWords(prev => [...prev, newWord]);
        return { success: true };
    } catch(e) { return { success: false, message: e.message }; }
  };

  const deleteWord = async (wordId) => {
      // Soft Delete
      try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        await setDoc(userRef, { deleted_ids: arrayUnion(wordId), known_ids: arrayRemove(wordId) }, { merge: true });
        setDeletedWordIds(prev => [...prev, wordId]);
        setKnownWordIds(prev => prev.filter(id => id !== wordId));
      } catch(e) { console.error(e); }
  };

  const markAsKnown = async (wordId) => {
      try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        await setDoc(userRef, { known_ids: arrayUnion(wordId) }, { merge: true });
        setKnownWordIds(prev => [...prev, wordId]);
      } catch(e) { console.error(e); }
  };

  const getAllWords = () => {
      // Kelime birleştirme ve normalizasyon mantığı
      const normalize = (w) => ({
          ...w, 
          source: w.source || (dynamicSystemWords.some(d => d.id === w.id) ? "system" : "user"),
          definitions: Array.isArray(w.definitions) ? w.definitions : [{ type: "other", meaning: "", engExplanation: "" }]
      });
      const system = dynamicSystemWords.filter(w => !deletedWordIds.includes(w.id));
      const custom = customWords.filter(w => !deletedWordIds.includes(w.id));
      return [...system, ...custom].map(normalize);
  };

  return (
    <DataContext.Provider value={{
      user, isAdmin, loading,
      knownWordIds, customWords, dynamicSystemWords, deletedWordIds, streak,
      addWord, deleteWord, markAsKnown, getAllWords,
      setCustomWords, setDeletedWordIds, setKnownWordIds, setDynamicSystemWords // İhtiyaç olursa
    }}>
      {children}
    </DataContext.Provider>
  );
};
