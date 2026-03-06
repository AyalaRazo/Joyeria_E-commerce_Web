import type { Product } from '../types';

/**
 * Devuelve true si el producto debe mostrarse como "NUEVO".
 * Requiere is_new = true y que new_until (si existe) no haya expirado.
 */
export const isProductNew = (product: Pick<Product, 'is_new' | 'new_until'>): boolean => {
  if (!product.is_new) return false;
  if (!product.new_until) return true;
  return new Date(product.new_until) > new Date();
};
