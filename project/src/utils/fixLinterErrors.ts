// Archivo temporal para arreglar errores de linter
// TODO: Remover este archivo cuando se arreglen los errores

import { QueryClient } from '@tanstack/react-query';

export const fixInvalidateQueries = (queryClient: QueryClient, queryKey: string[]) => {
  return queryClient.invalidateQueries({ queryKey });
}; 