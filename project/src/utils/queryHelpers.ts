import { QueryClient } from '@tanstack/react-query';

export const invalidateReviewsQuery = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: ['reviews-home'] });
};

export const invalidateProductsQuery = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: ['products'] });
};

export const invalidateAllQueries = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries();
}; 