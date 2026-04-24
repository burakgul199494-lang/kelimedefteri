import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { db, storage, appId, ADMIN_EMAILS } from "../services/firebase";
import { 
  collection, addDoc, getDocs, doc, deleteDoc, 
  query, orderBy, setDoc, serverTimestamp, where 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { ArrowLeft, Plus, Trash2, FileText, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PDFPage({ title, type }) {
  const { user } = useData();
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState([]);
  const [userStatus, setUserStatus] = useState({});
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [pdfTitle, setPdfTitle] = useState("");

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);
  const pdfsRef = collection(db, "artifacts", appId, "shared_pdfs");

  useEffect(() => {
    if (user) {
      fetchPdfs();
      fetchUserStatus();
    }
  }, [user, type]);

  const fetchPdfs = async () => {
    const q = query(pdfsRef, where("type", "==", type), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPdfs(list);
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
    if (!file || !pdfTitle) return alert("Başlık ve dosya seçilmedi!");
    
    setUploading(true);
    try {
      const storagePath = `${appId}/pdfs/${type}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadResult = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(uploadResult.ref);

      await addDoc(pdfsRef, {
        title: pdfTitle,
        url: url,
        storagePath: storagePath,
        type: type,
        createdAt: serverTimestamp()
      });

      setFile(null);
      setPdfTitle("");
      fetchPdfs();
      alert("PDF yüklendi! 🎉");
    } catch (err) {
      alert("Hata: " + err.message);
    }
    setUploading(false);
  };

  const toggleReviewed = async (pdfId) => {
    const currentStatus = userStatus[pdfId] || false;
    const docRef = doc(db, "artifacts", appId, "users", user.uid, "pdf_status", pdfId);
    await setDoc(docRef, { reviewed: !currentStatus }, { merge: true });
    setUserStatus({ ...userStatus, [pdfId]: !currentStatus });
  };

  const handleDelete = async (pdf) => {
    if (!window.confirm("Bu PDF silinsin mi?")) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "shared_pdfs", pdf.id));
      await deleteObject(ref(storage, pdf.storagePath));
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
            <h2 className="font-bold text-indigo-600 flex items-center gap-2 underline">PDF Yükle (Sadece Admin)</h2>
            <input type="text" placeholder="Konu Başlığı" value={pdfTitle} onChange={(e) => setPdfTitle(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl" />
            <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm" />
            <button disabled={uploading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg">
              {uploading ? <Loader2 className="animate-spin inline mr-2"/> : "PDF Yükle"}
            </button>
          </form>
        )}

        <div className="space-y-4">
          {pdfs.map(pdf => (
            <div key={pdf.id} className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FileText className={userStatus[pdf.id] ? "text-emerald-500" : "text-slate-400"} size={24}/>
                <div>
                  <h3 className="font-bold text-slate-800">{pdf.title}</h3>
                  <a href={pdf.url} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm flex items-center gap-1">Aç <ExternalLink size={14}/></a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleReviewed(pdf.id)} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${userStatus[pdf.id] ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                  <CheckCircle size={18}/> {userStatus[pdf.id] ? "İnceledim" : "İncele"}
                </button>
                {isAdmin && <button onClick={() => handleDelete(pdf)} className="text-slate-300 hover:text-red-500"><Trash2 size={20}/></button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
