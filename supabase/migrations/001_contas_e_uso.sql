-- Contas do Pronto: dados do médico sincronizados, uso grátis e assinatura.
-- Paciente nunca chega aqui: só o que o próprio médico configura e a contagem de atendimentos.

create table public.contas (
  id uuid primary key references auth.users on delete cascade,
  email text,
  criado_em timestamptz not null default now(),
  -- nenhuma | pendente | ativa | pausada | cancelada (espelha a assinatura do Mercado Pago)
  assinatura_status text not null default 'nenhuma',
  assinatura_id text,
  assinatura_atualizada timestamptz
);

-- Uma linha por chave que o app guardava no navegador (perfil, locais, modelos, diagnosticos...).
create table public.dados (
  user_id uuid not null references auth.users on delete cascade,
  chave text not null check (chave ~ '^[a-zA-Z]{1,40}$'),
  valor jsonb not null,
  atualizado timestamptz not null default now(),
  primary key (user_id, chave)
);

-- Cada atendimento conta uma vez, mesmo que a receita seja impressa e o prontuário copiado.
create table public.usos (
  user_id uuid not null references auth.users on delete cascade,
  atendimento uuid not null,
  criado_em timestamptz not null default now(),
  tipo text not null check (tipo in ('boas-vindas', 'diario', 'assinatura')),
  primary key (user_id, atendimento)
);
create index usos_por_dia on public.usos (user_id, tipo, criado_em);

alter table public.contas enable row level security;
alter table public.dados enable row level security;
alter table public.usos enable row level security;

-- O médico lê a própria conta; a assinatura só muda pelo webhook (chave de serviço).
create policy "lê a própria conta" on public.contas for select to authenticated using ((select auth.uid()) = id);
create policy "lê os próprios dados" on public.dados for select to authenticated using ((select auth.uid()) = user_id);
create policy "cria os próprios dados" on public.dados for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "altera os próprios dados" on public.dados for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "apaga os próprios dados" on public.dados for delete to authenticated using ((select auth.uid()) = user_id);
-- Uso só entra pela função consumir(), nunca direto.
create policy "lê o próprio uso" on public.usos for select to authenticated using ((select auth.uid()) = user_id);

-- Toda conta nova ganha a linha em contas.
create function public.nova_conta() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.contas (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.nova_conta();

-- Situação do médico: o que ainda tem de grátis e se assina.
create function public.situacao() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_status text;
  v_boas int;
  v_hoje int;
begin
  if uid is null then raise exception 'sem login'; end if;
  select assinatura_status into v_status from public.contas where id = uid;
  select count(*) into v_boas from public.usos where user_id = uid and tipo = 'boas-vindas';
  select count(*) into v_hoje from public.usos
    where user_id = uid and tipo = 'diario'
      and (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  return jsonb_build_object(
    'assinante', coalesce(v_status, 'nenhuma') = 'ativa',
    'assinatura', coalesce(v_status, 'nenhuma'),
    'boas_vindas_restantes', greatest(0, 10 - v_boas),
    'diario_restante', case when v_boas < 10 then 1 else greatest(0, 1 - v_hoje) end
  );
end;
$$;

-- Registra um atendimento e diz se está liberado. Regra: 10 de boas-vindas; acabando,
-- 1 grátis por dia (horário de Brasília); assinatura ativa libera tudo.
create function public.consumir(p_atendimento uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_status text;
  v_boas int;
  v_hoje int;
  v_tipo text;
begin
  if uid is null then raise exception 'sem login'; end if;
  -- Dois cliques ao mesmo tempo não podem gastar dois grátis.
  perform pg_advisory_xact_lock(hashtext(uid::text));

  if exists (select 1 from public.usos where user_id = uid and atendimento = p_atendimento) then
    return public.situacao() || jsonb_build_object('liberado', true, 'repetido', true);
  end if;

  select assinatura_status into v_status from public.contas where id = uid;
  if v_status = 'ativa' then
    v_tipo := 'assinatura';
  else
    select count(*) into v_boas from public.usos where user_id = uid and tipo = 'boas-vindas';
    if v_boas < 10 then
      v_tipo := 'boas-vindas';
    else
      select count(*) into v_hoje from public.usos
        where user_id = uid and tipo = 'diario'
          and (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
      if v_hoje < 1 then
        v_tipo := 'diario';
      else
        return public.situacao() || jsonb_build_object('liberado', false);
      end if;
    end if;
  end if;

  insert into public.usos (user_id, atendimento, tipo) values (uid, p_atendimento, v_tipo);
  return public.situacao() || jsonb_build_object('liberado', true, 'tipo', v_tipo);
end;
$$;

revoke all on function public.situacao() from public, anon;
revoke all on function public.consumir(uuid) from public, anon;
revoke all on function public.nova_conta() from public, anon, authenticated;
grant execute on function public.situacao() to authenticated;
grant execute on function public.consumir(uuid) to authenticated;
