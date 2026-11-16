-- Batimento diário (rotina do GitHub): uma gravação por dia para o plano grátis não pausar o projeto.
-- Guarda só a hora; apaga o que tiver mais de 30 dias. Sem dado de ninguém.
create table privado.batimento (
  id bigint generated always as identity primary key,
  em timestamptz not null default now()
);
revoke all on privado.batimento from public, anon, authenticated;

create function public.batimento() returns void
language sql security definer set search_path = '' as $$
  insert into privado.batimento default values;
  delete from privado.batimento where em < now() - interval '30 days';
$$;
revoke all on function public.batimento() from public;
grant execute on function public.batimento() to anon, authenticated;
