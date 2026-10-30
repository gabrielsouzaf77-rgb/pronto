// Cancela a assinatura do médico logado, pelo próprio Pronto (o CDC pede cancelamento pelo mesmo
// canal da contratação). O acesso continua até o fim do período já pago.
import { admin, CORS, gravarAssinatura, mp, resposta, segredo, usuarioDaRequisicao } from '../_shared/mercadopago.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido.' });

  const user = await usuarioDaRequisicao(req);
  if (!user) return resposta(401, { erro: 'Entre na sua conta de novo.' });

  const { data: conta } = await admin().from('contas').select('assinatura_id, assinatura_status').eq('id', user.id).maybeSingle();
  if (!conta?.assinatura_id || conta.assinatura_status === 'cancelada') return resposta(200, { assinatura: conta?.assinatura_status ?? 'nenhuma' });

  const token = await segredo('MP_ACCESS_TOKEN');
  if (!token) return resposta(503, { erro: 'Não foi possível cancelar agora. Fale com o suporte do Pronto.' });

  // A data da próxima cobrança é o fim do período pago; o Mercado Pago apaga depois do cancelamento.
  const antes = await mp(token, `/preapproval/${conta.assinatura_id}`);
  if (!antes.ok || antes.dados?.external_reference !== user.id) return resposta(404, { erro: 'Assinatura não encontrada.' });
  const ate = antes.dados.next_payment_date ?? null;

  const r = await mp(token, `/preapproval/${conta.assinatura_id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
  if (!r.ok) {
    console.error('cancelar-assinatura', r.status, JSON.stringify(r.dados));
    return resposta(502, { erro: 'O Mercado Pago não confirmou o cancelamento. Tente de novo em instantes.' });
  }
  const status = await gravarAssinatura(user.id, { ...r.dados, id: conta.assinatura_id, status: 'cancelled' }, ate);
  return resposta(200, { assinatura: status, ate });
});
