import { CATEGORIAS, CATEGORIAS_RECEITA } from '../constants';
import { getCategoriasCustom } from '../screens/CategoriasCustomScreen';

// Definição da interface de retorno do CSV analisado
export interface TransacaoImportada {
  titulo: string;
  data: string;
  valor: number;
  tipo: 'despesa' | 'renda';
  categoria: string;
}

export async function sugerirCategoriaTransacao(titulo: string, tipo: 'despesa' | 'renda' = 'despesa'): Promise<string> {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key) throw new Error('Chave API do Gemini não configurada no .env');

  const defaults = tipo === 'despesa' ? CATEGORIAS.map((c) => c.id) : CATEGORIAS_RECEITA.map((c) => c.id);
  const customs = tipo === 'despesa' ? (await getCategoriasCustom()).map((c) => c.id) : [];
  const catList = [...defaults, ...customs];

  const prompt = `Analise a transação com descrição: "${titulo}" (tipo: ${tipo}).
Sua tarefa é classificar essa transação APENAS com um dos IDs exatos das categorias permitidas abaixo.
Categorias permitidas: ${catList.join(', ')}.
Gere como resposta EXATAMENTE a palavra do ID escolhido (tudo minúsculo), sem pontuação, sem aspas, sem espaços extra.
Se nenhuma fizer sentido, escolha "outros".`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!res.ok) throw new Error(`Erro ${res.status}: API do Gemini falhou.`);
    const json = await res.json();

    let text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || 'outros';
    // Remove qualquer pontuação ou linhas extras
    text = text.replace(/[^a-z0-9_-]/g, '');

    if (catList.includes(text)) {
      return text;
    }
    return 'outros';
  } catch (error) {
    console.error('Falha na IA:', error);
    return 'outros'; // Fallback silencioso para não travar o app
  }
}

export async function analisarLoteCSV(textoCSV: string): Promise<TransacaoImportada[]> {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key) throw new Error('Chave API do Gemini não configurada no .env');

  const despesaCats = [...CATEGORIAS.map(c => c.id), ...(await getCategoriasCustom()).map(c=>c.id)];
  const rendaCats = CATEGORIAS_RECEITA.map(c => c.id);

  const prompt = `Você é um assistente financeiro de elite.
Vou te passar o conteúdo em texto bruto de um arquivo CSV de extrato bancário.
Sua missão é extrair as transações dele e formatá-las num array JSON estrito, sem usar Markdown, apenas o JSON bruto iniciando em [ e terminando em ].
Extraia: titulo da transação (limpe o titulo, deixe human-readable), data (formato YYYY-MM-DD), valor (numero positivo sempre), tipo ('despesa' ou 'renda').
Além disso, preveja a Categoria ideal. Se for despesa, use estritamente uma destas: [${despesaCats.join(', ')}]. Se for renda, use: [${rendaCats.join(', ')}]. Se não souber, use "outros".

O CSV:
"""
${textoCSV}
"""
Retorne SOMENTE o JSON array válido, no seguinte modelo:
[{"titulo": "Mercado X", "data": "2024-05-12", "valor": 120.50, "tipo": "despesa", "categoria": "mercado"}]
`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.1,
          responseMimeType: "application/json"
        },
      }),
    });

    if (!res.ok) throw new Error(`Erro ${res.status}: API do Gemini`);
    const json = await res.json();
    let textResult = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // As vezes a IA ainda embrulha em json
    if (textResult.startsWith('```json')) {
      textResult = textResult.replace(/```json\n?/, '').replace(/\n?```/, '');
    }

    const arrayData = JSON.parse(textResult);
    return arrayData;
  } catch (err: any) {
    console.error('Falha ao processar CSV via IA:', err);
    throw new Error('Falha ao usar a Inteligência Artificial para ler o CSV. Tente manualmente ou verifique as colunas.');
  }
}
