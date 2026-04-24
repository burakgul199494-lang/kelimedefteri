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

  // --- PDF İNDİRME FONKSİYONU ---
  const handleDownloadPDF = () => {
    const element = document.getElementById('pdf-content-area');
    const opt = {
      margin:       [20, 20, 20, 20], // Görseldeki ile uyumlu kenar boşlukları
      filename:     `${selectedItem.title}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  // --- JODIT AYARLARI ---
  const config = useMemo(() => ({
    readonly: false,
    placeholder: 'Notlarınızı buraya yazın...',
    height: "auto", // Editörün içeriğe göre sonsuz uzamasını sağlar (Kendi scrollunu iptal eder)
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

  // --- GÖRÜNTÜLEME VE DÜZENLEME EKRANI ---
  if (selectedItem) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center">
        
        {/* 🔥 OTOMATİK A4 SAYFA GÖRÜNÜMÜ İÇİN CSS HİLESİ 🔥 */}
        <style>
          {`
            /* Editörün dış çalışma alanını gri yap */
            .word-style-editor .jodit-workplace {
              background-color: #cbd5e1 !important; 
              padding: 20px 0 !important;
              height: auto !important;
            }

            /* Asıl yazı yazılan alanı gerçek A4 boyutlarında beyaz kağıtlara böl */
            .word-style-editor .jodit-wysiwyg {
              background-color: transparent !important;
              background-image: repeating-linear-gradient(
                to bottom,
                white 0,
                white 297mm,             /* A4 Yüksekliği (Tam burada 1. sayfa biter) */
                #94a3b8 297mm,           /* Koyu gri sayfa arası boşluk başlar */
                #94a3b8 calc(297mm + 15px) /* 15px'lik sayfa geçiş boşluğu */
              ) !important;
              width: 210mm !important;    /* A4 Genişliği */
              min-height: 297mm !important;
              margin: 0 auto !important;  /* Kağıdı ortala */
              padding: 20mm !important;   /* Word kenar boşlukları */
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important;
              box-sizing: border-box !important;
            }
          `}
        </style>

        <div className="w-full max-w-5xl">
          
          {/* ÜST BAR */}
          <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
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
                <>
                  <button onClick={handleDownloadPDF} className="p-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 flex items-center gap-2 font-bold px-4 transition-colors"><Download size={20}/> PDF İndir</button>
                  <button onClick={() => { setEditTitle(selectedItem.title); setEditContent(selectedItem.content); setIsEditing(true); }} className="p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 flex items-center gap-2 font-bold px-4 transition-colors"><Edit size={20}/> Düzenle</button>
                </>
              )}
            </div>
          </div>

          {/* İÇERİK ALANI */}
          {isEditing ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <input 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                className="w-full text-2xl font-bold p-6 border-b border-slate-200 focus:outline-none focus:bg-indigo-50 transition-colors"
                placeholder="Konu veya Hikaye Başlığı"
              />
              <div className="word-style-editor w-full text-black">
                <JoditEditor
                  ref={editorRef}
                  value={editContent}
                  config={config}
                  onBlur={newContent => setEditContent(newContent)}
                />
              </div>
            </div>
          ) : (
            // OKUMA VE PDF ÇIKTI ALANI
            <div className="flex justify-center bg-slate-200 p-8 rounded-2xl">
              <div id="pdf-content-area" className="bg-white p-[20mm] w-[210mm] min-h-[297mm] shadow-md box-border">
                <h1 className="text-3xl font-extrabold text-slate-800 border-b-2 border-slate-100 pb-4 mb-8 text-center">{selectedItem.title}</h1>
                <div className="prose prose-indigo max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: selectedItem.content }}></div>
              </div>
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
