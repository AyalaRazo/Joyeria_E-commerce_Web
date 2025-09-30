import { QueryClient } from '@tanstack/react-query';

export const invalidateReviewsQuery = (queryClient: QueryClient) => {
  return queryClient.invalidateQueries({ queryKey: ['reviews-home'] });
};

export const invalidateQueries = (queryClient: QueryClient, queryKeys: string[]) => {
  return queryClient.invalidateQueries({ queryKey: queryKeys });
}; 