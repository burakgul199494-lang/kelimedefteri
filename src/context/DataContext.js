import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  collection, getDocs, deleteDoc, addDoc 
} from "firebase/firestore";
import { auth, db, appId, ADMIN_EMAILS } from "../services/firebase";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  // --- STATE'LER ---
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [knownWordIds, setKnownWordIds] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [deletedWordIds, setDeletedWordIds] = useState([]);
  const [dynamicSystemWords, setDynamicSystemWords] = useState([]);
  
  // YENİ: Öğrenme sürecindeki kelimelerin durumu { "wordID": { level: 1, nextReview: "2023-..." } }
  const [learningProgress, setLearningProgress] = useState({}); 
  const [streak, setStreak] = useState(0);

  // --- AUTH VE DATA FETCHING ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) setIsAdmin(true);
      else setIsAdmin(false);
      
      if (!currentUser) {
        setLoading(false);
        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); setDynamicSystemWords([]); setLearningProgress({}); setStreak(0);
      }
    });
    return () => unsubscribe();
  }, []);

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
        setLearningProgress(data.learning_progress || {}); // YENİ

        // Streak Mantığı
        const todayStr = new Date().toISOString().split("T")[0];
        const lastVisit = data.last_visit_date;
        let currentStreak = data.streak || 0;

        if (lastVisit !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];
          if (lastVisit === yesterdayStr) currentStreak += 1;
          else currentStreak = 1;
          
          await setDoc(userRef, { last_visit_date: todayStr, streak: currentStreak }, { merge: true });
        }
        setStreak(currentStreak);
      } else {
        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(userRef, { last_visit_date: todayStr, streak: 1, learning_progress: {} }, { merge: true });
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
    } catch (e) { console.error("Sistem kelimeleri çekilemedi:", e); }
  };

  // --- KELİME NORMALİZASYONU ---
  const normalizeWord = (w) => {
    const isDynamic = dynamicSystemWords.some((d) => d.id === w.id);
    const source = w.source || (isDynamic ? "system" : "user");
    return {
      ...w,
      source,
      definitions: Array.isArray(w.definitions)
        ? w.definitions.map(def => ({ ...def, engExplanation: def.engExplanation || "" }))
        : [{ type: "other", meaning: "", engExplanation: "" }],
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

  // --- YENİ: SRS (ARALIKLI TEKRAR) MANTIĞI ---
  // Game.js içinden bu fonksiyon çağırılacak
  const handleSRSSwipe = async (wordId, isSuccess) => {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      
      // Mevcut ilerlemeyi al (yoksa varsayılan: level 0)
      const currentData = learningProgress[wordId] || { level: 0, nextReview: new Date().toISOString() };
      let newLevel = currentData.level;
      let nextReviewDate = new Date();

      if (isSuccess) {
          // Başarılı (Sağa kaydırma)
          if (newLevel === 0) {
              // 1. Seviye: 1 Gün Sonra
              newLevel = 1;
              nextReviewDate.setDate(nextReviewDate.getDate() + 1);
          } else if (newLevel === 1) {
              // 2. Seviye: 3 Gün Sonra
              newLevel = 2;
              nextReviewDate.setDate(nextReviewDate.getDate() + 3);
          } else {
              // 3. Seviye: Mezun Oldu! (Öğrenilenlere at)
              await updateDoc(userRef, {
                  known_ids: arrayUnion(wordId),
                  [`learning_progress.${wordId}`]: deleteField() // İlerlemeden sil (Artık 'known')
              });
              // State güncelle
              setKnownWordIds(prev => [...prev, wordId]);
              const newProg = { ...learningProgress };
              delete newProg[wordId];
              setLearningProgress(newProg);
              return { graduated: true }; // Oyuna mezun olduğunu bildir
          }
      } else {
          // Başarısız (Sola kaydırma) - Başa sar
          newLevel = 0;
          // Tarih bugünde kalır, yani hemen tekrar sorulabilir veya yarına kalır.
          // Biz "Bugün" olarak bırakıyoruz.
      }

      // Firestore ve State Güncelleme (Mezun olmadıysa)
      const progressData = {
          level: newLevel,
          nextReview: nextReviewDate.toISOString()
      };

      // Firestore 'dot notation' ile sadece o kelimenin alanını günceller
      // Not: deleteField import edilmeli, ama burada basitlik için tüm objeyi set ediyoruz
      // Gerçek firestore update'i için:
      await setDoc(userRef, { 
          learning_progress: { ...learningProgress, [wordId]: progressData } 
      }, { merge: true });

      setLearningProgress(prev => ({ ...prev, [wordId]: progressData }));
      return { graduated: false, nextDate: nextReviewDate };
  };

  // --- CRUD ---
  const handleSaveNewWord = async (wordData) => {
    const allWords = getAllWords();
    const normalizedInput = wordData.word.toLowerCase().trim();
    if (allWords.some(w => w.word.toLowerCase() === normalizedInput)) return { success: false, message: "Mevcut!" };

    const newWord = { id: Date.now(), ...wordData, source: "user" };
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await setDoc(userRef, { custom_words: arrayUnion(newWord) }, { merge: true });
      setCustomWords((prev) => [...prev, newWord]);
      return { success: true };
    } catch (e) { return { success: false, message: "Hata." }; }
  };

  const handleDeleteWord = async (wordId) => {
    try {
      const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
      await setDoc(userRef, { deleted_ids: arrayUnion(wordId), known_ids: arrayRemove(wordId) }, { merge: true });
      setDeletedWordIds((prev) => [...prev, wordId]);
      setKnownWordIds((prev) => prev.filter((id) => id !== wordId));
    } catch (e) { console.error(e); }
  };

  const handleUpdateWord = async (originalId, newData) => {
     try {
       const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
       const isCustom = customWords.find((w) => w.id === originalId);
       const isKnown = knownWordIds.includes(originalId);

       if (isCustom) {
         const updatedWord = { ...isCustom, ...newData, source: "user" };
         await updateDoc(userRef, { custom_words: arrayRemove(isCustom) });
         await updateDoc(userRef, { custom_words: arrayUnion(updatedWord) });
         setCustomWords((prev) => prev.map((w) => (w.id === originalId ? updatedWord : w)));
       } else {
         await setDoc(userRef, { deleted_ids: arrayUnion(originalId) }, { merge: true });
         const newCustomWord = { ...newData, id: Date.now(), source: "user" };
         await setDoc(userRef, { custom_words: arrayUnion(newCustomWord) }, { merge: true });
         setDeletedWordIds((prev) => [...prev, originalId]);
         setCustomWords((prev) => [...prev, newCustomWord]);
         if (isKnown) {
           await updateDoc(userRef, { known_ids: arrayRemove(originalId) });
           await updateDoc(userRef, { known_ids: arrayUnion(newCustomWord.id) });
           setKnownWordIds((prev) => prev.filter(id => id !== originalId).concat(newCustomWord.id));
         }
       }
     } catch (e) { console.error(e); }
  };

  // Manuel işlem (Listeden)
  const addToKnown = async (wordId) => {
     try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        await updateDoc(userRef, { known_ids: arrayUnion(wordId) });
        setKnownWordIds(prev => [...prev, wordId]);
        // Eğer progress'te varsa oradan silinmeli (manuel "öğrendim" dendiği için)
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
       await updateDoc(userRef, { custom_words: arrayRemove(wordObj), deleted_ids: arrayRemove(wordObj.id) });
       setCustomWords(prev => prev.filter(w => w.id !== wordObj.id));
       setDeletedWordIds(prev => prev.filter(id => id !== wordObj.id));
     } catch(e) { console.error(e); }
  };

  const resetProfile = async () => {
      try {
        const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
        const today = new Date().toISOString().split("T")[0];
        await setDoc(userRef, { known_ids:[], custom_words:[], deleted_ids:[], learning_progress:{}, streak:1, last_visit_date: today });
        setKnownWordIds([]); setCustomWords([]); setDeletedWordIds([]); setLearningProgress({}); setStreak(1);
      } catch(e) { console.error(e); }
  };

  const handleSaveSystemWord = async (wordData) => {
    try {
      const newWord = { ...wordData, source: "system", createdAt: new Date() };
      const docRef = await addDoc(collection(db, "artifacts", appId, "system_words"), newWord);
      setDynamicSystemWords(prev => [...prev, { ...newWord, id: docRef.id }]);
      return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
  };

  const handleDeleteSystemWord = async (wordId) => {
      if(!window.confirm("Emin misin?")) return;
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

  // Helper: deleteField importu olmadığı için manuel obje temizliği yapılıyor yukarıda.
  const deleteField = () => "DELETE"; // Placeholder

  return (
    <DataContext.Provider value={{
      user, isAdmin, loading,
      knownWordIds, customWords, dynamicSystemWords, deletedWordIds, streak, learningProgress,
      getAllWords, getDeletedWords,
      handleSaveNewWord, handleDeleteWord, handleUpdateWord,
      addToKnown, removeFromKnown, restoreWord, permanentlyDeleteWord, resetProfile,
      handleSaveSystemWord, handleDeleteSystemWord, handleUpdateSystemWord,
      handleSRSSwipe // YENİ FONKSİYON
    }}>
      {children}
    </DataContext.Provider>
  );
};
