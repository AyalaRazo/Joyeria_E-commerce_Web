import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface HeroProps {
  onShopNow: () => void;
}

const Hero: React.FC<HeroProps> = ({ onShopNow }) => {
  // Nueva función para hacer scroll al catálogo
  const handleExplore = () => {
    const grid = document.getElementById('product-grid');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  return (
    <section className="relative h-[90vh] bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src="https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Luxury jewelry"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-20 left-10 opacity-20">
        <Sparkles className="h-6 w-6 text-gray-300 animate-pulse" />
      </div>
      <div className="absolute top-40 right-20 opacity-20">
        <Sparkles className="h-4 w-4 text-gray-300 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute bottom-40 left-1/4 opacity-20">
        <Sparkles className="h-5 w-5 text-gray-300 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6">
              <span className="text-[0.70rem] md:text-[0.80rem] lg:text-[0.85rem] inline-block px-4 py-2 bg-gradient-to-r from-gray-300/20 to-gray-500/20 border border-gray-300/30 rounded-full text-gray-300 text-sm font-medium tracking-wider">
                COLECCIÓN EXCLUSIVA 2025
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-tight">
              <span className="block text-white">ELEGANCIA</span>
              <span className="block bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                INFINITA
              </span>
            </h1>
            
            <p className="text-lg md:text-xl xl:text-2xl text-gray-300 mb-12 leading-relaxed max-w-2xl">
              Descubre nuestra colección de joyas de lujo, donde cada pieza cuenta una historia de 
              <span className="text-gray-300 font-medium"> exquisita artesanía</span> y 
              <span className="text-gray-300 font-medium"> elegancia atemporal</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={handleExplore}
                className="group bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black px-8 py-4 rounded-xl font-bold text-lg tracking-wide hover:shadow-2xl hover:shadow-gray-400/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <span>EXPLORAR COLECCIÓN</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent"></div>
    </section>
  );
};

export default Hero;