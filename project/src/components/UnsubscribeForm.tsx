import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, Mail } from 'lucide-react';

const UnsubscribeForm: React.FC<{ token?: string }> = ({ token }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [step, setStep] = useState<'init' | 'confirm'>('init');

  useEffect(() => {
    if (token) {
      handleTokenUnsubscribe(token);
    }
  }, [token]);

  const handleTokenUnsubscribe = async (unsubscribeToken: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('interested_clients')
        .update({ is_subscribed: false })
        .eq('unsubscribe_token', unsubscribeToken)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setMessage({
          text: `El email ${data[0].email} ha sido dado de baja correctamente.`,
          type: 'success'
        });
      } else {
        setMessage({
          text: 'Token no válido o ya estaba dado de baja.',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setMessage({
        text: 'Ocurrió un error al procesar la baja.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Primero buscamos el email
      const { data, error } = await supabase
        .from('interested_clients')
        .select('email, is_subscribed')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setMessage({
          text: 'No encontramos suscripción con ese email.',
          type: 'error'
        });
        return;
      }

      if (!data.is_subscribed) {
        setMessage({
          text: 'Este email ya estaba dado de baja.',
          type: 'error'
        });
        return;
      }

      // Si existe y está suscrito, pasamos al paso de confirmación
      setStep('confirm');
    } catch (err) {
      console.error('Error:', err);
      setMessage({
        text: 'Ocurrió un error al verificar el email.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('interested_clients')
        .update({ is_subscribed: false })
        .eq('email', email);

      if (error) throw error;

      setMessage({
        text: `El email ${email} ha sido dado de baja correctamente.`,
        type: 'success'
      });
      setStep('init');
      setEmail('');
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setMessage({
        text: 'Ocurrió un error al procesar la baja.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (token) {
    return (
      <div className="max-w-md mx-auto bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Baja de newsletter</h2>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Procesando tu solicitud...</p>
          </div>
        ) : message ? (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <Check className="h-5 w-5 mr-2" />
              ) : (
                <X className="h-5 w-5 mr-2" />
              )}
              <p>{message.text}</p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-900 rounded-lg p-6 shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4">Darse de baja</h2>
      
      {step === 'init' ? (
        <form onSubmit={handleEmailUnsubscribe}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Ingresa tu email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white placeholder-gray-400 rounded-lg block w-full pl-10 p-3 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-300"
          >
            {isLoading ? 'Verificando...' : 'Continuar'}
          </button>
        </form>
      ) : (
        <div>
          <p className="text-gray-300 mb-4">¿Estás seguro que quieres darte de baja del email <span className="font-semibold">{email}</span>?</p>
          
          <div className="flex space-x-4">
            <button
              onClick={confirmUnsubscribe}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-300"
            >
              {isLoading ? 'Procesando...' : 'Sí, darme de baja'}
            </button>
            <button
              onClick={() => {
                setStep('init');
                setMessage(null);
              }}
              disabled={isLoading}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`mt-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <Check className="h-5 w-5 mr-2" />
            ) : (
              <X className="h-5 w-5 mr-2" />
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnsubscribeForm;