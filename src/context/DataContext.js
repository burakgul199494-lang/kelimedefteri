import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  collection, deleteDoc, addDoc, increment, onSnapshot, query, orderBy, limit, getDocs, writeBatch, where 
} from "firebase/firestore";
import { messaging } from "../services/firebase"; 
import { getToken } from "firebase/messaging";
import { auth, db, appId, ADMIN_EMAILS } from "../services/firebase";

import { oxford3000 } from "../data/oxford3000";

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
  const [blacklistedWords, setBlacklistedWords] = useState([]); 
  const [streak, setStreak] = useState(0);
  const [learningQueue, setLearningQueue] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);

  const [questProgress, setQuestProgress] = useState({});
  const [questHistory, setQuestHistory] = useState({});

  const DAILY_QUESTS_TARGETS = {
    flashcard: 10, quiz: 20, quiz2: 20, exercise: 20,     
    writing: 10, writing2: 10, gap_filling: 10,  
    sentence_builder: 10, word_match: 20, pronunciation: 5  
  };

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
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
          setIsAdmin(true);
      } else {
          setIsAdmin(false);
      }

      setAuthLoading(false);

      if (!currentUser) {
        setKnownWordIds([]); 
        setCustomWords([]); 
        setDeletedWordIds([]); 
        setLearningQueue([]); 
        setStreak(0); 
        setBlacklistedWords([]);
        setQuestProgress({}); 
        setQuestHistory({}); 
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
        const sysWordsMap = new Map();

        if (typeof oxford3000 !== 'undefined') {
            oxford3000.forEach(w => {
                sysWordsMap.set(String(w.id), { ...w, source: "system", isStatic: true });
            });
        }

        snapshot.forEach((doc) => {
            sysWordsMap.set(String(doc.id), { ...doc.data(), id: doc.id, source: "system", isStatic: false });
        });

        setDynamicSystemWords(Array.from(sysWordsMap.values()));
        setSystemLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const blacklistRef = collection(db, "artifacts", appId, "blacklist");
    const unsub = onSnapshot(blacklistRef, (snapshot) => {
        const bannedIds = new Set();
        snapshot.forEach((doc) => {
            // 🔥 ARTIK KELİME ADINA (word) DEĞİL, KİMLİĞİNE (bannedId) BAKIYORUZ
            if(doc.data().bannedId) bannedIds.add(String(doc.data().bannedId));
        });
        setBlacklistedWords(Array.from(bannedIds));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userWordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
    const unsubUserWords = onSnapshot(userWordsRef, (snapshot) => {
        const usrWords = [];
        snapshot.forEach(doc => { usrWords.push({ ...doc.data(), id: doc.id, source: "user" }); });
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

  useEffect(() => {
    const refreshToken = async () => {
      if (!user) return; 
      try {
        if ("serviceWorker" in navigator && Notification.permission === "granted") {
          const registration = await navigator.serviceWorker.ready;
          const currentToken = await getToken(messaging, {
            vapidKey: "BAEv8tvoKaliQ-Dx3xxhUcPH-hDV_RylcMuPI4OtWMS3nYvHT_Gv7myuk_DsQ3kltls8moIe9WSdbLjBrE-Ui54",
            serviceWorkerRegistration: registration 
          });
          if (currentToken) {
            const userRef = doc(db, "artifacts", appId, "users", user.uid);
            await setDoc(userRef, { fcmToken: currentToken, lastTokenUpdate: new Date().toISOString(), platform: /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios_pwa" : "web" }, { merge: true });
          }
        }
      } catch (error) {}
    };
    refreshToken();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset*60*1000));
    const today = localDate.toISOString().split("T")[0];
    
    const dailyRef = doc(db, "artifacts", appId, "users", user.uid, "daily_history", today);
    const unsubDaily = onSnapshot(dailyRef, (docSnap) => {
      if (docSnap.exists()) setQuestProgress(docSnap.data().progress || {});
      else setQuestProgress({});
    });

    const historyCol = collection(db, "artifacts", appId, "users", user.uid, "daily_history");
    const unsubHistory = onSnapshot(historyCol, (snapshot) => {
        const historyData = {};
        snapshot.forEach(doc => { historyData[doc.id] = doc.data(); });
        setQuestHistory(historyData);
    });

    return () => { unsubDaily(); unsubHistory(); };
  }, [user]);

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
          await setDoc(leaderboardRef, { displayName: user.displayName || user.email.split('@')[0], photoURL: user.photoURL || "", score: increment(points), lastUpdated: new Date() }, { merge: true });
      } catch (e) { console.error(e); }
  };

  const updateGameStats = async (gameType, count = 1) => {
      if (!user) return;
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const localDate = new Date(now.getTime() - (offset*60*1000));
      const today = localDate.toISOString().split("T")[0];
      const weekKey = getCurrentWeekKey();
      
      try {
          const batch = writeBatch(db);
          const weeklyRef = doc(db, "artifacts", appId, "weekly_stats", weekKey, "user_activities", user.uid);
          batch.set(weeklyRef, { [gameType]: increment(count), lastUpdated: new Date(), displayName: user.displayName || user.email }, { merge: true });

          const dailyRef = doc(db, "artifacts", appId, "users", user.uid, "daily_history", today);
          let questType = null;
          if (gameType === "flashcard") questType = "flashcard";
          else if (gameType === "quiz") questType = "quiz";
          else if (gameType === "quiz2") questType = "quiz2";
          else if (gameType === "exercise") questType = "exercise";
          else if (gameType === "writing") questType = "writing";
          else if (gameType === "writing2") questType = "writing2";
          else if (gameType === "gap-filling") questType = "gap_filling";
          else if (gameType === "sentence-builder") questType = "sentence_builder";
          else if (gameType === "word-match") questType = "word_match";
          else if (gameType === "pronunciation") questType = "pronunciation";

          if (questType) {
             batch.set(dailyRef, { progress: { [questType]: increment(count) }, lastUpdated: new Date() }, { merge: true });
          }
          await batch.commit();
      } catch (e) { console.error(e); }
  };

  const normalizeWord = (w) => {
    if (!w) return {};
    return {
        ...w, phonetic: w.phonetic || "", plural: w.plural || "", v2: w.v2 || "", v3: w.v3 || "", vIng: w.vIng || "", thirdPerson: w.thirdPerson || "", advLy: w.advLy || "", compEr: w.compEr || "", superEst: w.superEst || "", sentence_tr: w.sentence_tr || "", tags: Array.isArray(w.tags) ? w.tags : [],
        definitions: Array.isArray(w.definitions) ? w.definitions.map(def => ({ ...def, engExplanation: def.engExplanation || "", trExplanation: def.trExplanation || "" })) : [{ type: "other", meaning: "", engExplanation: "", trExplanation: "" }],
    };
  };

  const getAllWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    const queueMap = {};
    learningQueue.forEach(item => { queueMap[String(item.wordId)] = item; });
    const knownSet = new Set(knownWordIds.map(String));
    const systemRaw = dynamicSystemWords.filter(w => !deletedSet.has(String(w.id)));
    const customRaw = customWords.filter(w => !deletedSet.has(String(w.id)));
    const userMapById = {};
    const processedUserIds = new Set(); 

    customRaw.forEach(w => { userMapById[w.id] = w; });
    const finalWordList = [];

    const getWordStats = (wordId) => {
        const strId = String(wordId);
        if (knownSet.has(strId)) return { level: 6, nextReview: null, isMastered: true };
        if (queueMap[strId]) return { level: queueMap[strId].level, nextReview: queueMap[strId].nextReview, isMastered: false };
        return { level: 0, nextReview: null, isMastered: false };
    };

    systemRaw.forEach(systemWord => {
        const userMatch = userMapById[systemWord.id]; 
        const stats = getWordStats(userMatch ? userMatch.id : systemWord.id);
        if (userMatch) {
            processedUserIds.add(userMatch.id);
            finalWordList.push({ ...userMatch, ...systemWord, id: userMatch.id, source: "user", ...stats });
        } else {
            finalWordList.push({ ...systemWord, source: "system", ...stats });
        }
    });

    customRaw.forEach(userWord => {
        if (!processedUserIds.has(userWord.id)) {
            const stats = getWordStats(userWord.id);
            finalWordList.push({ ...userWord, source: "user", ...stats });
        }
    });

    const all = finalWordList.map(normalizeWord);
    if (blacklistedWords.length > 0) {
        return all.filter(w => !blacklistedWords.includes(String(w.id)));
    }
    return all;
  };
  
  const getDeletedWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    const systemDeleted = dynamicSystemWords.filter((w) => deletedSet.has(String(w.id))).map(normalizeWord);
    const customDeleted = customWords.filter((w) => deletedSet.has(String(w.id))).map(normalizeWord);
    return [...systemDeleted, ...customDeleted].sort((a, b) => a.word.localeCompare(b.word));
  };

  const handleSmartLearn = async (rawWordId, action) => {
    const wordId = String(rawWordId); 
    try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const now = new Date();
        if (action === "master") {
            const newQueue = learningQueue.filter(q => String(q.wordId) !== wordId);
            await updateDoc(userRef, { known_ids: arrayUnion(wordId), learning_queue: newQueue });
            return;
        }
        const currentItem = learningQueue.find(q => String(q.wordId) === wordId);
        const currentLevel = currentItem ? (currentItem.level || 0) : 0;
        let newQueue = learningQueue.filter(q => String(q.wordId) !== wordId);

        if (action === "know") {
            if (knownWordIds.includes(wordId)) return;
            const newLevel = currentLevel + 1;
            const nextDate = new Date();
            let daysToAdd = 0; let isMastered = false;
            switch (newLevel) { case 1: daysToAdd = 1; break; case 2: daysToAdd = 3; break; case 3: daysToAdd = 7; break; case 4: daysToAdd = 14; break; case 5: daysToAdd = 30; break; case 6: isMastered = true; break; default: isMastered = true; break; }
            if (isMastered) await updateDoc(userRef, { known_ids: arrayUnion(wordId), learning_queue: newQueue });
            else {
                nextDate.setDate(now.getDate() + daysToAdd); 
                newQueue.push({ wordId: wordId, level: newLevel, nextReview: nextDate.toISOString() });
                await updateDoc(userRef, { learning_queue: newQueue });
            }
        } else if (action === "dont_know") {
            if (knownWordIds.map(String).includes(wordId)) {
                await updateDoc(userRef, { known_ids: arrayRemove(wordId) });
                await updateDoc(userRef, { known_ids: arrayRemove(Number(wordId)) });
            }
            await updateDoc(userRef, { learning_queue: newQueue });
        }
    } catch (e) { console.error(e); }
  };

  const handleUpdateWord = async (targetId, newData) => {
     try {
       const strId = String(targetId);
       const existingUserWord = customWords.find(w => String(w.id) === strId);
       if (existingUserWord) {
         const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", strId);
         await updateDoc(wordRef, newData);
       } else {
         const systemOriginal = dynamicSystemWords.find(w => String(w.id) === strId);
         if (systemOriginal) {
            const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", strId);
            await setDoc(wordRef, { ...systemOriginal, ...newData, id: strId, source: "user", createdAt: new Date() });
         }
       }
     } catch (e) { console.error(e); }
  };

  const handleSaveSystemWord = async (wordData) => {
    try {
      const newWord = {
        word: wordData.word.trim(), phonetic: wordData.phonetic || "", plural: wordData.plural || "", v2: wordData.v2 || "", v3: wordData.v3 || "", vIng: wordData.vIng || "", thirdPerson: wordData.thirdPerson || "", advLy: wordData.advLy || "", compEr: wordData.compEr || "", superEst: wordData.superEst || "", sentence: wordData.sentence.trim(), sentence_tr: wordData.sentence_tr || "",
        definitions: Array.isArray(wordData.definitions) ? wordData.definitions : [], tags: wordData.tags || [], source: "system", createdAt: new Date()
      };
      await addDoc(collection(db, "artifacts", appId, "system_words"), newWord);
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  };

  // 🔥 SİLME VE "VARSAYILANA DÖN" MANTIĞI EKLENDİ
  const handleDeleteSystemWord = async (wordId) => {
      const wordToDelete = dynamicSystemWords.find(w => String(w.id) === String(wordId));
      if (!wordToDelete) return;

      const isOxford = String(wordId).startsWith("ox-");
      const isEdited = isOxford && !wordToDelete.isStatic;

      if (isEdited) {
          // EĞER DÜZENLENMİŞ OXFORD İSE SADECE FİREBASE'DEKİ KOPYAYI SİL VE ESKİ HALİNE DÖNDÜR
          if(!window.confirm("Bu kelime üzerindeki değişikliklerinizi silip orijinal Oxford haline döndürmek istiyor musunuz?")) return;
          try { 
              await deleteDoc(doc(db, "artifacts", appId, "system_words", String(wordId))); 
          } catch(e) { console.error(e); }
          return;
      }

      // NORMAL SİLME İŞLEMİ
      if(!window.confirm("Bu kelimeyi sistemden silmek istediğine emin misin?")) return;
      try { 
          if (isOxford) {
             // SADECE STATİK (OXFORD) İSE KARA LİSTEYE ATARAK GİZLE
             await addDoc(collection(db, "artifacts", appId, "blacklist"), { 
                 bannedId: String(wordId), 
                 word: wordToDelete.word.toLowerCase().trim(), 
                 bannedAt: new Date() 
             });
          } else {
             // KULLANICI EKLEMİŞSE VERİTABANINDAN TAMAMEN YOK ET
             await deleteDoc(doc(db, "artifacts", appId, "system_words", String(wordId))); 
          }
      } catch(e) { console.error(e); }
  };

  const removeFromBlacklist = async (wordId) => {
      try {
          const blacklistRef = collection(db, "artifacts", appId, "blacklist");
          const q = query(blacklistRef, where("bannedId", "==", String(wordId)));
          const querySnapshot = await getDocs(q);
          const batch = writeBatch(db);
          querySnapshot.forEach((doc) => {
              batch.delete(doc.ref);
          });
          await batch.commit();
          alert(`Kelime başarıyla geri getirildi!`);
      } catch (e) {
          console.error("Kara listeden çıkarma hatası:", e);
      }
  };

  const resetProfile = async () => {
      if(!window.confirm("TÜM İLERLEMEN SİLİNECEK! Çift kayıtlar, geçmiş ve günlük görevler temizlenecek.\nOnaylıyor musun?")) return;
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

        const historyRef = collection(db, "artifacts", appId, "users", user.uid, "daily_history");
        const historySnapshot = await getDocs(historyRef);
        const historyBatch = writeBatch(db);
        historySnapshot.forEach((doc) => { historyBatch.delete(doc.ref); });
        await historyBatch.commit();
        
        setQuestProgress({}); setQuestHistory({});

        const wordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
        const snapshot = await getDocs(wordsRef);
        const systemTexts = new Set(dynamicSystemWords.map(w => w.word.toLowerCase().trim()));
        const docsToDelete = [];

        snapshot.forEach((doc) => {
            const text = doc.data().word.toLowerCase().trim();
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
          const wordsMap = {}; const docsToDelete = [];
          querySnapshot.forEach((doc) => {
              const data = doc.data(); const text = data.word.toLowerCase().trim();
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
          if(docsToDelete.length > 0) { alert(`${docsToDelete.length} adet çift kelime temizlendi!`); window.location.reload(); } 
          else { alert("Çift kelime bulunamadı."); }
      } catch(e) { console.error(e); alert("Hata: " + e.message); }
  };

  const handleSaveNewWord = async (wordData) => {
    const newId = Date.now().toString();
    const newWord = {
        id: newId, word: wordData.word.trim(), phonetic: wordData.phonetic || "", tags: wordData.tags || [], plural: wordData.plural || "", v2: wordData.v2 || "", v3: wordData.v3 || "", vIng: wordData.vIng || "", thirdPerson: wordData.thirdPerson || "", advLy: wordData.advLy || "", compEr: wordData.compEr || "", superEst: wordData.superEst || "", definitions: wordData.definitions, sentence: wordData.sentence.trim(), sentence_tr: wordData.sentence_tr || "", source: "user", createdAt: new Date()
    };
    try {
        await setDoc(doc(db, "artifacts", appId, "users", user.uid, "words", newId), newWord);
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
       await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, "words", String(wordObj.id)));
     } catch(e) { console.error(e); }
  };

  const handleUpdateSystemWord = async (id, wordData) => {
      try {
          await setDoc(doc(db, "artifacts", appId, "system_words", id), {
            word: wordData.word?.trim() || "", phonetic: wordData.phonetic || "", plural: wordData.plural || "", v2: wordData.v2 || "", v3: wordData.v3 || "", vIng: wordData.vIng || "", thirdPerson: wordData.thirdPerson || "", advLy: wordData.advLy || "", compEr: wordData.compEr || "", superEst: wordData.superEst || "", sentence: wordData.sentence?.trim() || "", sentence_tr: wordData.sentence_tr || "", definitions: Array.isArray(wordData.definitions) ? wordData.definitions : [], tags: wordData.tags || [], updatedAt: new Date()
          }, { merge: true });
          return { success: true };
      } catch(e) { return { success: false, message: e.message }; }
  };

  const registerMistake = async (wordId, amount = 1) => {
    const all = getAllWords();
    const word = all.find((w) => String(w.id) === String(wordId));
    if (!word) return;
    await handleUpdateWord(wordId, { mistakeCount: (word.mistakeCount || 0) + amount, lastMistakeDate: new Date().toISOString() });
  };

  const clearMistake = async (wordId) => { await handleUpdateWord(wordId, { mistakeCount: 0 }); };

  return (
    <DataContext.Provider value={{
      user, isAdmin, loading,
      knownWordIds, customWords, dynamicSystemWords, deletedWordIds, streak, learningQueue, leaderboardData,
      getAllWords, getDeletedWords,
      handleSaveNewWord, handleDeleteWord, handleUpdateWord,
      addToKnown, removeFromKnown, restoreWord, permanentlyDeleteWord, resetProfile,
      handleSaveSystemWord, handleDeleteSystemWord, handleUpdateSystemWord, cleanUpDuplicates,
      updateGameStats, getCurrentWeekKey, handleSmartLearn, addScore,
      questProgress, questHistory, DAILY_QUESTS_TARGETS,
      registerMistake, clearMistake,
      blacklistedWords, removeFromBlacklist
    }}>
      {children}
    </DataContext.Provider>
  );
};
