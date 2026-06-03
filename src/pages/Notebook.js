import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { db, appId } from "../services/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { ArrowLeft, Plus, Trash2, Save, Book, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Editörün stilleri

export default function Notebook() {
  const { user } = useData();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const notesRef = collection(db, "artifacts", appId, "users", user?.uid || "default", "grammar_notes");

  // React Quill için Word benzeri ayarlar (Tablo, Madde İşaretleri, Renkler vb.)
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
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleSave = async () => {
    if (!activeNote) return;
    setIsSaving(true);
    const docRef = doc(db, "artifacts", appId, "users", user.uid, "grammar_notes", activeNote.id);
    await updateDoc(docRef, {
      title: title,
      content: content,
      updatedAt: serverTimestamp()
    });
    
    // Sol menüdeki listeyi güncelle
    setNotes(notes.map(n => n.id === activeNote.id ? { ...n, title, content } : n));
    setIsSaving(false);
  };

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
          <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 shadow-md">
            {isSaving ? "Kaydediliyor..." : <><Save size={18}/> Kaydet</>}
          </button>
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
                  theme="snow" 
                  value={content} 
                  onChange={setContent} 
                  modules={modules}
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
