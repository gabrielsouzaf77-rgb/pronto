// Recebe os avisos do Mercado Pago sobre assinaturas e atualiza a conta do médico.
// Nunca confia no corpo do aviso: busca a assinatura na API do Mercado Pago com o nosso token.
// Se MP_WEBHOOK_SECRET estiver configurado, também confere a assinatura digital (x-signature).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const STATUS: Record<string, string> = {
  authorized: 'ativa',
  paused: 'pausada',
  cancelled: 'cancelada',
  pending: 'pendente',
};

async function assinaturaValida(req: Request, idDoAviso: string): Promise<boolean> {
  const segredo = Deno.env.get('MP_WEBHOOK_SECRET');
  if (!segredo) return true;
  const partes = Object.fromEntries((req.headers.get('x-signature') ?? '').split(',').map((p) => p.trim().split('=')));
  const manifesto = `id:${idDoAviso.toLowerCase()};request-id:${req.headers.get('x-request-id') ?? ''};ts:${partes.ts ?? ''};`;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const assinado = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifesto));
  const hex = [...new Uint8Array(assinado)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === partes.v1;
}

Deno.serve(async (req) => {
  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return new Response('sem token', { status: 503 });

  const url = new URL(req.url);
  const corpo = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const tipo = String(corpo.type ?? corpo.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '');
  const id = String(corpo.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');
  if (!id) return new Response('ok');
  if (!(await assinaturaValida(req, id))) return new Response('assinatura inválida', { status: 401 });

  const mp = (caminho: string) =>
    fetch(`https://api.mercadopago.com${caminho}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null);

  // Cobrança mensal: o aviso traz o pagamento; a situação vem da assinatura dona dele.
  let idAssinatura = '';
  if (tipo.includes('authorized_payment')) {
    const pagamento = await mp(`/authorized_payments/${id}`);
    idAssinatura = pagamento?.preapproval_id ?? '';
  } else if (tipo.includes('preapproval')) {
    idAssinatura = id;
  }
  if (!idAssinatura) return new Response('ok');

  const assinatura = await mp(`/preapproval/${idAssinatura}`);
  const conta = assinatura?.external_reference;
  if (!conta) return new Response('ok');

  const status = STATUS[assinatura.status] ?? 'pendente';
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.from('contas').update({
    assinatura_id: idAssinatura,
    assinatura_status: status,
    // Cancelou: continua liberado até o fim do que já pagou.
    assinatura_ate: status === 'cancelada' || status === 'pausada' ? assinatura.next_payment_date ?? null : null,
    assinatura_atualizada: new Date().toISOString(),
  }).eq('id', conta);
  if (error) {
    console.error('mp-webhook', error.message);
    return new Response('erro', { status: 500 });
  }
  return new Response('ok');
});
