-- Ejecutar en Supabase > SQL Editor DESPUÉS de "dotnet ef database update" (Fase 2).
-- Activa RLS en las tablas de Identity para bloquear el acceso directo por la API pública de Supabase.
do $$
declare t text;
begin
  foreach t in array array['usuario','rol','usuario_rol','usuario_claim','usuario_login','rol_claim','usuario_token','__EFMigrationsHistory']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
