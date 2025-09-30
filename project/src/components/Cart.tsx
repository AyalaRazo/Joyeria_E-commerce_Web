import React from 'react';
import { X, Plus, Minus, ShoppingBag, CreditCard } from 'lucide-react';
import { CartItem } from '../types';
import { supabase } from '../lib/supabase';

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
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-gradient-to-b from-gray-900 to-black shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-6 w-6 text-gray-300" />
              <h2 className="text-xl font-bold text-white">Carrito</h2>
              <span className="bg-gray-300 text-black px-2 py-1 rounded-full text-xs font-bold">
                {items.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-300"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-6xl mb-4">🛍️</div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">Tu carrito está vacío</h3>
                <p className="text-gray-500 mb-6">Añade algunos productos para comenzar</p>
                <button
                  onClick={onClose}
                  className="bg-gradient-to-r from-gray-300 to-gray-500 text-black px-6 py-3 rounded-xl font-bold text-sm tracking-wide hover:shadow-lg transition-all duration-300"
                >
                  CONTINUAR COMPRANDO
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition-colors duration-300">
                    <div className="flex space-x-4">
                      <img
                        src={item.product?.image || '/default-product-image.png'}
                        alt={item.product?.name || 'Producto'}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">
                          {item.product?.name || 'Producto'}
                          {item.variant?.name && (
                            <span className="block text-xs text-yellow-400 font-medium">{item.variant.name}</span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-400 mb-2">{item.product?.material || 'Material no especificado'}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-yellow-400">
                            {formatPrice(item.price)}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors duration-300"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center mt-4 space-x-3">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-300"
                      >
                        <Minus className="h-4 w-4 text-white" />
                      </button>
                      <span className="font-bold text-white px-4">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-300"
                      >
                        <Plus className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold text-white">Total:</span>
                <span className="font-bold text-2xl text-gray-300">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              
              <button 
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black py-4 px-6 rounded-xl font-bold text-lg tracking-wide hover:shadow-lg hover:shadow-gray-400/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>{user ? 'FINALIZAR COMPRA' : 'INICIAR SESIÓN PARA COMPRAR'}</span>
              </button>
              
              <button
                onClick={onClose}
                className="w-full border-2 border-gray-300 text-gray-300 py-3 px-6 rounded-xl font-bold text-sm tracking-wide hover:bg-gray-300 hover:text-black transition-all duration-300"
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