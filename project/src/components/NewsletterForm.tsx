import React, { useState } from 'react';
import { Mail, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const NewsletterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const availableInterests = [
    'Anillos',
    'Collares',
    'Pulseras',
    'Pendientes',
    'Novedades',
    'Ofertas'
  ];

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const trackCompleteRegistration = () => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'CompleteRegistration', {
        content_name: 'Newsletter',
        status: 'success',
        email: email,
        interests: interests.join(', ')
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!email || !email.includes('@')) {
      setError('Ingresa un email válido');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('interested_clients')
        .upsert(
          { 
            email,
            interests,
            metadata: {
              source: 'website_newsletter',
              user_agent: navigator.userAgent
            }
          },
          { onConflict: 'email' }
        );

      if (error) throw error;

      trackCompleteRegistration();
      setIsSuccess(true);
      setEmail('');
      setInterests([]);
    } catch (err) {
      console.error('Error saving subscription:', err);
      setError('Error al suscribirte. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-lg p-4 text-center">
        <div className="flex justify-center mb-3">
          <Check className="h-6 w-6 text-green-300" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">¡Gracias por suscribirte!</h3>
        <p className="text-green-200 text-sm">
          Te mantendremos informado sobre nuestras novedades.
        </p>
        <button
          onClick={() => setIsSuccess(false)}
          className="mt-3 text-green-300 hover:text-white text-xs font-medium"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg p-4 shadow">
      <h3 className="text-base font-bold text-white mb-2">Únete al Club Exclusivo</h3>
      <p className="text-gray-300 text-xs mb-4">
        Recibe novedades, lanzamientos exclusivos y ofertas especiales.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1">
            Tu email *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white placeholder-gray-400 rounded-md block w-full pl-8 p-2 text-sm focus:ring-1 focus:ring-yellow-500 focus:border-transparent"
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-300 mb-1">
            ¿Qué te interesa? (opcional)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {availableInterests.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  interests.includes(interest)
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-2 px-3 rounded-md transition-all duration-200 flex items-center justify-center text-sm"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando...
            </>
          ) : (
            'Suscribirme'
          )}
        </button>

        {error && (
          <div className="mt-3 flex items-center text-red-400 text-xs">
            <X className="h-3 w-3 mr-1" />
            <span>{error}</span>
          </div>
        )}

        <p className="mt-3 text-[10px] text-gray-400">
          Al suscribirte aceptas recibir comunicaciones. 
          <a 
            href="/unsubscribe" 
            className="text-yellow-400 hover:text-yellow-300 underline ml-1"
          >
            Puedes darte de baja.
          </a>
        </p>
      </form>
    </div>
  );
};

export default NewsletterForm;