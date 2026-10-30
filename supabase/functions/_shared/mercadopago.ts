// O que as funções do servidor do Pronto têm em comum: respostas com CORS, cliente com a chave de
// serviço, quem está logado, segredos e a conversa com o Mercado Pago.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

// Segredo do ambiente da função ou, se não houver, da tabela privado.config (só a chave de serviço lê).
export async function segredo(nome: string): Promise<string | undefined> {
  const doAmbiente = Deno.env.get(nome);
  if (doAmbiente) return doAmbiente;
  const { data } = await admin().rpc('config_secreta', { p_chave: nome });
  return typeof data === 'string' && data ? data : undefined;
}

export async function usuarioDaRequisicao(req: Request) {
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await cliente.auth.getUser();
  return user;
}

export async function mp(token: string, caminho: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.mercadopago.com${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  return { ok: r.ok, status: r.status, dados: await r.json().catch(() => null) };
}

const STATUS: Record<string, string> = { authorized: 'ativa', paused: 'pausada', cancelled: 'cancelada', pending: 'pendente' };

// Grava na conta o que o Mercado Pago diz da assinatura. Cancelada ou pausada continua liberada até
// a próxima cobrança que não vai acontecer (o período já pago); se o Mercado Pago não informar mais
// essa data, a que já estava guardada é mantida.
export async function gravarAssinatura(conta: string, assinatura: { id: string; status: string; next_payment_date?: string }, ate?: string | null) {
  const status = STATUS[assinatura.status] ?? 'pendente';
  const mudanca: Record<string, unknown> = {
    assinatura_id: assinatura.id,
    assinatura_status: status,
    assinatura_atualizada: new Date().toISOString(),
  };
  // Pendente (abriu o pagamento e não pagou) não mexe na data: não pode virar acesso liberado.
  // E só ganha o "até o fim do período" quem estava pagando: cancelar sem nunca ter pago não libera nada.
  const { data: antes } = await admin().from('contas').select('assinatura_status').eq('id', conta).maybeSingle();
  const pagava = antes?.assinatura_status === 'ativa';
  if (status === 'ativa') mudanca.assinatura_ate = null;
  else if ((status === 'cancelada' || status === 'pausada') && pagava) {
    if (ate !== undefined) mudanca.assinatura_ate = ate;
    else if (assinatura.next_payment_date) mudanca.assinatura_ate = assinatura.next_payment_date;
  }
  const { error } = await admin().from('contas').update(mudanca).eq('id', conta);
  if (error) throw new Error(error.message);
  return status;
}
