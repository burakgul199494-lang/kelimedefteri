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

  // 🔥 PDF 4 SAYFA SORUNUNU ÇÖZEN GİZLİ MOTOR 🔥
  const handleDownloadPDF = () => {
    // 1. Ekrandaki karmaşadan kurtulmak için arka planda gizli, temiz bir div yaratıyoruz.
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px'; // Ekranın dışına atıyoruz ki görünmesin
    container.style.top = '0';
    container.style.width = '800px'; // A4'ün tam piksel karşılığı
    container.style.backgroundColor = 'white';

    // 2. İçeriği temiz bir şekilde bu gizli dive yerleştiriyoruz.
    container.innerHTML = `
      <div style="font-family: sans-serif; color: #1e293b; padding: 10px;">
         <h1 style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 20px; font-size: 26px; text-transform: uppercase;">
           ${selectedItem.title}
         </h1>
         <div style="font-size: 16px; line-height: 1.6;">
            ${selectedItem.content}
         </div>
      </div>
    `;
    document.body.appendChild(container);

    // 3. SADECE BURADAN 15mm boşluk veriyoruz. (Çifte marjin kalktı)
    const opt = {
      margin:       [15, 15, 15, 15], 
      filename:     `${selectedItem.title}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'], avoid: ['img', 'table', 'tr', 'h1', 'h2', 'h3'] }
    };

    // 4. PDF'i oluştur ve işlem bitince gizli çöp kutusunu sil
    html2pdf().set(opt).from(container).save().then(() => {
       document.body.removeChild(container);
    });
  };

  const config = useMemo(() => ({
    readonly: false,
    placeholder: 'Notlarınızı buraya yazın...',
    height: "auto",
    minHeight: 600,
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
      <div className="min-h-screen bg-slate-200 p-4 md:p-8 flex flex-col items-center overflow-y-auto">
        
        {/* 🔥 TERTEMİZ DÜZ KAĞIT CSS (Boşluk/taşma sorunu yok) 🔥 */}
        <style>
          {`
            .word-style-editor .jodit-container {
              border: none !important;
              background-color: white !important;
            }
            .word-style-editor .jodit-wysiwyg {
              background-color: white !important;
              padding: 40px !important;
              box-sizing: border-box !important;
              line-height: 1.6 !important;
            }
          `}
        </style>

        <div className="w-full max-w-[800px] mb-6">
          <div className="flex justify-between items-center mb-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-sm border border-slate-200 sticky top-4 z-50">
            <button onClick={() => { setSelectedItem(null); setIsEditing(false); }} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"><X size={20}/></button>
                  <button onClick={handleSave} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-bold px-4 transition-colors shadow-sm"><Save size={20}/> Kaydet</button>
                </>
              ) : (
                <>
                  <button onClick={handleDownloadPDF} className="p-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 flex items-center gap-2 font-bold px-4 transition-colors shadow-sm"><Download size={20}/> PDF İndir</button>
                  <button onClick={() => { setEditTitle(selectedItem.title); setEditContent(selectedItem.content); setIsEditing(true); }} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-bold px-4 transition-colors shadow-sm"><Edit size={20}/> Düzenle</button>
                </>
              )}
            </div>
          </div>

          {/* DÜZENLEME VE OKUMA ALANI (İkisi de aynı A4 genişliğinde) */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full min-h-[1000px]">
            {isEditing ? (
              <>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  className="w-full text-2xl font-bold p-8 border-b border-slate-100 focus:outline-none focus:bg-indigo-50 transition-all text-center"
                  placeholder="Başlık Giriniz"
                />
                <div className="word-style-editor w-full">
                  <JoditEditor
                    ref={editorRef}
                    value={editContent}
                    config={config}
                    onBlur={newContent => setEditContent(newContent)}
                  />
                </div>
              </>
            ) : (
              <div className="p-10 md:p-16">
                <h1 className="text-4xl font-black text-slate-900 border-b-2 border-indigo-600 pb-6 mb-10 text-center uppercase tracking-widest">{selectedItem.title}</h1>
                <div className="prose prose-slate prose-lg max-w-none text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedItem.content }}></div>
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
          <div className="text-center text-slate-500 mt-10 bg-white p-12 rounded-3xl border-2 border-slate-200 border-dashed">
            Henüz içerik eklenmemiş. <strong className="text-indigo-600">+</strong> butonuna basarak yeni bir içerik oluşturabilirsiniz.
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
