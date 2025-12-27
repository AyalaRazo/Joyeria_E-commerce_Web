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
      case 'rings': return 'Anillos';
      case 'necklaces': return 'Collares';
      case 'bracelets': return 'Pulseras';
      case 'earrings': return 'Pendientes';
      default: return 'Colección';
    }
  };

  const getCategoryDescription = (cat: string) => {
    switch (cat) {
      case 'rings': return 'Anillos para momentos especiales';
      case 'necklaces': return 'Collares que realzan tu elegancia';
      case 'bracelets': return 'Pulseras que complementan tu estilo';
      case 'earrings': return 'Pendientes que capturan la luz';
      default: return 'Descubre nuestras creaciones exclusivas';
    }
  };

  // Filtrar productos activos y variantes activas
  const activeProducts = products.filter(product => {
    if (product.is_active === false) return false;
    // Si tiene variantes, al menos una debe estar activa
    if (product.variants && product.variants.length > 0) {
      return product.variants.some(v => v.is_active !== false);
    }
    return true;
  });

  // Ordenar productos por prioridad:
  // 1. Oferta (original_price > price)
  // 2. Destacado
  // 3. Nuevo
  // 4. Normales
  const sortedProducts = [...activeProducts].sort((a, b) => {
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                {getCategoryTitle(category)}
              </span>
            </h2>
            <p className="text-lg text-gray-300 max-w-xl mx-auto">
              {getCategoryDescription(category)}
            </p>
          </div>
          
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-gray-300"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                {getCategoryTitle(category)}
              </span>
            </h2>
            <p className="text-lg text-gray-300 max-w-xl mx-auto">
              {getCategoryDescription(category)}
            </p>
          </div>
          
          <div className="text-center py-16">
            <div className="text-5xl mb-3">⚠️</div>
            <h3 className="text-xl font-bold text-red-400 mb-3">Error</h3>
            <p className="text-gray-300 mb-4 max-w-xl mx-auto text-sm">
              {error}
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 max-w-xl mx-auto text-sm">
              <h4 className="font-semibold text-gray-300 mb-2">Para solucionar:</h4>
              <ul className="text-left text-gray-400 space-y-1">
                <li>• Verifica las variables de entorno de Supabase</li>
                <li>• Asegúrate que la base de datos esté funcionando</li>
                <li>• Revisa la consola del navegador</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="product-grid" className="py-16 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-6xl mx-auto px-1 sm:px-12 lg:px-32">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
              {getCategoryTitle(category)}
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            {getCategoryDescription(category)}
          </p>
        </div>

        {sortedProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">💎</div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">No hay productos</h3>
            <p className="text-gray-500 text-sm">Pronto tendremos nuevas piezas</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-4 w-full">
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
