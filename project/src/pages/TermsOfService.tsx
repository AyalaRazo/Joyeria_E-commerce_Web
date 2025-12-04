import React from 'react';

const TermsOfService: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
    <div className="max-w-4xl mx-auto space-y-8 text-gray-300">
      <header className="space-y-3 text-center">
        <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Términos de Servicio</p>
        <h1 className="text-4xl font-bold text-white">Condiciones de compra y uso</h1>
      </header>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Pedidos y pagos</h2>
        <p>
          Los precios incluyen IVA. Utilizamos Stripe para procesar pagos seguros con tarjetas Visa, Mastercard y American Express.
        </p>
      </section>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Envíos</h2>
        <p>
          Entregamos en toda la República Mexicana mediante paqueterías certificadas. Recibirás un código de rastreo al confirmar tu pago.
        </p>
      </section>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Garantía y devoluciones</h2>
        <p>
          Todas las devoluciones deben solicitarse a través del panel o vía soporte@empresa.com. Consulta la sección de devoluciones para conocer los plazos.
        </p>
      </section>
    </div>
  </div>
);

export default TermsOfService;

