-- =====================================================================
-- CASACA DE CANCHA - Seed inicial (editable desde el admin)
-- =====================================================================

-- --------------------------------------------------------------------
-- STORE SETTINGS
-- --------------------------------------------------------------------
insert into public.store_settings (key, value_json) values
('brand', '{
  "name": "Casaca de Cancha",
  "slogan": "VESTÍ FÚTBOL.",
  "descriptor": "Camisetas, buzos e indumentaria de fútbol.",
  "location": "Mar del Plata, Buenos Aires, Argentina",
  "email": "cosovschim@gmail.com"
}'),
('announcement_bar', '{
  "active": true,
  "messages": [
    {"text": "Envíos a todo el país", "active": true},
    {"text": "Somos de Mar del Plata", "active": true},
    {"text": "10% OFF pagando por transferencia", "active": true},
    {"text": "Consultanos por WhatsApp", "active": true}
  ]
}'),
('hero', '{
  "active": true,
  "title": "VESTÍ FÚTBOL.",
  "subtitle": "Camisetas y buzos para vivir cada partido con tus colores. Desde Mar del Plata a todo el país.",
  "cta_text": "VER CAMISETAS",
  "cta_link": "/camisetas",
  "secondary_text": "CONSULTAR POR WHATSAPP",
  "image_desktop": "",
  "image_mobile": "",
  "align": "left"
}'),
('trust_strip', '{
  "items": [
    {"title": "Envíos a todo el país", "icon": "truck"},
    {"title": "Atención por WhatsApp", "icon": "whatsapp"},
    {"title": "Descuento por transferencia", "icon": "discount"},
    {"title": "Cambios según política vigente", "icon": "refresh"}
  ]
}'),
('mundial_block', '{
  "active": true,
  "title": "EL MUNDIAL SE ALIENTA CON LA CAMISETA PUESTA",
  "subtitle": "Elegí tu casaca y viví cada partido con tus colores.",
  "image_url": ""
}'),
('whatsapp', '{
  "active": true,
  "number": "5492235383082",
  "default_message": "Hola, vengo desde la web de Casaca de Cancha y quería consultar por una camiseta."
}'),
('payments_transfer', '{
  "active": true,
  "discount_percent": 10,
  "alias": "casaca.cancha.mp",
  "cbu": "0000000000000000000000",
  "holder": "[RAZÓN SOCIAL]",
  "bank": "Mercado Pago",
  "cuit": "",
  "text": "Pagando por transferencia obtenés un 10% de descuento.",
  "instructions": "Una vez realizada la transferencia, envianos el comprobante por WhatsApp indicando tu número de pedido."
}'),
('payments_mercadopago', '{
  "active": true,
  "link": "https://link.mercadopago.com.ar/mgbsoftwarefactory",
  "checkout_pro_active": false
}'),
('shipping', '{
  "national_active": true,
  "pickup_active": true,
  "pickup_text": "Retiro en Mar del Plata a coordinar.",
  "coordinate_text": "Envío a coordinar según localidad.",
  "flat_rate": 0,
  "free_from": 0,
  "text": "Hacemos envíos a todo el país. Coordinamos el costo según tu localidad."
}'),
('footer', '{
  "instagram": "https://www.instagram.com/casacadecancha.ar",
  "whatsapp": "5492235383082",
  "email": "cosovschim@gmail.com",
  "location": "Mar del Plata, Buenos Aires",
  "legal_name": "",
  "cuit": ""
}'),
('seo', '{
  "title": "Camisetas de Argentina para el Mundial | Casaca de Cancha",
  "description": "Camisetas, buzos e indumentaria de fútbol desde Mar del Plata con envíos a todo el país.",
  "og_image": ""
}'),
('analytics', '{
  "meta_pixel_id": "",
  "ga_id": "",
  "tiktok_pixel_id": "",
  "meta_domain_verification": ""
}'),
('home_sections', '{
  "trust": true,
  "featured": true,
  "collections": true,
  "products": true,
  "mundial": true,
  "how_to_buy": true,
  "faq": true
}')
on conflict (key) do nothing;

