import React from 'react';
import { Category } from '../types';
import { ArrowRight } from 'lucide-react';

interface CategoryGridProps {
  categories: Category[];
  onCategorySelect: (categoryId: string | number) => void;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, onCategorySelect }) => {
  // Colores para cada categoría (puedes personalizarlos)
  const categoryColors = [
    'from-purple-500 to-purple-700',
    'from-blue-500 to-blue-700',
    'from-emerald-500 to-emerald-700',
    'from-amber-500 to-amber-700',
    'from-rose-500 to-rose-700'
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
              NUESTRAS COLECCIONES
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Cada categoría representa la perfecta fusión entre tradición artesanal y diseño contemporáneo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category, index) => (
            <div
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${categoryColors[index % categoryColors.length]} hover:brightness-110 transition-all duration-500 transform hover:scale-105 cursor-pointer shadow-2xl hover:shadow-yellow-500/20 min-h-[200px] flex flex-col justify-end p-6`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent group-hover:from-black/30 transition-all duration-500"></div>
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors duration-300">
                  {category.name}
                </h3>
                <p className="text-gray-100 text-sm mb-4 leading-relaxed">
                  {category.description}
                </p>
                <div className="flex items-center text-yellow-400 group-hover:text-yellow-300 transition-colors duration-300">
                  <span className="text-sm font-medium tracking-wide">EXPLORAR</span>
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>

              {/* Decorative border */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-gray-300/30 rounded-2xl transition-all duration-500"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;