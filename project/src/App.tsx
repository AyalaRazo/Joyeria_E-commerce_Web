import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import Footer from './components/Footer';
import Auth from './components/Auth';
import { useCart } from './hooks/useCart';
import { useAuth } from './hooks/useAuth';
import { useProducts } from './hooks/useProducts';
import type { Product } from './types';
import ProductPage from './components/ProductPage';
import ResetPassword from './pages/ResetPassword';
import CheckoutSucessPage from './pages/Success';
import CheckoutCancelPage from './pages/Cancel';
import NewsletterForm from './components/NewsletterForm';
import UnsubscribePage from './pages/UnsubscribePage';
import AdminPanel from './components/AdminPanel';
import RequireUserAuth from './components/RequireUserAuth';
import RequireWorker from './components/RequireWorker';
import OrdersPage from './components/OrdersPage';
import UserAddresses from './components/UserAddresses';
import AboutUs from './pages/AboutUs';
import JewelryCare from './pages/JewelryCare';
import WarrantyPage from './pages/WarrantyPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ReturnsPolicy from './pages/ReturnsPolicy';
import InvoiceHelp from './pages/InvoiceHelp';
import FavoritesPage from './pages/FavoritesPage';
import ContactPage from './pages/ContactPage';
import JewelryTicker from './components/JewelryTicker';
import ReviewsSlider from './components/ReviewsSlider';


