
import React, { useState } from 'react';
import { User, BrandingConfig } from '../types';
import { getStoredUsers } from '../storage';

interface LoginFormProps {
  onLogin: (user: User) => void;
  branding: BrandingConfig;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, branding }) => {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const users = await getStoredUsers();
      const user = users.find(u => u.cpf === cpf && u.password === password);

      if (user) {
        if (user.active === false) {
          setError('Usuário inativo.');
        } else {
          onLogin(user);
        }
      } else {
        setError('Credenciais inválidas.');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-20 mx-auto mb-4 object-contain" />
          ) : (
            <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-xl">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
          )}
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">{branding.appName}</h1>
          <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px] mt-2">{branding.appSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF de Acesso</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50/50 transition-all"
              placeholder="000.000.000-00"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Privada</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none font-bold text-slate-700 bg-slate-50/50 transition-all"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-[0.2em]"
          >
            {loading ? 'Validando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-16 text-center">
          <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">TrainMaster v2.5 Stable</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
