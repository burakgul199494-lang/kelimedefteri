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

  // --- PDF AKTARIM AYARLARI (ZOOM SORUNU ÇÖZÜMÜ) ---
  const handleDownloadPDF = () => {
    const element = document.getElementById('pdf-content-area');
    const opt = {
      margin:       0, // Kenar boşlukları HTML içindeki padding ile yönetiliyor
      filename:     `${selectedItem.title}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        width: 794, // A4'ün 96 DPI'daki tam genişliği
      },
      jsPDF:        { unit: 'px', hotfixes: ['px_scaling'], format: [794, 1123], orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  };

  const config = useMemo(() => ({
    readonly: false,
    placeholder: 'Notlarınızı buraya yazın...',
    height: "auto",
    minHeight: 1123, // En az bir A4 sayfası boyutu
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
      <div className="min-h-screen bg-slate-300 p-4 md:p-8 flex flex-col items-center overflow-y-auto">
        
        {/* 🔥 GERÇEKÇİ WORD GÖRÜNÜMÜ CSS 🔥 */}
        <style>
          {`
            /* Editörün çevresi */
            .word-style-editor .jodit-container {
              border: none !important;
              background-color: transparent !important;
            }

            .word-style-editor .jodit-workplace {
              background-color: #94a3b8 !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              padding: 40px 0 !important;
            }

            /* Beyaz Kağıt Alanı */
            .word-style-editor .jodit-wysiwyg {
              background-color: white !important;
              width: 210mm !important;
              min-height: 297mm !important;
              padding: 20mm !important;
              margin-bottom: 20px !important;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
              box-sizing: border-box !important;
              
              /* Otomatik Sayfa Çizgisi Hilesi */
              background-image: repeating-linear-gradient(
                to bottom,
                transparent 0,
                transparent 296mm,
                #e2e8f0 296mm,
                #e2e8f0 297mm,
                #64748b 297mm,
                #64748b 305mm
              ) !important;
              background-attachment: local !important;
            }

            /* PDF ve Ön İzleme Alanı Sabitleme */
            #pdf-content-area {
              width: 210mm;
              background: white;
              margin: 0 auto;
              box-sizing: border-box;
            }

            .page-container {
               padding: 20mm;
               min-height: 297mm;
               position: relative;
            }

            @media screen and (max-width: 210mm) {
              .word-style-editor .jodit-wysiwyg, #pdf-content-area {
                width: 95vw !important;
                padding: 10mm !important;
              }
            }
          `}
        </style>

        <div className="w-full max-w-5xl mb-6">
          <div className="flex justify-between items-center mb-4 bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg border border-slate-200 sticky top-4 z-50">
            <button onClick={() => { setSelectedItem(null); setIsEditing(false); }} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"><X size={20}/></button>
                  <button onClick={handleSave} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-bold px-4 transition-colors shadow-md"><Save size={20}/> Kaydet</button>
                </>
              ) : (
                <>
                  <button onClick={handleDownloadPDF} className="p-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 flex items-center gap-2 font-bold px-4 transition-colors shadow-md"><Download size={20}/> PDF İndir</button>
                  <button onClick={() => { setEditTitle(selectedItem.title); setEditContent(selectedItem.content); setIsEditing(true); }} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-bold px-4 transition-colors shadow-md"><Edit size={20}/> Düzenle</button>
                </>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <input 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                className="w-full text-2xl font-bold p-6 border-b border-slate-200 focus:outline-none focus:bg-indigo-50 transition-all text-center"
                placeholder="Konu / Hikaye Başlığı"
              />
              <div className="word-style-editor w-full">
                <JoditEditor
                  ref={editorRef}
                  value={editContent}
                  config={config}
                  onBlur={newContent => setEditContent(newContent)}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <div id="pdf-content-area" className="shadow-2xl">
                <div className="page-container">
                    <h1 className="text-4xl font-black text-slate-900 border-b-4 border-indigo-600 pb-6 mb-10 text-center uppercase tracking-widest">{selectedItem.title}</h1>
                    <div className="prose prose-slate prose-lg max-w-none text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedItem.content }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate("/")} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:text-indigo-600"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
          <button onClick={handleAddNew} className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700"><Plus size={20} /></button>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-slate-500 mt-10 bg-white p-12 rounded-3xl border-2 border-slate-200 border-dashed">
            Henüz içerik yok. <strong className="text-indigo-600">+</strong> butonuna basarak başla.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group cursor-pointer hover:border-indigo-400 hover:shadow-xl transition-all duration-300">
              <div className="flex-1" onClick={() => setSelectedItem(item)}>
                <span className="text-indigo-600 font-bold mr-4 bg-indigo-50 px-4 py-2 rounded-xl">{index + 1}</span>
                <span className="font-bold text-slate-800 text-lg">{item.title}</span>
              </div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
