// Recebe os avisos do Mercado Pago sobre assinaturas e atualiza a conta do médico.
// Nunca confia no corpo do aviso: busca a assinatura na API do Mercado Pago com o nosso token.
// Se MP_WEBHOOK_SECRET existir, também confere a assinatura digital do aviso (x-signature).
import { gravarAssinatura, mp, segredo } from '../_shared/mercadopago.ts';

async function avisoAutentico(req: Request, idDoAviso: string): Promise<boolean> {
  const chaveSecreta = await segredo('MP_WEBHOOK_SECRET');
  if (!chaveSecreta) return true;
  const partes = Object.fromEntries((req.headers.get('x-signature') ?? '').split(',').map((p) => p.trim().split('=')));
  const manifesto = `id:${idDoAviso.toLowerCase()};request-id:${req.headers.get('x-request-id') ?? ''};ts:${partes.ts ?? ''};`;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(chaveSecreta), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const assinado = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifesto));
  const hex = [...new Uint8Array(assinado)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === partes.v1;
}

Deno.serve(async (req) => {
  const token = await segredo('MP_ACCESS_TOKEN');
  if (!token) return new Response('sem token', { status: 503 });

  const url = new URL(req.url);
  const corpo = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const tipo = String(corpo.type ?? corpo.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '');
  const id = String(corpo.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');
  if (!id) return new Response('ok');
  if (!(await avisoAutentico(req, id))) return new Response('assinatura inválida', { status: 401 });

  // Cobrança mensal: o aviso traz o pagamento; a situação vem da assinatura dona dele.
  let idAssinatura = '';
  if (tipo.includes('authorized_payment')) {
    const pagamento = await mp(token, `/authorized_payments/${id}`);
    idAssinatura = pagamento.dados?.preapproval_id ?? '';
  } else if (tipo.includes('preapproval')) {
    idAssinatura = id;
  }
  if (!idAssinatura) return new Response('ok');

  const assinatura = await mp(token, `/preapproval/${idAssinatura}`);
  const conta = assinatura.dados?.external_reference;
  if (!conta) return new Response('ok');

  try {
    await gravarAssinatura(conta, assinatura.dados);
  } catch (e) {
    console.error('mp-webhook', String(e));
    return new Response('erro', { status: 500 });
  }
  return new Response('ok');
});
