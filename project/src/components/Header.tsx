import React, { useState } from 'react';
import { ShoppingBag, Search, Menu, Package, User, LogOut, Settings, Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchModal from './SearchModal';
import { useAuth } from '../hooks/useAuth';
import type { Product } from '../types';

interface HeaderProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  onAddToCart: (product: Product) => void;
  onCartToggle: () => void;
  cartItemCount: number;
  user: any;
  onLoginClick: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  activeCategory, 
  onCategoryChange, 
  onAddToCart,
  onCartToggle,
  cartItemCount,
  user,
  onLoginClick,
  onLogout
}) => {
  const { canAccessAdmin, loading: authLoading } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const navigate = useNavigate();

  const categories = [
    { id: 'all', name: 'Todo' },
    { id: 'rings', name: 'Anillos' },
    { id: 'necklaces', name: 'Collares' },
    { id: 'bracelets', name: 'Pulseras' },
    { id: 'earrings', name: 'Pendientes' }
  ];

  const trackCategoryView = (categoryId: string) => {
    if (categoryId === 'all') return;
    const categoryName = categories.find(c => c.id === categoryId)?.name || categoryId;
    try {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'PageView', {
          content_category: categoryName,
          category_id: categoryId,
        });
      }
    } catch (error) {
      console.warn('Meta PageView tracking falló:', error);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    trackCategoryView(categoryId);
    if (!isHome) {
      localStorage.setItem('selectedCategory', categoryId);
      navigate('/');
    } else {
      onCategoryChange(categoryId);
    }
  };

  const handleLogout = async () => {
    try {
      await onLogout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <header className="bg-gradient-to-r from-black via-gray-900 to-black shadow-lg sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16"> {/* Cambiado de h-20 a h-16 */}
          {/* Logo - más compacto */}
          <div 
            className="flex items-center space-x-2 cursor-pointer group"  /* Reducido space-x */
            onClick={() => {
              onCategoryChange('all');
              if (!isHome) navigate('/');
            }}
          >
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                Joyeria Orlando
              </h1>
            </div>
          </div>

          {/* Navigation - más compacto */}
          <nav className="hidden lg:flex space-x-4"> {/* Reducido space-x de 8 a 4 */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-all duration-200 relative group ${
                  isHome && activeCategory === category.id
                    ? 'text-gray-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {category.id === 'all' ? 'Todo' : category.name}
                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-gray-300 to-gray-500 transform transition-transform duration-200 ${
                  isHome && activeCategory === category.id ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}></span>
              </button>
            ))}
          </nav>

          {/* Right side actions - más compactos */}
          <div className="flex items-center space-x-4"> {/* Reducido space-x de 6 a 4 */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 text-gray-300 hover:text-gray-200 transition-colors duration-200 hover:bg-gray-800 rounded-lg group"
              aria-label="Buscar productos"
            >
              <Search className="h-4 w-4" /> {/* Reducido tamaño de icono */}
            </button>
            
            {/* Cart - más compacto */}
            <button 
              onClick={onCartToggle}
              className="relative p-1.5 text-gray-300 hover:text-gray-200 transition-colors duration-200 hover:bg-gray-800 rounded-lg group"
              aria-label="Carrito de compras"
            >
              <ShoppingBag className="h-4 w-4" /> {/* Reducido tamaño de icono */}
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </button>

            {/* User Menu - más compacto */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-1.5 p-1.5 text-gray-300 hover:text-gray-200 transition-colors duration-200 hover:bg-gray-800 rounded-lg group"
                  aria-label="Menú de usuario"
                >
                  <User className="h-4 w-4" /> {/* Reducido tamaño de icono */}
                  <span className="hidden sm:block text-xs font-medium">
                    {user.name || user.email?.split('@')[0] || 'Usuario'}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/orders');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        <Package className="h-3.5 w-3.5 mr-1.5" />
                        Mis Pedidos
                      </button>
                      <button
                        onClick={() => {
                          navigate('/addresses');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        <User className="h-3.5 w-3.5 mr-1.5" />
                        Mis Direcciones
                      </button>
                      <button
                        onClick={() => {
                          navigate('/favorites');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        <Heart className="h-3.5 w-3.5 mr-1.5" />
                        Mis Favoritos
                      </button>
                      {!authLoading && canAccessAdmin() && (
                        <button
                          onClick={() => {
                            navigate('/admin');
                            setShowUserMenu(false);
                          }}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                        >
                          <Settings className="h-3.5 w-3.5 mr-1.5" />
                          Panel Admin
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5 mr-1.5" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLoginClick();
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white font-medium rounded-lg hover:bg-gray-800 transition-all duration-200"
                aria-label="Iniciar sesión"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:block">Iniciar Sesión</span>
              </button>
            )}

            {/* Mobile menu button - más compacto */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 text-gray-300 hover:text-gray-200 transition-colors duration-200 hover:bg-gray-800 rounded-lg"
              aria-label="Menú móvil"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile menu - más compacto */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-700">
            <nav className="flex flex-col space-y-1 py-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    handleCategoryClick(category.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    isHome && activeCategory === category.id
                      ? 'text-gray-300 bg-gray-800'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {category.id === 'all' ? 'Todo' : category.name}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;