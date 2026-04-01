import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Transacao } from '../types';
import { formatarMoeda, formatarData } from '../utils';
import { CATEGORIAS, CATEGORIAS_RECEITA } from '../constants';

export async function exportarRelatorioPDF(
  transacoes: Transacao[],
  mes: number,
  ano: number,
  nomeUsuario: string
): Promise<void> {
  const despesas = transacoes.filter((t) => t.tipo === 'despesa');
  const receitas = transacoes.filter((t) => t.tipo === 'renda');

  const totalDespesas = despesas.reduce((acc, t) => acc + t.valor, 0);
  const totalReceitas = receitas.reduce((acc, t) => acc + t.valor, 0);
  const saldoFinal = totalReceitas - totalDespesas;

  // Agrupar despesas por categoria
  const categoriasGasto: Record<string, number> = {};
  despesas.forEach((d) => {
    categoriasGasto[d.categoria] = (categoriasGasto[d.categoria] || 0) + d.valor;
  });

  const catRows = Object.entries(categoriasGasto)
    .sort((a, b) => b[1] - a[1])
    .map(([catId, total]) => {
      const catDef = CATEGORIAS.find((c) => c.id === catId) || { label: catId, cor: '#95A5A6' };
      return `
        <tr>
          <td style="color: ${catDef.cor}; font-weight: bold;">${catDef.label}</td>
          <td style="text-align: right;">${formatarMoeda(total)}</td>
        </tr>
      `;
    })
    .join('');

  const transRows = transacoes
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .map((t) => {
      const isDesp = t.tipo === 'despesa';
      const cor = isDesp ? '#E74C3C' : '#27AE60';
      const sinal = isDesp ? '-' : '+';
      const catDef = (isDesp ? CATEGORIAS : CATEGORIAS_RECEITA).find((c) => c.id === t.categoria)?.label || t.categoria;
      
      return `
        <tr>
          <td>${formatarData(t.data)}</td>
          <td><b>${t.titulo}</b><br><small style="color: #7f8c8d;">${catDef}</small></td>
          <td style="text-align: right; color: ${cor}; font-weight: bold;">
            ${sinal} ${formatarMoeda(t.valor)}
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Relatório Financeiro</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #2C3E50; margin-bottom: 5px; }
          p { margin: 0; color: #7f8c8d; font-size: 14px; }
          .summary { display: flex; justify-content: space-between; margin-top: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; }
          .box { text-align: center; }
          .box h3 { margin: 0; font-size: 14px; color: #95a5a6; text-transform: uppercase; }
          .box p { font-size: 24px; font-weight: bold; margin-top: 5px; color: #2c3e50; }
          .box .green { color: #27ae60; }
          .box .red { color: #e74c3c; }
          h2 { margin-top: 40px; color: #34495e; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #ecf0f1; color: #7f8c8d; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; }
          td { padding: 12px; border-bottom: 1px solid #ecf0f1; font-size: 14px; }
          .footer { margin-top: 50px; text-align: center; color: #bdc3c7; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Resumo Financeiro</h1>
        <p>Referência: ${mes.toString().padStart(2, '0')}/${ano}</p>
        <p>Gerado por: ${nomeUsuario}</p>

        <div class="summary">
          <div class="box">
            <h3>Receitas</h3>
            <p class="green">+ ${formatarMoeda(totalReceitas)}</p>
          </div>
          <div class="box">
            <h3>Despesas</h3>
            <p class="red">- ${formatarMoeda(totalDespesas)}</p>
          </div>
          <div class="box">
            <h3>Saldo</h3>
            <p style="color: ${saldoFinal >= 0 ? '#27ae60' : '#e74c3c'}">
              ${formatarMoeda(saldoFinal)}
            </p>
          </div>
        </div>

        <h2>Gastos por Categoria</h2>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th style="text-align: right;">Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${catRows || '<tr><td colspan="2" style="text-align: center;">Nenhuma despesa registrada.</td></tr>'}
          </tbody>
        </table>

        <h2>Extrato de Transações</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th style="text-align: right;">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${transRows || '<tr><td colspan="3" style="text-align: center;">Nenhuma movimentação.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Gerado automaticamente pelo aplicativo Oikos Family.
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exportar Relatório PDF',
        UTI: 'com.adobe.pdf',
      });
    } else {
      console.warn('O compartilhamento não está disponível neste dispositivo.');
    }
  } catch (error) {
    console.error('Erro ao gerar/compartilhar PDF:', error);
    throw error;
  }
}
