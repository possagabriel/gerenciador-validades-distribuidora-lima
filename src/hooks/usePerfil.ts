import { useQuery } from '@tanstack/react-query';
import { client } from '../api/client';

export type Cargo = 'CAIXA' | 'ESTOQUISTA' | 'GERENTE' | 'ADMIN';
export interface Perfil {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  cpf: string;
  tipo_funcionario: Cargo;
  is_active: boolean;
}

export function usePerfil() {
  return useQuery({ queryKey: ['perfil'], queryFn: async () => (await client.get<Perfil>('usuarios/me/')).data });
}

export function podeGerenciar(papel: Cargo | undefined) {
  return papel === 'GERENTE' || papel === 'ADMIN';
}

export function podeEditarEstoque(papel: Cargo | undefined) {
  return papel === 'ESTOQUISTA' || podeGerenciar(papel);
}
