import React from 'react';

const ReturnsPolicy: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
    <div className="max-w-4xl mx-auto space-y-8 text-gray-300">
      <header className="space-y-3 text-center">
        <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Devoluciones</p>
        <h1 className="text-4xl font-bold text-white">Proceso sencillo y transparente</h1>
      </header>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Plazos</h2>
        <p>
          Puedes solicitar la devolución dentro de los primeros 30 días naturales posteriores a la entrega.
        </p>
      </section>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Requisitos</h2>
        <ul className="space-y-2">
          <li>• Piezas sin uso y con todos los accesorios.</li>
          <li>• Ticket o comprobante digital.</li>
          <li>• Evaluación previa del equipo de control de calidad.</li>
        </ul>
      </section>

      <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold text-white">Pasos</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>Ingresa a tu cuenta y selecciona la orden.</li>
          <li>Describe el motivo y adjunta fotografías opcionales.</li>
          <li>Recibirás una guía de devolución y seguimiento por correo.</li>
        </ol>
      </section>
    </div>
  </div>
);

export default ReturnsPolicy;

