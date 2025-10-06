import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Star, Sparkles, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
  onAddToCart?: (product: Product, quantity: number, variant?: any) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onAddToCart }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  // Lógica para manejar variantes
  const getDefaultModel = () => {
    if (!product.variants || product.variants.length === 0) return '';
    const firstModel = product.variants.find(v => v.model) || product.variants[0];
    return firstModel.model || '';
  };

  const [selectedModel, setSelectedModel] = useState(getDefaultModel());
  const [quantity, setQuantity] = useState(1);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);

  useEffect(() => {
    const defModel = getDefaultModel();
    setSelectedModel(defModel);
  }, [product.id]);

  const selectedVariant = product.variants?.find(v => v.model === selectedModel) || product.variants?.[0];
  const stock = (selectedVariant ? selectedVariant.stock : product.stock) ?? 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const displayImage = selectedVariant ? selectedVariant.image : product.image;
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;

  // Mostrar cantidad solo si hay menos de 20 unidades
  const showStockCount = stock > 0 && stock <= 20;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navegación directa sin condiciones
    console.log('Navigating to:', `/producto/${product.id}`);
    navigate(`/producto/${product.id}`);
  };

  const handleSelectChange = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleAddToCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      // Si no está autenticado, navegar a la página del producto donde puede iniciar sesión
      navigate(`/producto/${product.id}`);
      return;
    }

    try {
      if (onAddToCart) {
        await onAddToCart(product, quantity, selectedVariant);
      } else {
        await addToCart(product, quantity, selectedVariant);
      }
      
      // Feedback visual
      const button = e.currentTarget as HTMLButtonElement;
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '✓ Añadido';
        button.classList.add('bg-green-500');
      
      
      // Disparar evento personalizado para actualizar el carrito
      const cartUpdateEvent = new CustomEvent('cart-updated', { 
        detail: { action: 'add', productId: product.id, quantity } 
      });
      window.dispatchEvent(cartUpdateEvent);
      
      setTimeout(() => {
        if (button) {
          button.innerHTML = originalText;
          button.classList.remove('bg-green-500');
        }
        setShowQuantitySelector(false);
        setQuantity(1);
      }, 2000);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleQuantityChange = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl hover:shadow-gray-400/20 transition-all duration-500 transform hover:scale-105 h-full flex flex-col cursor-pointer"
      onClick={handleClick}
    >
      {/* Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        {product.is_new && (
          <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            NUEVO
          </span>
        )}
        {product.is_featured && (
          <span className="bg-gradient-to-r from-gray-300 to-gray-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1">
            <Star className="h-3 w-3" fill="currentColor" />
            <span>DESTACADO</span>
          </span>
        )}
        {product.original_price && product.original_price > displayPrice && (
          <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            OFERTA
          </span>
        )}
      </div>

      {/* Imagen */}
      <div className="relative h-100 sm:h-80 overflow-hidden">
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Sparkles className="h-5 w-5 text-gray-300 animate-pulse" />
        </div>
      </div>

      {/* Información del producto */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gray-300 transition-colors duration-300 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-sm text-gray-400 font-medium tracking-wide">
            {product.material}
          </p>
        </div>

        <p className="text-gray-300 text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
          {product.description}
        </p>

        {/* Selector de modelo (solo si hay variantes con modelo) */}
        {product.variants && product.variants.some(v => v.model) && (
          <div className="mb-4">
            <label className="block text-gray-400 text-xs mb-1">Modelo:</label>
            <select
              className="w-full bg-gray-800 text-white rounded p-4 md:p-2 border border-gray-700 text-xs sm:text-sm"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              onClick={handleSelectChange}
            >
              {[...new Set(product.variants.map(v => v.model).filter(Boolean))].map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sección de precios */}
        <div className="mt-auto">
          {/* Precio actual y original en línea */}
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-xl sm:text-2xl font-bold text-gray-300">
              {formatPrice(displayPrice)}
            </span>
            {product.original_price && product.original_price > displayPrice && (
              <span className="text-base text-gray-500 line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>

          {/* Ahorro debajo */}
          {product.original_price && product.original_price > displayPrice && (
            <div className="mb-2">
              <span className="text-sm text-green-400 font-medium">
                Ahorras: {formatPrice(product.original_price - displayPrice)}
              </span>
            </div>
          )}

          {/* Estado de stock */}
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${stock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-xs ${stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stock > 0 ? (showStockCount ? `${stock} Restantes` : 'Disponible') : 'Agotado'}
            </span>
          </div>

          {/* Selector de cantidad y botón agregar */}
          {stock > 0 && (
            <div className="space-y-3">
              {!showQuantitySelector ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQuantitySelector(true);
                  }}
                  className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-2 px-4 rounded-lg font-bold text-sm tracking-wide hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>AGREGAR AL CARRITO</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      onClick={(e) => {
                        handleQuantityChange(e);
                        setQuantity(Math.max(1, quantity - 1));
                      }}
                      className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-white w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={(e) => {
                        handleQuantityChange(e);
                        setQuantity(quantity + 1);
                      }}
                      className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddToCartClick}
                      className="flex-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-2 px-3 rounded-lg font-bold text-xs tracking-wide hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-1"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      <span>AGREGAR</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQuantitySelector(false);
                        setQuantity(1);
                      }}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Borde decorativo */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-gray-300/30 rounded-2xl transition-all duration-500 pointer-events-none"></div>
    </div>
  );
};

export default ProductCard;