-- --------------------------------------------------------------------
-- CATEGORIES
-- --------------------------------------------------------------------
insert into public.categories (name, slug, sort_order) values
('Camisetas', 'camisetas', 1),
('Niños', 'ninos', 2),
('Buzos', 'buzos', 3),
('Accesorios', 'accesorios', 4)
on conflict (slug) do nothing;

-- --------------------------------------------------------------------
-- COLLECTIONS
-- --------------------------------------------------------------------
insert into public.collections (name, slug, description, active, sort_order) values
('Mundial 2026', 'mundial-2026', 'Camisetas para vivir el Mundial con tus colores.', true, 1),
('Titulares', 'titulares', 'Las casacas titulares.', true, 2),
('Alternativas', 'alternativas', 'Modelos alternativos.', true, 3),
('Niños', 'ninos', 'Indumentaria para los más chicos.', true, 4),
('Buzos', 'buzos', 'Buzos y abrigos futboleros.', true, 5),
('Selecciones', 'selecciones', 'Camisetas de selecciones.', false, 6),
('Retro', 'retro', 'Clásicos que no pasan de moda.', false, 7),
('Ofertas', 'ofertas', 'Promociones vigentes.', true, 8)
on conflict (slug) do nothing;

-- --------------------------------------------------------------------
-- PROMOTIONS
-- --------------------------------------------------------------------
insert into public.promotions (name, type, percentage, active, configuration_json) values
('Descuento por transferencia', 'percentage', 10, true, '{"applies_to":"transfer"}')
on conflict do nothing;

-- --------------------------------------------------------------------
-- SIZE GUIDES
-- --------------------------------------------------------------------
insert into public.size_guides (name, audience, sort_order, measurements_json) values
('Adultos', 'adultos', 1, '[
  {"size":"S","width":48,"length":64},
  {"size":"M","width":50,"length":66},
  {"size":"L","width":54,"length":70},
  {"size":"XL","width":58,"length":72},
  {"size":"XXL","width":62,"length":75}
]'),
('Niños', 'ninos', 2, '[
  {"size":"6","width":32,"length":52},
  {"size":"8","width":35,"length":54},
  {"size":"10","width":37,"length":56},
  {"size":"12","width":40,"length":60},
  {"size":"14","width":42,"length":62},
  {"size":"16","width":44,"length":64}
]')
on conflict do nothing;

-- --------------------------------------------------------------------
-- FAQS
-- --------------------------------------------------------------------
insert into public.faqs (question, answer, sort_order) values
('¿Hacen envíos?', 'Sí, hacemos envíos a todo el país. Coordinamos el costo según tu localidad.', 1),
('¿Desde dónde despachan?', 'Despachamos desde Mar del Plata, Buenos Aires.', 2),
('¿Cómo elijo mi talle?', 'Consultá nuestra guía de talles. Te recomendamos medir una camiseta cómoda y comparar las medidas. Ante dudas, escribinos por WhatsApp.', 3),
('¿Qué medios de pago aceptan?', 'Aceptamos transferencia bancaria y Mercado Pago.', 4),
('¿Hay descuento por transferencia?', 'Sí, pagando por transferencia obtenés un descuento. El porcentaje se muestra en el checkout.', 5),
('¿Cuánto demora el despacho?', 'Coordinamos el despacho una vez confirmado el pago. Te avisamos por WhatsApp.', 6),
('¿Cómo realizo un cambio?', 'Escribinos por WhatsApp dentro del plazo de nuestra política de cambios y te ayudamos.', 7),
('¿Cómo consulto stock?', 'El stock disponible se muestra en cada producto. Si no ves tu talle, consultanos por WhatsApp.', 8),
('¿Puedo retirar en Mar del Plata?', 'Sí, podés coordinar el retiro en Mar del Plata por WhatsApp.', 9),
('¿Cómo envío el comprobante?', 'Una vez realizado el pago, envianos el comprobante por WhatsApp junto con tu número de pedido.', 10)
on conflict do nothing;

