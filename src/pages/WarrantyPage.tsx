import React from 'react';

const WarrantyPage: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
    <div className="max-w-4xl mx-auto space-y-10">
      <header className="text-center space-y-3">
        <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Garantía</p>
        <h1 className="text-4xl font-bold text-white">Cobertura y condiciones</h1>
        <p className="text-gray-300">
          Todas nuestras joyas cuentan con garantía limitada contra defectos de fabricación y desprendimiento
          prematuro de piedras.
        </p>
      </header>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-2xl font-semibold text-white">Duración</h2>
        <p className="text-gray-300">
          La garantía cubre 12 meses a partir de la fecha de compra o entrega (lo que ocurra después). Aplica a piezas compradas en sitio web y showroom.
        </p>
      </section>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Incluye</h2>
        <ul className="text-gray-300 space-y-2">
          <li>• Reparación de cierres, broches o garras defectuosas.</li>
          <li>• Reposición de piedras cuando se desprenden por falla del engaste.</li>
          <li>• Limpieza profunda y pulido profesional.</li>
        </ul>
      </section>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">No cubre</h2>
        <ul className="text-gray-400 text-sm space-y-2">
          <li>• Golpes, caídas o uso indebido.</li>
          <li>• Rayones profundos por fricción con otras piezas.</li>
          <li>• Modificaciones con talleres externos.</li>
        </ul>
      </section>

      <section className="text-center bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">¿Necesitas ayuda?</h2>
        <p className="text-gray-300">
          Envía tu número de pedido y fotografías a <a className="text-yellow-400" href="mailto:garantia@empresa.com">garantia@empresa.com</a>.
        </p>
      </section>
    </div>
  </div>
);

export default WarrantyPage;

