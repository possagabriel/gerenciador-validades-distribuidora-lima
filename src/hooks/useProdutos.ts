import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { buscarCodigoBarras, detalharProduto, listarProdutos } from '../api/produtos';

export function useProdutos(search: string) {
  return useInfiniteQuery({
    queryKey: ['produtos', search],
    initialPageParam: 'produtos/',
    queryFn: ({ pageParam }) => listarProdutos(search, pageParam),
    getNextPageParam: page => page.next ?? undefined,
  });
}

export function useProduto(id: number) {
  return useQuery({ queryKey: ['produto', id], queryFn: () => detalharProduto(id) });
}

export function useProdutoPorCodigo(codigo: string | null) {
  return useQuery({ queryKey: ['produto-codigo', codigo], queryFn: () => buscarCodigoBarras(codigo!), enabled: Boolean(codigo) });
}
