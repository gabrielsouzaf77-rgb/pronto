-- Quem cancela continua assinante até o fim do período pago (assinatura_ate).

alter table public.contas add column assinatura_ate timestamptz;

create or replace function public.assinante(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select assinatura_status = 'ativa' or assinatura_ate > now() from public.contas where id = uid), false);
$$;
revoke all on function public.assinante(uuid) from public, anon, authenticated;

create or replace function public.situacao() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_status text;
  v_ate timestamptz;
  v_boas int;
  v_hoje int;
begin
  if uid is null then raise exception 'sem login'; end if;
  select assinatura_status, assinatura_ate into v_status, v_ate from public.contas where id = uid;
  select count(*) into v_boas from public.usos where user_id = uid and tipo = 'boas-vindas';
  select count(*) into v_hoje from public.usos
    where user_id = uid and tipo = 'diario'
      and (criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  return jsonb_build_object(
    'assinante', public.assinante(uid),
    'assinatura', coalesce(v_status, 'nenhuma'),
    'assinatura_ate', v_ate,
    'boas_vindas_restantes', greatest(0, 10 - v_boas),
    'diario_restante', case when v_boas < 10 then 1 else greatest(0, 1 - v_hoje) end
  );
end;
$$;

create or replace function public.consumir(p_atendimento uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_boas int;
  v_hoje int;
  v_tipo text;
begin
  if uid is null then raise exception 'sem login'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));

  if exists (select 1 from public.usos where user_id = uid and atendimento = p_atendimento) then
    return public.situacao() || jsonb_build_object('liberado', true, 'repetido', true);
  end if;

  if public.assinante(uid) then
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
