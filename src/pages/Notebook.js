import React, { useState, useEffect, useRef, useMemo } from "react";
import { useData } from "../context/DataContext";
import { db, appId } from "../services/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { ArrowLeft, Plus, Trash2, Book, FileText, Download, CheckCircle2, Loader2, Cloud, Clock, Home, RotateCcw } from "lucide-react";
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

export default function Notebook() {
  const { user } = useData();
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState("saved");
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [zoomFactor, setZoomFactor] = useState(1); 
  
  const contentRef = useRef("");
  const titleRef = useRef("");
  const activeNoteRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const notesRef = collection(db, "artifacts", appId, "users", user?.uid || "default", "grammar_notes");

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
  }, [user]);

  const fetchNotes = async () => {
    const q = query(notesRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setNotes(list);
  };

  const createNewNote = async () => {
    const newNote = {
      title: "Yeni Sayfa",
      content: "",
      isCompleted: false, // YENİ: Başlangıçta "Yazım Aşamasında" olarak başlar
      reviewCount: 0,     // YENİ: Tekrar sayacı
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(notesRef, newNote);
    const createdNote = { id: docRef.id, ...newNote };
    setNotes([...notes, createdNote]);
    selectNote(createdNote);
  };

  const selectNote = async (note) => {
    setActiveNote(note);
    setTitle(note.title || "");
    contentRef.current = note.content || "";
    setSaveStatus("saved");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    // YENİ: Anında lastViewedAt güncellemeyi kaldırdık. Artık sadece 20 saniye kalırsa güncellenecek.
  };

  // --- YENİ: 20 SANİYE EMNİYET KİLİDİ VE TEKRAR SAYACI ---
  useEffect(() => {
    let timer;
    // Eğer bir konu açıksa VE o konu "Tekrar Moduna" alınmışsa (isCompleted === true)
    if (activeNote && activeNote.isCompleted) {
      
      // 20 Saniye (20000 ms) bekler
      timer = setTimeout(async () => {
        try {
          const currentNote = notes.find(n => n.id === activeNote.id);
          const newCount = (currentNote?.reviewCount || 0) + 1;
          
          const docRef = doc(db, "artifacts", appId, "users", user.uid, "grammar_notes", activeNote.id);
          await updateDoc(docRef, { 
            lastViewedAt: serverTimestamp(),
            reviewCount: newCount
          });
          
          // Listeyi sessizce günceller ki kullanıcı anasayfaya döndüğünde yeni sayacı görsün
          setNotes(prev => prev.map(n => 
            n.id === activeNote.id 
              ? { ...n, lastViewedAt: new Date(), reviewCount: newCount } 
              : n
          ));
        } catch (error) {
          console.error("Tekrar sayacı güncellenemedi:", error);
        }
      }, 20000); 
    }

    // Kullanıcı 20 saniye dolmadan konudan çıkarsa veya başka konuya geçerse sayaç iptal olur
    return () => clearTimeout(timer);
  }, [activeNote?.id, activeNote?.isCompleted]); 

  // --- YENİ: TEKRAR MODU AÇ/KAPAT FONKSİYONU ---
  const toggleCompletion = async (e, note) => {
    e.stopPropagation(); // Kartın içine girilmesini (tıklanmasını) engeller
    const newStatus = !note.isCompleted;
    
    try {
      const docRef = doc(db, "artifacts", appId, "users", user.uid, "grammar_notes", note.id);
      await updateDoc(docRef, { isCompleted: newStatus });
      
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isCompleted: newStatus } : n));
      
      if (activeNote?.id === note.id) {
        setActiveNote(prev => ({ ...prev, isCompleted: newStatus }));
      }
    } catch (error) {
      console.error("Durum güncellenemedi:", error);
    }
  };

  const handleEditorChange = useRef((newContent) => {
    if (!activeNoteRef.current || window.innerWidth < 768) return; 
    
    contentRef.current = newContent;
    setSaveStatus("waiting");
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const currentNoteId = activeNoteRef.current.id;
        const docRef = doc(db, "artifacts", appId, "users", user.uid, "grammar_notes", currentNoteId);
        
        await updateDoc(docRef, {
          title: titleRef.current,
          content: contentRef.current,
          updatedAt: serverTimestamp()
        });
        
        setNotes(prev => prev.map(n => 
          n.id === currentNoteId 
            ? { ...n, title: titleRef.current, content: contentRef.current } 
            : n
        ));
        
        setSaveStatus("saved");
      } catch (error) {
        console.error("Kaydetme hatası:", error);
      }
    }, 1500);
  }).current;

  const handleTitleChange = (e) => {
    if (isMobile) return; 
    setTitle(e.target.value);
    handleEditorChange(contentRef.current); 
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Bu sayfayı silmek istediğine emin misin?")) return;
    await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, "grammar_notes", id));
    setNotes(notes.filter(n => n.id !== id));
    if (activeNote?.id === id) {
      setActiveNote(null);
      setTitle("");
      contentRef.current = "";
    }
  };

  const handleDownloadPDF = () => {
    const currentContent = contentRef.current;
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

  const MemoizedQuill = useMemo(() => {
    if (!activeNote) return null;
    return (
      <div className={`bg-white quill-wrapper relative ${isMobile ? 'border-none' : 'rounded-2xl shadow-sm border border-slate-200'}`}>
        <ReactQuill 
          key={`${activeNote.id}-${isMobile}`} 
          theme="snow" 
          defaultValue={activeNote.content || ""} 
          onChange={handleEditorChange} 
          modules={isMobile ? { toolbar: false } : modules} 
          readOnly={isMobile} 
          scrollingContainer="#editor-scroller" 
          className={isMobile ? "mobile-view-editor" : "min-h-[500px]"}
        />
      </div>
    );
  }, [activeNote?.id, isMobile]); 

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
            <Book className="w-5 h-5 text-indigo-600 shrink-0"/> <span className="truncate">Gramer Defterim</span>
          </h1>
        </div>
        
        {activeNote && (
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-sm font-medium">
              {saveStatus === "saved" && <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> <span className="text-slate-500">Buluta Kaydedildi</span></>}
              {saveStatus === "waiting" && <><Cloud className="w-5 h-5 text-slate-400" /> <span className="text-slate-400">Değişiklikler bekleniyor...</span></>}
              {saveStatus === "saving" && <><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> <span className="text-indigo-600 font-bold">Kaydediliyor...</span></>}
            </div>

            <button 
              onClick={handleDownloadPDF}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 font-bold py-2 px-3 md:px-4 rounded-xl flex items-center gap-2 shadow-sm transition-colors md:ml-4"
            >
              <Download size={18}/> <span className="hidden md:inline">PDF</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sol Menü */}
        {activeNote && !isMobile && (
          <div className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col h-[calc(100vh-73px)] shrink-0">
            <div className="p-4 border-b border-slate-100">
              <button onClick={createNewNote} className="w-full bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-dashed border-indigo-200">
                <Plus size={18} /> Yeni Sayfa
              </button>
            </div>
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
                    <div className="text-[10px] text-slate-400 pl-6 mt-0.5 truncate">
                       Son: {formatTime(note.lastViewedAt)}
                    </div>
                  </div>
                  <button onClick={(e) => handleDelete(e, note.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ana İçerik Alanı */}
        <div id="editor-scroller" className="flex-1 bg-slate-50 h-[calc(100vh-73px)] overflow-y-auto relative w-full max-w-full">
          
          {activeNote ? (
            <div className="w-full flex justify-center p-4">
              
              <div 
                style={isMobile ? { 
                  zoom: zoomFactor, 
                  width: '794px', 
                  backgroundColor: 'white', 
                  minHeight: '1123px', 
                  padding: '40px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                  borderRadius: '8px' 
                } : { 
                  width: '100%', 
                  maxWidth: '56rem' 
                }}
                className={isMobile ? "" : "pb-20 space-y-4"}
              >
                
                {isMobile ? (
                  <h1 className="w-full text-4xl font-black text-slate-800 pb-4 mb-4 border-b-2 border-slate-200 break-words">
                    {title || "İsimsiz Sayfa"}
                  </h1>
                ) : (
                  <input 
                    type="text" 
                    value={title} 
                    onChange={handleTitleChange} 
                    placeholder="01. To Be"
                    className="w-full text-3xl font-black bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-300 px-2"
                  />
                )}
                
                {MemoizedQuill}
              </div>

            </div>
          ) : (
            /* --- DASHBOARD LİSTE PANELİ --- */
            <div className="max-w-4xl mx-auto p-4 md:p-10 pb-20">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800">Çalışma Notlarım</h2>
                  <p className="text-slate-500 mt-1 text-sm md:text-base">Eklediğin tüm konular, tekrar sayıları ve son çalışma tarihleri.</p>
                </div>
                <div className="bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-xl self-start sm:self-auto shrink-0">
                  {notes.length} Konu
                </div>
              </div>

              {!isMobile && (
                <button onClick={createNewNote} className="w-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all mb-6 shadow-sm active:scale-[0.99]">
                  <Plus size={20} /> Yeni Konu Ekle
                </button>
              )}

              <div className="flex flex-col gap-3">
                {notes.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => selectNote(note)} 
                    className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between group active:scale-[0.99] gap-4"
                  >
                    <div className="flex items-start md:items-center gap-4 truncate w-full">
                      <div className="hidden sm:flex bg-indigo-50 p-3 rounded-xl text-indigo-500 shrink-0 group-hover:scale-110 transition-transform">
                        <FileText size={22}/>
                      </div>
                      <div className="flex flex-col truncate w-full">
                        <h3 className="font-bold text-slate-800 text-base md:text-lg truncate mb-1">{note.title || "İsimsiz Sayfa"}</h3>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                          
                          {/* TEKRAR SAYACI GÖSTERGESİ */}
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            <RotateCcw size={14} className="text-indigo-400" />
                            <span className="text-slate-600">{note.reviewCount || 0} Tekrar</span>
                          </div>

                          {/* SON TEKRAR TARİHİ GÖSTERGESİ */}
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            <Clock size={14} className={note.lastViewedAt ? "text-amber-500" : "text-slate-400"}/>
                            <span className={note.lastViewedAt ? "text-amber-700/80" : ""}>{formatTime(note.lastViewedAt)}</span>
                          </div>

                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                      
                      {/* TEKRAR MODU AÇ/KAPAT BUTONU */}
                      <button 
                        onClick={(e) => toggleCompletion(e, note)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${
                          note.isCompleted 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" 
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <CheckCircle2 size={16} className={note.isCompleted ? "text-emerald-500" : "text-slate-400"} />
                        {note.isCompleted ? "Tekrar Modu Aktif" : "Yazım Aşamasında"}
                      </button>

                      {/* Silme Butonu */}
                      <button onClick={(e) => handleDelete(e, note.id)} className="text-slate-300 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-slate-50 md:bg-transparent rounded-xl md:rounded-none">
                        <Trash2 size={18}/>
                      </button>

                    </div>
                  </div>
                ))}
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

        .ql-editor {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important; 
        }
        
        .ql-editor img {
          max-width: 100% !important;
          height: auto !important;
        }

        .ql-editor pre {
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          overflow-x: auto !important;
          max-width: 100% !important;
        }

        .mobile-view-editor .ql-container.ql-snow {
          border: none !important;
          font-size: 16px !important; 
        }
        .mobile-view-editor .ql-editor {
          padding: 10px 0px !important;
        }
      `}</style>
    </div>
  );
}
