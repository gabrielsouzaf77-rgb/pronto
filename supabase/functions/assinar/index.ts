// Cria a assinatura mensal no Mercado Pago para o médico logado e devolve o link de pagamento.
// Precisa do segredo MP_ACCESS_TOKEN (Access Token da conta do Mercado Pago) no projeto.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const PRECO = 49.9;
const SITE = Deno.env.get('SITE_URL') ?? 'https://gabrielsouzaf77-rgb.github.io/pronto/';

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido.' });

  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return resposta(503, { erro: 'A assinatura ainda não está disponível. Avise quem te passou o Pronto.' });

  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await cliente.auth.getUser();
  if (error || !user?.email) return resposta(401, { erro: 'Entre na sua conta de novo.' });

  const mp = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      reason: 'Pronto · assinatura mensal',
      external_reference: user.id,
      payer_email: user.email,
      back_url: `${SITE}?assinatura=voltou`,
      status: 'pending',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: PRECO, currency_id: 'BRL' },
    }),
  });
  const dados = await mp.json().catch(() => ({}));
  if (!mp.ok || !dados.init_point) {
    console.error('assinar', mp.status, JSON.stringify(dados));
    return resposta(502, { erro: 'O Mercado Pago não respondeu como esperado. Tente de novo em instantes.' });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  await admin.from('contas').update({
    assinatura_id: dados.id,
    assinatura_status: 'pendente',
    assinatura_atualizada: new Date().toISOString(),
  }).eq('id', user.id).neq('assinatura_status', 'ativa');

  return resposta(200, { url: dados.init_point });
});
