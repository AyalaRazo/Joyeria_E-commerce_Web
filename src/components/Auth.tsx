import React, { useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface AuthProps {
  isOpen: boolean;
  mode: 'login' | 'register' | 'forgot-password';
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onSwitchMode: () => void;
  loading: boolean;
}

const Auth: React.FC<AuthProps> = ({
  isOpen,
  mode,
  onClose,
  onLogin,
  onRegister,
  onForgotPassword,
  onSwitchMode,
  loading
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (mode === 'forgot-password') {
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (mode === 'register') {
      if (!formData.name) {
        newErrors.name = 'El nombre es requerido';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirma tu contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSuccessMessage('');
    setErrors({});

    try {
      if (mode === 'login') {
        await onLogin(formData.email, formData.password);
      } else if (mode === 'register') {
        await onRegister(formData.email, formData.password, formData.name);
      } else if (mode === 'forgot-password') {
        await onForgotPassword(formData.email);
        setSuccessMessage('Se ha enviado un enlace de recuperación a tu correo electrónico');
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-black opacity-70"></div>
        </div>

        <div className="inline-block align-bottom bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">
                {mode === 'login' ? 'Iniciar Sesión' : 
                 mode === 'register' ? 'Registrarse' : 
                 'Recuperar Contraseña'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {successMessage && (
              <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded-lg">
                <p className="text-green-400 text-sm">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-800 rounded-lg text-white focus:outline-none ${
                        errors.name ? 'border border-red-500' : 'border border-gray-700 focus:border-gray-500'
                      }`}
                      placeholder="Tu nombre"
                    />
                  </div>
                  {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-800 rounded-lg text-white focus:outline-none ${
                      errors.email ? 'border border-red-500' : 'border border-gray-700 focus:border-gray-500'
                    }`}
                    placeholder="tu@email.com"
                  />
                </div>
                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
              </div>

              {mode !== 'forgot-password' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className={`w-full pl-10 pr-12 py-3 bg-gray-800 rounded-lg text-white focus:outline-none ${
                        errors.password ? 'border border-red-500' : 'border border-gray-700 focus:border-gray-500'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-800 rounded-lg text-white focus:outline-none ${
                        errors.confirmPassword ? 'border border-red-500' : 'border border-gray-700 focus:border-gray-500'
                      }`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black py-3 px-4 rounded-lg font-bold hover:shadow-lg transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : 
                 mode === 'login' ? 'INICIAR SESIÓN' : 
                 mode === 'register' ? 'REGISTRARSE' : 
                 'ENVIAR ENLACE DE RECUPERACIÓN'}
              </button>
            </form>

            <div className="mt-4 text-center space-y-2">
              {mode === 'forgot-password' ? (
                <button
                  onClick={() => onSwitchMode()}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  ¿Recordaste tu contraseña? Inicia sesión aquí
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onSwitchMode()}
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors block"
                  >
                    {mode === 'login' 
                      ? '¿No tienes cuenta? Regístrate aquí' 
                      : '¿Ya tienes cuenta? Inicia sesión aquí'}
                  </button>
                  {mode === 'login' && (
                    <button
                      onClick={() => {
                        // Cambiar a modo de recuperación de contraseña
                        const event = new CustomEvent('auth-mode-change', { detail: 'forgot-password' });
                        window.dispatchEvent(event);
                      }}
                      className="text-gray-400 hover:text-gray-300 text-sm transition-colors block"
                    >
                      ¿Olvidaste tu contraseña? Recupérala aquí
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;