function App() {
  const {
    user,
    isAuthOpen,
    authMode,
    loading: authLoading,
    login,
    register,
    forgotPassword,
    logout,
    openAuth,
    closeAuth,
    setAuthMode
  } = useAuth();

  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getCartItemCount,
    clearCart
  } = useCart();

  const {
    products,
    categories,
    loading: productsLoading,
    error: productsError
  } = useProducts();

  const [activeCategory, setActiveCategory] = useState('all');
  const [showHero, setShowHero] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Scroll al inicio en cada cambio de ruta
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Escuchar eventos de cambio de modo de autenticación
  useEffect(() => {
    const handleAuthModeChange = (event: CustomEvent) => {
      setAuthMode(event.detail);
    };

    window.addEventListener('auth-mode-change', handleAuthModeChange as EventListener);
    
    return () => {
      window.removeEventListener('auth-mode-change', handleAuthModeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const savedCategory = localStorage.getItem('selectedCategory');
    if (savedCategory) {
      setActiveCategory(savedCategory);
      localStorage.removeItem('selectedCategory');
      
      setTimeout(() => {
        const grid = document.getElementById('product-grid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    
    if (location.pathname !== '/') {
      localStorage.setItem('selectedCategory', category);
      navigate('/');
    } else {
      const grid = document.getElementById('product-grid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleShopNow = () => {
    setShowHero(false);
    const grid = document.getElementById('product-grid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCheckout = () => {
    setIsCheckoutOpen(true);
    setIsCartOpen(false);
  };

  const handleOrderComplete = () => {
    setIsCheckoutOpen(false);
    clearCart();
  };

  const handleAuthRequired = () => {
    openAuth();
  };


  const handleAddToCart = async (product: Product, quantity: number = 1, variant?: any) => {
    try {
      await addToCart(product, quantity, variant);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleCartToggle = () => {
    setIsCartOpen(!isCartOpen);
  };

  const handleCartClose = () => {
    setIsCartOpen(false);
  };

  const handleUpdateQuantity = async (id: string | number, quantity: number) => {
    try {
      await updateQuantity(id, quantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleRemoveItem = async (id: string | number) => {
    try {
      await removeFromCart(id);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    
    const category = categories.find(c => 
      c.name.toLowerCase() === activeCategory.toLowerCase()
    );
    if (!category) return products;
    
    return products.filter(product => 
      product.category_id === category.id
    );
  }, [products, categories, activeCategory]);

  // Loading state simple
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <Header
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        onAddToCart={handleAddToCart}
        onCartToggle={handleCartToggle}
        cartItemCount={getCartItemCount()}
        user={user}
        onLoginClick={openAuth}
        onLogout={logout}
      />

      <Routes>
        <Route path="/" element={
          <main>
            {showHero && <Hero onShopNow={handleShopNow} />}

            <JewelryTicker />

            {/* Sección promo */}
            <section className="relative overflow-hidden mx-4 sm:mx-8 lg:mx-auto lg:max-w-6xl my-8 rounded-2xl">
              <img
                src="/images/promo-banner.jpg"
                alt="Promoción especial"
                className="w-full h-80 sm:h-[28rem] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent rounded-2xl" />
              <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-16">
                <p className="text-xs tracking-[0.35em] text-yellow-400 uppercase font-semibold mb-2">
                  Oferta especial
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                  Hasta 30% de descuento<br className="hidden sm:block" /> en piezas seleccionadas
                </h2>
                <p className="text-gray-300 text-sm sm:text-base max-w-md leading-relaxed">
                  Visita cualquiera de nuestras tres sucursales en Tijuana y Mexicali y aprovecha esta promoción por tiempo limitado.
                </p>
              </div>
            </section>

            <ProductGrid
              products={filteredProducts}
              onAddToCart={handleAddToCart}
              category={activeCategory}
              loading={productsLoading}
              error={productsError}
            />
            <ReviewsSlider />
            <div className="lg:w-4/6 lg:px-0 px-8 mx-auto py-16">
              <NewsletterForm />
            </div>
          </main>
        } />
        
        <Route path="/producto/:id" element={<ProductPage />} />
        
        <Route path="/cart" element={
          <Cart
            isOpen={true}
            onClose={() => navigate('/')}
            items={cartItems.map(item => ({
              ...item,
              name: item.product?.name || 'Producto',
              image: item.product?.image || '/default-product-image.png'
            }))}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            totalPrice={getCartTotal()}
            onCheckout={handleCheckout}
            user={user}
            onAuthRequired={handleAuthRequired}
          />
        } />
        
        
        
        <Route path="/orders" element={
          <RequireUserAuth>
            <OrdersPage />
          </RequireUserAuth>
        } />

        <Route path="/addresses" element={
          <RequireUserAuth>
            <UserAddresses />
          </RequireUserAuth>
        } />

        <Route path="/favorites" element={
          <RequireUserAuth>
            <FavoritesPage />
          </RequireUserAuth>
        } />
        
        <Route path="/admin" element={
          <RequireWorker>
            <AdminPanel />
          </RequireWorker>
        } />
        
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/success" element={<CheckoutSucessPage />} />
        <Route path="/cancel" element={<CheckoutCancelPage />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        <Route path="/sobre-nosotros" element={<AboutUs />} />
        <Route path="/cuidado-de-joyas" element={<JewelryCare />} />
        <Route path="/garantia" element={<WarrantyPage />} />
        <Route path="/privacidad" element={<PrivacyPolicy />} />
        <Route path="/terminos" element={<TermsOfService />} />
        <Route path="/devoluciones" element={<ReturnsPolicy />} />
        <Route path="/factura-tu-compra" element={<InvoiceHelp />} />
        <Route path="/contacto" element={<ContactPage />} />
      </Routes>

      <Cart
        isOpen={isCartOpen}
        onClose={handleCartClose}
        items={cartItems.map(item => ({
          ...item,
          name: item.product?.name || 'Producto',
          image: item.product?.image || '/default-product-image.png'
        }))}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        totalPrice={getCartTotal()}
        onCheckout={handleCheckout}
        user={user}
        onAuthRequired={handleAuthRequired}
      />

      <Checkout
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems.map(item => ({
          ...item,
          name: item.product?.name || 'Producto',
          image: item.product?.image || '/default-product-image.png',
          variant_name: item.variant?.name,
          category: item.product?.category?.name
        }))}
        totalPrice={getCartTotal()}
        onOrderComplete={handleOrderComplete}
        user={user}
        onAuthRequired={handleAuthRequired}
      />

<Auth
        isOpen={isAuthOpen}
        mode={authMode}
        onClose={closeAuth}
        onLogin={async (email: string, password: string) => {
          try {
            await login(email, password);
          } catch (error) {
            console.error('Login error:', error);
            throw error;
          }
        }}
        onRegister={async (email: string, password: string, name: string) => {
          try {
            await register(email, password, name);
          } catch (error) {
            console.error('Registration error:', error);
            throw error;
          }
        }}
        onForgotPassword={async (email: string) => {
          try {
            await forgotPassword(email);
          } catch (error) {
            console.error('Forgot password error:', error);
            throw error;
          }
        }}
        onSwitchMode={() => {
          // ✅ Usa setAuthMode directamente
          if (authMode === 'login') {
            setAuthMode('register');
          } else if (authMode === 'register') {
            setAuthMode('login');
          } else {
            setAuthMode('login');
          }
        }}
        loading={authLoading}
      />

      <Footer />
    </div>
  );
}

function AppWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

export default React.memo(AppWrapper);
