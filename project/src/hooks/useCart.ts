import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { CartItem, Product, ProductVariant } from '../types';

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para formatear los items del carrito
  const formatCartItem = (item: any): CartItem => ({
    id: item.id,
    cart_user_id: item.cart_user_id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    price: item.price,
    added_at: item.added_at,
    product: item.product ? {
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      original_price: item.product.original_price,
      image: item.product.image,
      description: item.product.description,
      material: item.product.material,
      in_stock: item.product.in_stock,
      is_new: item.product.is_new,
      is_featured: item.product.is_featured,
      created_at: item.product.created_at,
      updated_at: item.product.updated_at,
      category_id: item.product.category_id,
      stock: item.product.stock
    } : undefined,
    variant: item.variant ? {
      id: item.variant.id,
      product_id: item.variant.product_id,
      name: item.variant.name,
      price: item.variant.price,
      image: item.variant.image,
      model: item.variant.model,
      size: item.variant.size,
      stock: item.variant.stock,
      original_price: item.variant.original_price
    } : undefined
  });

  // Función auxiliar para sincronizar cart_items con el carrito JSON
  const syncCartItemsWithJson = useCallback(async (currentItems: any[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Primero eliminar todos los elementos existentes en cart_items para este usuario
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_user_id', user.id);

      // Si hay items del carrito JSON, insertarlos en cart_items
      if (currentItems.length > 0) {
        const cartItemsData = currentItems.map((item: any) => ({
          cart_user_id: user.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          price: item.price,
          added_at: item.added_at
        }));

        const { error: insertError } = await supabase
          .from('cart_items')
          .insert(cartItemsData);

        if (insertError) {
          console.error('Error inserting cart_items:', insertError);
        }
      }
    } catch (err) {
      console.error('Error syncing cart_items:', err);
    }
  }, []);

  // Cargar items del carrito
  const loadCartItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCartItems([]);
        return;
      }

      // Obtener el carrito del usuario
      const { data: cartData, error: cartError } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user.id)
        .single();

      if (cartError && cartError.code !== 'PGRST116') {
        throw cartError;
      }

      // Si no hay carrito o no hay items, retornar array vacío
      if (!cartData || !cartData.items) {
        setCartItems([]);
        return;
      }

      // Los items ya están en formato JSON, solo necesitamos formatearlos
      const formattedData = cartData.items.map((item: any) => formatCartItem(item));
      setCartItems(formattedData);
    } catch (err) {
      console.error('Error loading cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, []);

  // Agregar item al carrito
  const addToCart = useCallback(async (
    product: Product, 
    quantity: number = 1, 
    variant?: ProductVariant
  ) => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to add items to cart');
      }

      const stock = variant?.stock ?? product.stock ?? 0;
      if (stock <= 0) {
        throw new Error('This product is out of stock');
      }

      // Obtener el carrito actual
      const { data: currentCart, error: cartError } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user.id)
        .single();

      let currentItems = [];
      if (cartError && cartError.code !== 'PGRST116') {
        throw cartError;
      }
      if (currentCart && currentCart.items) {
        currentItems = currentCart.items;
      }

      // Buscar si el item ya existe usando el ID compuesto
      const itemId = `${product.id}-${variant?.id || 'base'}`;
      const existingItemIndex = currentItems.findIndex((item: any) => 
        item.id === itemId
      );

      if (existingItemIndex !== -1) {
        // Actualizar cantidad del item existente
        currentItems[existingItemIndex].quantity += quantity;
      } else {
        // Crear nuevo item
        const newItem = {
          id: `${product.id}-${variant?.id || 'base'}`, // ID compuesto para identificar únicamente
          cart_user_id: user.id,
          product_id: product.id,
          variant_id: variant?.id ?? null,
          quantity,
          price: variant?.price ?? product.price,
          added_at: new Date().toISOString(),
          product: {
            id: product.id,
            name: product.name,
            price: variant?.price ?? product.price,
            original_price: product.original_price,
            image: variant?.image || product.image,
            description: product.description,
            material: product.material,
            in_stock: product.in_stock,
            is_new: product.is_new,
            is_featured: product.is_featured,
            created_at: product.created_at,
            updated_at: product.updated_at,
            category_id: product.category_id,
            stock: product.stock
          },
          variant: variant ? {
            id: variant.id,
            user_id: variant.product_id,
            name: variant.name,
            price: variant.price,
            image: variant.image,
            model: variant.model,
            size: variant.size,
            stock: variant.stock,
            original_price: variant.original_price
          } : undefined
        };
        currentItems.unshift(newItem);
      }

      // Actualizar el estado local inmediatamente para feedback visual
      const formattedItems = currentItems.map((item: any) => formatCartItem(item));
      setCartItems(formattedItems);

      // Actualizar el carrito en la base de datos
      const { error: updateError } = await supabase
        .from('carts')
        .upsert({
          user_id: user.id,
          items: currentItems,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        // Si hay error, revertir el estado local
        loadCartItems();
        throw updateError;
      }

      // Sincronizar con la tabla cart_items
      await syncCartItemsWithJson(currentItems);

      return currentItems[existingItemIndex !== -1 ? existingItemIndex : 0];
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
      throw err;
    }
  }, [loadCartItems, syncCartItemsWithJson]);


  // Remover item del carrito
  const removeFromCart = useCallback(async (itemId: string | number) => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Obtener el carrito actual
      const { data: currentCart, error: cartError } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user.id)
        .single();

      if (cartError) throw cartError;

      let currentItems = currentCart?.items || [];
      
      // Remover el item
      currentItems = currentItems.filter((item: any) => item.id !== itemId.toString());

      // Actualizar el estado local inmediatamente
      const formattedItems = currentItems.map((item: any) => formatCartItem(item));
      setCartItems(formattedItems);

      // Actualizar el carrito en la base de datos
      const { error: updateError } = await supabase
        .from('carts')
        .upsert({
          user_id: user.id,
          items: currentItems,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        // Si hay error, revertir el estado local
        loadCartItems();
        throw updateError;
      }

      // Sincronizar con la tabla cart_items
      await syncCartItemsWithJson(currentItems);
    } catch (err) {
      console.error('Error removing item:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove item');
      loadCartItems();
      throw err;
    }
  }, [loadCartItems, syncCartItemsWithJson]);

  // Actualizar cantidad de un item
  const updateQuantity = useCallback(async (itemId: string | number, quantity: number) => {
    try {
      setError(null);
      
      if (quantity <= 0) {
        // Si la cantidad es 0 o menor, remover el item directamente
        return await removeFromCart(itemId);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Obtener el carrito actual
      const { data: currentCart, error: cartError } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user.id)
        .single();

      if (cartError) throw cartError;

      let currentItems = currentCart?.items || [];
      
      // Actualizar la cantidad del item
      const itemIndex = currentItems.findIndex((item: any) => item.id === itemId.toString());
      if (itemIndex !== -1) {
        currentItems[itemIndex].quantity = quantity;
      }

      // Actualizar el estado local inmediatamente
      const formattedItems = currentItems.map((item: any) => formatCartItem(item));
      setCartItems(formattedItems);

      // Actualizar el carrito en la base de datos
      const { error: updateError } = await supabase
        .from('carts')
        .upsert({
          user_id: user.id,
          items: currentItems,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        // Si hay error, revertir el estado local
        loadCartItems();
        throw updateError;
      }

      // Sincronizar con la tabla cart_items
      await syncCartItemsWithJson(currentItems);
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quantity');
      loadCartItems();
      throw err;
    }
  }, [loadCartItems, syncCartItemsWithJson, removeFromCart]);

  // Limpiar el carrito completamente
  const clearCart = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Eliminar todos los elementos de la tabla cart_items para este usuario
      const { error: deleteCartItemsError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_user_id', user.id);

      if (deleteCartItemsError) {
        console.error('Error deleting cart_items:', deleteCartItemsError);
      }

      // Actualizar el carrito en la base de datos con items vacíos
      const { error: updateError } = await supabase
        .from('carts')
        .upsert({
          user_id: user.id,
          items: [],
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      // Actualizar el estado local
      setCartItems([]);
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
      loadCartItems();
      throw err;
    }
  }, [loadCartItems]);

  // Efecto para cargar el carrito al montar y cuando cambia el usuario
  useEffect(() => {
    const authListener = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadCartItems();
      }
    });

    loadCartItems();

    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, [loadCartItems]);

  // Efecto para actualizar el carrito cuando cambia el estado local
  useEffect(() => {
    // Forzar re-render cuando cambian los items del carrito
    const timeoutId = setTimeout(() => {
      // Este efecto se ejecuta cada vez que cartItems cambia
      // No necesitamos hacer nada específico aquí, solo que se ejecute
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [cartItems]);

  // Efecto para escuchar eventos de actualización del carrito
  useEffect(() => {
    const handleCartUpdate = () => {
      // Forzar recarga del carrito cuando se dispara el evento
      loadCartItems();
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, [loadCartItems]);

  return {
    cartItems,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal: () => cartItems.reduce((total, item) => total + (item.price * item.quantity), 0),
    getCartItemCount: () => cartItems.reduce((count, item) => count + item.quantity, 0),
    loadCartItems,
    cartCount: cartItems.reduce((count, item) => count + item.quantity, 0),
    cartTotal: cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  };
};