-- --------------------------------------------------------------------
-- PRODUCTS DE EJEMPLO
-- --------------------------------------------------------------------
do $$
declare
  cat_camisetas uuid;
  col_mundial uuid;
  col_titulares uuid;
  col_alternativas uuid;
  p1 uuid;
  p2 uuid;
begin
  select id into cat_camisetas from public.categories where slug = 'camisetas';
  select id into col_mundial from public.collections where slug = 'mundial-2026';
  select id into col_titulares from public.collections where slug = 'titulares';
  select id into col_alternativas from public.collections where slug = 'alternativas';

  -- Producto 1: Titular
  insert into public.products (name, slug, short_description, description, price, compare_at_price, unit_cost, packaging_cost, category_id, material, fabric, care, badge, featured, active, seo_title, seo_description)
  values (
    'Camiseta Argentina Titular 2026',
    'camiseta-argentina-titular-2026',
    'La casaca para vivir cada partido con tus colores.',
    E'Camiseta inspirada en la pasión por la Selección.\n\n- Calidad nacional\n- Tela W18\n- Marca y escudo bordado\n- Etiqueta\n- Estampados en vinilo',
    25000, 28000, 12000, 800,
    cat_camisetas, 'Poliéster deportivo', 'Tela W18', 'Lavar a mano o ciclo delicado. No usar lavandina. Secar a la sombra.',
    'Más vendido', true, true,
    'Camiseta Argentina Titular 2026 | Casaca de Cancha',
    'Camiseta Argentina Titular 2026. Calidad nacional, tela W18, escudo bordado. Envíos a todo el país desde Mar del Plata.'
  )
  on conflict (slug) do nothing
  returning id into p1;

  if p1 is null then
    select id into p1 from public.products where slug = 'camiseta-argentina-titular-2026';
  end if;

  -- Producto 2: Alternativa
  insert into public.products (name, slug, short_description, description, price, unit_cost, packaging_cost, category_id, material, fabric, badge, featured, active)
  values (
    'Camiseta Argentina Alternativa 2026',
    'camiseta-argentina-alternativa-2026',
    'El modelo alternativo para destacarte.',
    E'Camiseta alternativa inspirada en la pasión por la Selección.\n\n- Calidad nacional\n- Tela W18\n- Estampados en vinilo',
    25000, 12000, 800,
    cat_camisetas, 'Poliéster deportivo', 'Tela W18', 'Nuevo', true, true
  )
  on conflict (slug) do nothing
  returning id into p2;

  if p2 is null then
    select id into p2 from public.products where slug = 'camiseta-argentina-alternativa-2026';
  end if;

  -- Variantes (talles) para ambos
  insert into public.product_variants (product_id, size, sku, stock_physical, stock_minimum, sort_order)
  select p1, s.size, 'CDC-TIT-' || s.size, s.stock, 2, s.ord
  from (values ('S',8,1),('M',10,2),('L',6,3),('XL',4,4),('XXL',2,5)) as s(size,stock,ord)
  where not exists (select 1 from public.product_variants v where v.product_id = p1 and v.size = s.size);

  insert into public.product_variants (product_id, size, sku, stock_physical, stock_minimum, sort_order)
  select p2, s.size, 'CDC-ALT-' || s.size, s.stock, 2, s.ord
  from (values ('S',5,1),('M',7,2),('L',5,3),('XL',3,4),('XXL',0,5)) as s(size,stock,ord)
  where not exists (select 1 from public.product_variants v where v.product_id = p2 and v.size = s.size);

  -- Imágenes (placeholder). Reemplazar desde el admin con fotos reales.
  insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
  select p1, 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=900&q=80', 'Camiseta Argentina Titular 2026', 0, true
  where not exists (select 1 from public.product_images where product_id = p1);

  insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
  select p2, 'https://images.unsplash.com/photo-1577212017184-80cc0da76e0c?w=900&q=80', 'Camiseta Argentina Alternativa 2026', 0, true
  where not exists (select 1 from public.product_images where product_id = p2);

  -- Asociar a colecciones
  insert into public.collection_products (collection_id, product_id) values
    (col_mundial, p1), (col_titulares, p1),
    (col_mundial, p2), (col_alternativas, p2)
  on conflict do nothing;
end $$;
