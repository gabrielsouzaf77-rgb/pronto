// Pergunta ao Mercado Pago como está a assinatura do médico logado e atualiza a conta.
// O app chama na volta do pagamento e ao abrir: assim a assinatura ativa aparece mesmo que o
// aviso (webhook) do Mercado Pago atrase ou não chegue.
import { admin, CORS, gravarAssinatura, mp, resposta, segredo, usuarioDaRequisicao } from '../_shared/mercadopago.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const user = await usuarioDaRequisicao(req);
  if (!user) return resposta(401, { erro: 'Entre na sua conta de novo.' });

  const { data: conta } = await admin().from('contas').select('assinatura_id, assinatura_status').eq('id', user.id).maybeSingle();
  if (!conta?.assinatura_id) return resposta(200, { assinatura: conta?.assinatura_status ?? 'nenhuma' });

  const token = await segredo('MP_ACCESS_TOKEN');
  if (!token) return resposta(200, { assinatura: conta.assinatura_status });

  const r = await mp(token, `/preapproval/${conta.assinatura_id}`);
  // Só aceita a resposta se a assinatura for mesmo deste médico.
  if (!r.ok || r.dados?.external_reference !== user.id) return resposta(200, { assinatura: conta.assinatura_status });

  const status = await gravarAssinatura(user.id, r.dados);
  return resposta(200, { assinatura: status });
});
