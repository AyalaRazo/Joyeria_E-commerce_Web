import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Soportar parámetros en search o en hash
  let params = new URLSearchParams(location.search);
  let access_token = params.get('access_token');
  let errorParam = params.get('error');
  let errorCode = params.get('error_code');
  let errorDescription = params.get('error_description');
  if (!errorParam && location.hash) {
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, '?'));
    errorParam = hashParams.get('error');
    errorCode = hashParams.get('error_code');
    errorDescription = hashParams.get('error_description');
    access_token = access_token || hashParams.get('access_token');
  }

  if (errorParam === 'access_denied' && errorCode === 'otp_expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-gray-900 px-4">
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-800 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Enlace expirado o no válido</h2>
          <p className="text-gray-400 mb-4">El enlace para restablecer tu contraseña ha expirado o no es válido. Por favor solicita un nuevo enlace desde la opción "¿Olvidaste tu contraseña?".</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password || !confirmPassword) {
      setError('Por favor ingresa y confirma tu nueva contraseña.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    // Llamada a Supabase para actualizar la contraseña
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-gray-900 px-4">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-800">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Restablecer contraseña</h2>
        {success ? (
          <div className="text-green-400 text-center text-lg font-semibold">
            ¡Contraseña actualizada! Redirigiendo...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-1 font-medium">Nueva contraseña</label>
              <input
                type="password"
                className="w-full bg-gray-800 text-white rounded-lg p-4 border border-gray-700 focus:ring-2 focus:ring-yellow-400 text-lg font-medium shadow-sm transition-all duration-200 placeholder-gray-400"
                placeholder="Nueva contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1 font-medium">Confirmar nueva contraseña</label>
              <input
                type="password"
                className="w-full bg-gray-800 text-white rounded-lg p-4 border border-gray-700 focus:ring-2 focus:ring-yellow-400 text-lg font-medium shadow-sm transition-all duration-200 placeholder-gray-400"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-red-400 text-center font-medium">{error}</div>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 px-4 rounded-xl font-bold text-lg tracking-wide hover:shadow-lg hover:shadow-yellow-400/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword; 