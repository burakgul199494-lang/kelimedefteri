import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { db, appId, ADMIN_EMAILS } from "../services/firebase";
import { 
  collection, addDoc, getDocs, doc, deleteDoc, 
  query, orderBy, setDoc, serverTimestamp 
} from "firebase/firestore";
import { ArrowLeft, Plus, Trash2, FileText, CheckCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PDFPage({ title, type }) {
  const { user } = useData();
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState([]);
  const [userStatus, setUserStatus] = useState({});
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfUrl, setPdfUrl] = useState(""); 

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);
  const pdfsRef = collection(db, "artifacts", appId, "shared_pdfs");

  useEffect(() => {
    if (user) {
      fetchPdfs();
      fetchUserStatus();
    }
  }, [user, type]);

  const fetchPdfs = async () => {
    try {
      // "asc" yaparak ilk eklediğini en üstte, sonrakileri altına dizecek şekilde güncelledik.
      const q = query(pdfsRef, orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(pdf => pdf.type === type);
        
      setPdfs(list);
    } catch (error) {
      console.error("Dosyalar çekilirken hata oluştu:", error);
    }
  };

  const fetchUserStatus = async () => {
    const statusRef = collection(db, "artifacts", appId, "users", user.uid, "pdf_status");
    const snapshot = await getDocs(statusRef);
    const statusMap = {};
    snapshot.docs.forEach(doc => statusMap[doc.id] = doc.data().reviewed);
    setUserStatus(statusMap);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!pdfUrl || !pdfTitle) return alert("Lütfen başlık ve Google Drive linkini girin!");
    
    let finalUrl = pdfUrl;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
    }

    try {
      await addDoc(pdfsRef, {
        title: pdfTitle,
        url: finalUrl,
        type: type,
        createdAt: serverTimestamp()
      });

      setPdfUrl("");
      setPdfTitle("");
      fetchPdfs();
      alert("PDF Linki sisteme başarıyla eklendi! 🎉");
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const toggleReviewed = async (pdfId) => {
    const currentStatus = userStatus[pdfId] || false;
    const docRef = doc(db, "artifacts", appId, "users", user.uid, "pdf_status", pdfId);
    await setDoc(docRef, { reviewed: !currentStatus }, { merge: true });
    setUserStatus({ ...userStatus, [pdfId]: !currentStatus });
  };

  const handleDelete = async (pdf) => {
    if (!window.confirm("Bu içeriği silmek istiyor musunuz?")) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "shared_pdfs", pdf.id));
      fetchPdfs();
    } catch (err) {
      alert("Silme hatası!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate("/")} className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-slate-800">{title}</h1>
          <div className="w-10"></div>
        </div>

        {isAdmin && (
          <form onSubmit={handleUpload} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 space-y-4">
            <h2 className="font-bold text-indigo-600 flex items-center gap-2 underline">PDF Ekle (Sadece Admin)</h2>
            <input 
              type="text" 
              placeholder="Konu Başlığı (Örn: Present Continuous Tense)" 
              value={pdfTitle} 
              onChange={(e) => setPdfTitle(e.target.value)} 
              className="w-full p-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-indigo-500" 
            />
            <input 
              type="url" 
              placeholder="Google Drive PDF Linkini Buraya Yapıştırın" 
              value={pdfUrl} 
              onChange={(e) => setPdfUrl(e.target.value)} 
              className="w-full p-3 bg-slate-50 border rounded-xl focus:outline-none focus:border-indigo-500" 
            />
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-colors">
              Sisteme Kaydet
            </button>
          </form>
        )}

        <div className="space-y-4">
          {pdfs.map((pdf, index) => (
            <div key={pdf.id} className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between transition-all hover:border-indigo-300">
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-3 rounded-xl ${userStatus[pdf.id] ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <FileText size={24}/>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">
                    <span className="text-indigo-600 mr-2">{index + 1}.</span>
                    {pdf.title}
                  </h3>
                  <a href={pdf.url} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm font-semibold flex items-center gap-1 mt-1 hover:underline">
                    PDF'i Aç <ExternalLink size={14}/>
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleReviewed(pdf.id)} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 ${userStatus[pdf.id] ? "bg-emerald-500 text-white shadow-md" : "bg-slate-100 text-slate-400"}`}>
                  <CheckCircle size={18}/> <span className="hidden sm:inline">{userStatus[pdf.id] ? "İnceledim" : "İncele"}</span>
                </button>
                {isAdmin && <button onClick={() => handleDelete(pdf)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={20}/></button>}
              </div>
            </div>
          ))}
          {pdfs.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-medium">Henüz bir içerik eklenmemiş.</div>
          )}
        </div>
      </div>
    </div>
  );
}
