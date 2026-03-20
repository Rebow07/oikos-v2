// @ts-nocheck
// Edge Function — roda no Deno (Supabase), não no Node/Expo
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = (globalThis as any).Deno?.env?.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada. Vá em Supabase > Edge Functions > Secrets e adicione a chave.");
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new Error("Body da requisição inválido (não é JSON válido).");
    }

    const { email, mes, ano, despesas, receitas, saldo, pago, apagar, categorias } = body;

    if (!email) {
      throw new Error("Email não informado");
    }

    const categoriasHtml = (categorias || [])
      .slice(0, 10)
      .map((c: any) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${c.categoria}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">R$ ${Number(c.valor).toFixed(2)}</td></tr>`)
      .join("");

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:20px;margin:0">
      <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
        <div style="background:#000;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:8px">OIKOS</h1>
          <p style="color:rgba(255,255,255,0.4);margin:4px 0 0;font-size:11px;letter-spacing:5px">FAMILY</p>
        </div>
        <div style="padding:24px">
          <h2 style="margin:0 0 20px;color:#333;font-size:18px">Relatório de ${mes}/${ano}</h2>
          <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:12px">
            <span style="color:#666;font-size:13px">Receitas</span>
            <div style="color:#16a34a;font-size:22px;font-weight:bold">R$ ${Number(receitas || 0).toFixed(2)}</div>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:12px">
            <span style="color:#666;font-size:13px">Despesas</span>
            <div style="color:#dc2626;font-size:22px;font-weight:bold">R$ ${Number(despesas || 0).toFixed(2)}</div>
          </div>
          <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin-bottom:12px">
            <span style="color:#666;font-size:13px">Saldo</span>
            <div style="color:${Number(saldo || 0) >= 0 ? '#16a34a' : '#dc2626'};font-size:22px;font-weight:bold">R$ ${Number(saldo || 0).toFixed(2)}</div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:20px">
            <div style="flex:1;background:#f5f5f5;border-radius:8px;padding:12px;text-align:center">
              <div style="color:#666;font-size:11px">Pago</div>
              <div style="color:#16a34a;font-weight:bold">R$ ${Number(pago || 0).toFixed(2)}</div>
            </div>
            <div style="flex:1;background:#f5f5f5;border-radius:8px;padding:12px;text-align:center">
              <div style="color:#666;font-size:11px">A pagar</div>
              <div style="color:#dc2626;font-weight:bold">R$ ${Number(apagar || 0).toFixed(2)}</div>
            </div>
          </div>
          ${categoriasHtml ? `
          <h3 style="margin:20px 0 12px;color:#333;font-size:15px">Top categorias</h3>
          <table style="width:100%;border-collapse:collapse">${categoriasHtml}</table>
          ` : ""}
          <p style="color:#999;font-size:11px;margin-top:24px;text-align:center">Enviado automaticamente pelo Oikos Family</p>
        </div>
      </div>
    </body>
    </html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Oikos Family <onboarding@resend.dev>",
        to: [email],
        subject: `Relatório Financeiro - ${mes}/${ano} | Oikos Family`,
        html: html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", JSON.stringify(resendData));
      const errorMsg = resendData.message || resendData.name || `HTTP ${resendRes.status}`;
      throw new Error(`Erro Resend: ${errorMsg}`);
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Edge function error:", error?.message);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro desconhecido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});