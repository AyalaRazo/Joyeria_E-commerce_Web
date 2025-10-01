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
import RequireAuth from './components/RequireAuth';
import PurchasedProducts from './components/PurchasedProducts';

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
    loading: cartLoading,
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
    loading: productsLoading
  } = useProducts();

  const [activeCategory, setActiveCategory] = useState('all');
  const [showHero, setShowHero] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastSelectedCategory, setLastSelectedCategory] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Debug para ver cambios en el estado del modal
  useEffect(() => {
    console.log('Estado del modal de autenticación:', isAuthOpen);
  }, [isAuthOpen]);

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
      setLastSelectedCategory(savedCategory);
      localStorage.removeItem('selectedCategory');
      
      setTimeout(() => {
        const grid = document.getElementById('product-grid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setLastSelectedCategory(category);
    
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
    console.log('Autenticación requerida - abriendo modal');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <Header
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        products={products}
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
            <ProductGrid
              products={filteredProducts}
              onAddToCart={handleAddToCart}
              category={activeCategory}
              loading={productsLoading}
            />
            <div className="lg:w-3/4 mx-auto">
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
        
        
        <Route path="/purchased" element={
          <RequireAuth>
            <PurchasedProducts />
          </RequireAuth>
        } />
        
        <Route path="/admin" element={
          <RequireAuth>
            <AdminPanel />
          </RequireAuth>
        } />
        
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/success" element={<CheckoutSucessPage />} />
        <Route path="/cancel" element={<CheckoutCancelPage />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
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

export default AppWrapper;