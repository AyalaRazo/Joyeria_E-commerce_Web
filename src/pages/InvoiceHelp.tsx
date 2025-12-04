import React from 'react';

const InvoiceHelp: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
    <div className="max-w-3xl mx-auto space-y-8 text-gray-300">
      <header className="text-center space-y-3">
        <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Factura tu compra</p>
        <h1 className="text-4xl font-bold text-white">Solicita tu CFDI</h1>
        <p>Recuerda que solo podemos facturar compras realizadas dentro del mismo mes.</p>
      </header>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Envía un correo a facturacion@empresa.com con:</h2>
        <ul className="space-y-2">
          <li>• Número de pedido.</li>
          <li>• Constancia de Situación Fiscal actualizada.</li>
          <li>• RFC y Razón Social.</li>
          <li>• Código Postal del domicilio fiscal.</li>
          <li>• Régimen Fiscal.</li>
          <li>• Uso de CFDI.</li>
          <li>• Medio de pago.</li>
        </ul>
        <p className="text-sm text-gray-400">
          Si falta alguno de estos datos no podremos emitir la factura correspondiente.
        </p>
      </section>
    </div>
  </div>
);

export default InvoiceHelp;

