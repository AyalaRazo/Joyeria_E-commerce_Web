import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface HeroProps {
  onShopNow: () => void;
}

const Hero: React.FC<HeroProps> = ({ onShopNow }) => {
  const handleExplore = () => {
    const grid = document.getElementById('product-grid');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  return (
    <section className="relative h-[85vh] md:h-[90vh] bg-gradient-to-br from-black to-black overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src="https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Luxury jewelry"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/30 to-transparent"></div>
      </div>

      {/* Floating elements - más pequeños */}
      <div className="absolute top-12 left-8 opacity-20">
        <Sparkles className="h-4 w-4 text-gray-300 animate-pulse" />
      </div>
      <div className="absolute top-32 right-16 opacity-20">
        <Sparkles className="h-3 w-3 text-gray-300 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute bottom-32 left-1/4 opacity-20">
        <Sparkles className="h-3.5 w-3.5 text-gray-300 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            {/* Badge más pequeño */}
            <div className="mb-4">
              <span className="text-[0.65rem] md:text-[0.70rem] inline-block px-3 py-1.5 bg-gradient-to-r from-gray-300/20 to-gray-500/20 border border-gray-300/30 rounded-full text-gray-300 font-medium tracking-wider">
                COLECCIÓN 2025
              </span>
            </div>
            
            {/* Títulos más pequeños */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-snug">
              <span className="block text-white">ELEGANCIA</span>
              <span className="block bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                INFINITA
              </span>
            </h1>
            
            {/* Texto más pequeño y compacto */}
            <p className="text-base md:text-lg text-gray-300 mb-10 leading-relaxed max-w-xl">
              Descubre joyas de lujo donde cada pieza cuenta una historia de 
              <span className="text-gray-300 font-medium"> artesanía exquisita</span> y 
              <span className="text-gray-300 font-medium"> elegancia atemporal</span>.
            </p>
            
            {/* Botones más pequeños */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={handleExplore}
                className="group bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black px-6 py-3 rounded-lg font-bold text-base tracking-wide hover:shadow-xl hover:shadow-gray-400/20 transition-all duration-300 transform hover:scale-102 flex items-center justify-center space-x-2"
              >
                <span>EXPLORAR COLECCIÓN</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom gradient más pequeño */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent"></div>
    </section>
  );
};

export default Hero;