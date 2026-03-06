import React, { useState } from 'react';
import { MessageCircle, Phone, Send, User, Mail, CheckCircle } from 'lucide-react';

const ContactPage: React.FC = () => {
  const phone = '526865822233';
  const whatsappBase = `https://wa.me/${phone}?text=`;

  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = encodeURIComponent(
      `Hola, me comunico desde el sitio web.\n\n` +
      `*Nombre:* ${form.name}\n` +
      `*Correo:* ${form.email}\n` +
      (form.phone ? `*Teléfono:* ${form.phone}\n` : '') +
      `\n*Mensaje:*\n${form.message}`
    );
    window.open(`${whatsappBase}${text}`, '_blank', 'noopener,noreferrer');
    setSent(true);
  };

  const isValid = form.name.trim() && form.email.trim() && form.message.trim();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* Header */}
        <header className="text-center space-y-4">
          <p className="text-sm tracking-[0.3em] text-yellow-400 uppercase">Contacto</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white">Estamos para ayudarte</h1>
          <p className="text-gray-300 max-w-xl mx-auto">
            ¿Tienes preguntas sobre algún producto? ¿Quieres conocer nuestro catálogo completo?
            Escríbenos y con gusto te atendemos.
          </p>
        </header>

        <div className="grid md:grid-cols-5 gap-6">

          {/* Formulario */}
          <div className="md:col-span-3 bg-gray-900/70 border border-gray-800 rounded-2xl p-7 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Enviar mensaje</h2>
              <p className="text-gray-400 text-sm mt-1">Completa el formulario y te contactaremos a la brevedad.</p>
            </div>

            {sent ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-green-400" />
                </div>
                <p className="text-white font-semibold">¡Mensaje enviado!</p>
                <p className="text-gray-400 text-sm">Se abrió WhatsApp con tu mensaje. Responderemos a la brevedad.</p>
                <button
                  onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', message: '' }); }}
                  className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Nombre completo <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Tu nombre"
                      required
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-colors"
                    />
                  </div>
                </div>

                {/* Correo */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Correo electrónico <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="tu@email.com"
                      required
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-colors"
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="686 000 0000"
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-colors"
                    />
                  </div>
                </div>

                {/* Mensaje */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Mensaje <span className="text-yellow-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="¿En qué podemos ayudarte?"
                    required
                    rows={4}
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isValid}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm transition-all"
                >
                  <Send className="h-4 w-4" />
                  Enviar mensaje
                </button>
              </form>
            )}
          </div>

          {/* Panel lateral: WhatsApp + número */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold">WhatsApp directo</p>
                <p className="text-gray-400 text-sm mt-0.5 flex items-center justify-center gap-1">
                  <Phone className="h-3 w-3" /> +52 686 582 2233
                </p>
              </div>
              <a
                href={`${whatsappBase}${encodeURIComponent('Hola, tengo una pregunta sobre un producto de Joyería Orlando.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp
              </a>
            </div>

            <p className="text-center text-xs text-gray-600 px-2">
              También puedes visitarnos en cualquiera de nuestras dos sucursales en Mexicali.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContactPage;
