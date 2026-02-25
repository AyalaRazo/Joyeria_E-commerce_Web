import React from 'react';
import { X, Plus, Minus, ShoppingBag, CreditCard } from 'lucide-react';
import { CartItem } from '../types';
import { supabase } from '../lib/supabase';
import { buildMediaUrl } from '../utils/storage';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string | number, quantity: number) => void;
  onRemoveItem: (id: string | number) => void;
  totalPrice: number;
  onCheckout: () => void;
  user: any;
  onAuthRequired: () => void;
}

const Cart: React.FC<CartProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  totalPrice,
  onCheckout,
  user,
  onAuthRequired
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  // Función para actualizar el timestamp del carrito
  const updateCartTimestamp = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('carts')
        .update({ 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating cart timestamp:', error);
    }
  };

  // Manejar cambio de cantidad con actualización de timestamp
  const handleUpdateQuantity = async (id: string | number, quantity: number) => {
    try {
      await onUpdateQuantity(id, quantity);
      await updateCartTimestamp();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  // Manejar eliminación de item con actualización de timestamp
  const handleRemoveItem = async (id: string | number) => {
    try {
      await onRemoveItem(id);
      await updateCartTimestamp();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      onAuthRequired();
      return;
    }
    onCheckout();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="absolute right-0 top-0 h-full w-full sm:max-w-md bg-gradient-to-b from-gray-900 to-black shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header - más compacto */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 text-gray-300" />
              <h2 className="text-lg font-bold text-white">Carrito</h2>
              <span className="bg-gray-300 text-black px-1.5 py-0.5 rounded-full text-xs font-bold">
                {items.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-800 rounded transition-colors duration-200"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-5xl mb-3">🛍️</div>
                <h3 className="text-lg font-bold text-gray-400 mb-1.5">Carrito vacío</h3>
                <p className="text-gray-500 mb-4 text-sm">Añade productos para comenzar</p>
                <button
                  onClick={onClose}
                  className="bg-gradient-to-r from-gray-300 to-gray-500 text-black px-5 py-2.5 rounded-lg font-bold text-sm tracking-wide hover:shadow transition-all duration-200"
                >
                  CONTINUAR COMPRANDO
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors duration-200">
                    <div className="flex space-x-3">
                      <img
                        src={buildMediaUrl(item.variant?.image || item.product?.image)}
                        alt={item.product?.name || 'Producto'}
                        className="w-14 h-14 object-cover rounded-md border border-gray-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/default-product-image.png';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white text-sm mb-0.5 line-clamp-2">
                              {item.product?.name || 'Producto'}
                            </h3>
                            {item.variant && (
                              <p className="text-xs text-yellow-400 font-medium truncate">
                                {item.variant.model || 'Principal'}
                                {item.variant.size && ` · T${item.variant.size}`}
                                {(item.variant.metal_name || item.variant.carat) && (
                                  ` · ${[item.variant.metal_name, item.variant.carat ? `${item.variant.carat}k` : ''].filter(Boolean).join(' ')}`
                                )}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors duration-200 ml-2 flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-1.5 line-clamp-1">
                          {item.product?.material || 'Material no especificado'}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-bold text-yellow-400 text-sm">
                            {formatPrice(item.price)}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="p-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors duration-200"
                            >
                              <Minus className="h-3 w-3 text-white" />
                            </button>
                            <span className="font-bold text-white text-sm w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              className="p-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors duration-200"
                            >
                              <Plus className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Subtotal por item */}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700/50">
                      <span className="text-xs text-gray-400">Subtotal:</span>
                      <span className="font-bold text-white text-sm">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-sm">Total:</span>
                <span className="font-bold text-xl text-gray-300">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              
              <button 
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black py-3 px-4 rounded-lg font-bold text-base tracking-wide hover:shadow hover:shadow-gray-400/20 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-1.5"
              >
                <CreditCard className="h-4 w-4" />
                <span>{user ? 'FINALIZAR COMPRA' : 'INICIAR SESIÓN'}</span>
              </button>
              
              <button
                onClick={onClose}
                className="w-full border border-gray-300 text-gray-300 py-2.5 px-4 rounded-lg font-bold text-sm tracking-wide hover:bg-gray-300 hover:text-black transition-all duration-200"
              >
                CONTINUAR COMPRANDO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;