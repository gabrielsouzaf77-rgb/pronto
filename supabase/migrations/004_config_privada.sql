-- Segredos que só as funções do servidor leem (ex.: token do Mercado Pago), fora da API pública.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table privado.config (
  chave text primary key,
  valor text not null,
  atualizado timestamptz not null default now()
);
revoke all on privado.config from public, anon, authenticated;

create function public.config_secreta(p_chave text) returns text
language sql stable security definer set search_path = '' as $$
  select valor from privado.config where chave = p_chave;
$$;
revoke all on function public.config_secreta(text) from public, anon, authenticated;
grant execute on function public.config_secreta(text) to service_role;
