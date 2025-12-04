import React from 'react';

const PrivacyPolicy: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
    <div className="max-w-5xl mx-auto space-y-8 text-gray-300">
      <header className="text-center space-y-3">
        <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Política de Privacidad</p>
        <h1 className="text-4xl font-bold text-white">Tu información está segura</h1>
        <p>Actualizado en noviembre 2025.</p>
      </header>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Datos que recolectamos</h2>
        <ul className="space-y-2">
          <li>• Información de contacto (nombre, correo, teléfono).</li>
          <li>• Direcciones de envío y facturación.</li>
          <li>• Historial de pedidos, interacciones y preferencias.</li>
        </ul>
      </section>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Uso de la información</h2>
        <p>
          Utilizamos los datos para procesar pedidos, ofrecer soporte personalizado, enviar novedades (si lo autorizas) y cumplir obligaciones fiscales.
        </p>
      </section>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Tus derechos</h2>
        <p>Puedes solicitar acceso, rectificación y eliminación escribiendo a privacidad@empresa.com.</p>
      </section>
    </div>
  </div>
);

export default PrivacyPolicy;

