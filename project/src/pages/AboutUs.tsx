import React from 'react';

const AboutUs: React.FC = () => {
  const milestones = [
    { year: '1985', text: 'Nace nuestro taller familiar en Mexicali, B.C.' },
    { year: '1998', text: 'Abrimos nuestra primera boutique y presentamos colecciones exclusivas.' },
    { year: '2015', text: 'Integramos procesos certificados de sostenibilidad y trazabilidad.' },
    { year: '2024', text: 'Lanzamos la experiencia digital con asesoría personalizada.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Nuestra historia</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white">Joyas con legado, corazón y precisión</h1>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Desde hace cuatro décadas acompañamos compromisos, logros y nuevos comienzos. Cada pieza
            está diseñada en Mexicali con materiales certificados y un proceso artesanal que honra la tradición.
          </p>
        </header>

        <section className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-white">Visión</h2>
            <p className="text-gray-300">
              Crear joyería que conecte generaciones con diseños atemporales, materiales nobles
              y una experiencia de compra cercana, honesta y personalizada.
            </p>
          </div>
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-white">Valores</h2>
            <ul className="space-y-2 text-gray-300">
              <li>• Artesanía responsable y trazable.</li>
              <li>• Atención cálida antes, durante y después de la compra.</li>
              <li>• Innovación para personalizar cada historia.</li>
            </ul>
          </div>
        </section>

        <section className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Línea de tiempo</h2>
          <div className="space-y-4">
            {milestones.map(item => (
              <div key={item.year} className="flex items-start space-x-4">
                <div className="text-yellow-400 font-semibold">{item.year}</div>
                <p className="text-gray-300">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center space-y-4 bg-gray-900/70 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white">Tu historia merece un brillo único</h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Agenda una asesoría virtual o visítanos en el showroom para descubrir piezas únicas, personalizar
            un diseño desde cero o restaurar una joya que deseas seguir heredando.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;

