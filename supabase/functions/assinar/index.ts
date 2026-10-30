// Cria a assinatura mensal no Mercado Pago para o médico logado e devolve o link de pagamento.
// O token do Mercado Pago vem do segredo MP_ACCESS_TOKEN (ambiente ou privado.config).
import { admin, CORS, mp, resposta, segredo, usuarioDaRequisicao } from '../_shared/mercadopago.ts';

const PRECO = 49.9;
const SITE = Deno.env.get('SITE_URL') ?? 'https://gabrielsouzaf77-rgb.github.io/pronto/';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido.' });

  const token = await segredo('MP_ACCESS_TOKEN');
  if (!token) return resposta(503, { erro: 'A assinatura ainda não está disponível. Fale com o suporte do Pronto.' });

  const user = await usuarioDaRequisicao(req);
  if (!user?.email) return resposta(401, { erro: 'Entre na sua conta de novo.' });

  const r = await mp(token, '/preapproval', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      reason: 'Pronto · assinatura mensal',
      external_reference: user.id,
      payer_email: user.email,
      back_url: `${SITE}?assinatura=voltou`,
      status: 'pending',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: PRECO, currency_id: 'BRL' },
    }),
  });
  if (!r.ok || !r.dados?.init_point) {
    console.error('assinar', r.status, JSON.stringify(r.dados));
    return resposta(502, { erro: 'O Mercado Pago não respondeu como esperado. Tente de novo em instantes.' });
  }

  await admin().from('contas').update({
    assinatura_id: r.dados.id,
    assinatura_status: 'pendente',
    assinatura_atualizada: new Date().toISOString(),
  }).eq('id', user.id).neq('assinatura_status', 'ativa');

  return resposta(200, { url: r.dados.init_point });
});
