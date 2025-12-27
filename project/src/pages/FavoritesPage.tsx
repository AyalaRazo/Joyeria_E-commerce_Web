import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Heart, ArrowLeft } from 'lucide-react';
import type { Product } from '../types';
import { buildMediaUrl, isVideoUrl } from '../utils/storage';

export default function FavoritesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Scroll al inicio cuando se carga la página
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!user) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          navigate('/login');
        } else {
          fetchFavorites(session.user.id);
        }
      });
      return;
    }
    
    fetchFavorites(user.id);
  }, [user, navigate]);

  const fetchFavorites = async (userId?: string) => {
    const uid = userId || user?.id;
    
    if (!uid) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          product_id,
          product:products(
            *,
            variants:product_variants(*),
            images:product_images(*),
            category:categories(*)
          )
        `)
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const products = (data || [])
        .map((fav: any) => fav.product)
        .filter(Boolean) as Product[];

      setFavorites(products);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('toggle_favorite', {
        p_user_id: user.id,
        p_product_id: productId
      });

      if (error) throw error;

      if (!data) {
        setFavorites(prev => prev.filter(p => p.id !== productId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-300 mb-4"></div>
        <p className="text-gray-400">Cargando favoritos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-2xl font-bold text-white mb-6">Mis Favoritos</h1>
          <div className="text-xs text-gray-400">
                {favorites.length} favoritos
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No tienes productos favoritos aún</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-medium"
            >
              Explorar productos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((product) => (
              <div
                key={product.id}
                className="bg-gray-900 rounded-lg overflow-hidden shadow border border-gray-800 hover:border-yellow-400 transition-colors group relative cursor-pointer"
                onClick={() => navigate(`/producto/${product.id}`)}
              >
                <div className="h-64 bg-black flex items-center justify-center p-4">
                  {isVideoUrl(product.image) ? (
                    <video
                      src={buildMediaUrl(product.image)}
                      className="max-h-full max-w-full object-contain"
                      muted
                      playsInline
                      loop
                      autoPlay
                    />
                  ) : (
                    <img
                      src={buildMediaUrl(product.image)}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="text-white font-medium text-sm truncate mb-2">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 font-bold text-base">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN'
                      }).format(product.price || 0)}
                    </span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-gray-500 text-xs line-through">
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN'
                        }).format(product.original_price)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => handleToggleFavorite(product.id, e)}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10"
                >
                  <Heart className="h-5 w-5 text-red-500 fill-current" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}