import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../services/firebase";
import { Brain, Globe, Mail, Lock, Loader2 } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  
  const handleGoogle = async () => {
      try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch(e){ setError(e.message); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
       <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg">
                <Brain className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Kelime Atölyesi</h1>
          </div>
          {error && <div className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{error}</div>}
          <button onClick={handleGoogle} className="w-full bg-white border border-slate-200 py-3 rounded-xl mb-4 flex justify-center items-center gap-2"><Globe className="text-blue-500"/> Google ile Gir</button>
          <form onSubmit={handleAuth} className="space-y-4">
             <div className="relative"><Mail className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full pl-10 p-3 border rounded-xl" required/></div>
             <div className="relative"><Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Şifre" className="w-full pl-10 p-3 border rounded-xl" required/></div>
             <button disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">{loading ? <Loader2 className="animate-spin mx-auto"/> : (isLogin ? "Giriş" : "Kayıt Ol")}</button>
          </form>
          <p onClick={()=>setIsLogin(!isLogin)} className="text-center mt-4 text-sm text-slate-500 cursor-pointer">Hesap değiştir</p>
       </div>
    </div>
  );
}
