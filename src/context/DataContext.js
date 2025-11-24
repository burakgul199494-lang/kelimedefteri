import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  collection, getDocs, deleteDoc, addDoc, increment, onSnapshot, query, orderBy, limit
} from "firebase/firestore";
import { auth, db, appId, ADMIN_EMAILS } from "../services/firebase";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [knownWordIds, setKnownWordIds] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [deletedWordIds, setDeletedWordIds] = useState([]);
  const [dynamicSystemWords, setDynamicSystemWords] = useState([]);
  const [streak, setStreak] = useState(0);
  const [learningQueue, setLearningQueue] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);

  // --- YARDIMCI: HAFTA ANAHTARI OLUŞTURUCU ---
  // Her haftanın Pazartesi gününün tarihini "YYYY-MM-DD" formatında döndürür.
  // Pazartesi gelince bu anahtar değişeceği için sistem yeni bir listeye geçer.
  const getCurrentWeekKey = () => {
    const d = new Date();
    const day = d.getDay(); // Pazar: 0, Pzt: 1, ...
    
    // Eğer gün Pazar (0) ise, bir önceki haftanın Pazartesi'sine gitmek için -6 yaparız.
    // Diğer günler için: (Gün - 1) kadar geri gideriz.
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().slice(0, 10); // Örn: "2025-11-24"
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) setIsAdmin(true);
      else setIsAdmin(false);
      if (!currentUser) {
        setLoading(false); setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); setDynamicSystemWords([]); setLearningQueue([]); setStreak(0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) { 
        fetchUserData(); 
        fetchDynamicSystemWords(); 
        subscribeToLeaderboard(); 
    }
  }, [user]);

  // --- GÜNCELLENDİ: HAFTALIK LİDERLİK DİNLEME ---
  const subscribeToLeaderboard = () => {
      const weekKey = getCurrentWeekKey(); // Bu haftanın kimliği (Örn: 2025-11-24)
      
      // Veri yolu: artifacts -> appId -> weekly_scores -> [HAFTA_ID] -> users
      const q = query(
          collection(db, "artifacts", appId, "weekly_scores", weekKey, "users"), 
          orderBy("score", "desc"), 
          limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
          const leaders = [];
          snapshot.forEach((doc) => {
              leaders.push({ ...doc.data(), id: doc.id });
          });
          setLeaderboardData(leaders);
      });
      return unsubscribe;
  };

  // --- GÜNCELLENDİ: PUAN EKLEME (HAFTALIK) ---
  const addScore = async (points) => {
      if (!user || points <= 0) return;
      try {
          const weekKey = getCurrentWeekKey(); // Bu haftanın kimliği
          
          // Puanı genel havuza değil, O HAFTANIN klasörüne yazıyoruz
          const leaderboardRef = doc(db, "artifacts", appId, "weekly_scores", weekKey, "users", user.uid);
          
          await setDoc(leaderboardRef, {
              displayName: user.displayName || user.email.split('@')[0],
              photoURL: user.photoURL || "",
              score: increment(points), 
              lastUpdated: new Date()
          }, { merge: true });
          
          console.log(`${points} puan eklendi! (Hafta: ${weekKey})`);
      } catch (e) {
          console.error("Puan ekleme hatası:", e);
      }
  };

  // ... (Aşağıdaki tüm fonksiyonlar AYNI kalacak) ...
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
        setLearningQueue(data.learning_queue || []);
        
        const todayStr = new Date().toISOString().split("T")[0];
        const lastVisit = data.last_visit_date;
        let currentStreak = data.streak || 0;
        if (lastVisit !== todayStr) {
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];
          if (lastVisit === yesterdayStr) currentStreak += 1; else currentStreak = 1;
          await setDoc(userRef, { last_visit_date: todayStr, streak: currentStreak }, { merge: true });
        }
        setStreak(currentStreak);
      } else {
        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(userRef, { last_visit_date: todayStr, streak: 1 }, { merge: true });
        setStreak(1);
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

  const normalizeWord = (w) => {
    const isDynamic = dynamicSystemWords.some((d) => d.id === w.id);
    const source = w.source || (isDynamic ? "system" : "user");
    return { 
        ...w, source, 
        tags: Array.isArray(w.tags) ? w.tags : [],
        definitions: Array.isArray(w.definitions) ? w.definitions.map(def => ({ ...def, engExplanation: def.engExplanation || "" })) : [{ type: "other", meaning: "", engExplanation: "" }] 
    };
  };

  const getAllWords = () => {
    const system = dynamicSystemWords.filter(w => !deletedWordIds.includes(w.id));
    const custom = customWords.filter(w => !deletedWordIds.includes(w.id));
    return [...system, ...custom].map(normalizeWord);
  };
  
  const getDeletedWords = () => {
    const systemDeleted = dynamicSystemWords.filter((w) => deletedWordIds.includes(w.id)).map(normalizeWord);
    const customDeleted = customWords.filter((w) => deletedWordIds.includes(w.id)).map(normalizeWord);
    return [...systemDeleted, ...customDeleted].sort((a, b) => a.word.localeCompare(b.word));
  };

  const handleSmartLearn = async (wordId, action) => {
    const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
    const currentProgress = learningQueue.find(q => q.wordId === wordId) || { wordId, level: 0 };
    let newQueue = [...learningQueue.filter(q => q.wordId !== wordId)];

    if (action === "know") {
        let nextLevel = (currentProgress.level || 0) + 1;
        let delayDays = 0;
        if (nextLevel === 1) delayDays = 2;
        else if (nextLevel === 2) delayDays = 3;
        
        if (nextLevel >= 3) {
            await addToKnown(wordId);
            await updateDoc(userRef, { learning_queue: newQueue });
            setLearningQueue(newQueue);
            return;
        }
        const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + delayDays);
        newQueue.push({ wordId, level: nextLevel, nextReview: nextDate.toISOString() });
    } else {
        newQueue.push({ wordId, level: 0, nextReview: new Date().toISOString() });
    }
    try { await updateDoc(userRef, { learning_queue: newQueue }); setLearningQueue(newQueue); } catch (e) { console.error(e); }
  };

  const handleSaveNewWord = async (wordData) => {
    const normalizedInput = wordData.word.toLowerCase().trim();
    const allWords = getAllWords();
    if (allWords.some(w => w.word.toLowerCase() === normalizedInput)) return { success: false, message: "Zaten mevcut!" };
    const deletedList = getDeletedWords();
    if (deletedList.some(w => w.word.toLowerCase() === normalizedInput)) return { success: false, message: "Çöp kutusunda var!" };

    const newWord = {
      id: Date.now(), word: wordData.word.trim(),
      tags: wordData.tags || [],
      plural: wordData.plural||"", v2: wordData.v2||"", v3: wordData.v3||"", vIng: wordData.vIng||"", thirdPerson: wordData.thirdPerson||"",
      advLy: wordData.advLy||"", compEr: wordData.compEr||"", superEst: wordData.superEst||"",
      definitions: wordData.definitions, sentence: wordData.sentence.trim(), source: "user",
    };
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await setDoc(userRef, { custom_words: arrayUnion(newWord) }, { merge: true });
      setCustomWords((prev) => [...prev, newWord]);
      return { success: true };
    } catch (e) { return { success: false, message: "Hata" }; }
  };

  const handleDeleteWord = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      const newQueue = learningQueue.filter(q => q.wordId !== wordId);
      await setDoc(userRef, { deleted_ids: arrayUnion(wordId), known_ids: arrayRemove(wordId), learning_queue: newQueue }, { merge: true });
      setDeletedWordIds(prev => [...prev, wordId]); setKnownWordIds(prev => prev.filter(id => id !== wordId)); setLearningQueue(newQueue);
    } catch (e) { console.error(e); }
  };

  const handleUpdateWord = async (originalId, newData) => {
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       const isCustom = customWords.find((w) => w.id === originalId);
       const isKnown = knownWordIds.includes(originalId);
       if (isCustom) {
         const updatedWord = { ...isCustom, ...newData, source: "user" };
         await updateDoc(userRef, { custom_words: arrayRemove(isCustom) }); await updateDoc(userRef, { custom_words: arrayUnion(updatedWord) });
         setCustomWords((prev) => prev.map((w) => (w.id === originalId ? updatedWord : w)));
       } else {
         await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
         const newCustomWord = { ...newData, id: Date.now(), source: "user" };
         await setDoc(userRef, { custom_words: arrayUnion(newCustomWord) }, { merge: true });
         setDeletedWordIds((prev) => [...prev, originalId]); setCustomWords((prev) => [...prev, newCustomWord]);
         if (isKnown) {
           await updateDoc(userRef, { known_ids: arrayRemove(originalId) }); await updateDoc(userRef, { known_ids: arrayUnion(newCustomWord.id) });
           setKnownWordIds((prev) => prev.filter(id => id !== originalId).concat(newCustomWord.id));
         }
       }
     } catch (e) { console.error(e); }
  };

  const addToKnown = async (wordId) => {
     try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const newQueue = learningQueue.filter(q => q.wordId !== wordId);
        await updateDoc(userRef, { known_ids: arrayUnion(wordId), learning_queue: newQueue });
        setKnownWordIds(prev => [...prev, wordId]); setLearningQueue(newQueue);
     } catch(e) { console.error(e); }
  };

  const removeFromKnown = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await updateDoc(userRef, { known_ids: arrayRemove(wordId) });
      setKnownWordIds((prev) => prev.filter((id) => id !== wordId));
    } catch (e) { console.error(e); }
  };

  const restoreWord = async (wordObj) => {
     const allWords = getAllWords();
     if (allWords.some(w => w.word.toLowerCase() === wordObj.word.toLowerCase())) { alert("Zaten var."); return; }
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       await updateDoc(userRef, { deleted_ids: arrayRemove(wordObj.id) });
       setDeletedWordIds((prev) => prev.filter((id) => id !== wordObj.id));
     } catch(e) { console.error(e); }
  };

  const permanentlyDeleteWord = async (wordObj) => {
     if (wordObj.source !== "user") return;
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       const newQueue = learningQueue.filter(q => q.wordId !== wordObj.id);
       await updateDoc(userRef, { custom_words: arrayRemove(wordObj), deleted_ids: arrayRemove(wordObj.id), learning_queue: newQueue });
       setCustomWords(prev => prev.filter(w => w.id !== wordObj.id)); setDeletedWordIds(prev => prev.filter(id => id !== wordObj.id)); setLearningQueue(newQueue);
     } catch(e) { console.error(e); }
  };

  const resetProfile = async () => {
      try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const today = new Date().toISOString().split("T")[0];
        await setDoc(userRef, { known_ids:[], custom_words:[], deleted_ids:[], learning_queue: [], streak:1, last_visit_date: today });
        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); setLearningQueue([]); setStreak(1);
      } catch(e) { console.error(e); }
  };

  // ADMIN
  const handleSaveSystemWord = async (wordData) => {
    try {
      const normalizedInput = wordData.word.toLowerCase().trim();
      const exists = dynamicSystemWords.some(w => w.word.toLowerCase() === normalizedInput);
      if(exists) return { success: false, message: "Bu kelime zaten sistemde var!" };

      const newWord = { ...wordData, source: "system", createdAt: new Date() };
      const docRef = await addDoc(collection(db, "artifacts", appId, "system_words"), newWord);
      setDynamicSystemWords(prev => [...prev, { ...newWord, id: docRef.id }]);

      const conflictingCustom = customWords.find(w => w.word.toLowerCase() === normalizedInput);
      if (conflictingCustom) {
          const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
          await setDoc(userRef, { deleted_ids: arrayUnion(conflictingCustom.id) }, { merge: true });
          setDeletedWordIds(prev => [...prev, conflictingCustom.id]);
      }
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  };

  const handleDeleteSystemWord = async (wordId) => {
      if(!window.confirm("Silmek istediğine emin misin?")) return;
      try {
          await deleteDoc(doc(db, "artifacts", appId, "system_words", wordId));
          setDynamicSystemWords(prev => prev.filter(w => w.id !== wordId));
      } catch(e) { console.error(e); }
  };

  const handleUpdateSystemWord = async (id, wordData) => {
      try {
          const docRef = doc(db, "artifacts", appId, "system_words", id);
          await updateDoc(docRef, { ...wordData, updatedAt: new Date() });
          setDynamicSystemWords(prev => prev.map(w => w.id === id ? { ...w, ...wordData } : w));
          return { success: true };
      } catch(e) { return { success: false, message: e.message }; }
  };

  return (
    <DataContext.Provider value={{
      user, isAdmin, loading,
      knownWordIds, customWords, dynamicSystemWords, deletedWordIds, streak, learningQueue, leaderboardData,
      getAllWords, getDeletedWords,
      handleSaveNewWord, handleDeleteWord, handleUpdateWord,
      addToKnown, removeFromKnown, restoreWord, permanentlyDeleteWord, resetProfile,
      handleSaveSystemWord, handleDeleteSystemWord, handleUpdateSystemWord,
      handleSmartLearn, addScore
    }}>
      {children}
    </DataContext.Provider>
  );
};
