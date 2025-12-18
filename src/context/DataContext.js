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

  // --- YARDIMCI: Sadece İstatistikleri Çek ---
  const extractUserStats = (wordObj) => {
      const stats = {};
      Object.keys(wordObj).forEach(key => {
          if (
              key.startsWith("last") ||   // lastExercise_... lastSeen_...
              key.startsWith("next") ||   // nextReview
              key === "level" || 
              key === "streak" ||
              key === "createdAt"
          ) {
              stats[key] = wordObj[key];
          }
      });
      return stats;
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

  // --- KELİMELERİ GETİR (ID ÖNCELİKLİ - EN SAĞLAM YÖNTEM) ---
  const getAllWords = () => {
    const deletedSet = new Set(deletedWordIds.map(String));
    
    const systemRaw = dynamicSystemWords.filter(w => !deletedSet.has(String(w.id)));
    const customRaw = customWords.filter(w => !deletedSet.has(String(w.id)));
    
    // 1. Kullanıcı Kelimelerini Hızlı Erişim İçin Haritala (ID ve Text ile)
    const userMapById = {};
    const userMapByText = {};
    const processedUserIds = new Set(); // Hangi kullanıcı kelimeleri işlendi?

    customRaw.forEach(w => {
        userMapById[w.id] = w;
        userMapByText[w.word.toLowerCase().trim()] = w;
    });

    const finalWordList = [];

    // 2. SİSTEM KELİMELERİNİ DÖN (Diktatör Modu)
    systemRaw.forEach(systemWord => {
        // ÖNCE ID ile eşleştir (En garantisi budur, isim değişse bile ID tutar)
        let userMatch = userMapById[systemWord.id];

        // EĞER ID tutmazsa, TEXT ile eşleştir (Eski kayıtlar veya manuel eklenenler için)
        if (!userMatch) {
            userMatch = userMapByText[systemWord.word.toLowerCase().trim()];
        }

        if (userMatch) {
            // Eşleşme bulundu: Kullanıcının ilerlemesini al, içeriği SİSTEMDEN bas.
            processedUserIds.add(userMatch.id); // Bu kullanıcı kelimesini işledik
            finalWordList.push({
                ...systemWord, // <-- İçerik (Dog3, Plural vb.) buradan gelir
                
                // Kullanıcı verileri
                id: userMatch.id, // ID'yi kullanıcıdan al (Update için kritik)
                source: "user",
                
                // İstatistikleri koru
                ...extractUserStats(userMatch)
            });
        } else {
            // Hiç eşleşme yok, ham sistem kelimesi
            finalWordList.push({ ...systemWord, source: "system" });
        }
    });

    // 3. SADECE KULLANICIDA OLAN (ÖZEL) KELİMELER
    customRaw.forEach(userWord => {
        // Eğer yukarıdaki döngüde bu kelimeyi işlemediysek, tamamen özel bir kelimedir.
        if (!processedUserIds.has(userWord.id)) {
            finalWordList.push({ ...userWord, source: "user" });
        }
    });

    // 4. Normalizasyon ve Kara Liste
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

  // --- KELİME GÜNCELLEME (PARÇALI GÜNCELLEME - FIX) ---
  const handleUpdateWord = async (originalId, newData) => {
     try {
       // Önce ID ile bul
       let isCustom = customWords.find((w) => String(w.id) === String(originalId));
       const isKnown = knownWordIds.includes(originalId);

       // ID ile bulamazsan (örneğin sistem kelimesi henüz kopyalanmamışsa)
       const systemOriginal = dynamicSystemWords.find(w => String(w.id) === String(originalId));

       if (isCustom) {
         // --- DURUM 1: Kullanıcının elinde zaten var ---
         // KRİTİK DÜZELTME: Sadece "newData" (yani tarihleri) güncelle.
         // Kelimenin adını, anlamını vs. tekrar yazma (Overwrite yapma).
         // Böylece sistemdeki güncelleme (Dog -> Dog3) kullanıcıya yansımaya devam eder.
         
         const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", String(originalId));
         
         // Sadece değişen alanları gönder (Partial Update)
         await updateDoc(wordRef, newData);

       } else if (systemOriginal) {
         // --- DURUM 2: Sistem kelimesi ilk defa kullanılıyor ---
         // Şimdi kopyasını oluşturmamız lazım.
         
         // Daha önce metin bazlı kopyası var mı kontrol et (Eski usül koruma)
         const existingByText = customWords.find(w => w.word.toLowerCase() === systemOriginal.word.toLowerCase());

         if (existingByText) {
             // Zaten metin olarak varmış, onun ID'sine geçiş yap
             await setDoc(doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress"), { deleted_ids: arrayUnion(originalId) }, { merge: true });
             
             // Var olanın sadece tarihini güncelle
             const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", existingByText.id);
             await updateDoc(wordRef, newData);

             // Listeleri güncelle
             if(isKnown) {
                 const userRef = doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress");
                 await updateDoc(userRef, { known_ids: arrayRemove(originalId) });
                 await updateDoc(userRef, { known_ids: arrayUnion(existingByText.id) });
             }
         } else {
             // Yepyeni kopya oluştur (İlk sefer olduğu için içeriği sistemden alıyoruz)
             await setDoc(doc(db, "artifacts", appId, "users", user.uid, "vocab_game", "progress"), { deleted_ids: arrayUnion(originalId) }, { merge: true });
             
             const newId = Date.now().toString();
             // Burada sistem verilerini kopyalıyoruz
             const newCustomWord = { 
                 ...systemOriginal, 
                 ...newData, 
                 id: newId, 
                 source: "user" 
             };
             
             // ID'yi systemOriginal ID'si ile aynı yaparsak sonraki güncellemeleri yakalamak kolaylaşır.
             // Ama Firebase çakışması olmasın diye yeni ID veriyoruz. 
             // getAllWords fonksiyonumuz ID eşleşmesini systemOriginal.id üzerinden değil, 
             // userWordMapById mantığıyla yapıyordu. 
             // BURADA BİR İNCELİK YAPACAĞIZ:
             // Kopyalarken "systemId" diye bir alan ekleyelim veya ID'yi korumaya çalışalım.
             // En güvenlisi: Sistem ID'sini koruyarak kaydetmektir ama User Collection içinde.
             
             // ID KORUMALI KAYIT:
             const targetId = systemOriginal.id; // Sistem ID'sini kullan
             const wordRef = doc(db, "artifacts", appId, "users", user.uid, "words", targetId);
             
             await setDoc(wordRef, { 
                 ...systemOriginal, 
                 ...newData, 
                 id: targetId, 
                 source: "user" 
             });

             if (isKnown) {
                // ID değişmediği için arrayRemove/Union gerekmez
             }
         }
       }
     } catch (e) { console.error("Update Error:", e); }
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
