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

  // --- PDF AKTARIMI (Sade ve Sorunsuz Mantık) ---
  const handleDownloadPDF = () => {
    const element = document.getElementById('pdf-render-content');
    const opt = {
      margin:       [15, 15, 15, 15], 
      filename:     `${selectedItem.title}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  };

  const config = useMemo(() => ({
    readonly: false,
    placeholder: 'Notlarınızı buraya yazın...',
    height: 600,
    language: 'tr',
    toolbarSticky: false,
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
      <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col items-center overflow-y-auto">
        
        {/* 🔥 TAILWIND'İN BOZDUĞU LİSTELERİ VE TABLOLARI DÜZELTEN CSS 🔥 */}
        <style>
          {`
            .rich-text-content {
              font-family: Arial, Helvetica, sans-serif !important;
              font-size: 16px !important;
              line-height: 1.6 !important;
              color: #1e293b !important;
            }
            
            /* Madde İşaretlerini Geri Getiriyoruz */
            .rich-text-content ul {
              list-style-type: disc !important;
              padding-left: 2rem !important;
              margin-bottom: 1rem !important;
            }
            .rich-text-content ol {
              list-style-type: decimal !important;
              padding-left: 2rem !important;
              margin-bottom: 1rem !important;
            }
            .rich-text-content li {
              margin-bottom: 0.5rem !important;
              display: list-item !important;
            }
            
            /* Başlık ve Paragraf Boşlukları */
            .rich-text-content p { margin-bottom: 1rem !important; }
            .rich-text-content h1, .rich-text-content h2, .rich-text-content h3 {
              margin-top: 1.5rem !important;
              margin-bottom: 1rem !important;
              font-weight: bold !important;
            }
            
            /* Tablo Stilleri */
            .rich-text-content table {
              border-collapse: collapse !important;
              width: 100% !important;
              margin-bottom: 1rem !important;
            }
            .rich-text-content td, .rich-text-content th {
              border: 1px solid #cbd5e1 !important;
              padding: 8px !important;
            }
          `}
        </style>

        <div className="w-full max-w-[800px] mb-6">
          <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <button onClick={() => { setSelectedItem(null); setIsEditing(false); }} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"><X size={20}/></button>
                  <button onClick={handleSave} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-bold px-4 transition-colors"><Save size={20}/> Kaydet</button>
                </>
              ) : (
                <>
                  <button onClick={handleDownloadPDF} className="p-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 flex items-center gap-2 font-bold px-4 transition-colors"><Download size={20}/> PDF İndir</button>
                  <button onClick={() => { setEditTitle(selectedItem.title); setEditContent(selectedItem.content); setIsEditing(true); }} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-bold px-4 transition-colors"><Edit size={20}/> Düzenle</button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full min-h-[800px]">
            {isEditing ? (
              <div>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  className="w-full text-2xl font-bold p-6 border-b border-slate-200 focus:outline-none focus:bg-indigo-50 transition-colors text-center text-slate-800"
                  placeholder="Başlık Giriniz"
                />
                <div className="w-full text-black rich-text-content">
                  <JoditEditor
                    ref={editorRef}
                    value={editContent}
                    config={config}
                    onBlur={newContent => setEditContent(newContent)}
                  />
                </div>
              </div>
            ) : (
              /* DÜZELTİLDİ: setSelectedItem yerine selectedItem.content yazıldı. 
                 Ayrıca 'rich-text-content' CSS class'ı ile madde işaretleri koruma altına alındı. */
              <div id="pdf-render-content" className="p-8 md:p-12 bg-white text-black rich-text-content">
                <h1 className="text-3xl font-bold border-b border-slate-300 pb-4 mb-6 text-center">{selectedItem.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: selectedItem.content }}></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- LİSTELEME EKRANI ---
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate("/")} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:text-indigo-600"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
          <button onClick={handleAddNew} className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700"><Plus size={20} /></button>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-slate-500 mt-10 bg-white p-12 rounded-2xl border border-slate-200 border-dashed">
            Henüz içerik eklenmemiş. <strong className="text-indigo-600">+</strong> butonuna basarak yeni bir içerik oluşturabilirsiniz.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group cursor-pointer hover:border-indigo-400 transition-all">
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
