import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-black via-gray-900 to-black border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">  
          {/* Brand - más compacto */}
          <div className="col-span-1 lg:col-span-2">
            <div className="mb-3">
              <h1 className="text-lg font-bold bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                Joyeria Orlando
              </h1>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed mb-3 max-w-md">
              Desde 1985, creamos joyas excepcionales que trascienden el tiempo. 
              Cada pieza es una obra de arte única.
            </p>
            <div className="flex space-x-2">
              <a href="https://www.instagram.com" className="p-1.5 bg-gray-800 hover:bg-gray-300 hover:text-black rounded transition-all duration-150 group">
                <Instagram className="h-3.5 w-3.5 text-gray-400 group-hover:text-black" />
              </a>
              <a href="https://www.facebook.com" target="_blank" className="p-1.5 bg-gray-800 hover:bg-gray-300 hover:text-black rounded transition-all duration-150 group">
                <Facebook className="h-3.5 w-3.5 text-gray-400 group-hover:text-black" />
              </a>
            </div>
          </div>

          {/* Quick Links - más compacto */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Enlaces</h3>
            <ul className="space-y-1.5">
              {[
                { label: 'Sobre Nosotros', to: '/sobre-nosotros' },
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

          {/* Contact - más compacto */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Contacto</h3>
            <div className="space-y-2">
              <div className="flex items-start space-x-1.5 text-gray-400">
                <MapPin className="h-3.5 w-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                <span className="text-xs leading-relaxed">Blvd. Lázaro Cárdenas 1400-Local 2, Mexicali, B.C.</span>
              </div>
              <div className="flex items-center space-x-1.5 text-gray-400">
                <Phone className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                <span className="text-xs">+52 686 000 0000</span>
              </div>
              <div className="flex items-center space-x-1.5 text-gray-400">
                <Mail className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                <span className="text-xs">joyeriaejemplo@gmail.com</span>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-white mb-1.5">Horario</h4>
              <div className="text-xs text-gray-400 space-y-0.5">
                <p>Lun-Vie: 09:00 - 19:00</p>
                <p>Sab: 09:00 - 14:00</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-5">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-gray-400 text-xs text-center md:text-left">
              © 2025 Joyeria - Julio Ayala Razo.
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