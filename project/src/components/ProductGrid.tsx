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
  // 1. Oferta (original_price > price en variante default)
  // 2. Destacado
  // 3. Nuevo
  // 4. Normales
  const sortedProducts = [...activeProducts].sort((a, b) => {
    const getPriority = (p: Product) => {
      // Verificar oferta en variante default
      const defaultVariant = p.variants?.find(v => v.is_default === true);
      const isOffer = defaultVariant
        ? !!(defaultVariant.original_price && defaultVariant.original_price > defaultVariant.price)
        : !!(p.original_price && p.original_price > p.price);
      
      if (isOffer) return 1;
      if (p.is_featured) return 2;
      if (p.is_new) return 3;
      return 4;
    };
    return getPriority(a) - getPriority(b);
  });

  // Skeleton component
  const ProductSkeleton = () => (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg h-full flex flex-col animate-pulse">
      <div className="relative w-full aspect-[3/4] bg-gray-700"></div>
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="mb-2">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
        </div>
        <div className="mt-auto">
          <div className="h-5 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );

  if (loading) {
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
          
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-4 w-full">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-full h-full flex">
                <ProductSkeleton />
              </div>
            ))}
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
