import React, { useState, useEffect, useRef, useMemo } from "react";
import { useData } from "../context/DataContext";
import { db, appId } from "../services/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { ArrowLeft, Plus, Trash2, Book, FileText, Download, CheckCircle2, Loader2, Cloud, Clock } from "lucide-react";
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
  if (!timestamp) return "Henüz çalışılmadı";
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
  
  // Mobil Cihaz Tespiti
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const contentRef = useRef("");
  const titleRef = useRef("");
  const activeNoteRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const notesRef = collection(db, "artifacts", appId, "users", user?.uid || "default", "grammar_notes");

  // Ekran boyutu değiştiğinde isMobile durumunu günceller
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
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
      createdAt: serverTimestamp(),
      lastViewedAt: serverTimestamp(), 
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

    try {
      const docRef = doc(db, "artifacts", appId, "users", user.uid, "grammar_notes", note.id);
      await updateDoc(docRef, { lastViewedAt: serverTimestamp() });
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, lastViewedAt: new Date() } : n));
    } catch (error) {
      console.error("Son görülme tarihi güncellenemedi:", error);
    }
  };

  const handleEditorChange = useRef((newContent) => {
    if (!activeNoteRef.current || isMobile) return; // Mobildeyse kaydetme döngüsünü tamamen iptal eder
    
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
    if (isMobile) return; // Mobilde başlık düzenlemeyi engeller
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
          key={`${activeNote.id}-${isMobile}`} // Cihaz modu değiştiğinde arayüzü yeniler
          theme="snow" 
          defaultValue={activeNote.content || ""} 
          onChange={handleEditorChange} 
          modules={isMobile ? { toolbar: false } : modules} // Mobilde araç çubuğunu gizler
          readOnly={isMobile} // Mobilde klavyenin açılmasını ve düzenlemeyi tamamen engeller
          scrollingContainer="#editor-scroller" 
          className={isMobile ? "mobile-view-editor" : "min-h-[500px]"}
        />
      </div>
    );
  }, [activeNote?.id, isMobile]); // isMobile state'ine duyarlı hale getirildi

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full overflow-x-hidden">
      {/* Üst Bar */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10 relative shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => activeNote ? setActiveNote(null) : navigate("/")} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors shrink-0">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          
          <h1 onClick={() => setActiveNote(null)} className="text-xl font-black text-slate-800 flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors truncate">
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
            <div className={`max-w-4xl mx-auto p-4 md:p-6 pb-20 ${isMobile ? 'space-y-2' : 'space-y-4'}`}>
              
              {/* Başlık Alanı: Mobilde düz metin olarak görünür, bilgisayarda düzenlenebilir input'tur */}
              {isMobile ? (
                <h1 className="w-full text-2xl font-black text-slate-800 px-2 pb-3 mb-2 border-b border-slate-200 break-words">
                  {title || "İsimsiz Sayfa"}
                </h1>
              ) : (
                <input 
                  type="text" 
                  value={title} 
                  onChange={handleTitleChange} 
                  placeholder="01. To Be"
                  className="w-full text-2xl md:text-3xl font-black bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-300 px-2"
                />
              )}
              
              {MemoizedQuill}
            </div>
          ) : (
            <div className="max-w-7xl mx-auto p-4 md:p-10 pb-20">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800">Çalışma Notlarım</h2>
                  <p className="text-slate-500 mt-1 text-sm md:text-base">Gramer defterine eklediğin tüm konular ve son tekrar tarihleri.</p>
                </div>
                <div className="bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-xl self-start sm:self-auto shrink-0">
                  {notes.length} Konu
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                
                <button onClick={createNewNote} className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-300 rounded-3xl bg-indigo-50/50 hover:bg-indigo-50 transition-all min-h-[140px] md:min-h-[160px] hover:shadow-md hover:-translate-y-1 w-full">
                  <div className="bg-white p-3 rounded-full shadow-sm text-indigo-500 group-hover:scale-110 transition-transform mb-3">
                    <Plus size={24} />
                  </div>
                  <span className="font-bold text-indigo-600">Yeni Konu Ekle</span>
                </button>

                {notes.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => selectNote(note)} 
                    className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 hover:ring-2 ring-indigo-50 cursor-pointer transition-all flex flex-col justify-between min-h-[140px] md:min-h-[160px] hover:-translate-y-1 relative group w-full"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-800 text-base md:text-lg leading-tight line-clamp-3 break-words w-full pr-6">{note.title || "İsimsiz Sayfa"}</h3>
                        
                        {/* Çöp kutusunun mobilde görünmesi için absolute positioning kullanıldı */}
                        <button onClick={(e) => handleDelete(e, note.id)} className="text-slate-200 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-full absolute top-4 md:top-5 right-4 md:right-5">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 w-full">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Clock size={14} className={note.lastViewedAt ? "text-indigo-400" : "text-slate-400"}/>
                        <span className={note.lastViewedAt ? "text-indigo-600/80 hidden sm:inline" : "hidden sm:inline"}>Son tekrar:</span>
                      </div>
                      <span className="text-slate-600 shrink-0">{formatTime(note.lastViewedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Araç çubuğu sabitleyici */
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

        /* Taşkınlık Engelleme (Overflow Fix) ve Kelime Kırma */
        .ql-editor {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important; 
        }
        
        /* Büyük resimlerin ekrandan taşmasını engeller */
        .ql-editor img {
          max-width: 100% !important;
          height: auto !important;
        }

        /* Kod bloklarının ekrandan taşmasını engeller */
        .ql-editor pre {
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          overflow-x: auto !important;
          max-width: 100% !important;
        }

        /* Mobilde temiz okuma ekranı için çerçeveleri ve gereksiz boşlukları siler */
        .mobile-view-editor .ql-container.ql-snow {
          border: none !important;
          font-size: 16px !important; 
        }
        .mobile-view-editor .ql-editor {
          padding: 10px 5px !important;
        }
      `}</style>
    </div>
  );
}
