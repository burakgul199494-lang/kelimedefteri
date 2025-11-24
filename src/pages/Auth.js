import React, { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail // YENİ EKLENDİ
} from "firebase/auth";
import { auth } from "../services/firebase";
import { Brain, Globe, Mail, Lock, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";

export default function Auth() {
  // view: 'login' | 'register' | 'reset'
  const [view, setView] = useState("login"); 
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(""); // Şifre sıfırlama başarılı mesajı için
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useData();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Form Gönderildiğinde
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError(""); 
    setSuccessMsg("");
    setLoading(true);
    
    try {
      if (view === "login") {
        // GİRİŞ YAPMA
        await signInWithEmailAndPassword(auth, email, password);
      } 
      else if (view === "register") {
        // KAYIT OLMA
        await createUserWithEmailAndPassword(auth, email, password);
      } 
      else if (view === "reset") {
        // ŞİFRE SIFIRLAMA LİNKİ GÖNDERME
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg("Sıfırlama bağlantısı e-posta adresine gönderildi! Lütfen gelen kutunu (ve spam klasörünü) kontrol et.");
        setLoading(false); 
        return; // Yönlendirme yapma, mesajı görsün
      }
    } catch (err) { 
      // Hata Mesajlarını Türkçeleştirme (Basitçe)
      let msg = err.message;
      if(msg.includes("user-not-found")) msg = "Bu e-posta ile kayıtlı kullanıcı bulunamadı.";
      else if(msg.includes("wrong-password")) msg = "Hatalı şifre.";
      else if(msg.includes("email-already-in-use")) msg = "Bu e-posta zaten kullanımda.";
      else if(msg.includes("invalid-email")) msg = "Geçersiz e-posta adresi.";
      
      setError(msg); 
    } finally { 
      if (view !== "reset") setLoading(false); 
    }
  };

  const handleGoogle = async () => {
    setError(""); 
    setLoading(true);
    try { 
      await signInWithPopup(auth, new GoogleAuthProvider()); 
    } catch (err) { 
      setError(err.message); 
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm transition-all duration-300">
        
        {/* Başlık Alanı */}
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg">
            <Brain className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Kelime Atölyesi</h1>
          <p className="text-slate-500 text-sm">
            {view === "login" && "Kelimelerini kaybetme."}
            {view === "register" && "Aramıza katıl."}
            {view === "reset" && "Şifreni mi unuttun?"}
          </p>
        </div>
        
        {/* Hata ve Başarı Mesajları */}
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm border border-red-100 flex items-center gap-2"><div className="w-1 h-1 bg-red-500 rounded-full shrink-0"/>{error}</div>}
        {successMsg && <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 text-sm border border-green-100 flex items-start gap-2"><CheckCircle2 className="w-5 h-5 shrink-0"/>{successMsg}</div>}
        
        {/* Google Butonu (Sadece Giriş ve Kayıtta) */}
        {view !== "reset" && (
            <>
                <button onClick={handleGoogle} className="w-full bg-white border border-slate-200 font-bold py-3 rounded-xl mb-4 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors text-slate-700">
                <Globe className="w-5 h-5 text-blue-500" /> Google ile Devam Et
                </button>
                
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-px bg-slate-200 flex-1"></div><span className="text-slate-400 text-xs font-bold">veya e-posta</span><div className="h-px bg-slate-200 flex-1"></div>
                </div>
            </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input (Her zaman var) */}
          <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
              <input type="email" placeholder="E-posta Adresi" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          
          {/* Şifre Input (Sadece Giriş ve Kayıtta var, Reset'te yok) */}
          {view !== "reset" && (
              <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
                  <input type="password" placeholder="Şifre" className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
          )}

          {/* Şifremi Unuttum Linki (Sadece Girişte) */}
          {view === "login" && (
              <div className="text-right">
                  <button type="button" onClick={() => { setView("reset"); setError(""); setSuccessMsg(""); }} className="text-xs font-bold text-indigo-500 hover:text-indigo-700">
                      Şifremi unuttum?
                  </button>
              </div>
          )}

          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex justify-center transition-colors shadow-md shadow-indigo-200">
              {loading ? <Loader2 className="animate-spin" /> : (
                  view === "login" ? "Giriş Yap" : 
                  view === "register" ? "Kayıt Ol" : 
                  "Sıfırlama Linki Gönder"
              )}
          </button>
        </form>

        {/* Alt Linkler (Geçişler) */}
        <div className="mt-6 text-center text-sm text-slate-500">
            {view === "login" && (
                <p>Hesabın yok mu? <button onClick={() => { setView("register"); setError(""); }} className="font-bold text-indigo-600 hover:underline">Hesap oluştur</button></p>
            )}
            
            {view === "register" && (
                <p>Zaten hesabın var mı? <button onClick={() => { setView("login"); setError(""); }} className="font-bold text-indigo-600 hover:underline">Giriş yap</button></p>
            )}

            {view === "reset" && (
                <button onClick={() => { setView("login"); setError(""); setSuccessMsg(""); }} className="flex items-center justify-center gap-2 font-bold text-slate-600 hover:text-indigo-600 w-full">
                    <ArrowLeft className="w-4 h-4"/> Girişe Dön
                </button>
            )}
        </div>

      </div>
    </div>
  );
}
