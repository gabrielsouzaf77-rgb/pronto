// Exclui a conta do médico logado e tudo dela (configurações e contagem de uso), como a LGPD garante.
// Antes, cancela a assinatura no Mercado Pago, para não continuar cobrando de quem saiu.
import { admin, CORS, mp, resposta, segredo, usuarioDaRequisicao } from '../_shared/mercadopago.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido.' });

  const user = await usuarioDaRequisicao(req);
  if (!user) return resposta(401, { erro: 'Entre na sua conta de novo.' });

  const { data: conta } = await admin().from('contas').select('assinatura_id, assinatura_status').eq('id', user.id).maybeSingle();
  if (conta?.assinatura_id && conta.assinatura_status !== 'cancelada') {
    const token = await segredo('MP_ACCESS_TOKEN');
    const r = token ? await mp(token, `/preapproval/${conta.assinatura_id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) }) : { ok: false };
    // Pendente que nunca foi paga pode falhar no cancelamento sem problema; ativa não pode ficar cobrando.
    if (!r.ok && conta.assinatura_status === 'ativa') {
      return resposta(502, { erro: 'Não foi possível cancelar a assinatura antes de excluir. Tente de novo ou fale com o suporte.' });
    }
  }

  // Apagar o usuário apaga em cascata contas, dados e usos.
  const { error } = await admin().auth.admin.deleteUser(user.id);
  if (error) {
    console.error('excluir-conta', error.message);
    return resposta(500, { erro: 'Não foi possível excluir agora. Tente de novo em instantes.' });
  }
  return resposta(200, { ok: true });
});
