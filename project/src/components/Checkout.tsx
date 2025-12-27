import React, { useState, useRef, useEffect } from 'react';
import { X, CreditCard, ArrowLeft, Check, Lock, Truck, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CartItem } from '../types';
import { useAddresses } from '../hooks/useAddresses';
import type { UserAddress } from '../types';
import { buildMediaUrl } from '../utils/storage';

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
  const { addresses, loading: addressesLoading, create, load } = useAddresses();
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectionError, setSelectionError] = useState('');
  const [addressFeedback, setAddressFeedback] = useState('');
  
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

  useEffect(() => {
    if (!addressesLoading && addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find(a => a.is_default) || addresses[0];
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setShippingAddress({
          firstName: defaultAddress.name?.split(' ')[0] || '',
          lastName: defaultAddress.name?.split(' ').slice(1).join(' ') || '',
          email: user?.email || '',
          phone: defaultAddress.phone || '',
          address: defaultAddress.address_line1,
          address_line2: defaultAddress.address_line2 || '',
          city: defaultAddress.city,
          state: defaultAddress.state || '',
          postalCode: defaultAddress.postal_code || '',
          country: defaultAddress.country === 'MX' ? 'México' : (defaultAddress.country || 'México'),
        });
      }
    }
  }, [addresses, addressesLoading, selectedAddressId, user?.email]);

  useEffect(() => {
    if (isOpen) {
      load();
      setSelectionError('');
      setAddressFeedback('');
      setCurrentStep(1);
    }
  }, [isOpen, load]);

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

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelectionError('');
    setAddressFeedback('');

    if (addresses.length === 0) {
      if (!validateForm()) return;

      try {
        const createdAddress = await create({
          label: 'Casa',
          name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
          phone: shippingAddress.phone,
          address_line1: shippingAddress.address,
          address_line2: shippingAddress.address_line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postalCode,
          country: 'MX',
          is_default: true,
        } as Omit<UserAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>);

        setSelectedAddressId(createdAddress.id);
        setAddressFeedback('Dirección guardada. Revisa y continúa.');
      } catch (error) {
        console.error('Error guardando dirección:', error);
        setSelectionError('No pudimos guardar la dirección, intenta nuevamente.');
      }
      return;
    }

    if (!selectedAddressId) {
      setSelectionError('Selecciona una dirección para continuar.');
      return;
    }

    setCurrentStep(2);
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
    // Si se creó una nueva dirección, usar esa; si no, usar la seleccionada
    const finalAddressId = selectedAddressId;
    const finalAddressSnapshot = finalAddressId 
      ? (addresses.find(a => a.id === finalAddressId) || null)
      : null;
    
    const requestPayload = {
      cartItems: validatedItems,
      user: { 
        id: authSession.user.id,
        email: authSession.user.email
      },
      shipping: shippingAddress,
      selectedAddressId: finalAddressId,
      shipping_address_id: finalAddressId,
      shipping_snapshot: finalAddressSnapshot
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
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              {currentStep > 1 && !orderCompleted && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors duration-300"
                >
                  <ArrowLeft className="h-4 w-4 text-gray-400 hover:text-white" />
                </button>
              )}
              <h2 className="text-xl font-bold text-white">
                {orderCompleted ? 'Pedido Confirmado' : 'Finalizar Compra'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors duration-300"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-white" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row h-full max-h-[calc(85vh-60px)]">
            {/* Main Content */}
            <div className="flex-1 p-4 overflow-y-auto min-h-0">
              {!orderCompleted && (
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center space-x-3">
                    {[1, 2].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          currentStep >= step 
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' 
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {step}
                        </div>
                        {step < 2 && (
                          <div className={`w-12 h-1 mx-2 ${
                            currentStep > step ? 'bg-yellow-400' : 'bg-gray-700'
                          }`}></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectionError && (
                <p className="text-red-400 text-xs mb-2">{selectionError}</p>
              )}
              {addressFeedback && (
                <p className="text-green-400 text-xs mb-2">{addressFeedback}</p>
              )}

              {/* Step 1: Shipping Address */}
              {currentStep === 1 && (
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Información de Envío</h3>

                  {/* Selección de dirección guardada */}
                  {!addressesLoading && addresses.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <h4 className="text-white font-medium text-sm">Elige una dirección</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {addresses.map((a) => (
                          <label key={a.id} className={`cursor-pointer border rounded-lg p-3 bg-gray-800/60 border-gray-700 flex items-start space-x-2 ${selectedAddressId === a.id ? 'ring-1 ring-yellow-400' : ''}`}>
                            <input 
                              type="radio" 
                              name="address" 
                              className="mt-0.5" 
                              checked={selectedAddressId === a.id} 
                              onChange={() => {
                                setSelectedAddressId(a.id);
                                setSelectionError('');
                                setAddressFeedback('');
                                setShippingAddress({
                                  firstName: a.name?.split(' ')[0] || '',
                                  lastName: a.name?.split(' ').slice(1).join(' ') || '',
                                  email: user?.email || '',
                                  phone: a.phone || '',
                                  address: a.address_line1,
                                  address_line2: a.address_line2 || '',
                                  city: a.city,
                                  state: a.state || '',
                                  postalCode: a.postal_code || '',
                                  country: a.country === 'MX' ? 'México' : (a.country || 'México'),
                                });
                              }} 
                            />
                            <div className="text-xs">
                              <div className="flex items-center space-x-1">
                                <span className="text-white font-medium">{a.label || 'Dirección'}</span>
                                {a.is_default && <span className="text-xs text-yellow-400">(Predeterminada)</span>}
                              </div>
                              <div className="text-gray-300">{a.address_line1}</div>
                              {a.address_line2 && <div className="text-gray-400">{a.address_line2}</div>}
                              <div className="text-gray-400">{a.city}{a.state ? `, ${a.state}` : ''} {a.postal_code || ''}</div>
                              <div className="text-gray-500">{a.country || 'MX'} {a.phone ? `· ${a.phone}` : ''}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="text-xs text-gray-400">
                        Administra tus direcciones en
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            window.location.assign('/addresses');
                          }}
                          className="ml-1 text-yellow-400 hover:text-yellow-300 underline"
                        >
                          Mis Direcciones
                        </button>
                        (menú de usuario).
                      </div>
                    </div>
                  )}

                  {/* Si no hay direcciones, mostrar formulario para capturar */}
                  {addresses.length === 0 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Nombre *
                          </label>
                          <input
                            type="text"
                            required
                            value={shippingAddress.firstName}
                            onChange={(e) => setShippingAddress({...shippingAddress, firstName: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white focus:outline-none transition-colors duration-300 ${
                              formErrors.firstName ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                            }`}
                            placeholder="Ingresa tu nombre"
                          />
                          {formErrors.firstName && (
                            <p className="text-red-400 text-xs mt-0.5">{formErrors.firstName}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Apellidos *
                          </label>
                          <input
                            type="text"
                            required
                            value={shippingAddress.lastName}
                            onChange={(e) => setShippingAddress({...shippingAddress, lastName: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white focus:outline-none transition-colors duration-300 ${
                              formErrors.lastName ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                            }`}
                            placeholder="Ingresa tus apellidos"
                          />
                          {formErrors.lastName && (
                            <p className="text-red-400 text-xs mt-0.5">{formErrors.lastName}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={shippingAddress.email}
                            readOnly
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white focus:outline-none transition-colors duration-300 ${
                              formErrors.email ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                            }`}
                            placeholder="tu@email.com"
                          />
                          {formErrors.email && (
                            <p className="text-red-400 text-xs mt-0.5">{formErrors.email}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Teléfono *
                          </label>
                          <input
                            type="tel"
                            required
                            value={shippingAddress.phone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              if (value.length <= 10) {
                                setShippingAddress({...shippingAddress, phone: value});
                              }
                            }}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white focus:outline-none transition-colors duration-300 ${
                              formErrors.phone ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                            }`}
                            placeholder="5512345678"
                            maxLength={10}
                          />
                          {formErrors.phone && (
                            <p className="text-red-400 text-xs mt-0.5">{formErrors.phone}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
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
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white focus:outline-none transition-colors duration-300 ${
                              formErrors.postalCode ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                            }`}
                            placeholder="12345"
                          />
                          {formErrors.postalCode && (
                            <p className="text-red-400 text-xs mt-0.5">{formErrors.postalCode}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Colonia/Fraccionamiento *
                          </label>
                          <input
                            type="text"
                            required
                            value={shippingAddress.address}
                            onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white focus:outline-none transition-colors duration-300 ${
                              formErrors.address ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                            }`}
                            placeholder="Nombre de tu colonia"
                          />
                          {formErrors.address && (
                            <p className="text-red-400 text-xs mt-0.5">{formErrors.address}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Calle y número
                        </label>
                        <input
                          type="text"
                          value={shippingAddress.address_line2 || ''}
                          onChange={(e) => setShippingAddress({...shippingAddress, address_line2: e.target.value})}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors duration-300"
                          placeholder="Calle Principal #123, Interior 4"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Municipio *
                          </label>
                          <input
                            type="text"
                            required
                            value={shippingAddress.city}
                            onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white focus:outline-none transition-colors duration-300 ${
                              formErrors.city ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                            }`}
                            placeholder="Tu municipio"
                          />
                          {formErrors.city && (
                            <p className="text-red-400 text-xs mt-0.5">{formErrors.city}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Estado *
                          </label>
                          <input
                            type="text"
                            required
                            value={shippingAddress.state}
                            onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white focus:outline-none transition-colors duration-300 ${
                              formErrors.state ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-yellow-400'
                            }`}
                            placeholder="Tu estado"
                          />
                          {formErrors.state && (
                            <p className="text-red-400 text-xs mt-0.5">{formErrors.state}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">País</label>
                        <input
                          type="text"
                          value="México"
                          readOnly
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 cursor-not-allowed"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 px-4 rounded-lg font-bold text-sm tracking-wide hover:shadow-lg hover:shadow-yellow-500/25 transition-all duration-300 transform hover:scale-105"
                      >
                        GUARDAR DIRECCIÓN
                      </button>
                    </>
                  )}
                  {addresses.length > 0 && (
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 px-4 rounded-lg font-bold text-sm tracking-wide hover:shadow-lg hover:shadow-yellow-500/25 transition-all duration-300 transform hover:scale-105"
                    >
                      SELECCIONAR
                    </button>
                  )}
                </form>
              )}
              
              {/* Step 2: Payment */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Confirma tu pedido</h3>

                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-white mb-3">Resumen del pedido</h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {items.map(item => (
                        <div key={item.id} className="flex space-x-2">
                          <img
                            src={buildMediaUrl(item.image)}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium text-white line-clamp-2">
                              {item.name}
                              {item.variant_name && (
                                <span className="block text-xs text-yellow-400 font-medium">{item.variant_name}</span>
                              )}
                            </h4>
                            <div className="flex justify-between items-center mt-0.5">
                              <span className="text-xs text-gray-400">Cantidad: {item.quantity}</span>
                              <span className="text-xs font-bold text-yellow-400">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-600 pt-3 space-y-2 mt-3 text-xs">
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
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-600">
                        <span className="font-bold text-white">Total:</span>
                        <span className="font-bold text-yellow-400">{formatPrice(finalTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                    <h4 className="font-semibold text-white mb-3">Dirección de envío</h4>
                    <div className="text-xs text-gray-300 space-y-0.5">
                      <p className="font-medium text-white">{shippingAddress.firstName} {shippingAddress.lastName}</p>
                      <p>{shippingAddress.address}</p>
                      {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                      <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
                      <p>{shippingAddress.country}</p>
                      <p>Tel: {shippingAddress.phone}</p>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center mb-3">
                      <Shield className="h-5 w-5 text-green-400 mr-2" />
                      <h4 className="font-semibold text-white">Pago 100% Seguro</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-300 mb-4">
                      <div className="flex items-center">
                        <Lock className="h-3 w-3 text-gray-400 mr-1" />
                        <span>Encriptación SSL</span>
                      </div>
                      <div className="flex items-center">
                        <CreditCard className="h-3 w-3 text-gray-400 mr-1" />
                        <span>Stripe Payments</span>
                      </div>
                      <div className="flex items-center">
                        <Truck className="h-3 w-3 text-gray-400 mr-1" />
                        <span>Envío asegurado</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center py-3">
                      <p className="text-gray-300 mb-4 text-center text-xs max-w-md">
                        Serás redirigido a Stripe para completar tu pago de forma segura. 
                        Aceptamos Visa, Mastercard y American Express.
                      </p>
                      <button
                        onClick={handlePaymentSubmit}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black py-3 px-4 rounded-lg font-bold text-sm tracking-wide hover:shadow-lg hover:shadow-gray-400/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {isProcessing ? 'Redirigiendo a Stripe...' : 'CONTINUAR AL PAGO'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 3: Order Confirmation */}
              {currentStep === 3 && orderCompleted && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white">¡Pedido Confirmado!</h3>
                  <p className="text-gray-300 text-sm max-w-md mx-auto">
                    Tu pedido ha sido procesado exitosamente. Recibirás un email de confirmación con los detalles del envío.
                  </p>
                  
                  <div className="bg-gray-800 rounded-lg p-4 text-left">
                    <h4 className="font-bold text-white mb-3">Detalles del Pedido</h4>
                    <div className="space-y-1.5 text-xs">
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
                    className="bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black py-2.5 px-6 rounded-lg font-bold text-sm tracking-wide hover:shadow-lg hover:shadow-gray-400/25 transition-all duration-300 transform hover:scale-105"
                  >
                    SEGUIR EXPLORANDO
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:w-72 bg-gray-800 p-4 border-l border-gray-700">
              <h3 className="font-bold text-white mb-4">Resumen de Costos</h3>

              <div className="border-t border-gray-600 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Envío:</span>
                  <span className="text-white">{formatPrice(shippingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IVA (16%):</span>
                  <span className="text-white">{formatPrice(tax)}</span>
                </div>
                <div className="border-t border-gray-600 pt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-white">Total:</span>
                    <span className="font-bold text-gray-300">{formatPrice(finalTotal)}</span>
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