-- 5 proyectos de ejemplo (con contacto, condiciones de pago, hitos y una nota cada uno).
-- Ejecutar en Supabase → SQL Editor DESPUÉS de las migraciones 003, 004 y 005.
-- El precio total de cada ejemplo es la suma de sus cargos (no llevan servicios asociados).
-- Se asignan al primer usuario de Authentication → Users (en el SQL Editor no hay sesión).
-- Si un proyecto con el mismo nombre de negocio ya existe, no se duplica.
-- Para borrarlos: elimínalos desde la app (o borra las filas cuyo business_name está abajo).

do $$
declare
  uid uuid := (select id from auth.users order by created_at limit 1);
  pid uuid;
  ex record;
begin
  if uid is null then
    raise exception 'No hay usuarios en Authentication → Users';
  end if;

  for ex in
    select * from (values
      ('Carlos Ruiz', 'Taller Ruiz Motor',
       'Web corporativa con catálogo de servicios y formulario de cita previa.',
       'desplegado'::project_status, '612 345 678', 'Valencia', 'Valencia', '46015', 'Av. del Puerto 128, bajo',
       'transferencia', 4800.00,
       '[{"id":"ej1-x1","description":"Diseño y desarrollo web","amount":4500},{"id":"ej1-x2","description":"Kilometraje","amount":300}]',
       '[{"id":"ej1-1","description":"Reserva","percentage":30,"dueDate":"2026-06-10","paid":true,"paidAt":"2026-06-10T09:00:00Z"},
         {"id":"ej1-2","description":"Entrega del diseño","percentage":40,"dueDate":"2026-07-15","paid":true,"paidAt":"2026-07-16T11:30:00Z"},
         {"id":"ej1-3","description":"Publicación","percentage":30,"dueDate":"2026-08-01","paid":true,"paidAt":"2026-08-02T10:00:00Z"}]',
       '2026-06-05T10:00:00Z'::timestamptz,
       'Cliente muy contento. Proponer mantenimiento anual en enero.'),

      ('Marta Gómez', 'Floristería Petals',
       'Tienda online con pedidos para entrega en el día y pasarela de pago.',
       'en_desarrollo'::project_status, '655 908 112', 'Sevilla', 'Sevilla', '41004', 'Calle Feria 45',
       'bizum', 2350.00,
       '[{"id":"ej2-x1","description":"Tienda online","amount":2350}]',
       '[{"id":"ej2-1","description":"Inicio del proyecto","percentage":50,"dueDate":"2026-09-01","paid":true,"paidAt":"2026-09-01T08:45:00Z"},
         {"id":"ej2-2","description":"Entrega final","percentage":50,"dueDate":"2026-12-05","paid":false,"paidAt":null}]',
       '2026-08-20T16:20:00Z'::timestamptz,
       'Pendiente de recibir las fotos de producto.'),

      ('Javier Ortega', 'Clínica Dental Sonríe',
       'Landing page para campaña de ortodoncia invisible.',
       'nuevo'::project_status, '+34 917 22 33 44', 'Madrid', 'Getafe', '28901', 'Calle Madrid 12, 1ºA',
       'efectivo', 1200.00,
       '[{"id":"ej3-x1","description":"Landing page","amount":1100},{"id":"ej3-x2","description":"Dietas","amount":100}]',
       '[{"id":"ej3-1","description":"Señal","percentage":25.5,"dueDate":"2026-11-25","paid":false,"paidAt":null},
         {"id":"ej3-2","description":"Entrega","percentage":74.5,"dueDate":"2026-12-20","paid":false,"paidAt":null}]',
       '2026-11-10T12:00:00Z'::timestamptz,
       'Llamar el lunes para cerrar textos de la landing.'),

      ('Lucía Fernández', 'Hotel Rural El Encinar',
       'Rediseño completo de la web con motor de reservas y versión en inglés.',
       'en_desarrollo'::project_status, '687 450 231', 'Cáceres', 'Trujillo', '10200', 'Camino de la Dehesa s/n',
       'transferencia', 9500.00,
       '[{"id":"ej4-x1","description":"Web y motor de reservas","amount":9000},{"id":"ej4-x2","description":"Dietas","amount":250},{"id":"ej4-x3","description":"Kilometraje","amount":250}]',
       '[{"id":"ej4-1","description":"Reserva","percentage":20,"dueDate":"2026-09-15","paid":true,"paidAt":"2026-09-14T17:00:00Z"},
         {"id":"ej4-2","description":"Diseño aprobado","percentage":30,"dueDate":"2026-10-20","paid":true,"paidAt":"2026-10-22T09:10:00Z"},
         {"id":"ej4-3","description":"Motor de reservas","percentage":30,"dueDate":"2026-12-01","paid":false,"paidAt":null},
         {"id":"ej4-4","description":"Publicación","percentage":20,"dueDate":"2027-01-15","paid":false,"paidAt":null}]',
       '2026-09-10T09:30:00Z'::timestamptz,
       'Integrar el motor de reservas con su channel manager actual.'),

      ('Andrés Molina', 'Gimnasio FitZone',
       'App web para socios: horarios de clases, reservas y cuotas.',
       'nuevo'::project_status, '600 777 321', 'Málaga', 'Marbella', '29601', 'Av. Ricardo Soriano 33',
       'bizum', 3000.00,
       '[{"id":"ej5-x1","description":"App web para socios","amount":3000}]',
       '[{"id":"ej5-1","description":"Reserva","percentage":33.33,"dueDate":"2026-11-20","paid":true,"paidAt":"2026-11-15T19:00:00Z"},
         {"id":"ej5-2","description":"Primera versión","percentage":33.33,"dueDate":"2026-12-22","paid":false,"paidAt":null},
         {"id":"ej5-3","description":"Entrega final","percentage":33.34,"dueDate":"2027-02-01","paid":false,"paidAt":null}]',
       '2026-10-28T11:15:00Z'::timestamptz,
       'Quieren pagos de cuotas con Bizum en una segunda fase.')
    ) as t(client_name, business_name, description, status, phone, province, city, postal_code, address,
           payment_method, total_price, extras, milestones, created_at, note)
  loop
    if exists (select 1 from public.projects where user_id = uid and business_name = ex.business_name) then
      continue;
    end if;

    insert into public.projects (
      user_id, client_name, business_name, description, status, phone, province, city, postal_code, address,
      payment_method, total_price, extra_charges, payment_milestones, created_at, updated_at
    ) values (
      uid, ex.client_name, ex.business_name, ex.description, ex.status, ex.phone, ex.province, ex.city,
      ex.postal_code, ex.address, ex.payment_method, ex.total_price, ex.extras::jsonb, ex.milestones::jsonb, ex.created_at, ex.created_at
    ) returning id into pid;

    insert into public.notes (user_id, project_id, content, color, created_at)
    values (uid, pid, ex.note, 'violet', ex.created_at);
  end loop;
end $$;
