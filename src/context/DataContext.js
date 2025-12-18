import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  collection, deleteDoc, addDoc, increment, onSnapshot, query, orderBy, limit, getDocs, writeBatch, where 
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

  // --- Veri State'leri ---
  const [knownWordIds, setKnownWordIds] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [deletedWordIds, setDeletedWordIds] = useState([]);
  const [dynamicSystemWords, setDynamicSystemWords] = useState([]);
  const [blacklistedWords, setBlacklistedWords] = useState([]); 
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

  // 1. OTURUM DİNLEME
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) setIsAdmin(true);
      else setIsAdmin(false);

      setAuthLoading(false);

      if (!currentUser) {
        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); 
        setLearningQueue([]); setStreak(0);
        setBlacklistedWords([]);
        setProfileLoading(false); 
      } else {
        setProfileLoading(true); 
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. SİSTEM KELİMELERİNİ DİNLE
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

  // 3. KARA LİSTEYİ DİNLE
  useEffect(() => {
    const blacklistRef = collection(db, "artifacts", appId, "blacklist");
    const unsub = onSnapshot(blacklistRef, (snapshot) => {
        const banned = new Set();
        snapshot.forEach((doc) => {
            if(doc.data().word) banned.add(doc.data().word.toLowerCase().trim());
        });
        setBlacklistedWords(Array.from(banned));
    });
    return () => unsub();
  }, []);

  // 4. KULLANICI VERİLERİNİ DİNLE
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
    // Normalizasyon sırasında kaynak kontrolü yapma, bunu getAllWords'e bıraktık
    return { 
        ...w, 
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

  // --- KELİMELERİ GETİR (SİSTEM ÖNCELİKLİ MİMARİ) ---
  const getAllWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    
    // 1. Silinmemiş Ham Listeleri Al
    const systemRaw = dynamicSystemWords.filter(w => !deletedSet.has(String(w.id)));
    const customRaw = customWords.filter(w => !deletedSet.has(String(w.id)));
    
    // 2. Kullanıcı Kelimelerini "Text" Anahtarıyla Haritala
    // Amaç: Sistem kelimesiyle eşleşen kullanıcı verisini (stats) hızlı bulmak.
    const userWordMap = {};
    customRaw.forEach(w => {
        userWordMap[w.word.toLowerCase().trim()] = w;
    });

    const finalWordList = [];

    // 3. ADIM: SİSTEM KELİMELERİNİ İŞLE (Master Data)
    // Her zaman Sistem kelimesini temel alıyoruz.
    systemRaw.forEach(systemWord => {
        const text = systemWord.word.toLowerCase().trim();
        const userMatch = userWordMap[text];

        if (userMatch) {
            // Eşleşme Var: Kullanıcının bu kelimeyle geçmişi var.
            // TEMEL: SystemWord (Doğru İçerik)
            // SÜS: UserWord (İstatistikler)
            finalWordList.push({
                ...systemWord, // İçerik buradan gelir (Admin ne yazdıysa o)
                
                // İstatistikleri Kullanıcıdan al
                id: userMatch.id, // Kullanıcı ID'si önemli (Update için)
                source: "user",
                createdAt: userMatch.createdAt,
                
                // Sadece istatistik alanlarını kopyala
                lastExercise_plural: userMatch.lastExercise_plural,
                lastExercise_v2: userMatch.lastExercise_v2,
                lastExercise_v3: userMatch.lastExercise_v3,
                lastExercise_vIng: userMatch.lastExercise_vIng,
                lastExercise_thirdPerson: userMatch.lastExercise_thirdPerson,
                lastExercise_advLy: userMatch.lastExercise_advLy,
                lastExercise_compEr: userMatch.lastExercise_compEr,
                lastExercise_superEst: userMatch.lastExercise_superEst,
                
                lastSeen_quiz: userMatch.lastSeen_quiz,
                lastSeen_writing: userMatch.lastSeen_writing,
                
                level: userMatch.level,
                nextReview: userMatch.nextReview,
                streak: userMatch.streak
            });
        } else {
            // Eşleşme Yok: Kullanıcı henüz bu kelimeyle tanışmamış.
            // Olduğu gibi ekle.
            finalWordList.push({
                ...systemWord,
                source: "system"
            });
        }
    });

    // 4. ADIM: TAMAMEN ÖZEL (CUSTOM) KELİMELERİ EKLE
    // Kullanıcının eklediği ama sistemde olmayan kelimeler.
    const systemTexts = new Set(systemRaw.map(w => w.word.toLowerCase().trim()));
    
    customRaw.forEach(userWord => {
        const text = userWord.word.toLowerCase().trim();
        // Eğer sistemde yoksa listeye ekle. (Varsa zaten yukarıda işledik)
        if (!systemTexts.has(text)) {
            finalWordList.push({
                ...userWord,
                source: "user"
            });
        }
    });

    // 5. Normalizasyon ve Kara Liste
    const all = finalWordList.map(normalizeWord);

    if (blacklistedWords.length > 0) {
        return all.filter(w => !blacklistedWords.includes(w.word.toLowerCase().trim()));
    }

    return all;
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
            if (currentLevel >= 2) { await addToKnown(wordId); return; }
            else {
                newQueue.push({ wordId, level: currentLevel + 1, nextReview: nextDate.toISOString() });
                await updateDoc(userRef, { learning_queue: newQueue });
            }
        } else if (action === "dont_know") {
            if (knownWordIds.includes(wordId)) await removeFromKnown(wordId);
            await updateDoc(userRef, { learning_queue: newQueue });
        }
    } catch (e) { console.error("Hata:", e); }
  };

  // --- KELİME GÜNCELLEME ---
  const handleUpdateWord = async (originalId, newData) => {
     try {
       const isCustom = customWords.find((w) => String(w.id) === String(originalId));
       const isKnown = knownWordIds.includes(originalId);

       if (isCustom) {
         // Güncelleme yaparken de Self-Healing (İyileştirme) yapalım
         // Eğer bu kelimenin sistemde bir karşılığı varsa, içeriği sistemden alıp tazeleyelim.
         const systemMatch = dynamicSystemWords.find(sw => sw.word.toLowerCase().trim() === isCustom.word.toLowerCase().trim());
         
         let dataToSave = { ...isCustom, ...newData, source: "user" };
         
         if (systemMatch) {
             dataToSave = {
                 ...dataToSave, // Kullanıcı ID ve Tarihleri koru
                 // İçeriği sistemden zorla güncelle
                 plural: systemMatch.plural,
                 v2: systemMatch.v2,
                 v3: systemMatch.v3,
                 vIng: systemMatch.vIng,
                 thirdPerson: systemMatch.thirdPerson,
                 advLy: systemMatch.advLy,
                 compEr: systemMatch.compEr,
                 superEst: systemMatch.superEst,
                 definitions: systemMatch.definitions,
                 sentence: systemMatch.sentence,
                 sentence_tr: systemMatch.sentence_tr,
                 tags: systemMatch.tags
             };
         }

         const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", String(originalId));
         await updateDoc(wordRef, dataToSave);

       } else {
         // SİSTEM KELİMESİ İLK DEFA KOPYALANIYOR
         const originalSystemWord = dynamicSystemWords.find(w => String(w.id) === String(originalId));
         if (!originalSystemWord) return;

         const existingCustomByText = customWords.find(w => w.word.toLowerCase() === originalSystemWord.word.toLowerCase());
         const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");

         if (existingCustomByText) {
             // Zaten kopyası var, sadece tarihi güncelle (ve içeriği tazele)
             await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
             
             let dataToSave = { ...existingCustomByText, ...newData, source: "user" };
             // İçeriği tazele
             dataToSave = {
                 ...dataToSave,
                 plural: originalSystemWord.plural,
                 v2: originalSystemWord.v2,
                 // ... (tüm alanlar)
                 definitions: originalSystemWord.definitions,
                 ...originalSystemWord, // En güvenlisi bu, sonra ID'yi koru
                 id: existingCustomByText.id,
                 ...newData // Yeni tarihi en sona koy
             };

             const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", existingCustomByText.id);
             await updateDoc(wordRef, dataToSave);

             if(isKnown) {
                 await updateDoc(userRef, { known_ids: arrayRemove(originalId) });
                 await updateDoc(userRef, { known_ids: arrayUnion(existingCustomByText.id) });
             }
             const queueItem = learningQueue.find(q => q.wordId === originalId);
             if (queueItem) {
                 const newQueue = learningQueue.filter(q => q.wordId !== originalId);
                 newQueue.push({ ...queueItem, wordId: existingCustomByText.id });
                 await updateDoc(userRef, { learning_queue: newQueue });
             }
         } else {
             // Yeni kopya oluştur
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

  const handleSaveSystemWord = async (wordData) => {
    try {
      const normalizedInput = wordData.word.toLowerCase().trim();
      const exists = dynamicSystemWords.some(w => w.word.toLowerCase() === normalizedInput);
      if(exists) return { success: false, message: "Bu kelime zaten sistemde var!" };

      const newWord = { ...wordData, sentence_tr: wordData.sentence_tr || "", source: "system", createdAt: new Date() };
      await addDoc(collection(db, "artifacts", appId, "system_words"), newWord);
      
      const blacklistRef = collection(db, "artifacts", appId, "blacklist");
      const q = query(blacklistRef, where("word", "==", normalizedInput));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (doc) => { await deleteDoc(doc.ref); });

      const conflictingCustom = customWords.find(w => w.word.toLowerCase() === normalizedInput);
      if (conflictingCustom) {
          const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
          await setDoc(userRef, { deleted_ids: arrayUnion(conflictingCustom.id) }, { merge: true });
      }
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  };

  const handleDeleteSystemWord = async (wordId) => {
      if(!window.confirm("Bu kelime tüm kullanıcılardan silinecek (Yasaklanacak). Emin misin?")) return;
      try { 
          const wordToDelete = dynamicSystemWords.find(w => String(w.id) === String(wordId));
          if (wordToDelete) {
             await addDoc(collection(db, "artifacts", appId, "blacklist"), {
                 word: wordToDelete.word.toLowerCase().trim(),
                 bannedAt: new Date()
             });
          }
          await deleteDoc(doc(db, "artifacts", appId, "system_words", wordId)); 
      } catch(e) { console.error(e); }
  };

  const resetProfile = async () => {
      if(!window.confirm("TÜM İLERLEMEN SİLİNECEK! Çift kayıtlar ve geçmiş temizlenecek.\nOnaylıyor musun?")) return;
      
      try {
        setProfileLoading(true);
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const today = new Date().toISOString().split("T")[0];
        
        await setDoc(userRef, { known_ids: [], deleted_ids: [], learning_queue: [], streak: 1, last_visit_date: today });
        const weekKey = getCurrentWeekKey();
        const leaderboardRef = doc(db, "artifacts", appId, "weekly_scores", weekKey, "users", user.uid);
        await deleteDoc(leaderboardRef);
        const statsRef = doc(db, "artifacts", appId, "weekly_stats", weekKey, "user_activities", user.uid);
        await deleteDoc(statsRef);

        const wordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
        const snapshot = await getDocs(wordsRef);
        
        const systemTexts = new Set(dynamicSystemWords.map(w => w.word.toLowerCase().trim()));
        const docsToDelete = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            const text = data.word.toLowerCase().trim();
            if (systemTexts.has(text)) { docsToDelete.push(doc.ref); }
        });

        const chunkSize = 500;
        for (let i = 0; i < docsToDelete.length; i += chunkSize) {
            const batch = writeBatch(db);
            const chunk = docsToDelete.slice(i, i + chunkSize);
            chunk.forEach(ref => batch.delete(ref));
            await batch.commit();
        }

        alert("Profilin tamamen tertemiz oldu! 🚀\nSayfa yenileniyor...");
        window.location.reload();

      } catch(e) { console.error(e); alert("Hata: " + e.message); } 
      finally { setProfileLoading(false); }
  };

  const cleanUpDuplicates = async () => {
      if(!user) return;
      try {
          const wordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
          const querySnapshot = await getDocs(wordsRef);
          const wordsMap = {};
          const docsToDelete = [];
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              const text = data.word.toLowerCase().trim();
              if(!wordsMap[text]) wordsMap[text] = [];
              wordsMap[text].push({ id: doc.id, ...data, ref: doc.ref });
          });
          for (const text in wordsMap) {
              const duplicates = wordsMap[text];
              if (duplicates.length > 1) {
                  duplicates.sort((a, b) => b.id.localeCompare(a.id));
                  const [keep, ...remove] = duplicates;
                  remove.forEach(w => docsToDelete.push(w.ref));
              }
          }
          const chunkSize = 500;
          for (let i = 0; i < docsToDelete.length; i += chunkSize) {
              const batch = writeBatch(db);
              const chunk = docsToDelete.slice(i, i + chunkSize);
              chunk.forEach(ref => batch.delete(ref));
              await batch.commit();
          }
          if(docsToDelete.length > 0) {
              alert(`${docsToDelete.length} adet çift kelime temizlendi!`);
              window.location.reload();
          } else { alert("Çift kelime bulunamadı."); }
      } catch(e) { console.error(e); alert("Hata: " + e.message); }
  };

  const handleSaveNewWord = async (wordData) => {
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
