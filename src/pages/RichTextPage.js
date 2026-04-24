import React, { useState, useEffect, useMemo, useRef } from "react";
import { useData } from "../context/DataContext";
import { db, appId } from "../services/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import JoditEditor from "jodit-react";
import html2pdf from "html2pdf.js";
import { ArrowLeft, Edit, Save, Plus, Trash2, X, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RichTextPage({ title, collectionName }) {
  const { user } = useData();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const editorRef = useRef(null);

  const collectionRef = collection(db, "artifacts", appId, "users", user.uid, collectionName);

  useEffect(() => {
    if (user) fetchItems();
  }, [user, collectionName]);

  const fetchItems = async () => {
    const q = query(collectionRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setItems(fetchedItems);
  };

  const handleAddNew = async () => {
    const newItem = {
      title: "Yeni Başlık",
      content: "",
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collectionRef, newItem);
    setSelectedItem({ id: docRef.id, ...newItem });
    setEditTitle(newItem.title);
    setEditContent(newItem.content);
    setIsEditing(true);
    fetchItems();
  };

  const handleSave = async () => {
    if (selectedItem) {
      const itemRef = doc(db, "artifacts", appId, "users", user.uid, collectionName, selectedItem.id);
      await updateDoc(itemRef, {
        title: editTitle,
        content: editContent
      });
      setSelectedItem({ ...selectedItem, title: editTitle, content: editContent });
      setIsEditing(false);
      fetchItems();
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Bu içeriği silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, collectionName, id));
      setSelectedItem(null);
      fetchItems();
    }
  };

  // --- PDF AKTARIMI (SAYFA BÖLÜNMELERİNİ ÖNLEYEN AYARLAR) ---
  const handleDownloadPDF = () => {
    const element = document.getElementById('pdf-render-content');
    const opt = {
      margin:       [20, 20, 20, 20], 
      filename:     `${selectedItem.title}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      // ÖNEMLİ: avoid-all paragraf, tablo ve başlıkların tam ortadan bölünmesini engeller
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  };

  const config = useMemo(() => ({
    readonly: false,
    placeholder: 'Notlarınızı buraya yazın...',
    height: "auto",
    minHeight: 1123, // 1 sayfa A4
    language: 'tr',
    toolbarSticky: true,
    buttons: [
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'font', 'fontsize', 'brush', 'paragraph', '|',
      'align', 'ul', 'ol', 'outdent', 'indent', '|',
      'table', 'image', 'link', 'hr', '|',
      'undo', 'redo', 'fullsize'
    ],
  }), []);

  if (selectedItem) {
    return (
      <div className="min-h-screen bg-slate-300 p-4 md:p-8 flex flex-col items-center">
        
        <style>
          {`
            /* Yazarken Sayfa Numaralarını Görme */
            .word-style-editor .jodit-wysiwyg {
              background-color: white !important;
              width: 210mm !important;
              padding: 20mm !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
              position: relative;
              
              /* Sayfa çizgileri ve göstergeler */
              background-image: repeating-linear-gradient(
                to bottom,
                white 0,
                white 296.5mm,
                #64748b 296.5mm,
                #64748b 297mm,
                #94a3b8 297mm,
                #94a3b8 310mm
              ) !important;
              background-attachment: local !important;
            }

            /* PDF ve Ön İzleme İçin Yazıların Bölünmesini Engelleme */
            .unified-content p, 
            .unified-content h1, 
            .unified-content h2, 
            .unified-content li, 
            .unified-content table, 
            .unified-content tr {
              break-inside: avoid-page !important;
              page-break-inside: avoid !important;
            }

            .unified-content {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              font-size: 16px;
            }

            #pdf-render-content {
              width: 210mm;
              background: white;
              padding: 20mm;
              box-sizing: border-box;
            }
          `}
        </style>

        <div className="w-full max-w-5xl mb-6">
          <div className="flex justify-between items-center mb-4 bg-white/95 p-4 rounded-xl shadow-lg border border-slate-200 sticky top-4 z-50">
            <button onClick={() => { setSelectedItem(null); setIsEditing(false); }} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200">
              <ArrowLeft size={20} />
            </button>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-red-100 text-red-600 rounded-xl"><X size={20}/></button>
                  <button onClick={handleSave} className="p-2 bg-emerald-600 text-white rounded-xl px-4 font-bold flex items-center gap-2"><Save size={20}/> Kaydet</button>
                </>
              ) : (
                <>
                  <button onClick={handleDownloadPDF} className="p-2 bg-rose-600 text-white rounded-xl px-4 font-bold flex items-center gap-2 shadow-md"><Download size={20}/> PDF İndir</button>
                  <button onClick={() => { setEditTitle(selectedItem.title); setEditContent(selectedItem.content); setIsEditing(true); }} className="p-2 bg-indigo-600 text-white rounded-xl px-4 font-bold flex items-center gap-2 shadow-md"><Edit size={20}/> Düzenle</button>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center w-full">
            {isEditing ? (
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 w-full">
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  className="w-full text-2xl font-bold p-6 border-b border-slate-200 focus:outline-none text-center"
                />
                <div className="word-style-editor">
                  <JoditEditor
                    ref={editorRef}
                    value={editContent}
                    config={config}
                    onBlur={newContent => setEditContent(newContent)}
                  />
                </div>
              </div>
            ) : (
              <div id="pdf-render-content" className="unified-content shadow-2xl">
                <h1 className="text-3xl font-bold border-b-2 border-indigo-600 pb-4 mb-8 text-center uppercase">{selectedItem.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: setSelectedItem.content }}></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate("/")} className="p-2 bg-white rounded-xl border border-slate-200 hover:text-indigo-600"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
          <button onClick={handleAddNew} className="p-2 bg-indigo-600 text-white rounded-xl"><Plus size={20} /></button>
        </div>

        {items.map((item, index) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group cursor-pointer hover:border-indigo-400 transition-all">
            <div className="flex-1" onClick={() => setSelectedItem(item)}>
              <span className="text-indigo-600 font-bold mr-4 bg-indigo-50 px-4 py-2 rounded-xl">{index + 1}</span>
              <span className="font-bold text-slate-800 text-lg">{item.title}</span>
            </div>
            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}
