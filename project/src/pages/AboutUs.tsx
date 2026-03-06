import React from 'react';
import { Star, Shield, Truck, RefreshCw } from 'lucide-react';

const AboutUs: React.FC = () => {

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Nuestra historia</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white">Más de una década vistiendo a Mexicali</h1>
          <p className="text-gray-300 max-w-3xl mx-auto">
            En Joyería Orlando nos dedicamos a ofrecer las mejores piezas de joyería chapada en oro a precios accesibles.
            Con más de 10 años de experiencia en el mercado de Mexicali, hemos crecido gracias a la confianza de nuestros clientes.
          </p>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Contamos con dos sucursales estratégicamente ubicadas en el Boulevard Lázaro Cárdenas, para que siempre nos tengas cerca.
            Nuestro compromiso es brindarte joyería de calidad que se vea y se sienta como oro de verdad.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Calidad Premium', desc: 'Chapado en oro de alta calidad con acabados que perduran en el tiempo.', icon: <Star className="h-5 w-5" /> },
            { title: 'Garantía de Satisfacción', desc: 'Todas nuestras piezas cuentan con garantía. Tu satisfacción es nuestra prioridad.', icon: <Shield className="h-5 w-5" /> },
            { title: 'Envíos a Todo México', desc: 'Recibe tu joyería en la puerta de tu casa. Envíos rápidos y seguros.', icon: <Truck className="h-5 w-5" /> },
            { title: 'Cambios y Devoluciones', desc: 'Política flexible de cambios para que compres con total confianza.', icon: <RefreshCw className="h-5 w-5" /> },
          ].map(({ title, desc, icon }) => (
            <div key={title} className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400">
                {icon}
              </div>
              <h2 className="text-base font-semibold text-yellow-400">{title}</h2>
              <p className="text-gray-300 text-sm">{desc}</p>
            </div>
          ))}
        </section>

        {/* Nuestras Sucursales */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white text-center">Nuestras Sucursales</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plaza Cibeles */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-white font-semibold text-lg">Plaza Cibeles</h3>
                <p className="text-gray-400 text-sm mt-1">Blvd. Lázaro Cárdenas 1400-Local 2, Lázaro Cárdenas, 21370 Mexicali, B.C.</p>
              </div>
              <div className="w-full h-64">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4752.2144251628215!2d-115.42244409297106!3d32.62421963905414!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d7710030d3b599%3A0xc4310c98a225ed81!2sJoyeria%20Orlando%20Plaza%20Cibeles!5e0!3m2!1ses!2smx!4v1772514499913!5m2!1ses!2smx"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Joyeria Orlando Plaza Cibeles"
                />
              </div>
            </div>

            {/* Blvd. Lázaro Cárdenas */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-white font-semibold text-lg">Blvd. Lázaro Cárdenas</h3>
                <p className="text-gray-400 text-sm mt-1">Blvd. Lázaro Cárdenas 1353, Villanova, 21180 Mexicali, B.C.</p>
              </div>
              <div className="w-full h-64">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d53765.720229618644!2d-115.56402216875!3d32.62330149999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d77a5fa9657b3b%3A0xaa0fc17b5cc0e84!2sJoyer%C3%ADa%20de%20Plata%20Orlando!5e0!3m2!1ses!2smx!4v1772514616865!5m2!1ses!2smx"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Joyeria Orlando Blvd. Lázaro Cárdenas"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;

