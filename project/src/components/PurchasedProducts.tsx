import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePurchasedProducts } from '../hooks/usePurchasedProducts';
import ProductCard from './ProductCard';
import type { Product } from '../types';

const PurchasedProducts: React.FC = () => {
  const { user } = useAuth();
  const { purchasedProducts, loading, error, loadPurchasedProducts } = usePurchasedProducts();

  useEffect(() => {
    if (user?.id) {
      loadPurchasedProducts(user.id);
    }
  }, [user?.id, loadPurchasedProducts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Mis Productos Comprados</h1>
          <p className="text-xl text-gray-300">
            Aquí puedes ver todos los productos que has comprado
          </p>
        </div>

        {purchasedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-2xl font-bold text-gray-400 mb-2">No has comprado productos aún</h3>
            <p className="text-gray-500">Cuando hagas tu primera compra, aparecerán aquí</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {purchasedProducts.map((product: Product) => (
              <div key={product.id} className="w-full h-full flex">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchasedProducts; 