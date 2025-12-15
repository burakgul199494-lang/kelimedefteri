import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  collection, deleteDoc, addDoc, increment, onSnapshot, query, orderBy, limit, writeBatch 
} from "firebase/firestore";
import { auth, db, appId, ADMIN_EMAILS } from "../services/firebase";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Veriler
  const [knownWordIds, setKnownWordIds] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [deletedWordIds, setDeletedWordIds] = useState([]);
  const [dynamicSystemWords, setDynamicSystemWords] = useState([]);
  const [streak, setStreak] = useState(0);
  const [learningQueue, setLearningQueue] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);

  // --- 1. SİSTEM KELİMELERİNİ CANLI DİNLE (TÜM KULLANICILAR İÇİN) ---
  useEffect(() => {
    const systemWordsRef = collection(db, "artifacts", appId, "system_words");
    
    // onSnapshot: Veritabanında değişiklik olduğu an tetiklenir
    const unsubscribe = onSnapshot(systemWordsRef, (snapshot) => {
        const sysWords = [];
        snapshot.forEach((doc) => {
            sysWords.push({ ...doc.data(), id: doc.id, source: "system" });
        });
        setDynamicSystemWords(sysWords);
    }, (error) => {
        console.error("Sistem kelimeleri alınamadı:", error);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. KULLANICI OTURUMU VE PROFİLİNİ CANLI DİNLE ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        if (ADMIN_EMAILS.includes(currentUser.email)) setIsAdmin(true);
        else setIsAdmin(false);
        // Kullanıcı geldi, verilerini dinlemeye başla (Aşağıdaki useEffect çalışacak)
      } else {
        // Çıkış yapıldı, temizle
        setIsAdmin(false);
        setLoading(false); 
        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); 
        setLearningQueue([]); setStreak(0);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- 3. KULLANICIYA ÖZEL VERİLERİ (KELİMELER + PROFİL) DİNLE ---
  useEffect(() => {
    if (!user) return;

    // A) Kullanıcının eklediği kelimeler (Custom Words)
    const userWordsRef = collection(db, "artifacts", appId, "users", user.uid, "words");
    const unsubUserWords = onSnapshot(userWordsRef, (snapshot) => {
        const usrWords = [];
        snapshot.forEach((doc) => {
            usrWords.push({ ...doc.data(), id: doc.id, source: "user" });
        });
        setCustomWords(usrWords);
    });

    // B) Kullanıcı Profili (İlerleme, Bilinenler, Silinenler, Streak)
    const userProfileRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
    const unsubProfile = onSnapshot(userProfileRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setKnownWordIds(data.known_ids || []);
            setDeletedWordIds(data.deleted_ids || []);
            setLearningQueue(data.learning_queue || []);
            
            // Streak Hesaplama (Canlı veri geldiğinde kontrol et)
            let currentStreak = data.streak || 0;
            const todayStr = new Date().toISOString().split("T")[0];
            const lastVisit = data.last_visit_date;

            if (lastVisit !== todayStr) {
                const yesterday = new Date(); 
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split("T")[0];
                
                // Eğer dün girdiysen artır, yoksa 1'e çek
                if (lastVisit === yesterdayStr) currentStreak += 1; 
                else currentStreak = 1;

                // Veritabanını güncelle (Bu işlem snapshot'ı tekrar tetikler ama tarih aynı olduğu için loop'a girmez)
                await updateDoc(userProfileRef, { last_visit_date: todayStr, streak: currentStreak });
            }
            setStreak(currentStreak);
        } else {
            // Profil yoksa oluştur
            const todayStr = new Date().toISOString().split("T")[0];
            await setDoc(userProfileRef, { 
                last_visit_date: todayStr, 
                streak: 1, 
                known_ids: [], 
                deleted_ids: [], 
                learning_queue: [] 
            }, { merge: true });
            setStreak(1);
        }
        setLoading(false); // Veriler yüklendi
    });

    // C) Liderlik Tablosu Dinleme
    const unsubLeaderboard = subscribeToLeaderboard();

    return () => {
        unsubUserWords();
        unsubProfile();
        if(unsubLeaderboard) unsubLeaderboard();
    };
  }, [user]); // User değiştiğinde (giriş/çıkış) yeniden çalış

  // --- YARDIMCI FONKSİYONLAR ---

  const getCurrentWeekKey = () => {
    const d = new Date();
    const day = d.getDay(); 
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().slice(0, 10);
  };

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

  // --- OYUN İÇİ AKSİYONLAR ---

  const handleSmartLearn = async (wordId, action) => {
    try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const now = new Date();

        if (action === "master") {
            await addToKnown(wordId);
            return;
        }

        const currentItem = learningQueue.find(q => String(q.wordId) === String(wordId));
        const currentLevel = currentItem ? (currentItem.level || 0) : 0;
        let newQueue = learningQueue.filter(q => String(q.wordId) !== String(wordId));

        if (action === "know") {
            if (knownWordIds.includes(wordId)) return;

            if (currentLevel === 0) {
                const nextDate = new Date();
                nextDate.setDate(now.getDate() + 1); 
                newQueue.push({ wordId, level: 1, nextReview: nextDate.toISOString() });
            } else if (currentLevel === 1) {
                const nextDate = new Date();
                nextDate.setDate(now.getDate() + 2); 
                newQueue.push({ wordId, level: 2, nextReview: nextDate.toISOString() });
            } else if (currentLevel >= 2) {
                await addToKnown(wordId);
                return; 
            }
        } 
        else if (action === "dont_know") {
            if (knownWordIds.includes(wordId)) {
                await removeFromKnown(wordId);
            }
        }

        await updateDoc(userRef, { learning_queue: newQueue });
        // setLearningQueue'yu manuel çağırmıyoruz, onSnapshot güncelleyecek.

    } catch (e) {
        console.error("Hata:", e);
    }
  };

  const handleSaveNewWord = async (wordData) => {
    const normalizedInput = wordData.word.toLowerCase().trim();
    const allWords = getAllWords();
    if (allWords.some(w => w.word.toLowerCase() === normalizedInput)) return { success: false, message: "Zaten mevcut!" };
    
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

  const handleUpdateWord = async (originalId, newData) => {
     try {
       const isCustom = customWords.find((w) => String(w.id) === String(originalId));
       const isKnown = knownWordIds.includes(originalId);
       
       if (isCustom) {
         const updatedWord = { ...isCustom, ...newData, source: "user" };
         const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", String(originalId));
         await updateDoc(wordRef, updatedWord);
       } else {
         const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
         await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
         
         const newId = Date.now().toString();
         const newCustomWord = { ...newData, id: newId, source: "user" };
         const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", newId);
         await setDoc(wordRef, newCustomWord);
         
         if (isKnown) {
           await updateDoc(userRef, { known_ids: arrayRemove(originalId) }); 
           await updateDoc(userRef, { known_ids: arrayUnion(newCustomWord.id) });
         }
       }
     } catch (e) { console.error(e); }
  };

  const addToKnown = async (wordId) => {
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       // Queue'dan silmeyi de DB üzerinden yapıyoruz ki temiz olsun
       // Ancak arrayRemove nesne ile zor olduğu için tüm queue'yu okuyup filtreleyip yazmak en garantisi
       // handleSmartLearn zaten queue'yu temizleyip gönderiyor. Burada sadece Known eklesek yeterli ama queue'yu temizlemek de iyi.
       // Basitlik için sadece Known ekleyelim, queue handleSmartLearn ile yönetiliyor genelde.
       // Eğer direkt flash karttan eklendiyse queue'dan düşmesi lazım.
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
      await addDoc(collection(db, "artifacts", appId, "system_words"), newWord);
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  };

  const handleDeleteSystemWord = async (wordId) => {
      if(!window.confirm("Silmek istediğine emin misin?")) return;
      try {
          await deleteDoc(doc(db, "artifacts", appId, "system_words", wordId));
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
      handleSaveSystemWord, handleDeleteSystemWord, handleUpdateSystemWord,
      handleSmartLearn, addScore
    }}>
      {children}
    </DataContext.Provider>
  );
};
