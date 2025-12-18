import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  collection, deleteDoc, addDoc, increment, onSnapshot, query, orderBy, limit, getDocs, writeBatch 
} from "firebase/firestore";
import { auth, db, appId, ADMIN_EMAILS } from "../services/firebase";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [authLoading, setAuthLoading] = useState(true);
  const [systemLoading, setSystemLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const [knownWordIds, setKnownWordIds] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [deletedWordIds, setDeletedWordIds] = useState([]);
  const [dynamicSystemWords, setDynamicSystemWords] = useState([]);
  const [streak, setStreak] = useState(0);
  const [learningQueue, setLearningQueue] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);

  const loading = authLoading || systemLoading || (user ? profileLoading : false);

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
      setAuthLoading(false);
      if (!currentUser) {
        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); 
        setLearningQueue([]); setStreak(0);
        setProfileLoading(false); 
      } else {
        setProfileLoading(true); 
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const systemWordsRef = collection(db, "artifacts", appId, "system_words");
    const unsub = onSnapshot(systemWordsRef, (snapshot) => {
        const sysWords = [];
        snapshot.forEach((doc) => {
            sysWords.push({ ...doc.data(), id: doc.id, source: "system" });
        });
        setDynamicSystemWords(sysWords);
        setSystemLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userWordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
    const unsubUserWords = onSnapshot(userWordsRef, (snapshot) => {
        const usrWords = [];
        snapshot.forEach(doc => {
            usrWords.push({ ...doc.data(), id: doc.id, source: "user" });
        });
        setCustomWords(usrWords);
    });

    const userProfileRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
    const unsubProfile = onSnapshot(userProfileRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setKnownWordIds(data.known_ids || []);
            setDeletedWordIds(data.deleted_ids || []);
            setLearningQueue(data.learning_queue || []);
            
            let currentStreak = data.streak || 0;
            const todayStr = new Date().toISOString().split("T")[0];
            const lastVisit = data.last_visit_date;

            if (lastVisit !== todayStr) {
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split("T")[0];
                if (lastVisit === yesterdayStr) currentStreak += 1; else currentStreak = 1;
                updateDoc(userProfileRef, { last_visit_date: todayStr, streak: currentStreak });
            }
            setStreak(currentStreak);
        } else {
            const todayStr = new Date().toISOString().split("T")[0];
            setDoc(userProfileRef, { last_visit_date: todayStr, streak: 1 }, { merge: true });
            setStreak(1);
        }
        setProfileLoading(false); 
    });

    const unsubLeaderboard = subscribeToLeaderboard();
    return () => { unsubUserWords(); unsubProfile(); unsubLeaderboard(); };
  }, [user?.uid]);

  const subscribeToLeaderboard = () => {
      const weekKey = getCurrentWeekKey(); 
      const q = query(collection(db, "artifacts", appId, "weekly_scores", weekKey, "users"), orderBy("score", "desc"), limit(50));
      return onSnapshot(q, (snapshot) => {
          const leaders = [];
          snapshot.forEach((doc) => { leaders.push({ ...doc.data(), id: doc.id }); });
          setLeaderboardData(leaders);
      });
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

  const updateGameStats = async (gameType, count = 1) => {
      if (!user) return;
      try {
          const weekKey = getCurrentWeekKey();
          const statsRef = doc(db, "artifacts", appId, "weekly_stats", weekKey, "user_activities", user.uid);
          await setDoc(statsRef, {
              [gameType]: increment(count),
              lastUpdated: new Date(),
              displayName: user.displayName || user.email
          }, { merge: true });
      } catch (e) { console.error("İstatistik hatası:", e); }
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
          ? w.definitions.map(def => ({ ...def, engExplanation: def.engExplanation || "", trExplanation: def.trExplanation || "" })) 
          : [{ type: "other", meaning: "", engExplanation: "", trExplanation: "" }] 
    };
  };

  const getAllWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    const system = dynamicSystemWords.filter(w => !deletedSet.has(String(w.id)));
    const custom = customWords.filter(w => !deletedSet.has(String(w.id)));
    
    // ÇİFT KELİME KONTROLÜ (DUPLICATE PREVENTION)
    // Eğer bir kelime hem 'custom' hem 'system' listesinde varsa (metin olarak),
    // Sadece 'custom' olanı göster, system olanı gizle.
    const customWordTexts = new Set(custom.map(w => w.word.toLowerCase().trim()));
    const uniqueSystem = system.filter(w => !customWordTexts.has(w.word.toLowerCase().trim()));

    return [...uniqueSystem, ...custom].map(normalizeWord);
  };
  
  const getDeletedWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    const systemDeleted = dynamicSystemWords.filter((w) => deletedSet.has(String(w.id))).map(normalizeWord);
    const customDeleted = customWords.filter((w) => deletedSet.has(String(w.id))).map(normalizeWord);
    return [...systemDeleted, ...customDeleted].sort((a, b) => a.word.localeCompare(b.word));
  };

  const handleSmartLearn = async (wordId, action) => {
    try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const now = new Date();
        if (action === "master") { await addToKnown(wordId); return; }
        
        const currentItem = learningQueue.find(q => String(q.wordId) === String(wordId));
        const currentLevel = currentItem ? (currentItem.level || 0) : 0;
        let newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));

        if (action === "know") {
            if (knownWordIds.includes(wordId)) return;
            const nextDate = new Date();
            if (currentLevel === 0) nextDate.setDate(now.getDate() + 1);
            else nextDate.setDate(now.getDate() + 2);
            
            if (currentLevel >= 2) await addToKnown(wordId);
            else {
                newQueue.push({ wordId, level: currentLevel + 1, nextReview: nextDate.toISOString() });
                await updateDoc(userRef, { learning_queue: newQueue });
            }
        } else if (action === "dont_know") {
            if (knownWordIds.includes(wordId)) await removeFromKnown(wordId);
            // Dont know durumunda da kuyruk güncellenmeli
            await updateDoc(userRef, { learning_queue: newQueue });
        }
    } catch (e) { console.error("Hata:", e); }
  };

  // --- KELİME GÜNCELLEME (DUPLICATE FIX) ---
  const handleUpdateWord = async (originalId, newData) => {
     try {
       // 1. Bu kelime zaten bir "Custom Word" mü? (ID ile kontrol)
       const existingCustomById = customWords.find((w) => String(w.id) === String(originalId));
       const isKnown = knownWordIds.includes(originalId);

       if (existingCustomById) {
         // EVET: Direkt güncelle
         const updatedWord = { ...existingCustomById, ...newData, source: "user" };
         const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", String(originalId));
         await updateDoc(wordRef, updatedWord);
       } else {
         // HAYIR: Bu bir "System Word". 
         const originalSystemWord = dynamicSystemWords.find(w => String(w.id) === String(originalId));
         if (!originalSystemWord) return;

         // !!! KRİTİK KONTROL !!! 
         // Bu sistem kelimesinin metniyle (örn: "Book") daha önce oluşturulmuş 
         // başka bir Custom Word var mı? Varsa YENİ OLUŞTURMA, ONU GÜNCELLE.
         const existingCustomByText = customWords.find(w => w.word.toLowerCase() === originalSystemWord.word.toLowerCase());

         const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");

         if (existingCustomByText) {
             // Zaten kopyası varmış! (Duplicate engelleme)
             // 1. Sistem kelimesini gizle (Deleted listesine ekle)
             await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
             
             // 2. Mevcut kopyayı güncelle
             const updatedWord = { ...existingCustomByText, ...newData, source: "user" };
             const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", existingCustomByText.id);
             await updateDoc(wordRef, updatedWord);

             // 3. ID değişimi gerekiyorsa listeleri güncelle
             // (Sistem ID'si yerine Custom ID kullanılmalı)
             if(isKnown) {
                 await updateDoc(userRef, { known_ids: arrayRemove(originalId) });
                 await updateDoc(userRef, { known_ids: arrayUnion(existingCustomByText.id) });
             }
         } else {
             // HİÇ YOKSA: Yeni kopya oluştur
             await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
             
             const newId = Date.now().toString();
             const newCustomWord = { 
                 ...originalSystemWord, 
                 ...newData, 
                 id: newId, 
                 source: "user" 
             };

             const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", newId);
             await setDoc(wordRef, newCustomWord);

             if (isKnown) {
               await updateDoc(userRef, { known_ids: arrayRemove(originalId) }); 
               await updateDoc(userRef, { known_ids: arrayUnion(newCustomWord.id) });
             }
             
             const queueItem = learningQueue.find(q => q.wordId === originalId);
             if (queueItem) {
                 const newQueue = learningQueue.filter(q => q.wordId !== originalId);
                 newQueue.push({ ...queueItem, wordId: newId });
                 await updateDoc(userRef, { learning_queue: newQueue });
             }
         }
       }
     } catch (e) { console.error(e); }
  };

  // --- FAZLALIKLARI TEMİZLEME (YENİ FONKSİYON) ---
  // Bunu bir kere Admin panelinden veya butondan çağırarak kopyaları silebilirsin.
  const cleanUpDuplicates = async () => {
      if(!user) return;
      try {
          const wordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
          const querySnapshot = await getDocs(wordsRef);
          
          const wordsMap = {}; // Kelime metnine göre grupla
          const batch = writeBatch(db);
          let deletedCount = 0;

          querySnapshot.forEach((doc) => {
              const data = doc.data();
              const text = data.word.toLowerCase().trim();
              if(!wordsMap[text]) wordsMap[text] = [];
              wordsMap[text].push({ id: doc.id, ...data });
          });

          // Her kelime grubu için kontrol et
          for (const text in wordsMap) {
              const duplicates = wordsMap[text];
              if (duplicates.length > 1) {
                  // Birden fazla varsa...
                  // En son güncellenen (veya en çok verisi olanı) tut, diğerlerini sil.
                  // Basitçe: ID'si (oluşturulma tarihi) en büyük olan kalsın.
                  duplicates.sort((a, b) => b.id.localeCompare(a.id)); // Yeniden eskiye
                  
                  // İlkini tut, diğerlerini sil
                  const [keep, ...remove] = duplicates;
                  
                  remove.forEach(w => {
                      const ref = doc(db, "artifacts", appId, "users", user.uid, "words", w.id);
                      batch.delete(ref);
                      deletedCount++;
                  });
              }
          }

          if(deletedCount > 0) {
              await batch.commit();
              alert(`${deletedCount} adet çift kelime temizlendi!`);
              window.location.reload();
          } else {
              alert("Çift kelime bulunamadı.");
          }

      } catch(e) { console.error(e); alert("Hata: " + e.message); }
  };

  const handleSaveNewWord = async (wordData) => {
    // ... (Eski kodlar aynı)
    const normalizedInput = wordData.word.toLowerCase().trim();
    const allWords = getAllWords();
    if (allWords.some(w => w.word.toLowerCase() === normalizedInput)) return { success: false, message: "Zaten mevcut!" };
    
    const newId = Date.now().toString();
    const newWord = {
      id: newId, word: wordData.word.trim(), tags: wordData.tags || [],
      plural: wordData.plural||"", v2: wordData.v2||"", v3: wordData.v3||"", vIng: wordData.vIng||"", thirdPerson: wordData.thirdPerson||"",
      advLy: wordData.advLy||"", compEr: wordData.compEr||"", superEst: wordData.superEst||"",
      definitions: wordData.definitions, sentence: wordData.sentence.trim(), sentence_tr: wordData.sentence_tr || "",
      source: "user", createdAt: new Date()
    };
    try {
      const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", newId);
      await setDoc(wordRef, newWord);
      return { success: true };
    } catch (e) { return { success: false, message: "Hata" }; }
  };

  const handleDeleteWord = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      const newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));
      await setDoc(userRef, { deleted_ids: arrayUnion(wordId), known_ids: arrayRemove(wordId), learning_queue: newQueue }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const addToKnown = async (wordId) => {
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       const newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));
       await updateDoc(userRef, { known_ids: arrayUnion(wordId), learning_queue: newQueue });
     } catch(e) { console.error(e); }
  };

  const removeFromKnown = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await updateDoc(userRef, { known_ids: arrayRemove(wordId) });
    } catch (e) { console.error(e); }
  };

  const restoreWord = async (wordObj) => {
     const allWords = getAllWords();
     if (allWords.some(w => w.word.toLowerCase() === wordObj.word.toLowerCase())) { alert("Zaten var."); return; }
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       await updateDoc(userRef, { deleted_ids: arrayRemove(wordObj.id) });
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
     } catch(e) { console.error(e); }
  };

  const resetProfile = async () => {
      try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const today = new Date().toISOString().split("T")[0];
        await setDoc(userRef, { known_ids: [], deleted_ids: [], learning_queue: [], streak: 1, last_visit_date: today });
        const weekKey = getCurrentWeekKey();
        const leaderboardRef = doc(db, "artifacts", appId, "weekly_scores", weekKey, "users", user.uid);
        await deleteDoc(leaderboardRef);
        const statsRef = doc(db, "artifacts", appId, "weekly_stats", weekKey, "user_activities", user.uid);
        await deleteDoc(statsRef);
        alert("İlerleme sıfırlandı. Kelimelerin güvende! ✅");
      } catch(e) { console.error(e); }
  };

  const handleSaveSystemWord = async (wordData) => {
    try {
      const normalizedInput = wordData.word.toLowerCase().trim();
      const exists = dynamicSystemWords.some(w => w.word.toLowerCase() === normalizedInput);
      if(exists) return { success: false, message: "Bu kelime zaten sistemde var!" };
      const newWord = { ...wordData, sentence_tr: wordData.sentence_tr || "", source: "system", createdAt: new Date() };
      await addDoc(collection(db, "artifacts", appId, "system_words"), newWord);
      const conflictingCustom = customWords.find(w => w.word.toLowerCase() === normalizedInput);
      if (conflictingCustom) {
          const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
          await setDoc(userRef, { deleted_ids: arrayUnion(conflictingCustom.id) }, { merge: true });
      }
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  };

  const handleDeleteSystemWord = async (wordId) => {
      if(!window.confirm("Silmek istediğine emin misin?")) return;
      try { await deleteDoc(doc(db, "artifacts", appId, "system_words", wordId)); } catch(e) { console.error(e); }
  };

  const handleUpdateSystemWord = async (id, wordData) => {
      try {
          const docRef = doc(db, "artifacts", appId, "system_words", id);
          await updateDoc(docRef, { ...wordData, updatedAt: new Date() });
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
      handleSaveSystemWord, handleDeleteSystemWord, handleUpdateSystemWord, cleanUpDuplicates,
      updateGameStats, getCurrentWeekKey, handleSmartLearn, addScore
    }}>
      {children}
    </DataContext.Provider>
  );
};import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  collection, deleteDoc, addDoc, increment, onSnapshot, query, orderBy, limit, getDocs, writeBatch 
} from "firebase/firestore";
import { auth, db, appId, ADMIN_EMAILS } from "../services/firebase";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [authLoading, setAuthLoading] = useState(true);
  const [systemLoading, setSystemLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const [knownWordIds, setKnownWordIds] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [deletedWordIds, setDeletedWordIds] = useState([]);
  const [dynamicSystemWords, setDynamicSystemWords] = useState([]);
  const [streak, setStreak] = useState(0);
  const [learningQueue, setLearningQueue] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);

  const loading = authLoading || systemLoading || (user ? profileLoading : false);

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
      setAuthLoading(false);
      if (!currentUser) {
        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); 
        setLearningQueue([]); setStreak(0);
        setProfileLoading(false); 
      } else {
        setProfileLoading(true); 
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const systemWordsRef = collection(db, "artifacts", appId, "system_words");
    const unsub = onSnapshot(systemWordsRef, (snapshot) => {
        const sysWords = [];
        snapshot.forEach((doc) => {
            sysWords.push({ ...doc.data(), id: doc.id, source: "system" });
        });
        setDynamicSystemWords(sysWords);
        setSystemLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userWordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
    const unsubUserWords = onSnapshot(userWordsRef, (snapshot) => {
        const usrWords = [];
        snapshot.forEach(doc => {
            usrWords.push({ ...doc.data(), id: doc.id, source: "user" });
        });
        setCustomWords(usrWords);
    });

    const userProfileRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
    const unsubProfile = onSnapshot(userProfileRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setKnownWordIds(data.known_ids || []);
            setDeletedWordIds(data.deleted_ids || []);
            setLearningQueue(data.learning_queue || []);
            
            let currentStreak = data.streak || 0;
            const todayStr = new Date().toISOString().split("T")[0];
            const lastVisit = data.last_visit_date;

            if (lastVisit !== todayStr) {
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split("T")[0];
                if (lastVisit === yesterdayStr) currentStreak += 1; else currentStreak = 1;
                updateDoc(userProfileRef, { last_visit_date: todayStr, streak: currentStreak });
            }
            setStreak(currentStreak);
        } else {
            const todayStr = new Date().toISOString().split("T")[0];
            setDoc(userProfileRef, { last_visit_date: todayStr, streak: 1 }, { merge: true });
            setStreak(1);
        }
        setProfileLoading(false); 
    });

    const unsubLeaderboard = subscribeToLeaderboard();
    return () => { unsubUserWords(); unsubProfile(); unsubLeaderboard(); };
  }, [user?.uid]);

  const subscribeToLeaderboard = () => {
      const weekKey = getCurrentWeekKey(); 
      const q = query(collection(db, "artifacts", appId, "weekly_scores", weekKey, "users"), orderBy("score", "desc"), limit(50));
      return onSnapshot(q, (snapshot) => {
          const leaders = [];
          snapshot.forEach((doc) => { leaders.push({ ...doc.data(), id: doc.id }); });
          setLeaderboardData(leaders);
      });
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

  const updateGameStats = async (gameType, count = 1) => {
      if (!user) return;
      try {
          const weekKey = getCurrentWeekKey();
          const statsRef = doc(db, "artifacts", appId, "weekly_stats", weekKey, "user_activities", user.uid);
          await setDoc(statsRef, {
              [gameType]: increment(count),
              lastUpdated: new Date(),
              displayName: user.displayName || user.email
          }, { merge: true });
      } catch (e) { console.error("İstatistik hatası:", e); }
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
          ? w.definitions.map(def => ({ ...def, engExplanation: def.engExplanation || "", trExplanation: def.trExplanation || "" })) 
          : [{ type: "other", meaning: "", engExplanation: "", trExplanation: "" }] 
    };
  };

  const getAllWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    const system = dynamicSystemWords.filter(w => !deletedSet.has(String(w.id)));
    const custom = customWords.filter(w => !deletedSet.has(String(w.id)));
    
    // ÇİFT KELİME KONTROLÜ (DUPLICATE PREVENTION)
    // Eğer bir kelime hem 'custom' hem 'system' listesinde varsa (metin olarak),
    // Sadece 'custom' olanı göster, system olanı gizle.
    const customWordTexts = new Set(custom.map(w => w.word.toLowerCase().trim()));
    const uniqueSystem = system.filter(w => !customWordTexts.has(w.word.toLowerCase().trim()));

    return [...uniqueSystem, ...custom].map(normalizeWord);
  };
  
  const getDeletedWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    const systemDeleted = dynamicSystemWords.filter((w) => deletedSet.has(String(w.id))).map(normalizeWord);
    const customDeleted = customWords.filter((w) => deletedSet.has(String(w.id))).map(normalizeWord);
    return [...systemDeleted, ...customDeleted].sort((a, b) => a.word.localeCompare(b.word));
  };

  const handleSmartLearn = async (wordId, action) => {
    try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const now = new Date();
        if (action === "master") { await addToKnown(wordId); return; }
        
        const currentItem = learningQueue.find(q => String(q.wordId) === String(wordId));
        const currentLevel = currentItem ? (currentItem.level || 0) : 0;
        let newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));

        if (action === "know") {
            if (knownWordIds.includes(wordId)) return;
            const nextDate = new Date();
            if (currentLevel === 0) nextDate.setDate(now.getDate() + 1);
            else nextDate.setDate(now.getDate() + 2);
            
            if (currentLevel >= 2) await addToKnown(wordId);
            else {
                newQueue.push({ wordId, level: currentLevel + 1, nextReview: nextDate.toISOString() });
                await updateDoc(userRef, { learning_queue: newQueue });
            }
        } else if (action === "dont_know") {
            if (knownWordIds.includes(wordId)) await removeFromKnown(wordId);
            // Dont know durumunda da kuyruk güncellenmeli
            await updateDoc(userRef, { learning_queue: newQueue });
        }
    } catch (e) { console.error("Hata:", e); }
  };

  // --- KELİME GÜNCELLEME (DUPLICATE FIX) ---
  const handleUpdateWord = async (originalId, newData) => {
     try {
       // 1. Bu kelime zaten bir "Custom Word" mü? (ID ile kontrol)
       const existingCustomById = customWords.find((w) => String(w.id) === String(originalId));
       const isKnown = knownWordIds.includes(originalId);

       if (existingCustomById) {
         // EVET: Direkt güncelle
         const updatedWord = { ...existingCustomById, ...newData, source: "user" };
         const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", String(originalId));
         await updateDoc(wordRef, updatedWord);
       } else {
         // HAYIR: Bu bir "System Word". 
         const originalSystemWord = dynamicSystemWords.find(w => String(w.id) === String(originalId));
         if (!originalSystemWord) return;

         // !!! KRİTİK KONTROL !!! 
         // Bu sistem kelimesinin metniyle (örn: "Book") daha önce oluşturulmuş 
         // başka bir Custom Word var mı? Varsa YENİ OLUŞTURMA, ONU GÜNCELLE.
         const existingCustomByText = customWords.find(w => w.word.toLowerCase() === originalSystemWord.word.toLowerCase());

         const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");

         if (existingCustomByText) {
             // Zaten kopyası varmış! (Duplicate engelleme)
             // 1. Sistem kelimesini gizle (Deleted listesine ekle)
             await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
             
             // 2. Mevcut kopyayı güncelle
             const updatedWord = { ...existingCustomByText, ...newData, source: "user" };
             const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", existingCustomByText.id);
             await updateDoc(wordRef, updatedWord);

             // 3. ID değişimi gerekiyorsa listeleri güncelle
             // (Sistem ID'si yerine Custom ID kullanılmalı)
             if(isKnown) {
                 await updateDoc(userRef, { known_ids: arrayRemove(originalId) });
                 await updateDoc(userRef, { known_ids: arrayUnion(existingCustomByText.id) });
             }
         } else {
             // HİÇ YOKSA: Yeni kopya oluştur
             await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
             
             const newId = Date.now().toString();
             const newCustomWord = { 
                 ...originalSystemWord, 
                 ...newData, 
                 id: newId, 
                 source: "user" 
             };

             const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", newId);
             await setDoc(wordRef, newCustomWord);

             if (isKnown) {
               await updateDoc(userRef, { known_ids: arrayRemove(originalId) }); 
               await updateDoc(userRef, { known_ids: arrayUnion(newCustomWord.id) });
             }
             
             const queueItem = learningQueue.find(q => q.wordId === originalId);
             if (queueItem) {
                 const newQueue = learningQueue.filter(q => q.wordId !== originalId);
                 newQueue.push({ ...queueItem, wordId: newId });
                 await updateDoc(userRef, { learning_queue: newQueue });
             }
         }
       }
     } catch (e) { console.error(e); }
  };

  // --- FAZLALIKLARI TEMİZLEME (YENİ FONKSİYON) ---
  // Bunu bir kere Admin panelinden veya butondan çağırarak kopyaları silebilirsin.
  const cleanUpDuplicates = async () => {
      if(!user) return;
      try {
          const wordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
          const querySnapshot = await getDocs(wordsRef);
          
          const wordsMap = {}; // Kelime metnine göre grupla
          const batch = writeBatch(db);
          let deletedCount = 0;

          querySnapshot.forEach((doc) => {
              const data = doc.data();
              const text = data.word.toLowerCase().trim();
              if(!wordsMap[text]) wordsMap[text] = [];
              wordsMap[text].push({ id: doc.id, ...data });
          });

          // Her kelime grubu için kontrol et
          for (const text in wordsMap) {
              const duplicates = wordsMap[text];
              if (duplicates.length > 1) {
                  // Birden fazla varsa...
                  // En son güncellenen (veya en çok verisi olanı) tut, diğerlerini sil.
                  // Basitçe: ID'si (oluşturulma tarihi) en büyük olan kalsın.
                  duplicates.sort((a, b) => b.id.localeCompare(a.id)); // Yeniden eskiye
                  
                  // İlkini tut, diğerlerini sil
                  const [keep, ...remove] = duplicates;
                  
                  remove.forEach(w => {
                      const ref = doc(db, "artifacts", appId, "users", user.uid, "words", w.id);
                      batch.delete(ref);
                      deletedCount++;
                  });
              }
          }

          if(deletedCount > 0) {
              await batch.commit();
              alert(`${deletedCount} adet çift kelime temizlendi!`);
              window.location.reload();
          } else {
              alert("Çift kelime bulunamadı.");
          }

      } catch(e) { console.error(e); alert("Hata: " + e.message); }
  };

  const handleSaveNewWord = async (wordData) => {
    // ... (Eski kodlar aynı)
    const normalizedInput = wordData.word.toLowerCase().trim();
    const allWords = getAllWords();
    if (allWords.some(w => w.word.toLowerCase() === normalizedInput)) return { success: false, message: "Zaten mevcut!" };
    
    const newId = Date.now().toString();
    const newWord = {
      id: newId, word: wordData.word.trim(), tags: wordData.tags || [],
      plural: wordData.plural||"", v2: wordData.v2||"", v3: wordData.v3||"", vIng: wordData.vIng||"", thirdPerson: wordData.thirdPerson||"",
      advLy: wordData.advLy||"", compEr: wordData.compEr||"", superEst: wordData.superEst||"",
      definitions: wordData.definitions, sentence: wordData.sentence.trim(), sentence_tr: wordData.sentence_tr || "",
      source: "user", createdAt: new Date()
    };
    try {
      const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", newId);
      await setDoc(wordRef, newWord);
      return { success: true };
    } catch (e) { return { success: false, message: "Hata" }; }
  };

  const handleDeleteWord = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      const newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));
      await setDoc(userRef, { deleted_ids: arrayUnion(wordId), known_ids: arrayRemove(wordId), learning_queue: newQueue }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const addToKnown = async (wordId) => {
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       const newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));
       await updateDoc(userRef, { known_ids: arrayUnion(wordId), learning_queue: newQueue });
     } catch(e) { console.error(e); }
  };

  const removeFromKnown = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await updateDoc(userRef, { known_ids: arrayRemove(wordId) });
    } catch (e) { console.error(e); }
  };

  const restoreWord = async (wordObj) => {
     const allWords = getAllWords();
     if (allWords.some(w => w.word.toLowerCase() === wordObj.word.toLowerCase())) { alert("Zaten var."); return; }
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       await updateDoc(userRef, { deleted_ids: arrayRemove(wordObj.id) });
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
     } catch(e) { console.error(e); }
  };

  const resetProfile = async () => {
      try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const today = new Date().toISOString().split("T")[0];
        await setDoc(userRef, { known_ids: [], deleted_ids: [], learning_queue: [], streak: 1, last_visit_date: today });
        const weekKey = getCurrentWeekKey();
        const leaderboardRef = doc(db, "artifacts", appId, "weekly_scores", weekKey, "users", user.uid);
        await deleteDoc(leaderboardRef);
        const statsRef = doc(db, "artifacts", appId, "weekly_stats", weekKey, "user_activities", user.uid);
        await deleteDoc(statsRef);
        alert("İlerleme sıfırlandı. Kelimelerin güvende! ✅");
      } catch(e) { console.error(e); }
  };

  const handleSaveSystemWord = async (wordData) => {
    try {
      const normalizedInput = wordData.word.toLowerCase().trim();
      const exists = dynamicSystemWords.some(w => w.word.toLowerCase() === normalizedInput);
      if(exists) return { success: false, message: "Bu kelime zaten sistemde var!" };
      const newWord = { ...wordData, sentence_tr: wordData.sentence_tr || "", source: "system", createdAt: new Date() };
      await addDoc(collection(db, "artifacts", appId, "system_words"), newWord);
      const conflictingCustom = customWords.find(w => w.word.toLowerCase() === normalizedInput);
      if (conflictingCustom) {
          const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
          await setDoc(userRef, { deleted_ids: arrayUnion(conflictingCustom.id) }, { merge: true });
      }
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  };

  const handleDeleteSystemWord = async (wordId) => {
      if(!window.confirm("Silmek istediğine emin misin?")) return;
      try { await deleteDoc(doc(db, "artifacts", appId, "system_words", wordId)); } catch(e) { console.error(e); }
  };

  const handleUpdateSystemWord = async (id, wordData) => {
      try {
          const docRef = doc(db, "artifacts", appId, "system_words", id);
          await updateDoc(docRef, { ...wordData, updatedAt: new Date() });
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
      handleSaveSystemWord, handleDeleteSystemWord, handleUpdateSystemWord, cleanUpDuplicates,
      updateGameStats, getCurrentWeekKey, handleSmartLearn, addScore
    }}>
      {children}
    </DataContext.Provider>
  );
};
