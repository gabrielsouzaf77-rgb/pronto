-- O dono da linha vem do login: o app não precisa (nem consegue) mandar outro.
alter table public.dados alter column user_id set default auth.uid();
