import React, { useState, useEffect, useRef, useMemo } from "react";
import { useData } from "../context/DataContext";
import { db, appId } from "../services/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { ArrowLeft, Plus, Trash2, Book, FileText, Download, CheckCircle2, Loader2, Cloud, Clock, Home, RotateCcw, ListOrdered, ArrowUp, ArrowDown, X, Save as SaveIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import html2pdf from "html2pdf.js";
import "react-quill/dist/quill.snow.css"; 

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ script: "sub" }, { script: "super" }],
    ["blockquote", "code-block"],
    ["clean"],
  ],
};

const formatTime = (timestamp) => {
  if (!timestamp) return "Henüz tekrar edilmedi";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + " " + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

// YENİ: Dışarıdan dinamik özellikler (props) alıyoruz. Varsayılan olarak Gramer ayarlarına sahip.
export default function Notebook({ 
  pageTitle = "Gramer Defterim", 
  dbCollection = "global_grammar_notes", 
  trackingCollection = "grammar_tracking" 
}) {
  const { user, isAdmin } = useData(); 
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState("saved");
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [zoomFactor, setZoomFactor] = useState(1); 
  
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  const contentRef = useRef("");
  const titleRef = useRef("");
  const activeNoteRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // YENİ: Veritabanı yolları artık sabit değil, dışarıdan gelen isimlere göre şekilleniyor
  const globalNotesRef = collection(db, "artifacts", appId, dbCollection);
  const trackingRef = collection(db, "artifacts", appId, "users", user?.uid || "default", trackingCollection);

  const showPreviewMode = !isAdmin || isMobile;

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setZoomFactor((window.innerWidth - 32) / 794);
      } else {
        setZoomFactor(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { activeNoteRef.current = activeNote; }, [activeNote]);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user, dbCollection]); // Koleksiyon değişirse notları baştan çeker

  const fetchNotes = async () => {
    const snapshot = await getDocs(globalNotesRef);
    let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (!isAdmin) {
      list = list.filter(n => n.isCompleted === true);
    }

    list.sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : Infinity;
      const orderB = b.order !== undefined ? b.order : Infinity;
      
      if (orderA !== orderB) return orderA - orderB;
      
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeA - timeB;
    });

    const trackingSnap = await getDocs(trackingRef);
    const trackingData = {};
    trackingSnap.forEach(doc => {
      trackingData[doc.id] = doc.data();
    });

    const mergedList = list.map(n => ({
      ...n,
      lastViewedAt: trackingData[n.id]?.lastViewedAt || null,
      reviewCount: trackingData[n.id]?.reviewCount || 0
    }));

    setNotes(mergedList);
  };

  const createNewNote = async () => {
    if (!isAdmin) return; 
    
    const newNote = {
      title: "Yeni Sayfa",
      content: "",
      isCompleted: false, 
      order: notes.length, 
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(globalNotesRef, newNote);
    const createdNote = { id: docRef.id, ...newNote, reviewCount: 0, lastViewedAt: null };
    setNotes([...notes, createdNote]);
    selectNote(createdNote);
  };

  const selectNote = async (note) => {
    setActiveNote(note);
    setTitle(note.title || "");
    contentRef.current = note.content || "";
    setSaveStatus("saved");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  useEffect(() => {
    let timer;
    if (activeNote && activeNote.isCompleted) {
      timer = setTimeout(async () => {
        try {
          const currentNote = notes.find(n => n.id === activeNote.id);
          const newCount = (currentNote?.reviewCount || 0) + 1;
          const docRef = doc(db, "artifacts", appId, "users", user.uid, trackingCollection, activeNote.id);
          await setDoc(docRef, { 
            lastViewedAt: serverTimestamp(),
            reviewCount: newCount
          }, { merge: true });
          
          setNotes(prev => prev.map(n => 
            n.id === activeNote.id ? { ...n, lastViewedAt: new Date(), reviewCount: newCount } : n
          ));
        } catch (error) {
          console.error("Tekrar sayacı güncellenemedi:", error);
        }
      }, 20000); 
    }
    return () => clearTimeout(timer);
  }, [activeNote?.id, activeNote?.isCompleted]); 

  const handleResetCounter = async (e, id) => {
    e.stopPropagation(); 
    if (isReordering) return;
    
    const firstConfirm = window.confirm("Bu konunun tekrar sayacını sıfırlamak istediğinize emin misiniz?");
    if (!firstConfirm) return;
    
    const secondConfirm = window.confirm("KESİN KARAR MI? Sayacınız tamamen 0'lanacak ve bu işlem geri alınamaz.");
    if (!secondConfirm) return;

    try {
      const docRef = doc(db, "artifacts", appId, "users", user.uid, trackingCollection, id);
      await setDoc(docRef, { reviewCount: 0, lastViewedAt: null }, { merge: true });
      setNotes(notes.map(n => n.id === id ? { ...n, reviewCount: 0, lastViewedAt: null } : n));
    } catch (error) {
      console.error("Sıfırlama hatası:", error);
    }
  };

  const toggleCompletion = async (e, note) => {
    e.stopPropagation(); 
    if (!isAdmin || isReordering) return;

    const newStatus = !note.isCompleted;
    try {
      const docRef = doc(db, "artifacts", appId, dbCollection, note.id);
      await updateDoc(docRef, { isCompleted: newStatus });
      
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isCompleted: newStatus } : n));
      if (activeNote?.id === note.id) {
        setActiveNote(prev => ({ ...prev, isCompleted: newStatus }));
      }
    } catch (error) {
      console.error("Durum güncellenemedi:", error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!isAdmin || isReordering) return;
    if (!window.confirm("Bu sayfayı tamamen silmek istediğinize emin misiniz?")) return;
    
    await deleteDoc(doc(db, "artifacts", appId, dbCollection, id));
    setNotes(notes.filter(n => n.id !== id));
    if (activeNote?.id === id) {
      setActiveNote(null);
      setTitle("");
      contentRef.current = "";
    }
  };

  const handleEditorChange = useRef((newContent) => {
    if (!activeNoteRef.current || showPreviewMode) return; 
    contentRef.current = newContent;
    setSaveStatus("waiting");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const currentNoteId = activeNoteRef.current.id;
        const docRef = doc(db, "artifacts", appId, dbCollection, currentNoteId);
        await updateDoc(docRef, { title: titleRef.current, content: contentRef.current, updatedAt: serverTimestamp() });
        setNotes(prev => prev.map(n => n.id === currentNoteId ? { ...n, title: titleRef.current, content: contentRef.current } : n));
        setSaveStatus("saved");
      } catch (error) {
        console.error("Kaydetme hatası:", error);
      }
    }, 1500);
  }).current;

  const handleTitleChange = (e) => {
    if (showPreviewMode) return; 
    setTitle(e.target.value);
    handleEditorChange(contentRef.current); 
  };

  const handleDownloadPDF = () => {
    const currentContent = contentRef.current || activeNote?.content;
    if (!currentContent) return;
    
    const printContent = document.createElement("div");
    printContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h1 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">
          ${title || "İsimsiz Sayfa"}
        </h1>
        <div style="line-height: 1.6; font-size: 16px;">
          ${currentContent}
        </div>
      </div>
    `;

    const opt = {
      margin:       [15, 15, 15, 15],
      filename:     `${title ? title.replace(/\s+/g, '_') : 'Defter_Notu'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printContent).save();
  };

  const moveNote = (index, direction) => {
    const newNotes = [...notes];
    if (direction === "up" && index > 0) {
      [newNotes[index - 1], newNotes[index]] = [newNotes[index], newNotes[index - 1]];
    } else if (direction === "down" && index < newNotes.length - 1) {
      [newNotes[index + 1], newNotes[index]] = [newNotes[index], newNotes[index + 1]];
    }
    setNotes(newNotes);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const newNotes = [...notes];
    const draggedItem = newNotes[draggedIndex];
    newNotes.splice(draggedIndex, 1);
    newNotes.splice(targetIndex, 0, draggedItem);
    setNotes(newNotes);
    setDraggedIndex(null);
  };

  const saveOrder = async () => {
    try {
      setSaveStatus("saving");
      const batch = writeBatch(db);
      
      notes.forEach((note, index) => {
        const docRef = doc(db, "artifacts", appId, dbCollection, note.id);
        batch.update(docRef, { order: index });
      });
      
      await batch.commit();
      setSaveStatus("saved");
      setIsReordering(false);
      alert("Yeni sıralama başarıyla kaydedildi!");
    } catch (error) {
      console.error("Sıralama kaydedilemedi:", error);
      alert("Hata oluştu.");
    }
  };

  const MemoizedQuill = useMemo(() => {
    if (!activeNote || showPreviewMode) return null;
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 quill-wrapper relative">
        <ReactQuill 
          key={activeNote.id} 
          theme="snow" 
          defaultValue={activeNote.content || ""} 
          onChange={handleEditorChange} 
          modules={modules} 
          scrollingContainer="#editor-scroller" 
          className="min-h-[500px]"
        />
      </div>
    );
  }, [activeNote?.id, showPreviewMode]); 

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full overflow-x-hidden">
      {/* Üst Bar */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10 relative shadow-sm">
        <div className="flex items-center gap-2 md:gap-4">
          {activeNote && (
            <button onClick={() => setActiveNote(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors shrink-0">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
          )}
          <button onClick={() => navigate("/")} className="p-2 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors shrink-0" title="Ana Ekrana Dön">
            <Home size={20} className="text-indigo-600" />
          </button>
          <h1 onClick={() => setActiveNote(null)} className="text-xl font-black text-slate-800 flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors truncate ml-1 md:ml-2">
            <Book className="w-5 h-5 text-indigo-600 shrink-0"/> <span className="truncate">{pageTitle}</span>
          </h1>
        </div>
        
        {activeNote && (
          <div className="flex items-center gap-4 shrink-0">
            {isAdmin && !isMobile && (
              <div className="hidden md:flex items-center gap-2 text-sm font-medium">
                {saveStatus === "saved" && <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> <span className="text-slate-500">Buluta Kaydedildi</span></>}
                {saveStatus === "waiting" && <><Cloud className="w-5 h-5 text-slate-400" /> <span className="text-slate-400">Değişiklikler bekleniyor...</span></>}
                {saveStatus === "saving" && <><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> <span className="text-indigo-600 font-bold">Kaydediliyor...</span></>}
              </div>
            )}
            <button onClick={handleDownloadPDF} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 font-bold py-2 px-3 md:px-4 rounded-xl flex items-center gap-2 shadow-sm transition-colors md:ml-4">
              <Download size={18}/> <span className="hidden md:inline">PDF İndir</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sol Menü (Web'de Konu İçi) */}
        {activeNote && !isMobile && (
          <div className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col h-[calc(100vh-73px)] shrink-0">
            {isAdmin && (
              <div className="p-4 border-b border-slate-100">
                <button onClick={createNewNote} className="w-full bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-dashed border-indigo-200">
                  <Plus size={18} /> Yeni Ekle
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {notes.map(note => (
                <div 
                  key={note.id} 
                  onClick={() => selectNote(note)}
                  className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group transition-colors ${activeNote?.id === note.id ? "bg-indigo-50 border border-indigo-100" : "hover:bg-slate-50"}`}
                >
                  <div className="flex flex-col truncate w-full pr-2">
                    <div className="flex items-center gap-2 truncate font-medium">
                      <FileText size={16} className={activeNote?.id === note.id ? "text-indigo-500 shrink-0" : "text-slate-400 shrink-0"}/>
                      <span className={`truncate ${activeNote?.id === note.id ? "text-indigo-700 font-bold" : "text-slate-600"}`}>
                        {note.title || "İsimsiz Sayfa"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ana İçerik Alanı */}
        <div id="editor-scroller" className="flex-1 bg-slate-50 h-[calc(100vh-73px)] overflow-y-auto relative w-full max-w-full">
          {activeNote ? (
            <div className="w-full flex justify-center p-4">
              {showPreviewMode ? (
                <div 
                  className="pdf-preview-container"
                  style={{ zoom: zoomFactor, width: '794px', minHeight: '1123px', backgroundColor: 'white', padding: '40px 50px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', borderRadius: '8px' }}
                >
                  <div style={{ fontFamily: "Arial, sans-serif", color: "#1e293b" }}>
                    <h1 style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", marginBottom: "20px", fontSize: "2.5rem", fontWeight: "900" }}>{activeNote.title || "İsimsiz Sayfa"}</h1>
                    <div className="ql-editor" style={{ padding: 0, overflowY: 'visible', height: 'auto', fontSize: '18px', lineHeight: '1.7' }} dangerouslySetInnerHTML={{ __html: activeNote.content || "" }} />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-4xl pb-20 space-y-4">
                  <input type="text" value={title} onChange={handleTitleChange} placeholder="01. To Be" className="w-full text-3xl font-black bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-300 px-2" />
                  {MemoizedQuill}
                </div>
              )}
            </div>
          ) : (
            /* --- DASHBOARD LİSTE PANELİ --- */
            <div className="max-w-4xl mx-auto p-4 md:p-10 pb-20">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800">{isAdmin ? "Yönetim Paneli" : "İçerikler"}</h2>
                  <p className="text-slate-500 mt-1 text-sm md:text-base">{isAdmin ? "Tüm kullanıcıların gördüğü içerikleri yönet." : "Eklenen tüm içerikler ve kendi çalışma verilerin."}</p>
                </div>
                <div className="bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-xl self-start sm:self-auto shrink-0">{notes.length} İçerik</div>
              </div>

              {/* YENİ: ADMİN BUTONLARI */}
              {isAdmin && !isMobile && (
                <>
                  {!isReordering ? (
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      <button onClick={createNewNote} className="flex-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]">
                        <Plus size={20} /> Yeni Ekle
                      </button>
                      <button onClick={() => setIsReordering(true)} className="flex-1 bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]">
                        <ListOrdered size={20} /> Sıralamayı Düzenle
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 p-4 md:p-6 bg-indigo-50 border-2 border-indigo-200 rounded-3xl shadow-inner">
                      <div className="flex items-center gap-3 text-indigo-700 font-bold">
                        <div className="bg-indigo-200 p-2 rounded-full"><ListOrdered size={24}/></div>
                        <div>
                          <div>Sıralama Modu Aktif</div>
                          <div className="text-xs text-indigo-500 font-normal mt-0.5">İçerikleri sürükleyip bırakarak veya okları kullanarak sırayı belirleyin.</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button onClick={() => { setIsReordering(false); fetchNotes(); }} className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                          <X size={18}/> İptal
                        </button>
                        <button onClick={saveOrder} className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
                          <SaveIcon size={18}/> Kaydet
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-col gap-3">
                {notes.map((note, index) => (
                  <div 
                    key={note.id} 
                    onClick={() => { if (!isReordering) selectNote(note); }} 
                    draggable={isReordering}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDraggedIndex(index); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`bg-white p-4 md:p-5 rounded-2xl shadow-sm transition-all flex items-center justify-between group 
                      ${isReordering ? "cursor-move border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30" : "border border-slate-200 hover:shadow-md hover:border-indigo-300 cursor-pointer active:scale-[0.99]"}
                      ${draggedIndex === index ? "opacity-40" : "opacity-100"}
                    `}
                  >
                    <div className="flex items-center gap-4 truncate w-full">
                      <div className={`hidden sm:flex p-3 rounded-xl shrink-0 transition-transform ${isReordering ? "bg-slate-100 text-slate-400 cursor-move" : "bg-indigo-50 text-indigo-500 group-hover:scale-110"}`}>
                        {isReordering ? <ListOrdered size={22} /> : <FileText size={22}/>}
                      </div>
                      
                      <div className="flex flex-col truncate w-full">
                        <div className="flex items-center gap-2">
                          {isReordering && <span className="bg-slate-800 text-white text-xs font-black px-2 py-0.5 rounded-md">{index + 1}</span>}
                          <h3 className="font-bold text-slate-800 text-base md:text-lg truncate">{note.title || "İsimsiz Sayfa"}</h3>
                        </div>
                        
                        {!isReordering && (
                          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 mt-1">
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              <RotateCcw size={14} className="text-indigo-400" />
                              <span className="text-slate-600">{note.reviewCount || 0} Tekrar</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              <Clock size={14} className={note.lastViewedAt ? "text-amber-500" : "text-slate-400"}/>
                              <span className={note.lastViewedAt ? "text-amber-700/80" : ""}>{formatTime(note.lastViewedAt)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isReordering ? (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          <button onClick={(e) => { e.stopPropagation(); moveNote(index, "up"); }} disabled={index === 0} className="p-2 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded-lg shadow-sm disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-400 transition-colors"><ArrowUp size={18}/></button>
                          <button onClick={(e) => { e.stopPropagation(); moveNote(index, "down"); }} disabled={index === notes.length - 1} className="p-2 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded-lg shadow-sm disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-400 transition-colors"><ArrowDown size={18}/></button>
                        </div>
                      ) : (
                        <>
                          <button onClick={(e) => handleResetCounter(e, note.id)} className="text-slate-400 hover:text-amber-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-slate-50 md:bg-transparent rounded-xl md:rounded-none" title="Tekrar Sayacını Sıfırla"><RotateCcw size={18}/></button>
                          {isAdmin && <button onClick={(e) => toggleCompletion(e, note)} className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${note.isCompleted ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}><CheckCircle2 size={16} className={note.isCompleted ? "text-emerald-500" : "text-slate-400"} />{note.isCompleted ? "Tekrar Modu Aktif" : "Yazım Aşamasında"}</button>}
                          {isAdmin && <button onClick={(e) => handleDelete(e, note.id)} className="text-slate-300 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-opacity p-2 shrink-0"><Trash2 size={20}/></button>}
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {notes.length === 0 && !isAdmin && (
                  <div className="text-center py-16 text-slate-400">
                    <Book className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                    <p>Henüz çalışmaya hazır bir içerik bulunamadı.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .quill-wrapper .ql-toolbar.ql-snow {
          position: sticky;
          top: 0;
          z-index: 50;
          background-color: #ffffff;
          border-top-left-radius: 1rem;
          border-top-right-radius: 1rem;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .ql-editor { word-wrap: break-word !important; overflow-wrap: break-word !important; word-break: break-word !important; }
        .ql-editor img { max-width: 100% !important; height: auto !important; }
        .ql-editor pre { white-space: pre-wrap !important; word-wrap: break-word !important; overflow-x: auto !important; max-width: 100% !important; }
      `}</style>
    </div>
  );
}
