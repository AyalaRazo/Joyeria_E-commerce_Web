import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-black via-gray-900 to-black border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">  
          {/* Brand */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="rounded-xl shadow-lg group-hover:shadow-gray-400/25 transition-all duration-300 ">
              
            </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                  Joyeria
                </h1>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
              Desde 1985, creamos joyas excepcionales que trascienden el tiempo. 
              Cada pieza es una obra de arte única, elaborada con los materiales más finos 
              y la artesanía más exquisita.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com" className="p-3 bg-gray-800 hover:bg-gray-300 hover:text-black rounded-lg transition-all duration-300 group">
                <Instagram className="h-5 w-5 text-gray-400 group-hover:text-black" />
              </a>
              <a href="https://www.facebook.com" target="_blank" className="p-3 bg-gray-800 hover:bg-gray-300 hover:text-black rounded-lg transition-all duration-300 group">
                <Facebook className="h-5 w-5 text-gray-400 group-hover:text-black" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6">Enlaces Rápidos</h3>
            <ul className="space-y-3">
              {[
                { label: 'Sobre Nosotros', to: '/sobre-nosotros' },
                { label: 'Factura tu Compra', to: '/factura-tu-compra' },
                { label: 'Cuidado de Joyas', to: '/cuidado-de-joyas' },
                { label: 'Garantía', to: '/garantia' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-gray-400 hover:text-gray-300 transition-colors duration-300 flex items-center group">
                    <span className="w-2 h-2 bg-gray-300 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6">Contacto</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-400">
                <MapPin className="h-5 w-5 text-gray-300" />
                <span className="text-sm">Blvd. Lázaro Cárdenas 1400-Local 2, Lázaro Cárdenas, 21370 Mexicali, B.C.</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Phone className="h-5 w-5 text-gray-300" />
                <span className="text-sm">+52 686 000 0000</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Mail className="h-5 w-5 text-gray-300" />
                <span className="text-sm">joyeriaejemplo@gmail.com</span>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-white mb-3">Horario de Atención</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Lunes - Viernes: 09:00 - 19:00</p>
                <p>Sabado: 09:00 - 14:00</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © 2025 Joyeria creada por Julio Ayala Razo. Todos los derechos reservados.
            </p>
            <div className="flex space-x-6 text-sm text-gray-400">
              <Link to="/privacidad" className="hover:text-gray-300 transition-colors duration-300">Política de Privacidad</Link>
              <Link to="/terminos" className="hover:text-gray-300 transition-colors duration-300">Términos de Servicio</Link>
              <Link to="/devoluciones" className="hover:text-gray-300 transition-colors duration-300">Devoluciones</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;