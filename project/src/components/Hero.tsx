import React from 'react';
import { ArrowRight, Shield, Truck, Star } from 'lucide-react';

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
    <section className="relative min-h-screen bg-black overflow-hidden">

      {/* Imagen de fondo */}
      <div className="absolute inset-0">
        <img
          src="https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Luxury jewelry"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
      </div>

      {/* Línea dorada lateral */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-yellow-400/30 to-transparent" />

      {/* Texto vertical editorial — solo desktop */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-3">
        <div className="w-px h-14 bg-gradient-to-b from-transparent to-yellow-400/40" />
        <span
          className="text-[9px] tracking-[0.45em] text-gray-500 uppercase font-medium"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Alta Joyería
        </span>
        <div className="w-px h-14 bg-gradient-to-t from-transparent to-yellow-400/40" />
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-20 w-full py-24">
          <div className="max-w-2xl xl:max-w-3xl">

            {/* Badge */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-8 bg-yellow-400/70" />
              <span className="text-[0.62rem] tracking-[0.4em] text-yellow-400/90 uppercase font-semibold">
                Colección 2026
              </span>
            </div>

            {/* Título editorial */}
            <h1 className="mb-7 leading-none">
              <span className="block text-5xl sm:text-6xl lg:text-[5.5rem] xl:text-[6.5rem] font-thin text-white/90 tracking-tight">
                Elegancia
              </span>
              <span className="block text-5xl sm:text-6xl lg:text-[5.5rem] xl:text-[6.5rem] font-bold text-white tracking-tight">
                Infinita
              </span>
              <span className="block text-lg sm:text-xl lg:text-2xl font-light text-yellow-400/75 tracking-[0.2em] mt-3">
                — en cada pieza
              </span>
            </h1>

            {/* Descripción */}
            <p className="text-sm sm:text-base text-gray-400 mb-10 leading-relaxed max-w-md">
              Joyería artesanal de alta calidad. Cada pieza es elaborada con
              materiales seleccionados para quienes aprecian la verdadera elegancia.
            </p>

            {/* CTA */}
            <div className="mb-16">
              <button
                onClick={handleExplore}
                className="group flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black px-8 py-3.5 rounded-full font-bold text-sm tracking-[0.15em] hover:shadow-xl hover:shadow-yellow-500/25 transition-all duration-300 cursor-pointer"
              >
                <span>EXPLORAR COLECCIÓN</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold leading-none mb-0.5">4.9 / 5</p>
                  <p className="text-gray-500 text-[10px]">Clientes satisfechos</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-7 bg-gray-700/70" />
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                  <Shield className="h-3.5 w-3.5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold leading-none mb-0.5">Garantía</p>
                  <p className="text-gray-500 text-[10px]">En todos los productos</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-7 bg-gray-700/70" />
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                  <Truck className="h-3.5 w-3.5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold leading-none mb-0.5">Envío seguro</p>
                  <p className="text-gray-500 text-[10px]">A todo México</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Indicador de scroll */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-40">
        <div className="w-px h-10 bg-gradient-to-b from-white/0 to-white/60 animate-pulse" />
        <span className="text-[9px] tracking-[0.3em] text-gray-400 uppercase">Scroll</span>
      </div>

      {/* Gradiente inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black to-transparent" />

    </section>
  );
};

export default Hero;
