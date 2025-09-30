import React, { useState } from 'react';
import { Mail, Check, X, Sparkles } from 'lucide-react';
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
    'Ofertas especiales'
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
        content_name: 'Newsletter Subscription',
        status: 'success',
        email: email, // Solo si tienes permisos para recolectar esta data
        interests: interests.join(', ')
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validación
    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un email válido');
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
      setError('Ocurrió un error. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-xl p-6 shadow-lg text-center">
        <div className="flex justify-center mb-4">
          <Check className="h-10 w-10 text-green-300" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">¡Gracias por suscribirte!</h3>
        <p className="text-green-200">
          Te mantendremos informado sobre nuestras novedades y productos exclusivos.
        </p>
        <button
          onClick={() => setIsSuccess(false)}
          className="mt-4 text-green-300 hover:text-white text-sm font-medium"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-xl p-6 shadow-xl">
      <div className="flex items-center mb-4">
        <h3 className="text-xl md:text-[1.750rem] font-bold text-white">Únete a Nuestro Exclusivo Club</h3>
      </div>
      <p className="text-gray-300 mb-6 md:text-[1.150rem]">
        Suscríbete para recibir novedades, lanzamientos exclusivos y ofertas especiales.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Tu email *
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

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ¿Qué te interesa? (opcional)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableInterests.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
          className="w-1/2 mx-auto bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando...
            </>
          ) : (
            'Suscribirme ahora'
          )}
        </button>

        {error && (
          <div className="mt-4 flex items-center text-red-400">
            <X className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Al suscribirte aceptas recibir comunicaciones de marketing. 
          <a 
            href="/unsubscribe" 
            className="text-yellow-400 hover:text-yellow-300 underline ml-1"
          >
            Puedes darte de baja en cualquier momento.
          </a>
        </p>
      </form>
    </div>
  );
};

export default NewsletterForm;