// Cria a conta já confirmada (e-mail + senha). Sem e-mail de confirmação por enquanto:
// o envio padrão do Supabase só entrega para a equipe do projeto. Quando houver SMTP próprio,
// dá para trocar por signUp com confirmação.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const VERSAO_TERMOS = '2026-10-22';

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido.' });

  let corpo: { email?: unknown; senha?: unknown; aceite?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return resposta(400, { erro: 'Pedido inválido.' });
  }
  const email = String(corpo.email ?? '').trim().toLowerCase();
  const senha = String(corpo.senha ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return resposta(400, { erro: 'Confira o e-mail.' });
  if (senha.length < 8 || senha.length > 72) return resposta(400, { erro: 'A senha precisa ter de 8 a 72 caracteres.' });
  if (corpo.aceite !== true) return resposta(400, { erro: 'É preciso aceitar os Termos de uso e a Política de privacidade.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { termos_aceitos_em: new Date().toISOString(), termos_versao: VERSAO_TERMOS },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return resposta(409, { erro: 'Já existe uma conta com este e-mail. Entre com a sua senha.' });
    }
    console.error('cadastrar', error.message);
    return resposta(500, { erro: 'Não foi possível criar a conta agora. Tente de novo em instantes.' });
  }
  return resposta(201, { ok: true });
});
