import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  collection, getDocs, deleteDoc, addDoc, increment, onSnapshot, query, orderBy, limit, writeBatch 
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

  const getCurrentWeekKey = () => {
    const d = new Date();
    const day = d.getDay(); 
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) setIsAdmin(true);
      else setIsAdmin(false);
      if (!currentUser) {
        setLoading(false); 
        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); 
        setDynamicSystemWords([]); setLearningQueue([]); setStreak(0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) { 
        loadAllData();
        subscribeToLeaderboard(); 
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const systemWordsRef = collection(db, "artifacts", appId, "system_words");
        const userWordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
        const userProfileRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");

        const [systemSnapshot, userWordsSnapshot, docSnap] = await Promise.all([
            getDocs(systemWordsRef),
            getDocs(userWordsRef),
            getDoc(userProfileRef)
        ]);

        const sysWords = [];
        const sysWordSet = new Set();
        systemSnapshot.forEach((doc) => {
            const d = doc.data();
            sysWords.push({ ...d, id: doc.id, source: "system" });
            if(d.word) sysWordSet.add(d.word.toLowerCase().trim());
        });
        setDynamicSystemWords(sysWords);

        const usrWords = [];
        userWordsSnapshot.forEach(doc => {
            usrWords.push({ ...doc.data(), id: doc.id, source: "user" });
        });
        setCustomWords(usrWords);

        let currentDeleted = [];
        let currentKnown = [];
        let currentQueue = [];
        let currentStreak = 0;

        if (docSnap.exists()) {
            const data = docSnap.data();
            currentDeleted = data.deleted_ids || [];
            currentKnown = data.known_ids || [];
            currentQueue = data.learning_queue || [];
            currentStreak = data.streak || 0;

            const todayStr = new Date().toISOString().split("T")[0];
            const lastVisit = data.last_visit_date;
            if (lastVisit !== todayStr) {
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split("T")[0];
                if (lastVisit === yesterdayStr) currentStreak += 1; else currentStreak = 1;
                setDoc(userProfileRef, { last_visit_date: todayStr, streak: currentStreak }, { merge: true });
            }
        } else {
            const todayStr = new Date().toISOString().split("T")[0];
            setDoc(userProfileRef, { last_visit_date: todayStr, streak: 1 }, { merge: true });
            currentStreak = 1;
        }

        let newDeletedIds = [...currentDeleted];
        let dirty = false;

        usrWords.forEach(uWord => {
            if (sysWordSet.has(uWord.word.toLowerCase().trim())) {
                const uIdStr = String(uWord.id);
                if (!currentDeleted.includes(uIdStr)) {
                    newDeletedIds.push(uIdStr);
                    dirty = true;
                }
            }
        });

        if (dirty) {
            updateDoc(userProfileRef, { deleted_ids: newDeletedIds });
            currentDeleted = newDeletedIds;
        }

        setDeletedWordIds(currentDeleted);
        setKnownWordIds(currentKnown);
        setLearningQueue(currentQueue);
        setStreak(currentStreak);

    } catch (e) {
        console.error("Veri yükleme hatası:", e);
    } finally {
        setLoading(false);
    }
  };

  const subscribeToLeaderboard = () => {
      const weekKey = getCurrentWeekKey(); 
      const q = query(collection(db, "artifacts", appId, "weekly_scores", weekKey, "users"), orderBy("score", "desc"), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const leaders = [];
          snapshot.forEach((doc) => { leaders.push({ ...doc.data(), id: doc.id }); });
          setLeaderboardData(leaders);
      });
      return unsubscribe;
  };

  const addScore = async (points) => {
      if (!user || points <= 0) return;
      try {
          const weekKey = getCurrentWeekKey();
          const leaderboardRef = doc(db, "artifacts", appId, "weekly_scores", weekKey, "users", user.uid);
          await setDoc(leaderboardRef, {
              displayName: user.displayName || user.email.split('@')[0],
              photoURL: user.photoURL || "",
              score: increment(points), 
              lastUpdated: new Date()
          }, { merge: true });
      } catch (e) { console.error("Puan hatası:", e); }
  };

  const normalizeWord = (w) => {
    const isDynamic = dynamicSystemWords.some((d) => String(d.id) === String(w.id));
    const source = w.source || (isDynamic ? "system" : "user");
    return { 
        ...w, 
        source, 
        sentence_tr: w.sentence_tr || "",
        tags: Array.isArray(w.tags) ? w.tags : [],
        definitions: Array.isArray(w.definitions) 
          ? w.definitions.map(def => ({ 
              ...def, 
              engExplanation: def.engExplanation || "",
              trExplanation: def.trExplanation || "" 
            })) 
          : [{ type: "other", meaning: "", engExplanation: "", trExplanation: "" }] 
    };
  };

  const getAllWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    const system = dynamicSystemWords.filter(w => !deletedSet.has(String(w.id)));
    const custom = customWords.filter(w => !deletedSet.has(String(w.id)));
    return [...system, ...custom].map(normalizeWord);
  };
  
  const getDeletedWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    const systemDeleted = dynamicSystemWords.filter((w) => deletedSet.has(String(w.id))).map(normalizeWord);
    const customDeleted = customWords.filter((w) => deletedSet.has(String(w.id))).map(normalizeWord);
    return [...systemDeleted, ...customDeleted].sort((a, b) => a.word.localeCompare(b.word));
  };

  // ----------------------------------------------------------------
 // ----------------------------------------------------------------
  // --- HANDLE SMART LEARN (SENİN MANTIĞINA GÖRE GÜNCELLENDİ) ---
  const handleSmartLearn = async (wordId, action) => {
    try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const now = new Date();

        // 1. EZBERLEDİM -> Direkt Mezun
        if (action === "master") {
            await addToKnown(wordId);
            return;
        }

        // Mevcut seviyeyi bul
        const currentItem = learningQueue.find(q => String(q.wordId) === String(wordId));
        const currentLevel = currentItem ? (currentItem.level || 0) : 0;

        // İşlem başlayınca kelimeyi kuyruktan siliyoruz (yeni haliyle ekleyeceğiz)
        let newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));

        if (action === "know") {
            if (knownWordIds.includes(wordId)) return;

            if (currentLevel === 0) {
                // 0 -> 1 (Bekleme: 24 Saat)
                const nextDate = new Date();
                nextDate.setDate(now.getDate() + 1); // +1 Gün
                newQueue.push({ wordId, level: 1, nextReview: nextDate.toISOString() });

            } else if (currentLevel === 1) {
                // 1 -> 2 (Bekleme: 48 Saat)
                const nextDate = new Date();
                nextDate.setDate(now.getDate() + 2); // +2 Gün
                newQueue.push({ wordId, level: 2, nextReview: nextDate.toISOString() });

            } else if (currentLevel >= 2) {
                // 2 -> 3 (MEZUN OLDU -> Öğrendiklerime Git)
                await addToKnown(wordId);
                return; // Kuyruğa ekleme yapmıyoruz, bitti.
            }
        } 
        else if (action === "dont_know") {
            // Bilmiyorum dersen; Öğrenilenlerden çıkar, kuyruktan çıkar.
            // Böylece "Öğreneceğim" (Level 0) havuzuna düşer.
            if (knownWordIds.includes(wordId)) {
                await removeFromKnown(wordId);
            }
            // newQueue'ya ekleme yapmıyoruz.
        }

        // Veritabanını Güncelle
        await updateDoc(userRef, { learning_queue: newQueue });
        setLearningQueue(newQueue);

    } catch (e) {
        console.error("Hata:", e);
    }
  };

  const handleSaveNewWord = async (wordData) => {
    const normalizedInput = wordData.word.toLowerCase().trim();
    const allWords = getAllWords();
    if (allWords.some(w => w.word.toLowerCase() === normalizedInput)) return { success: false, message: "Zaten mevcut!" };
    const deletedList = getDeletedWords();
    if (deletedList.some(w => w.word.toLowerCase() === normalizedInput)) return { success: false, message: "Çöp kutusunda var!" };

    const newId = Date.now().toString();
    const newWord = {
      id: newId, 
      word: wordData.word.trim(),
      tags: wordData.tags || [],
      plural: wordData.plural||"", v2: wordData.v2||"", v3: wordData.v3||"", vIng: wordData.vIng||"", thirdPerson: wordData.thirdPerson||"",
      advLy: wordData.advLy||"", compEr: wordData.compEr||"", superEst: wordData.superEst||"",
      definitions: wordData.definitions, 
      sentence: wordData.sentence.trim(), 
      sentence_tr: wordData.sentence_tr || "",
      source: "user",
      createdAt: new Date()
    };
    try {
      const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", newId);
      await setDoc(wordRef, newWord);
      setCustomWords((prev) => [...prev, newWord]);
      return { success: true };
    } catch (e) { return { success: false, message: "Hata" }; }
  };

  const handleDeleteWord = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      const newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));
      await setDoc(userRef, { deleted_ids: arrayUnion(wordId), known_ids: arrayRemove(wordId), learning_queue: newQueue }, { merge: true });
      setDeletedWordIds(prev => [...prev, wordId]); setKnownWordIds(prev => prev.filter(id => String(id) !== String(wordId))); setLearningQueue(newQueue);
    } catch (e) { console.error(e); }
  };

  const handleUpdateWord = async (originalId, newData) => {
     try {
       const isCustom = customWords.find((w) => String(w.id) === String(originalId));
       const isKnown = knownWordIds.includes(originalId);
       if (isCustom) {
         const updatedWord = { ...isCustom, ...newData, source: "user" };
         const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", String(originalId));
         await updateDoc(wordRef, updatedWord);
         setCustomWords((prev) => prev.map((w) => (String(w.id) === String(originalId) ? updatedWord : w)));
       } else {
         const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
         await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
         const newId = Date.now().toString();
         const newCustomWord = { ...newData, id: newId, source: "user" };
         const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", newId);
         await setDoc(wordRef, newCustomWord);
         setDeletedWordIds((prev) => [...prev, originalId]); setCustomWords((prev) => [...prev, newCustomWord]);
         if (isKnown) {
           await updateDoc(userRef, { known_ids: arrayRemove(originalId) }); await updateDoc(userRef, { known_ids: arrayUnion(newCustomWord.id) });
           setKnownWordIds((prev) => prev.filter(id => String(id) !== String(originalId)).concat(newCustomWord.id));
         }
       }
     } catch (e) { console.error(e); }
  };

  const addToKnown = async (wordId) => {
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       const newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));
       await updateDoc(userRef, { known_ids: arrayUnion(wordId), learning_queue: newQueue });
       setKnownWordIds(prev => [...prev, wordId]); setLearningQueue(newQueue);
     } catch(e) { console.error(e); }
  };

  const removeFromKnown = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await updateDoc(userRef, { known_ids: arrayRemove(wordId) });
      setKnownWordIds((prev) => prev.filter((id) => String(id) !== String(wordId)));
    } catch (e) { console.error(e); }
  };

  const restoreWord = async (wordObj) => {
     const allWords = getAllWords();
     if (allWords.some(w => w.word.toLowerCase() === wordObj.word.toLowerCase())) { alert("Zaten var."); return; }
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       await updateDoc(userRef, { deleted_ids: arrayRemove(wordObj.id) });
       setDeletedWordIds((prev) => prev.filter((id) => String(id) !== String(wordObj.id)));
     } catch(e) { console.error(e); }
  };

  const permanentlyDeleteWord = async (wordObj) => {
     if (wordObj.source !== "user") return;
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       const newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordObj.id));
       await updateDoc(userRef, { deleted_ids: arrayRemove(wordObj.id), learning_queue: newQueue });
       
       const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", String(wordObj.id));
       await deleteDoc(wordRef);

       setCustomWords(prev => prev.filter(w => String(w.id) !== String(wordObj.id))); setDeletedWordIds(prev => prev.filter(id => String(id) !== String(wordObj.id))); setLearningQueue(newQueue);
     } catch(e) { console.error(e); }
  };

  const resetProfile = async () => {
      try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const today = new Date().toISOString().split("T")[0];
        await setDoc(userRef, { known_ids:[], deleted_ids:[], learning_queue: [], streak:1, last_visit_date: today });
        
        const batch = writeBatch(db);
        customWords.forEach(word => {
            const ref = doc(db, "artifacts", appId, "users", user.uid, "words", String(word.id));
            batch.delete(ref);
        });
        await batch.commit();

        const weekKey = getCurrentWeekKey();
        const leaderboardRef = doc(db, "artifacts", appId, "weekly_scores", weekKey, "users", user.uid);
        await deleteDoc(leaderboardRef);

        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); setLearningQueue([]); setStreak(1);
      } catch(e) { console.error(e); }
  };

  const handleSaveSystemWord = async (wordData) => {
    try {
      const normalizedInput = wordData.word.toLowerCase().trim();
      const exists = dynamicSystemWords.some(w => w.word.toLowerCase() === normalizedInput);
      if(exists) return { success: false, message: "Bu kelime zaten sistemde var!" };

      const newWord = { 
        ...wordData, 
        sentence_tr: wordData.sentence_tr || "",
        source: "system", 
        createdAt: new Date() 
      };
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
          setDynamicSystemWords(prev => prev.filter(w => String(w.id) !== String(wordId)));
      } catch(e) { console.error(e); }
  };

  const handleUpdateSystemWord = async (id, wordData) => {
      try {
          const docRef = doc(db, "artifacts", appId, "system_words", id);
          await updateDoc(docRef, { ...wordData, updatedAt: new Date() });
          setDynamicSystemWords(prev => prev.map(w => String(w.id) === String(id) ? { ...w, ...wordData } : w));
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
