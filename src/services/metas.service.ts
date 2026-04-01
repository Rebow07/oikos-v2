import { supabase } from './supabase';
import type { Meta } from '../types';

export async function buscarMetas(grupoId: string, mes: number, ano: number): Promise<Meta[]> {
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('mes', mes)
    .eq('ano', ano);

  if (error) throw error;
  return (data as Meta[]) || [];
}

export async function salvarMeta(meta: Omit<Meta, 'id' | 'criado_em'> & { id?: string }): Promise<void> {
  const { error } = await supabase
    .from('metas')
    .upsert(
      {
        grupo_id: meta.grupo_id,
        criado_por: meta.criado_por,
        categoria: meta.categoria,
        valor_limite: meta.valor_limite,
        mes: meta.mes,
        ano: meta.ano,
      },
      { onConflict: 'grupo_id,categoria,mes,ano' },
    );
  if (error) throw error;
}

export async function excluirMeta(id: string): Promise<void> {
  const { error } = await supabase.from('metas').delete().eq('id', id);
  if (error) throw error;
}
