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
      margin:       [15, 15, 15, 15], // Kenar boşlukları
      filename:     `${selectedItem.title}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  // --- BİREBİR WORD (JODIT) MENÜSÜ VE SAYFA BÖLME AYARLARI ---
  const config = useMemo(() => ({
    readonly: false,
    placeholder: 'Notlarınızı buraya yazın...',
    height: 700,
    language: 'tr',
    toolbarSticky: false,
    buttons: [
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'font', 'fontsize', 'brush', 'paragraph', '|',
      'align', 'ul', 'ol', 'outdent', 'indent', '|',
      'table', 'image', 'link', 'hr', '|', // Tablo eklentisi burada
      'undo', 'redo', 'fullsize', '|',
      'pageBreak' // Özel Butonumuz
    ],
    controls: {
      pageBreak: {
        name: 'pageBreak',
        text: '📄 Sayfa Böl',
        tooltip: 'PDF alırken sayfayı buradan keser',
        exec: (editor) => {
          // ÖNEMLİ: html2pdf__page-break sınıfı, kütüphanenin burayı sayfa sonu olarak algılamasını sağlar.
          // data-html2canvas-ignore="true" ise "Bu kesik çizgiyi PDF'e çizerken gizle" demektir.
          const html = `<div class="html2pdf__page-break" style="page-break-after: always; border-top: 2px dashed #4f46e5; margin: 40px 0; padding-top: 10px; text-align: center; color: #4f46e5; font-weight: bold; font-family: sans-serif;" contenteditable="false" data-html2canvas-ignore="true">✂️ --- YENİ SAYFA BAŞLANGICI --- ✂️</div><p><br></p>`;
          editor.s.insertHTML(html);
        }
      }
    }
  }), []);

  // --- GÖRÜNTÜLEME VE DÜZENLEME EKRANI ---
  if (selectedItem) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          
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
            <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <input 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                className="w-full text-2xl font-bold p-3 border-b-2 border-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Konu veya Hikaye Başlığı"
              />
              <div className="w-full text-black">
                <JoditEditor
                  ref={editorRef}
                  value={editContent}
                  config={config}
                  onBlur={newContent => setEditContent(newContent)} // Performans için onBlur kullanıldı
                />
              </div>
            </div>
          ) : (
            // PDF'in okunacağı (ve indirileceği) alan
            <div id="pdf-content-area" className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 min-h-[29.7cm]">
              <h1 className="text-3xl font-extrabold text-slate-800 border-b-2 border-slate-100 pb-4 mb-8 text-center">{selectedItem.title}</h1>
              {/* Jodit'ten gelen HTML içeriğini render ediyoruz */}
              <div className="prose prose-indigo max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: selectedItem.content }}></div>
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
