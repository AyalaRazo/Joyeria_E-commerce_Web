import React from 'react';
import { Star, MapPin } from 'lucide-react';

interface Review {
  author: string;
  rating: number;
  text: string;
  branch: string;
  date: string;
}

const reviews: Review[] = [
  {
    author: 'María G.',
    rating: 5,
    text: 'Excelente atención y joyería de altísima calidad. Me llevé un collar de diamantes y quedé encantada con el resultado. Totalmente recomendable.',
    branch: 'Punta Este — Mexicali',
    date: 'hace 2 semanas',
  },
  {
    author: 'Carlos R.',
    rating: 5,
    text: 'El servicio es impecable, muy profesionales y discretos. Los relojes son genuinos y a muy buen precio. Volveré sin duda.',
    branch: 'Cosmopolitan Zona Rio — Tijuana',
    date: 'hace 1 mes',
  },
  {
    author: 'Alejandro M.',
    rating: 5,
    text: 'Compré mi anillo de compromiso aquí y fue una experiencia única. Me asesoraron perfecto y la pieza es espectacular. 100% recomendado.',
    branch: 'Torela Agua Caliente — Tijuana',
    date: 'hace 3 semanas',
  },
  {
    author: 'Laura S.',
    rating: 5,
    text: 'Gran variedad de piezas exclusivas. Me ayudaron a elegir el regalo perfecto para mi mamá. Muy buen gusto y atención personalizada.',
    branch: 'Punta Este — Mexicali',
    date: 'hace 5 días',
  },
  {
    author: 'Fernando T.',
    rating: 5,
    text: 'Tienen una colección de diamantes preciosa con certificación. Muy buenos precios y la garantía es real. Confianza total.',
    branch: 'Cosmopolitan Zona Rio — Tijuana',
    date: 'hace 2 meses',
  },
  {
    author: 'Patricia V.',
    rating: 5,
    text: 'El personal es muy amable y conocedor. Compré un reloj de lujo y llegó en perfectas condiciones con estuche y documentación completa.',
    branch: 'Torela Agua Caliente — Tijuana',
    date: 'hace 1 semana',
  },
  {
    author: 'Roberto C.',
    rating: 5,
    text: 'Llevo comprando aquí más de 3 años y nunca me han fallado. Joyería de lujo con precio justo y servicio de primera.',
    branch: 'Punta Este — Mexicali',
    date: 'hace 3 días',
  },
  {
    author: 'Valeria H.',
    rating: 5,
    text: 'Super recomendados! La pulsera que compré es hermosa, la calidad es increíble y el empaque muy elegante. Perfecto para regalo.',
    branch: 'Cosmopolitan Zona Rio — Tijuana',
    date: 'hace 4 semanas',
  },
];

const Stars: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < count ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
      />
    ))}
  </div>
);

// Duplicate for seamless loop
const track = [...reviews, ...reviews];

const ReviewsSlider: React.FC = () => (
  <section className="py-10 overflow-hidden border-y border-gray-800/60 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 select-none">
    {/* Header */}
    <div className="text-center mb-6 px-4">
      <p className="text-xs tracking-[0.3em] text-yellow-400 uppercase mb-1">Lo que dicen de nosotros</p>
      <h2 className="text-xl sm:text-2xl font-bold text-white">Reseñas de Google Maps</h2>
    </div>

    {/* Ticker */}
    <div className="relative">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-gray-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-gray-950 to-transparent" />

      <div className="animate-marquee-reviews flex gap-5 w-max">
        {track.map((review, i) => (
          <div
            key={i}
            className="w-72 sm:w-80 flex-shrink-0 bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-3 hover:[animation-play-state:paused]"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{review.author}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{review.date}</p>
              </div>
              {/* Google icon */}
              <svg className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>

            <Stars count={review.rating} />

            <p className="text-gray-300 text-xs leading-relaxed line-clamp-4">{review.text}</p>

            <div className="flex items-center gap-1 text-gray-500 text-[10px]">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span>{review.branch}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ReviewsSlider;
