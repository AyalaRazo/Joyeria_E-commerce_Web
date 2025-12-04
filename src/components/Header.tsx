import React, { useState } from 'react';
import { ShoppingBag, Search, Menu, Package, User, LogOut, Settings } from 'lucide-react';
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
    <header className="bg-gradient-to-r from-black via-gray-900 to-black shadow-2xl sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => {
              onCategoryChange('all');
              if (!isHome) navigate('/');
            }}
          >
            
            <div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-transparent">
                Joyeria
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex space-x-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`px-4 py-2 text-sm font-medium tracking-wide transition-all duration-300 relative group ${
                  isHome && activeCategory === category.id
                    ? 'text-gray-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {category.id === 'all' ? 'Todo' : category.name}
                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-gray-300 to-gray-500 transform transition-transform duration-300 ${
                  isHome && activeCategory === category.id ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}></span>
              </button>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-gray-300 hover:text-gray-200 transition-colors duration-300 hover:bg-gray-800 rounded-lg group"
              aria-label="Buscar productos"
            >
              <Search className="h-5 w-5" />
            </button>
            
            {/* Cart */}
            <button 
              onClick={onCartToggle}
              className="relative p-2 text-gray-300 hover:text-gray-200 transition-colors duration-300 hover:bg-gray-800 rounded-lg group"
              aria-label="Carrito de compras"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 text-gray-300 hover:text-gray-200 transition-colors duration-300 hover:bg-gray-800 rounded-lg group"
                  aria-label="Menú de usuario"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:block text-sm font-medium">
                    {user.name || user.email?.split('@')[0] || 'Usuario'}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/orders');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Mis Pedidos
                      </button>
                    <button
                      onClick={() => {
                        navigate('/addresses');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Mis Direcciones
                    </button>
                      {!authLoading && canAccessAdmin() && (
                        <button
                          onClick={() => {
                            navigate('/admin');
                            setShowUserMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Panel Admin
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
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
                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white font-medium rounded-lg hover:bg-gray-800 transition-all duration-300"
                aria-label="Iniciar sesión"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:block">Iniciar Sesión</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-gray-200 transition-colors duration-300 hover:bg-gray-800 rounded-lg"
              aria-label="Menú móvil"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-700">
            <nav className="flex flex-col space-y-2 py-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    handleCategoryClick(category.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 text-left text-sm font-medium transition-colors ${
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