import React from 'react';

const Cancel: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
    <h1 className="text-4xl font-bold mb-4 text-red-400">Pago cancelado</h1>
    <p className="text-lg mb-8">El pago fue cancelado o no se pudo procesar. Puedes intentarlo de nuevo o contactarnos si necesitas ayuda.</p>
    <a href="/" className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold hover:bg-yellow-500 transition">Volver a la tienda</a>
  </div>
);

export default Cancel; 