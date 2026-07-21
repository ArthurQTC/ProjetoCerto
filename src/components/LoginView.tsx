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
  Coins,
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "../store";

export default function LoginView() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Recovery States
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState("");
  const [recoveryErrorMsg, setRecoveryErrorMsg] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [devCode, setDevCode] = useState("");

  const maskEmail = (emailStr: string) => {
    if (!emailStr) return "";
    const [local, domain] = emailStr.split("@");
    if (!domain) return emailStr;
    const maskedLocal = local.length > 2 
      ? local[0] + "***" + local[local.length - 1] 
      : local[0] + "***";
    const [domainName, domainExt] = domain.split(".");
    if (!domainExt) return `${maskedLocal}@${domain}`;
    const maskedDomain = domainName.length > 2
      ? domainName[0] + "***" + domainName[domainName.length - 1]
      : domainName[0] + "***";
    return `${maskedLocal}@${maskedDomain}.${domainExt}`;
  };

  const handleSendCode = async () => {
    if (!recoveryInput.trim()) {
      setRecoveryErrorMsg("Por favor, informe seu e-mail ou nome de usuário.");
      return;
    }
    setRecoveryLoading(true);
    setRecoveryErrorMsg("");
    setRecoverySuccessMsg("");
    setDevCode("");
    try {
      const res = await fetch("/api/public/enviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: recoveryInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar código de segurança.");
      }
      setTargetEmail(data.email || "");
      if (data.mock && data.code) {
        setDevCode(data.code);
        setRecoveryCode(data.code); // Pre-fill for maximum testing convenience!
        setRecoverySuccessMsg("Código gerado com sucesso (Modo de Teste)!");
      } else {
        setRecoverySuccessMsg(data.message || "Código enviado com sucesso!");
      }
      setRecoveryStep(2);
    } catch (err: any) {
      setRecoveryErrorMsg(err.message || "Erro de conexão com o servidor.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode || !recoveryNewPassword || !recoveryConfirmPassword) {
      setRecoveryErrorMsg("Todos os campos são obrigatórios.");
      return;
    }
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setRecoveryErrorMsg("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (recoveryNewPassword.length < 4) {
      setRecoveryErrorMsg("A senha deve ter pelo menos 4 caracteres.");
      return;
    }

    setRecoveryLoading(true);
    setRecoveryErrorMsg("");
    setRecoverySuccessMsg("");
    try {
      const res = await fetch("/api/public/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrUsername: recoveryInput,
          codigo: recoveryCode,
          novaSenha: recoveryNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao alterar a senha.");
      }
      setRecoverySuccessMsg("Senha alterada com sucesso!");
      setRecoveryCode("");
      setRecoveryNewPassword("");
      setRecoveryConfirmPassword("");
      setTimeout(() => {
        setShowRecoveryModal(false);
        setRecoveryStep(1);
        setRecoveryInput("");
        setRecoverySuccessMsg("");
        setTargetEmail("");
        setDevCode("");
      }, 2000);
    } catch (err: any) {
      setRecoveryErrorMsg(err.message || "Erro ao alterar a senha.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleCloseRecovery = () => {
    setShowRecoveryModal(false);
    setRecoveryStep(1);
    setRecoveryInput("");
    setRecoveryCode("");
    setRecoveryNewPassword("");
    setRecoveryConfirmPassword("");
    setRecoveryErrorMsg("");
    setRecoverySuccessMsg("");
    setTargetEmail("");
    setDevCode("");
  };

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
            <div className="flex justify-center mb-6">
              <img 
                src="https://dptxkbsyzfntolgmhniz.supabase.co/storage/v1/object/sign/ProjetoCerto/faviconProjetoCerto.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2MyYjJkMS1hMDBkLTQ5N2EtYTQwMC0zOWM0MjFkZmNmYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJQcm9qZXRvQ2VydG8vZmF2aWNvblByb2pldG9DZXJ0by5wbmciLCJpYXQiOjE3ODA0MjQxNDIsImV4cCI6MjA5NTc4NDE0Mn0._ofXmRtiUUM0MbiBO-FO7fBd5btjixNn1B7EGjNUVy4" 
                alt="Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black tracking-wider text-slate-800 leading-none">PROJETO CERTO</h1>
              <p className="text-[10px] font-extrabold text-[#D9A441] uppercase tracking-widest leading-none">Gestão de Custos</p>
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
                  placeholder="usuario ou usuario@email.com"
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

            {/* Ocultado por enquanto
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowRecoveryModal(true)}
                className="text-[10px] font-bold text-brand-primary hover:text-brand-secondary hover:underline cursor-pointer transition-all"
              >
                Esqueceu sua senha?
              </button>
            </div>
            */}

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

      {/* MODAL DE RECUPERAÇÃO DE SENHA */}
      <AnimatePresence>
        {showRecoveryModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-brand-primary text-white p-6 relative">
                <button
                  onClick={handleCloseRecovery}
                  className="absolute right-4 top-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-all cursor-pointer"
                  title="Fechar"
                >
                  <span className="text-sm">✕</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight uppercase leading-tight">Alterar Senha</h3>
                    <p className="text-[10px] text-white/70 font-mono uppercase tracking-widest mt-0.5">Recuperação de Acesso</p>
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <div className={`flex-1 py-3 text-center border-r border-slate-100 ${recoveryStep === 1 ? 'text-brand-primary bg-white font-extrabold border-b-2 border-brand-accent' : ''}`}>
                  1. Solicitar Código
                </div>
                <div className={`flex-1 py-3 text-center ${recoveryStep === 2 ? 'text-brand-primary bg-white font-extrabold border-b-2 border-brand-accent' : ''}`}>
                  2. Validar & Alterar
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {recoveryErrorMsg && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <span>{recoveryErrorMsg}</span>
                  </div>
                )}
                
                {recoverySuccessMsg && (
                  <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span className="text-sm">✅</span>
                    <span>{recoverySuccessMsg}</span>
                  </div>
                )}

                {recoveryStep === 1 ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Informe o e-mail ou nome de usuário da sua conta para enviarmos um código de segurança de 6 dígitos.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">E-mail ou Usuário</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={recoveryInput}
                          onChange={(e) => setRecoveryInput(e.target.value)}
                          placeholder="usuario ou usuario@email.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-xs font-bold focus:outline-none transition-all text-slate-700"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={recoveryLoading}
                      className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-secondary disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {recoveryLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                          <span>Enviando Código...</span>
                        </>
                      ) : (
                        <span>Enviar Código de Segurança</span>
                      )}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Informação Adicional</p>
                      <p className="text-xs font-bold text-brand-primary mt-1">
                        Código enviado para {targetEmail}
                      </p>
                    </div>

                    {devCode && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider leading-none">Modo de Teste / Desenvolvimento</p>
                        <p className="text-xs font-bold text-amber-800 mt-1 leading-relaxed">
                          Como a chave do serviço de e-mail (Resend) não está configurada nesta instância, geramos e preenchemos o código de segurança automaticamente para você testar: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200 text-xs font-black text-slate-900">{devCode}</span>
                        </p>
                      </div>
                    )}

                    {/* Código de Verificação */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Código de 6 dígitos</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-3 text-sm">🔑</span>
                        <input
                          type="text"
                          maxLength={6}
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="Digite o código"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-sm font-bold tracking-widest text-center focus:outline-none transition-all font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* Nova Senha */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nova Senha</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-3 text-sm">🔒</span>
                        <input
                          type="password"
                          value={recoveryNewPassword}
                          onChange={(e) => setRecoveryNewPassword(e.target.value)}
                          placeholder="Mínimo 4 caracteres"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-xs font-bold focus:outline-none transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Confirmar Nova Senha */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Confirmar Nova Senha</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-3 text-sm">🔒</span>
                        <input
                          type="password"
                          value={recoveryConfirmPassword}
                          onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-xs font-bold focus:outline-none transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setRecoveryStep(1)}
                        className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={recoveryLoading}
                        className="flex-2 py-3 px-4 bg-brand-primary hover:bg-brand-secondary disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {recoveryLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                            <span>Alterando...</span>
                          </>
                        ) : (
                          <span>Alterar Senha</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
