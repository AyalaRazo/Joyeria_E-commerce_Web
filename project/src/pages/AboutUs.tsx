import React from 'react';
import { Star, Shield, Truck, RefreshCw } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

const branches = [
  {
    name: 'Joyería D Luxury Punta Este',
    address: 'Calz. Cetys 2600-local 106, Rivera, 21254 Mexicali, B.C.',
    phone: '686 311 4648',
    mapsUrl: 'https://maps.app.goo.gl/oxPucRKMJsXvEZdD9',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d429985.77786467894!2d-115.97690202656247!3d32.652421100000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d7710035ea8e27%3A0xcb4022dbc73307c7!2sJoyer%C3%ADa%20D%20Luxury%20Punta%20Este!5e0!3m2!1ses!2smx!4v1773182254317!5m2!1ses!2smx',
    city: 'Mexicali',
  },
  {
    name: 'Joyería D Luxury Zona Rio Cosmopolitan',
    address: 'Blvrd Gral Rodolfo Sánchez Taboada 9551, Zona Urbana Rio Tijuana, 22010 Tijuana, B.C.',
    phone: '664 814 1413',
    mapsUrl: 'https://maps.app.goo.gl/ZZxVKB5kJtkJtPgb7',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d430601.98675007495!2d-117.5985413265625!3d32.52406309999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d949641cf45001%3A0x8119efb6fae92db!2sJoyer%C3%ADa%20D%20Luxury%20Zona%20Rio%20Cosmopolitan!5e0!3m2!1ses!2smx!4v1773182325335!5m2!1ses!2smx',
    city: 'Tijuana',
  },
  {
    name: 'Joyería D Luxury Torela Agua Caliente',
    address: 'Blvd. Agua Caliente 9955, Calete, 22044 Tijuana, B.C.',
    phone: '664 815 1622',
    mapsUrl: 'https://maps.app.goo.gl/xCrtNrAqLaRRLQz19',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d430601.98675007495!2d-117.5985413265625!3d32.52406309999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d947d9ac845e19%3A0x854f074fdc00f1f4!2sJoyer%C3%ADa%20D%20Luxury%20Torela%20Agua%20Caliente!5e0!3m2!1ses!2smx!4v1773182360294!5m2!1ses!2smx',
    city: 'Tijuana',
  },
];

const AboutUs: React.FC = () => {
  useSEO({
    title: 'Sobre Nosotros — Joyería D Luxury Black',
    description: 'Conoce la historia de D Luxury Black, joyería artesanal de lujo con 3 sucursales en Tijuana y Mexicali. Diamantes, garantía y envío a todo México.',
    path: '/sobre-nosotros',
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Nuestra historia</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white">D Luxury Black</h1>
          <p className="text-gray-300 max-w-3xl mx-auto">
            En D Luxury Black nos especializamos en la venta de joyería fina, diamantes y relojería de alto valor.
            Ofrecemos a nuestros clientes piezas exclusivas con la garantía, seguridad y discreción que merecen.
          </p>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Contamos con tres sucursales: dos en Tijuana y una en Mexicali, para estar siempre cerca de ti.
            Nuestro compromiso es brindarte una experiencia de compra única, con productos de la más alta calidad.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Joyería Fina y Diamantes', desc: 'Piezas exclusivas de joyería fina y diamantes certificados seleccionados con los más altos estándares.', icon: <Star className="h-5 w-5" /> },
            { title: 'Garantía y Seguridad', desc: 'Todas nuestras piezas cuentan con garantía. Operamos con total seguridad y discreción.', icon: <Shield className="h-5 w-5" /> },
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map(branch => (
              <div key={branch.name} className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-white font-semibold text-base leading-tight">{branch.name}</h3>
                      <p className="text-gray-400 text-xs mt-1">{branch.address}</p>
                      <p className="text-yellow-400 text-xs mt-1">📞 {branch.phone}</p>
                    </div>
                    <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">{branch.city}</span>
                  </div>
                  <a
                    href={branch.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    Ver en Google Maps →
                  </a>
                </div>
                <div className="w-full h-56">
                  <iframe
                    src={branch.mapEmbed}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={branch.name}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
