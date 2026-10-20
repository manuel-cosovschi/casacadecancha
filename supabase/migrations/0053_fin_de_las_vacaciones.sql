-- Fin de las vacaciones: la tienda vuelve a tomar pedidos.
--
-- El cartel de vacaciones seguía en la página en octubre ("Volvemos el 20/08")
-- con el checkout bloqueado. Se apaga el interruptor manual y se vacía el rango
-- de fechas, así no queda prendido por ninguno de los dos lados ni se vuelve a
-- prender solo. El título y los textos del cartel se dejan como estaban para
-- la próxima vez.
--
-- Lo mismo se hace desde el panel: Contenido → Modo vacaciones → destildar
-- "Forzar ahora" y "Activar solo por fechas".
update public.store_settings
set value_json = coalesce(value_json, '{}'::jsonb)
                 || '{"enabled": false, "auto": false, "from": "", "until": ""}'::jsonb,
    updated_at = now()
where key = 'vacation';
