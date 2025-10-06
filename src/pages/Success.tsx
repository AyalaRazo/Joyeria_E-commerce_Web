import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();

  useEffect(() => {
    // Limpiar el carrito cuando se llegue a la página de éxito
    const clearCartAndShow = async () => {
      try {
        await clearCart();
        console.log('Carrito limpiado después de compra exitosa');
      } catch (error) {
        console.error('Error limpiando carrito:', error);
      }
    };

    clearCartAndShow();
  }, [clearCart]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h1 className="text-4xl font-bold mb-4 text-green-400">¡Pago exitoso!</h1>
      <p className="text-lg mb-8">Tu pago fue procesado correctamente. Pronto recibirás un correo con los detalles de tu pedido.</p>
      <button 
        onClick={() => navigate('/')} 
        className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold hover:bg-yellow-500 transition"
      >
        Volver a la tienda
      </button>
    </div>
  );
};

export default Success; 