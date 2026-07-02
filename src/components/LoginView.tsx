import { useState } from "react";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight,
  Shield,
  Coins
} from "lucide-react";
import { useAuthStore } from "../store";

export default function LoginView() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Por favor, informe o e-mail e a senha.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "E-mail ou senha incorretos.");
      }

      // Successful login
      login(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'ADMIN' | 'GESTOR' | 'OPERADOR' | 'LEITOR') => {
    setErrorMsg("");
    if (role === 'ADMIN') {
      setEmail("admin@projetocerto.com");
      setPassword("admin123");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" id="login_view_container">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
        {/* Decorative background accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-brand-primary/5 rounded-full blur-3xl -mr-12 -mt-12"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-brand-accent/5 rounded-full blur-3xl -ml-12 -mb-12"></div>

        <div className="p-8 space-y-8 relative">
          {/* Brand header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-brand-primary/10 border border-white/10">
              <Coins className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-wider text-slate-800 leading-none">PROJETO CERTO</h1>
              <p className="text-[10px] font-extrabold text-[#D9A441] uppercase tracking-widest leading-none">Gestão de Custos & ERP</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">E-mail ou Usuário</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all placeholder:text-slate-300 font-semibold text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all placeholder:text-slate-300 text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-brand-primary/15 hover:shadow-xl hover:shadow-brand-primary/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              id="login_submit_btn"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-b-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
