import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../services/firebase";
import { Brain, Globe, Mail, Lock, Loader2 } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { setError(err.message); } finally { setLoading(false); }
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
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        
        <button onClick={handleGoogle} className="w-full bg-white border border-slate-200 font-bold py-3 rounded-xl mb-4 flex items-center justify-center gap-2 hover:bg-slate-50">
          <Globe className="w-5 h-5 text-blue-500" /> Google ile Gir
        </button>
        
        <div className="flex items-center gap-4 mb-4">
           <div className="h-px bg-slate-200 flex-1"></div><span className="text-slate-400 text-xs font-bold">veya</span><div className="h-px bg-slate-200 flex-1"></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative"><Mail className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" /><input type="email" placeholder="E-posta" className="w-full pl-10 p-3 border rounded-xl" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="relative"><Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" /><input type="password" placeholder="Şifre" className="w-full pl-10 p-3 border rounded-xl" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <button disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center">{loading ? <Loader2 className="animate-spin" /> : (isLogin ? "Giriş Yap" : "Kayıt Ol")}</button>
        </form>
        <p className="text-center mt-6 text-sm text-slate-500 cursor-pointer hover:text-indigo-600" onClick={() => setIsLogin(!isLogin)}>{isLogin ? "Hesap oluştur" : "Giriş yap"}</p>
      </div>
    </div>
  );
}
