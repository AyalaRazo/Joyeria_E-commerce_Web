import React from 'react';

const JewelryCare: React.FC = () => {
  const tips = [
    {
      title: 'Limpieza semanal',
      detail: 'Usa agua tibia, jabón neutro y un paño de microfibra. Evita químicos agresivos.',
    },
    {
      title: 'Almacenamiento individual',
      detail: 'Guarda cada pieza en estuches acolchados para evitar rayones y enredos.',
    },
    {
      title: 'Último detalle de tu look',
      detail: 'Coloca tus joyas al final, después de maquillaje, perfume o fijadores.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Cuidado de joyas</p>
          <h1 className="text-4xl font-bold text-white">Mantén el brillo original</h1>
          <p className="text-gray-300">
            Con estas recomendaciones prolongas la vida de tus piezas y conservas su garantía vigente.
          </p>
        </header>

        <section className="grid md:grid-cols-3 gap-6">
          {tips.map(tip => (
            <div key={tip.title} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-white mb-2">{tip.title}</h3>
              <p className="text-gray-300 text-sm">{tip.detail}</p>
            </div>
          ))}
        </section>

        <section className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-2xl font-semibold text-white">Servicios de mantenimiento</h2>
          <ul className="text-gray-300 space-y-2">
            <li>• Pulido profesional gratuito cada 12 meses.</li>
            <li>• Revisión de garras, engastes y cierres.</li>
            <li>• Ajuste de talla en anillos seleccionados.</li>
          </ul>
          <p className="text-sm text-gray-400">
            Agenda un servicio escribiendo a <a className="text-yellow-400" href="mailto:soporte@empresa.com">soporte@empresa.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default JewelryCare;

