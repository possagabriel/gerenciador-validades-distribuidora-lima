import { useQuery } from '@tanstack/react-query';
import { buscarCodigoBarras, detalharProduto, paginaProdutos } from '../api/produtos';

export function useProdutos(search: string, page = 1) {
  return useQuery({ queryKey: ['produtos', search, page], queryFn: () => paginaProdutos(search, page) });
}

export function useProduto(id: number) {
  return useQuery({ queryKey: ['produto', id], queryFn: () => detalharProduto(id) });
}

export function useProdutoPorCodigo(codigo: string | null) {
  return useQuery({ queryKey: ['produto-codigo', codigo], queryFn: () => buscarCodigoBarras(codigo!), enabled: Boolean(codigo) });
}
