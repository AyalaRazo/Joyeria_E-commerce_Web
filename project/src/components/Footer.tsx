import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';

const branches = [
  {
    name: 'Joyería D Luxury Cosmopolitan Zona Rio',
    address: 'Blvrd Gral Rodolfo Sánchez Taboada 9551, Zona Urbana Rio Tijuana, 22010 Tijuana, B.C.',
    phone: '664 814 1413',
    city: 'Tijuana',
  },
  {
    name: 'Joyería D Luxury Torela Agua Caliente',
    address: 'Blvd. Agua Caliente 9955, Calete, 22044 Tijuana, B.C.',
    phone: '664 815 1622',
    city: 'Tijuana',
  },
  {
    name: 'Joyería D Luxury Punta Este',
    address: 'Calz. Cetys 2600-local 106, Rivera, 21254 Mexicali, B.C.',
    phone: '686 311 4648',
    city: 'Mexicali',
  },
];

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-black via-gray-900 to-black border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Brand */}
          <div className="col-span-1 lg:col-span-2">
            <div className="mb-3">
              <img
                src="/images/logo.png"
                alt="D Luxury Black"
                className="h-12 w-auto object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="text-gray-300 text-xs leading-relaxed mb-3 max-w-md">
              Venta de joyería fina, diamantes y relojería de alto valor.<br />
              Con garantía, seguridad y discreción.
            </p>
            <div className="flex space-x-2">
              <a href="https://www.instagram.com/dluxuryblack/" className="p-1.5 bg-gray-800 hover:bg-gray-300 hover:text-black rounded transition-all duration-150 group">
                <Instagram className="h-3.5 w-3.5 text-gray-400 group-hover:text-black" />
              </a>
              <a href="https://www.facebook.com/DLuxorMexico" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-800 hover:bg-gray-300 hover:text-black rounded transition-all duration-150 group">
                <Facebook className="h-3.5 w-3.5 text-gray-400 group-hover:text-black" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Enlaces</h3>
            <ul className="space-y-1.5">
              {[
                { label: 'Sobre Nosotros', to: '/sobre-nosotros' },
                { label: 'Contacto', to: '/contacto' },
                { label: 'Factura tu Compra', to: '/factura-tu-compra' },
                { label: 'Cuidado de Joyas', to: '/cuidado-de-joyas' },
                { label: 'Garantía', to: '/garantia' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-gray-400 hover:text-gray-300 transition-colors duration-150 text-xs flex items-center group">
                    <span className="w-1 h-1 bg-gray-300 rounded-full mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sucursales */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Sucursales</h3>
            <div className="space-y-3">
              {branches.map(branch => (
                <div key={branch.name}>
                  <div className="flex items-start space-x-1.5 text-gray-400">
                    <MapPin className="h-3.5 w-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                    <div className="text-xs leading-relaxed space-y-0.5">
                      <p className="text-gray-300 font-medium">{branch.name}</p>
                      <p>{branch.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-gray-400 mt-1 ml-5">
                    <Phone className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                    <span className="text-xs">{branch.phone}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-5">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-gray-400 text-xs text-center md:text-left">
              © {new Date().getFullYear()} D Luxury Black. Todos los derechos reservados.
            </p>
            <div className="flex space-x-3 text-xs text-gray-400">
              <Link to="/privacidad" className="hover:text-gray-300 transition-colors duration-150">Privacidad</Link>
              <Link to="/terminos" className="hover:text-gray-300 transition-colors duration-150">Términos</Link>
              <Link to="/devoluciones" className="hover:text-gray-300 transition-colors duration-150">Devoluciones</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
