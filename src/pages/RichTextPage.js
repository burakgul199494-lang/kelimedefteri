import React, { useState, useEffect, useRef, useMemo } from "react";
import { useData } from "../context/DataContext";
import { db, appId } from "../services/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import JoditEditor from "jodit-react";
import { ArrowLeft, Edit, Save, Plus, Trash2, X, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js"; 

export default function RichTextPage({ title, collectionName }) {
  const { user } = useData();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const editor = useRef(null);
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

  // PDF İndirme Fonksiyonu
  const handleDownloadPDF = () => {
    const element = document.getElementById("pdf-content");
    const opt = {
      margin:       15,
      filename:     `${selectedItem.title}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const config = useMemo(() => ({
    readonly: false,
    height: 600,
    language: 'tr',
    placeholder: 'İçeriği buraya yazın veya yapıştırın...',
    uploader: {
      insertImageAsBase64URI: true 
    }
  }), []);

  if (selectedItem) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
        
        <style>{`
          .jodit-wysiwyg ul { list-style-type: disc !important; margin-left: 1.5rem !important; }
          .jodit-wysiwyg ol { list-style-type: decimal !important; margin-left: 1.5rem !important; }
        `}</style>

        <div className="w-full max-w-4xl bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => { setSelectedItem(null); setIsEditing(false); }} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200"><X size={20}/></button>
                  <button onClick={handleSave} className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 flex items-center gap-2 font-bold px-4"><Save size={20}/> Kaydet</button>
                </>
              ) : (
                <>
                  <button onClick={handleDownloadPDF} className="p-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 flex items-center gap-2 font-bold px-4">
                    <Download size={20}/> PDF İndir
                  </button>
                  <button onClick={() => { setEditTitle(selectedItem.title); setEditContent(selectedItem.content); setIsEditing(true); }} className="p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 flex items-center gap-2 font-bold px-4">
                    <Edit size={20}/> Düzenle
                  </button>
                </>
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
              <div className="bg-white rounded-xl mb-12">
                 <JoditEditor
                    ref={editor}
                    value={editContent}
                    config={config}
                    tabIndex={1}
                    onBlur={newContent => setEditContent(newContent)}
                 />
              </div>
            </div>
          ) : (
            <div id="pdf-content" className="space-y-6 bg-white p-2">
              <h1 className="text-3xl font-extrabold text-slate-800 border-b pb-4">{selectedItem.title}</h1>
              {/* 🔥 BOŞLUK DARALTMA (MARGIN) SINIFLARI EKLENDİ (prose-p:my-1, vb.) */}
              <div 
                className="prose prose-indigo max-w-none text-slate-800 leading-snug
                           prose-p:my-1 prose-headings:my-3 prose-ul:my-1 prose-li:my-0
                           prose-table:w-full prose-table:border-collapse prose-table:my-2
                           prose-td:border prose-td:border-slate-300 prose-td:p-2
                           prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:p-2
                           prose-img:rounded-xl prose-img:my-2" 
                dangerouslySetInnerHTML={{ __html: selectedItem.content }}
              ></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate("/")} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:text-indigo-600"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
          <button onClick={handleAddNew} className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700"><Plus size={20} /></button>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">Henüz içerik eklenmemiş. Sağ üstten + butonuna basarak ilk içeriğini oluştur.</div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group cursor-pointer hover:border-indigo-300 transition-colors">
              <div className="flex-1" onClick={() => setSelectedItem(item)}>
                <span className="text-indigo-600 font-bold mr-3">{index + 1}.</span>
                <span className="font-semibold text-slate-800 text-lg">{item.title}</span>
              </div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
