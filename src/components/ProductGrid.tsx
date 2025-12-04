import React from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number, variant?: any) => void;
  category: string;
  onProductClick?: (product: Product) => void;
  loading?: boolean;
  error?: string | null;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToCart,
  category,
  onProductClick,
  loading = false,
  error = null,
}) => {
  const getCategoryTitle = (cat: string) => {
    switch (cat) {
      case 'rings': return 'Anillos de Lujo';
      case 'necklaces': return 'Collares Exclusivos';
      case 'bracelets': return 'Pulseras Elegantes';
      case 'earrings': return 'Pendientes Únicos';
      default: return 'Toda la Colección';
    }
  };

  const getCategoryDescription = (cat: string) => {
    switch (cat) {
      case 'rings': return 'Anillos únicos para momentos especiales';
      case 'necklaces': return 'Collares que realzan tu elegancia natural';
      case 'bracelets': return 'Pulseras que complementan tu estilo';
      case 'earrings': return 'Pendientes que capturan la luz perfecta';
      default: return 'Descubre todas nuestras creaciones exclusivas';
    }
  };

  // Ordenar productos por prioridad:
  // 1. Oferta (original_price > price)
  // 2. Destacado
  // 3. Nuevo
  // 4. Normales
  const sortedProducts = [...products].sort((a, b) => {
    const getPriority = (p: Product) => {
      const isOffer = !!(p.original_price && p.original_price > p.price);
      if (isOffer) return 1;
      if (p.is_featured) return 2;
      if (p.is_new) return 3;
      return 4;
    };
    return getPriority(a) - getPriority(b);
  });

  if (loading) {
    return (
      <section className="bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                {getCategoryTitle(category)}
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              {getCategoryDescription(category)}
            </p>
          </div>
          
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-300"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                {getCategoryTitle(category)}
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              {getCategoryDescription(category)}
            </p>
          </div>
          
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-2xl font-bold text-red-400 mb-4">Error de Conexión</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              {error}
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 max-w-2xl mx-auto">
              <h4 className="text-lg font-semibold text-gray-300 mb-3">Para solucionar este problema:</h4>
              <ul className="text-left text-gray-400 space-y-2">
                <li>• Verifica que las variables de entorno de Supabase estén configuradas</li>
                <li>• Asegúrate de que la base de datos esté funcionando</li>
                <li>• Revisa la consola del navegador para más detalles</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="product-grid" className="py-20 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
              {getCategoryTitle(category)}
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {getCategoryDescription(category)}
          </p>
        </div>

        {sortedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💎</div>
            <h3 className="text-2xl font-bold text-gray-400 mb-2">No hay productos disponibles</h3>
            <p className="text-gray-500">Pronto tendremos nuevas piezas en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6 sm:gap-8 lg:gap-6 w-full">
            {sortedProducts.map((product) => (
              <div key={product.id} className="w-full h-full flex">
                <ProductCard
                  product={product}
                  onClick={onProductClick}
                  onAddToCart={onAddToCart}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;
