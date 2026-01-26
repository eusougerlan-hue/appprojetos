
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
          setError('Este usuário está inativo e não pode acessar o sistema.');
        } else {
          onLogin(user);
        }
      } else {
        setError('CPF ou Senha inválidos. Tente novamente.');
      }
    } catch (err) {
      setError('Erro de conexão com o banco de dados. Verifique o Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-10">
             {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
              )}
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{branding.appName}</h1>
            <p className="text-gray-500 mt-2 font-medium">{branding.appSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="000.000.000-00"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-gray-400">
            Desenvolvido por {branding.appName} &copy; 2024
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
