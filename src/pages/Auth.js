import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Yönlendirme için gerekli
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../services/firebase";
import { useData } from "../context/DataContext"; // Kullanıcı durumunu kontrol etmek için
import { Brain, Globe, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useData(); // Global kullanıcı bilgisini alıyoruz
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // EĞER KULLANICI ZATEN GİRİŞ YAPMIŞSA DİREKT ANA SAYFAYA AT
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        // Giriş Yapma
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Kayıt Olma
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // Başarılı olursa useEffect devreye girip yönlendirecek
    } catch (err) {
      // Hata Mesajlarını Türkçeleştirme
      let msg = err.message;
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
        msg = "Hatalı e-posta veya şifre.";
      } else if (msg.includes("email-already-in-use")) {
        msg = "Bu e-posta zaten kullanımda.";
      } else if (msg.includes("weak-password")) {
        msg = "Şifre en az 6 karakter olmalı.";
      }
      setError(msg);
      setLoading(false); // Sadece hata varsa loading'i durdur, başarılıysa yönlendirme bekliyoruz
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      // Başarılı olursa useEffect yönlendirecek
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg">
            <Brain className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Kelime Atölyesi</h1>
          <p className="text-slate-500">Kelimelerini kaybetme.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4"/> {error}
          </div>
        )}
        
        <button 
          onClick={handleGoogle} 
          disabled={loading}
          className="w-full bg-white border border-slate-200 font-bold py-3 rounded-xl mb-4 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
        >
          <Globe className="w-5 h-5 text-blue-500" /> Google ile Gir
        </button>
        
        <div className="flex items-center gap-4 mb-4">
           <div className="h-px bg-slate-200 flex-1"></div>
           <span className="text-slate-400 text-xs font-bold uppercase">veya</span>
           <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
            <input 
              type="email" 
              placeholder="E-posta" 
              className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
            <input 
              type="password" 
              placeholder="Şifre" 
              className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <button 
            disabled={loading} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex justify-center transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? "Giriş Yap" : "Kayıt Ol")}
          </button>
        </form>
        
        <p 
          className="text-center mt-6 text-sm text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors" 
          onClick={() => {
            setIsLogin(!isLogin);
            setError(""); // Mod değiştirince hatayı temizle
          }}
        >
          {isLogin ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
        </p>
      </div>
    </div>
  );
}
