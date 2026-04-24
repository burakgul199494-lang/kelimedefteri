import React, { useState, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { db, appId } from "../services/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css"; 
import { ArrowLeft, Edit, Save, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

// --- 1. ÖZEL SAYFA KESİCİ (PAGE BREAK) MODÜLÜ TANIYORUZ ---
const BlockEmbed = Quill.import('blots/block/embed');
class PageBreak extends BlockEmbed {
  static create() {
    const node = super.create();
    node.setAttribute('class', 'page-break-line');
    node.setAttribute('contenteditable', 'false');
    // Düzenlerken görünecek ama PDF'de sayfa atlatacak CSS kodları:
    node.setAttribute('style', 'page-break-after: always; border-top: 2px dashed #cbd5e1; margin: 40px 0; text-align: center; color: #94a3b8; font-size: 14px; padding-top: 8px; display: block; width: 100%; font-weight: bold;');
    node.innerText = "✂️ --- YENİ SAYFA BAŞLANGICI --- ✂️";
    return node;
  }
}
PageBreak.blotName = 'pageBreak';
PageBreak.tagName = 'div';
Quill.register(PageBreak);
// -----------------------------------------------------------

export default function RichTextPage({ title, collectionName }) {
  const { user } = useData();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

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

  // --- 2. EDİTÖR ARAÇ ÇUBUĞU (TOOLBAR) AYARLARI ---
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }], // Renk seçeneklerini de ekledim
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['pageBreak'], // YENİ SAYFA BÖLME BUTONUMUZ
        ['clean']
      ],
      handlers: {
        pageBreak: function() {
          const range = this.quill.getSelection(true);
          this.quill.insertEmbed(range.index, 'pageBreak', true, Quill.sources.USER);
          // Alt satırdan yazmaya devam edebilmen için bir boşluk bırakır:
          this.quill.insertText(range.index + 1, '\n', Quill.sources.USER);
          this.quill.setSelection(range.index + 2, Quill.sources.SILENT);
        }
      }
    }
  }), []);

  // --- GÖRÜNTÜLEME VE DÜZENLEME EKRANI ---
  if (selectedItem) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
        
        {/* YENİ BUTON VE PDF ÇIKTISI İÇİN GİZLİ CSS STİLLERİ */}
        <style>
          {`
            .ql-pageBreak:after {
              content: '📄 Sayfa Böl';
              font-size: 13px;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 90px !important;
              color: #4f46e5;
              font-weight: bold;
            }
            .ql-toolbar .ql-pageBreak {
              width: auto !important;
              padding: 0 5px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              margin-left: 10px;
            }
            .ql-toolbar .ql-pageBreak:hover {
              background-color: #e0e7ff;
            }
            .quill-editor-container .ql-editor {
              min-height: 400px;
              font-size: 16px;
            }
            /* PDF ÇIKTISI VEYA YAZDIRMA ESNASINDA ÇALIŞACAK KOD */
            @media print {
              .page-break-line {
                page-break-after: always !important; /* SAYFAYI BURADAN KES */
                break-after: page !important;
                border: none !important;
                color: transparent !important; /* YAZIYI GİZLE */
                margin: 0 !important;
                padding: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
              }
            }
          `}
        </style>

        <div className="w-full max-w-3xl bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => { setSelectedItem(null); setIsEditing(false); }} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"><X size={20}/></button>
                  <button onClick={handleSave} className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 flex items-center gap-2 font-bold px-4 transition-colors"><Save size={20}/> Kaydet</button>
                </>
              ) : (
                <button onClick={() => { setEditTitle(selectedItem.title); setEditContent(selectedItem.content); setIsEditing(true); }} className="p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 flex items-center gap-2 font-bold px-4 transition-colors"><Edit size={20}/> Düzenle</button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <input 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                className="w-full text-2xl font-bold p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                placeholder="Başlık Girin"
              />
              <div className="quill-editor-container bg-white rounded-xl mb-12">
                <ReactQuill 
                  theme="snow" 
                  value={editContent} 
                  onChange={setEditContent} 
                  modules={modules} // YENİ MENÜYÜ BAĞLADIK
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h1 className="text-3xl font-extrabold text-slate-800 border-b pb-4">{selectedItem.title}</h1>
              <div className="prose prose-indigo max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: selectedItem.content }}></div>
            </div>
          )}
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
          <div className="text-center text-slate-500 mt-10 bg-white p-8 rounded-2xl border border-slate-200 border-dashed">
            Henüz içerik eklenmemiş. Sağ üstten <strong className="text-indigo-600">+</strong> butonuna basarak ilk içeriğini oluştur.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex-1" onClick={() => setSelectedItem(item)}>
                <span className="text-indigo-600 font-bold mr-3 bg-indigo-50 px-3 py-1 rounded-lg">{index + 1}</span>
                <span className="font-semibold text-slate-800 text-lg">{item.title}</span>
              </div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
