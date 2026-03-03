import React from 'react';

const AboutUs: React.FC = () => {

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

        <section className="text-center space-y-4 bg-gray-900/70 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-white">Tu historia merece un brillo único</h2>
          <p className="text-gray-300 max-w-3xl mx-auto">
            Agenda una asesoría virtual o visítanos en el showroom para descubrir piezas únicas, personalizar
            un diseño desde cero o restaurar una joya que deseas seguir heredando.
          </p>
        </section>

        {/* Nuestras Sucursales */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white text-center">Nuestras Sucursales</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plaza Cibeles */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-white font-semibold text-lg">Plaza Cibeles</h3>
                <p className="text-gray-400 text-sm mt-1">Blvd. Lázaro Cárdenas 1400-Local 2, Lázaro Cárdenas, 21370 Mexicali, B.C.</p>
              </div>
              <div className="w-full h-64">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4752.2144251628215!2d-115.42244409297106!3d32.62421963905414!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d7710030d3b599%3A0xc4310c98a225ed81!2sJoyeria%20Orlando%20Plaza%20Cibeles!5e0!3m2!1ses!2smx!4v1772514499913!5m2!1ses!2smx"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Joyeria Orlando Plaza Cibeles"
                />
              </div>
            </div>

            {/* Blvd. Lázaro Cárdenas */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h3 className="text-white font-semibold text-lg">Blvd. Lázaro Cárdenas</h3>
                <p className="text-gray-400 text-sm mt-1">Blvd. Lázaro Cárdenas 1353, Villanova, 21180 Mexicali, B.C.</p>
              </div>
              <div className="w-full h-64">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d53765.720229618644!2d-115.56402216875!3d32.62330149999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d77a5fa9657b3b%3A0xaa0fc17b5cc0e84!2sJoyer%C3%ADa%20de%20Plata%20Orlando!5e0!3m2!1ses!2smx!4v1772514616865!5m2!1ses!2smx"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Joyeria Orlando Blvd. Lázaro Cárdenas"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;

