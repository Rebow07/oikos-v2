import { supabase } from './supabase';

export async function chamarIA(prompt: string, maxTokens = 300): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ia-proxy', {
    body: { prompt, maxTokens },
  });

  if (error) throw error;
  return data?.text || '';
}

export async function categorizarCSV(linhas: string[]): Promise<{ titulo: string; valor: number; categoria: string }[]> {
  const prompt = `Você é um categorizador financeiro. Recebeu linhas de um extrato bancário CSV.
Categorize cada linha em uma das categorias: compras, comida, mercado, transporte, combustivel, casa, saude, lazer, contas, educacao, viagem, beleza, eletronicos, pet, presente, restaurante, academia, streaming, outros.

Linhas:
${linhas.join('\n')}

Responda APENAS com JSON array. Cada item: {"titulo": "descrição limpa", "valor": número positivo, "categoria": "id_categoria"}
Sem texto extra, sem markdown.`;

  const resposta = await chamarIA(prompt, 1500);

  try {
    const clean = resposta.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}
