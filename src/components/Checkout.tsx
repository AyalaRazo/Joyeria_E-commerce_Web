import React, { useState, useRef, useEffect } from 'react';
import { X, CreditCard, ArrowLeft, Check, Lock, Truck, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CartItem } from '../types';

interface CheckoutCartItem extends CartItem {
  name: string;
  variant_name?: string;
  image: string;
  category?: string;
} 

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  address_line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  items: CheckoutCartItem[];
  totalPrice: number;
  onOrderComplete: () => void;
  user: any;
  onAuthRequired: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({
  isOpen,
  onClose,
  items,
  totalPrice,
  onOrderComplete,
  user,
  onAuthRequired
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    address_line2: '',
    city: '',
    postalCode: '',
    country: 'México',
    state: '',
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Ref para evitar duplicados de purchase
  const lastPurchaseEventID = useRef<string | null>(null);

  // Check if user is authenticated when opening checkout
  useEffect(() => {
    if (isOpen && !user) {
      onAuthRequired();
      onClose();
    }
  }, [isOpen, user, onAuthRequired, onClose]);

  // Update email when user changes
  useEffect(() => {
    if (user?.email && !shippingAddress.email) {
      setShippingAddress(prev => ({
        ...prev,
        email: user.email
      }));
    }
  }, [user?.email]);

  // Disparar evento Purchase cuando se complete la orden
  useEffect(() => {
    if (orderCompleted && items.length > 0 && user) {
      const eventID = `purchase_${user.email || user.id}_${Date.now()}`;
      if (lastPurchaseEventID.current !== eventID) {
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            content_ids: items.map(item => item.id),
            content_type: items.length > 0 ? items[0].category : 'product',
            value: finalTotal,
            currency: 'MXN',
            num_items: items.reduce((acc, item) => acc + item.quantity, 0),
            eventID,
          });
          console.log('Meta Purchase event triggered:', { eventID, value: finalTotal });
        }
        lastPurchaseEventID.current = eventID;
      }
    }
    if (!orderCompleted) {
      lastPurchaseEventID.current = null;
    }
  }, [orderCompleted, items, totalPrice, user]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const shippingCost = 15;
  const taxRate = 0.16; // 16% IVA en México
  const tax = totalPrice * taxRate;
  const finalTotal = totalPrice + shippingCost + tax;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!shippingAddress.firstName.trim()) {
      errors.firstName = 'El nombre es requerido';
    }
    if (!shippingAddress.lastName.trim()) {
      errors.lastName = 'Los apellidos son requeridos';
    }
    if (!shippingAddress.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email)) {
      errors.email = 'El email no es válido';
    }
    if (!shippingAddress.phone.trim()) {
      errors.phone = 'El teléfono es requerido';
    } else if (!/^[0-9]{10}$/.test(shippingAddress.phone.replace(/\s+/g, ''))) {
      errors.phone = 'El teléfono debe tener 10 dígitos';
    }
    if (!shippingAddress.postalCode.trim()) {
      errors.postalCode = 'El código postal es requerido';
    } else if (!/^[0-9]{5}$/.test(shippingAddress.postalCode)) {
      errors.postalCode = 'El código postal debe tener 5 dígitos';
    }
    if (!shippingAddress.address.trim()) {
      errors.address = 'La colonia/fraccionamiento es requerida';
    }
    if (!shippingAddress.address_line2.trim()) {
      errors.address = 'La calle y numero es requerida';
    }
    if (!shippingAddress.city.trim()) {
      errors.city = 'El municipio es requerido';
    }
    if (!shippingAddress.state.trim()) {
      errors.state = 'El estado es requerido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setCurrentStep(2);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      // Validar que tenemos items en el carrito
      if (!items || items.length === 0) {
        throw new Error('No hay productos en el carrito');
      }

      // Validar que tenemos usuario
      if (!user || !user.id) {
        throw new Error('Usuario no autenticado');
      }

     // Validar items del carrito
    const validatedItems = items.map(item => {
      // Separar el ID compuesto si es necesario
      const [productId, variantIdStr] = item.id.toString().split('-');
      const productIdNum = parseInt(productId);
      const variantId = variantIdStr === 'base' ? null : parseInt(variantIdStr);
      
      return {
        id: item.id,
        product_id: productIdNum, // Parte antes del guión
        variant_id: variantId, // Parte después del guión (si existe)
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        image: item.image
      };
    });


      // Obtener sesión
    const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !authSession) {
      throw new Error(sessionError?.message || 'No hay sesión activa');
    }

    // Preparar payload
    const requestPayload = {
      cartItems: validatedItems,
      user: { 
        id: authSession.user.id,
        email: authSession.user.email
      },
      shipping: shippingAddress
    };

      console.log('Enviando a Supabase Edge:', requestPayload);

      // Llamar a la función Edge
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify(requestPayload)
      });
  
      // Verificar respuesta
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
  
      const result = await response.json();
      console.log('Respuesta de Supabase Edge:', result);
  
      // Verificar URL de Stripe
      if (!result.url) {
        throw new Error('No se recibió la URL de redirección de Stripe');
      }
  
      // Redirigir a Stripe
      window.location.assign(result.url);
    } catch (err: any) {
      console.error('Error al procesar el pago:', err);
      
      let errorMessage = 'Error desconocido';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      // Mostrar errores más específicos según el tipo
      if (errorMessage.includes('fetch')) {
        errorMessage = 'Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.';
      } else if (errorMessage.includes('JSON')) {
        errorMessage = 'Error en la respuesta del servidor. Por favor intenta nuevamente.';
      }

      // Mostrar error al usuario
      alert(`Error al procesar el pago: ${err instanceof Error ? err.message : 'Inténtalo de nuevo'}`);
      setIsProcessing(false);
    }
  };

  const handleOrderComplete = () => {
    onOrderComplete();
    onClose();
    setCurrentStep(1);
    setOrderCompleted(false);
    // Limpiar el formulario
    setShippingAddress({
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phone: '',
      address: '',
      address_line2: '',
      city: '',
      postalCode: '',
      country: 'México',
      state: '',
    });
  };

  if (!isOpen) return null;
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              {currentStep > 1 && !orderCompleted && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-300"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-400 hover:text-white" />
                </button>
              )}
              <h2 className="text-2xl font-bold text-white">
                {orderCompleted ? 'Pedido Confirmado' : 'Finalizar Compra'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-300"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row h-full max-h-[calc(90vh-80px)]">
            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {!orderCompleted && (
                <div className="flex items-center justify-center mb-8">
                  <div className="flex items-center space-x-4">
                    {[1, 2].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          currentStep >= step 
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' 
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {step}
                        </div>
                        {step < 2 && (
                          <div className={`w-16 h-1 mx-2 ${
                            currentStep > step ? 'bg-yellow-400' : 'bg-gray-700'
                          }`}></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
{/* Step 1: Shipping Address */}
              {currentStep === 1 && (
                <form onSubmit={handleShippingSubmit} className="space-y-6">
                  <h3 className="text-xl font-bold text-white mb-6">Información de Envío</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.firstName}
                        onChange={(e) => setShippingAddress({...shippingAddress, firstName: e.target.value})}
                        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors duration-300 ${
                          formErrors.firstName ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                        }`}
                        placeholder="Ingresa tu nombre"
                      />
                      {formErrors.firstName && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Apellidos *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.lastName}
                        onChange={(e) => setShippingAddress({...shippingAddress, lastName: e.target.value})}
                        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors duration-300 ${
                          formErrors.lastName ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                        }`}
                        placeholder="Ingresa tus apellidos"
                      />
                      {formErrors.lastName && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={shippingAddress.email}
                        readOnly
                        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors duration-300 ${
                          formErrors.email ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                        }`}
                        placeholder="tu@email.com"
                      />

                      {formErrors.email && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        required
                        value={shippingAddress.phone}
                        onChange={(e) => {
                          // Solo permitir números
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                            setShippingAddress({...shippingAddress, phone: value});
                          }
                        }}
                        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors duration-300 ${
                          formErrors.phone ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                        }`}
                        placeholder="5512345678"
                        maxLength={10}
                      />
                      {formErrors.phone && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Código Postal *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={shippingAddress.postalCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setShippingAddress({...shippingAddress, postalCode: value});
                        }}
                        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors duration-300 ${
                          formErrors.postalCode ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                        }`}
                        placeholder="12345"
                      />
                      {formErrors.postalCode && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.postalCode}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Colonia/Fraccionamiento *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.address}
                        onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors duration-300 ${
                          formErrors.address ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                        }`}
                        placeholder="Nombre de tu colonia"
                      />
                      {formErrors.address && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.address}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Calle y número
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.address_line2 || ''}
                      onChange={(e) => setShippingAddress({...shippingAddress, address_line2: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-yellow-400 focus:outline-none transition-colors duration-300"
                      placeholder="Calle Principal #123, Interior 4"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Municipio *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors duration-300 ${
                          formErrors.city ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                        }`}
                        placeholder="Tu municipio"
                      />
                      {formErrors.city && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.city}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Estado *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors duration-300 ${
                          formErrors.state ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                        }`}
                        placeholder="Tu estado"
                      />
                      {formErrors.state && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.state}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">País</label>
                    <input
                      type="text"
                      value="México"
                      readOnly
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-4 px-6 rounded-xl font-bold text-lg tracking-wide hover:shadow-lg hover:shadow-yellow-500/25 transition-all duration-300 transform hover:scale-105"
                  >
                    CONTINUAR AL PAGO
                  </button>
                </form>
              )}
{/* Step 2: Payment */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white mb-6">Método de Pago</h3>
                  
                  {/* Información de seguridad */}
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center mb-4">
                      <Shield className="h-6 w-6 text-green-400 mr-3" />
                      <h4 className="text-lg font-semibold text-white">Pago 100% Seguro</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 text-gray-400 mr-2" />
                        <span>Encriptación SSL</span>
                      </div>
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                        <span>Stripe Payments</span>
                      </div>
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 text-gray-400 mr-2" />
                        <span>Envío asegurado</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumen antes del pago */}
                  <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
                    <h4 className="text-lg font-semibold text-white mb-4">Resumen de tu pedido</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Subtotal ({items.reduce((acc, item) => acc + item.quantity, 0)} productos):</span>
                        <span className="text-white font-medium">{formatPrice(totalPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Envío:</span>
                        <span className="text-white font-medium">{formatPrice(shippingCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">IVA (16%):</span>
                        <span className="text-white font-medium">{formatPrice(tax)}</span>
                      </div>
                      <div className="border-t border-gray-600 pt-3">
                        <div className="flex justify-between text-lg">
                          <span className="font-bold text-white">Total:</span>
                          <span className="font-bold text-yellow-400">{formatPrice(finalTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dirección de envío confirmada */}
                  <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
                    <h4 className="text-lg font-semibold text-white mb-4">Enviar a:</h4>
                    <div className="text-sm text-gray-300 space-y-1">
                      <p className="font-medium text-white">{shippingAddress.firstName} {shippingAddress.lastName}</p>
                      <p>{shippingAddress.address}</p>
                      {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                      <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
                      <p>{shippingAddress.country}</p>
                      <p>Tel: {shippingAddress.phone}</p>
                    </div>
                  </div>

                  {/* Botón de pago */}
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="flex items-center mb-4">
                      <CreditCard className="h-8 w-8 text-yellow-400 mr-3" />
                      <span className="text-xl font-bold text-white">Pago con Tarjeta</span>
                    </div>
                    <p className="text-gray-300 mb-6 text-center max-w-md">
                      Serás redirigido a Stripe para completar tu pago de forma segura. 
                      Aceptamos Visa, Mastercard y American Express.
                    </p>
                    <button
                      onClick={handlePaymentSubmit}
                      disabled={isProcessing}
                      className="w-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black py-4 px-6 rounded-xl font-bold text-lg tracking-wide hover:shadow-lg hover:shadow-gray-400/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isProcessing ? 'Redirigiendo a Stripe...' : 'PAGAR'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Order Confirmation */}
              {currentStep === 3 && orderCompleted && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-10 w-10 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white">¡Pedido Confirmado!</h3>
                  <p className="text-gray-300 max-w-md mx-auto">
                    Tu pedido ha sido procesado exitosamente. Recibirás un email de confirmación con los detalles del envío.
                  </p>
                  
                  <div className="bg-gray-800 rounded-xl p-6 text-left">
                    <h4 className="font-bold text-white mb-4">Detalles del Pedido</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Número de Pedido:</span>
                        <span className="text-white font-mono">#LJ{Date.now().toString().slice(-6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="text-yellow-400 font-bold">{formatPrice(finalTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Envío a:</span>
                        <span className="text-white">{shippingAddress.city}, {shippingAddress.country}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleOrderComplete}
                    className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black py-3 px-8 rounded-xl font-bold text-lg tracking-wide hover:shadow-lg hover:shadow-gray-400/25 transition-all duration-300 transform hover:scale-105"
                  >
                    SEGUIR EXPLORANDO
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:w-96 bg-gray-800 p-6 border-l border-gray-700">
              <h3 className="text-lg font-bold text-white mb-6">Resumen del Pedido</h3>
              
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex space-x-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white line-clamp-2">{item.name}
                        {item.variant_name && (
                          <span className="block text-xs text-yellow-400 font-medium">{item.variant_name}</span>
                        )}
                      </h4>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-400">Cantidad: {item.quantity}</span>
                        <span className="text-sm font-bold text-yellow-400">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-600 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Envío:</span>
                  <span className="text-white">{formatPrice(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">IVA (21%):</span>
                  <span className="text-white">{formatPrice(tax)}</span>
                </div>
                <div className="border-t border-gray-600 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-white">Total:</span>
                    <span className="text-xl font-bold text-gray-300">{formatPrice(finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;