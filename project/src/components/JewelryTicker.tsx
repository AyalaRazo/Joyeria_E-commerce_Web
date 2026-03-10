import React from 'react';
import { Gem, Truck, Shield, Sparkles, Watch, Diamond } from 'lucide-react';

const items = [
  { text: 'Joyería fina con certificación',         icon: <Gem       className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Diamantes certificados',                 icon: <Diamond   className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Relojería de alto valor',                icon: <Watch     className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Garantía en cada pieza',                 icon: <Shield    className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Anillos de compromiso y boda',           icon: <Sparkles  className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Envíos a todo México',                   icon: <Truck     className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Pulseras y collares de lujo',            icon: <Gem       className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Discreción y seguridad garantizadas',    icon: <Shield    className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Sucursales en Tijuana y Mexicali',       icon: <Sparkles  className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Aretes y dijes exclusivos',              icon: <Diamond   className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Asesoría personalizada sin costo',       icon: <Gem       className="h-3 w-3 flex-shrink-0" /> },
  { text: 'Relojes de marcas reconocidas',          icon: <Watch     className="h-3 w-3 flex-shrink-0" /> },
];

// Duplicamos para el loop infinito sin salto
const track = [...items, ...items];

const Separator: React.FC = () => (
  <span className="mx-5 text-yellow-400/40 select-none text-xs">✦</span>
);

const JewelryTicker: React.FC = () => (
  <div className="relative overflow-hidden border-y border-gray-800/70 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 py-2.5 select-none">

    {/* fade edges */}
    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-gray-950 to-transparent" />
    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-gray-950 to-transparent" />

    <div className="animate-marquee flex whitespace-nowrap w-max">
      {track.map((item, i) => (
        <React.Fragment key={i}>
          <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-medium tracking-wide text-gray-400 hover:text-gray-200 transition-colors duration-200 cursor-default">
            <span className="text-yellow-400">{item.icon}</span>
            {item.text}
          </span>
          <Separator />
        </React.Fragment>
      ))}
    </div>
  </div>
);

export default JewelryTicker;
