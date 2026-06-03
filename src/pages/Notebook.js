import React, { useState, useEffect, useRef } from "react";
import { useData } from "../context/DataContext";
import { db, appId } from "../services/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { ArrowLeft, Plus, Trash2, Book, FileText, Download, CheckCircle2, Loader2, Cloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import html2pdf from "html2pdf.js";
import "react-quill/dist/quill.snow.css"; 

// Araç çubukları tamamen dışarıda
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

// React Quill'in yapıştırma anında kafasının karışmasını (zıplamasını) önleyen açık format listesi
const formats = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background", "list", "bullet", "script",
  "blockquote", "code-block"
];

export default function Notebook() {
  const { user } = useData();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  // Otomatik Kayıt Durumu: "saved", "waiting", "saving"
  const [saveStatus, setSaveStatus] = useState("saved");
  const isFirstLoad = useRef(true); // Sayfa ilk açıldığında boş yere kaydetmemesi için

  const notesRef = collection(db, "artifacts", appId, "users", user?.uid || "default", "grammar_notes");

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    const q = query(notesRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setNotes(list);
    if (list.length > 0 && !activeNote) selectNote(list[0]);
  };

  const createNewNote = async () => {
    const newNote = {
      title: "Yeni Sayfa",
      content: "",
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(notesRef, newNote);
    const createdNote = { id: docRef.id, ...newNote };
    setNotes([...notes, createdNote]);
    selectNote(createdNote);
  };

  const selectNote = (note) => {
    isFirstLoad.current = true; // Farklı bir nota geçildiğinde otomatik kaydı duraklatır
    setActiveNote(note);
    setTitle(note.title || "");
    setContent(note.content || "");
    setSaveStatus("saved");
  };

  // --- DİNAMİK OTOMATİK KAYIT (AUTO-SAVE) ---
  useEffect(() => {
    if (!activeNote) return;

    // Sayfa ilk yüklendiğinde (veya nota tıklandığında) tetiklenmeyi engeller
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    setSaveStatus("waiting"); // Klavye ile yazarken "bekleniyor" durumuna geçer

    // Yazmayı bitirdikten 1.5 saniye sonra Firebase'e yazar
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const docRef = doc(db, "artifacts", appId, "users", user.uid, "grammar_notes", activeNote.id);
        await updateDoc(docRef, {
          title: title,
          content: content,
          updatedAt: serverTimestamp()
        });
        
        // Sol menüdeki listeyi sessizce günceller
        setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, title, content } : n));
        setSaveStatus("saved");
      } catch (error) {
        console.error("Kaydetme hatası:", error);
      }
    }, 1500);

    return () => clearTimeout(timer); // Eğer 1.5 saniye dolmadan yeni harfe basarsan süreyi sıfırlar
  }, [title, content]); 

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Bu sayfayı silmek istediğine emin misin?")) return;
    await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, "grammar_notes", id));
    setNotes(notes.filter(n => n.id !== id));
    if (activeNote?.id === id) {
      setActiveNote(null);
      setTitle("");
      setContent("");
    }
  };

  // --- PDF İNDİRME FONKSİYONU ---
  const handleDownloadPDF = () => {
    if (!content) return;
    
    const printContent = document.createElement("div");
    printContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h1 style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">
          ${title || "İsimsiz Sayfa"}
        </h1>
        <div style="line-height: 1.6; font-size: 16px;">
          ${content}
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Üst Bar */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2"><Book className="w-5 h-5 text-indigo-600"/> Gramer Defterim</h1>
        </div>
        
        {activeNote && (
          <div className="flex items-center gap-4">
            
            {/* DİNAMİK KAYIT GÖSTERGESİ */}
            <div className="flex items-center gap-2 text-sm font-medium">
              {saveStatus === "saved" && <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> <span className="text-slate-500">Buluta Kaydedildi</span></>}
              {saveStatus === "waiting" && <><Cloud className="w-5 h-5 text-slate-400" /> <span className="text-slate-400">Değişiklikler bekleniyor...</span></>}
              {saveStatus === "saving" && <><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> <span className="text-indigo-600 font-bold">Kaydediliyor...</span></>}
            </div>

            <button 
              onClick={handleDownloadPDF}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-colors ml-4"
            >
              <Download size={18}/> PDF İndir
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sol Menü (Sayfalar) */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-73px)]">
          <div className="p-4 border-b border-slate-100">
            <button onClick={createNewNote} className="w-full bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-dashed border-indigo-200">
              <Plus size={18} /> Yeni Sayfa Ekle
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {notes.map(note => (
              <div 
                key={note.id} 
                onClick={() => selectNote(note)}
                className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group transition-colors ${activeNote?.id === note.id ? "bg-indigo-50 border border-indigo-100 text-indigo-700" : "hover:bg-slate-50 text-slate-600"}`}
              >
                <div className="flex items-center gap-2 truncate font-medium">
                  <FileText size={16} className={activeNote?.id === note.id ? "text-indigo-500" : "text-slate-400"}/>
                  <span className="truncate">{note.title || "İsimsiz Sayfa"}</span>
                </div>
                <button onClick={(e) => handleDelete(e, note.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ Taraf (Editör) */}
        <div className="flex-1 bg-slate-50 h-[calc(100vh-73px)] overflow-y-auto">
          {activeNote ? (
            <div className="max-w-4xl mx-auto p-6 space-y-4 pb-20">
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="01. To Be"
                className="w-full text-3xl font-black bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-300"
              />
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <ReactQuill 
                  key={activeNote.id} // KESİN ÇÖZÜM: Farklı bir not seçildiğinde editörü tamamen sıfırlar ve temiz bir başlangıç yapar.
                  theme="snow" 
                  value={content} 
                  onChange={setContent} 
                  modules={modules}
                  formats={formats} // KESİN ÇÖZÜM: Yabancı bir metin yapıştırıldığında desteklenmeyen formatları ayıklayıp zıplamayı önler.
                  className="min-h-[500px]"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <Book className="w-16 h-16 opacity-20"/>
              <p className="font-medium">Soldaki menüden bir sayfa seçin veya yeni ekleyin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
