# Casaca de Cancha — Ecommerce

**VESTÍ FÚTBOL.** — Tienda online full-stack de indumentaria de fútbol, lista para
desplegar en Vercel + Supabase. Storefront de alta conversión, checkout propio
(transferencia + link de Mercado Pago), botón de WhatsApp y un dashboard
administrativo completo con gestión de pedidos, inventario, contenido editable,
analítica y rentabilidad.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase**: PostgreSQL + Auth + Storage
- **Recharts** para gráficos
- **React Hook Form** + **Zod** para formularios y validación
- **Server Actions** para todas las operaciones sensibles

## Estructura

```
src/
├── app/
│   ├── (store)/                 # Sitio público (layout con header/footer/carrito)
│   │   ├── page.tsx             # Home (hero, producto estrella, colecciones, FAQ…)
│   │   ├── producto/[slug]/     # Ficha de producto
│   │   ├── camisetas, ninos, buzos, coleccion/[slug]
│   │   ├── cart, checkout, pedido/[orderNumber]
│   │   ├── guia-de-talles, preguntas-frecuentes, legales/[slug]
│   ├── admin/
│   │   ├── login/               # Acceso administrador
│   │   └── (panel)/             # Dashboard protegido (requireAdmin)
│   │       ├── page.tsx         # Resumen + métricas + gráficos
│   │       ├── productos, pedidos, stock, colecciones, clientes
│   │       ├── promociones, rentabilidad, gastos, ads, analitica
│   │       ├── contenido, talles, faq, configuracion, usuarios, logs
│   ├── sitemap.ts, robots.ts
│   └── layout.tsx               # Metadata + pixels
├── components/                  # UI storefront + admin (brand, cart, store, admin)
├── lib/                         # supabase clients, queries, settings, metrics, utils
└── middleware.ts                # Protege /admin y refresca sesión
supabase/migrations/             # SQL: schema, RLS, seed, storage
```

## Puesta en marcha local

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Crear proyecto en Supabase** (https://supabase.com) y correr las migraciones
   en el **SQL Editor**, en orden:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_seed.sql`
   - `supabase/migrations/0004_storage.sql`

3. **Variables de entorno**: copiá `.env.example` a `.env.local` y completá:
   ```bash
   cp .env.example .env.local
   ```
   Los valores de Supabase están en *Project Settings → API*.

4. **Crear el usuario administrador inicial** en Supabase:
   *Authentication → Users → Add user* (email + contraseña). La primera persona
   que inicie sesión queda como `owner` automáticamente (trigger `handle_new_user`).

5. **Correr el proyecto**
   ```bash
   npm run dev
   ```
   - Tienda: http://localhost:3000
   - Admin: http://localhost:3000/admin

## Deploy en Vercel

1. Subí el repo a GitHub e importalo en Vercel.
2. Cargá las mismas variables de entorno en *Project → Settings → Environment Variables*.
   Importante: `SUPABASE_SERVICE_ROLE_KEY` es secreta (no usa el prefijo `NEXT_PUBLIC_`).
3. Deploy. Next.js se detecta automáticamente.
4. Actualizá `NEXT_PUBLIC_SITE_URL` con el dominio final.

## Configuración de Storage

La migración `0004_storage.sql` crea el bucket público `product-images`. Las fotos
se suben desde el admin (Productos → Fotos) usando la service role; también se
pueden pegar URLs externas.

## Flujos principales

- **Compra (web)**: producto → talle → carrito → checkout → elige transferencia o
  Mercado Pago → se crea el pedido (`pending_payment`), se reserva stock y se
  muestran los datos de pago + botón para enviar comprobante por WhatsApp.
- **Transferencia**: descuento configurable (default 10%) aplicado en checkout;
  alias/CBU copiables en la confirmación.
- **Mercado Pago**: por defecto usa el link + confirmación manual. Si cargás el
  access token y activás Checkout Pro, crea una preference por pedido y confirma
  el pago automáticamente vía webhook (ver sección Mercado Pago).
- **Cupones**: el cliente los aplica en el checkout; se validan y recalculan en el
  servidor.
- **Pedido manual**: registra ventas externas (WhatsApp, Instagram, local…) para
  que entren en las estadísticas.
- **Stock**: se reserva al crear el pedido, se descuenta al marcar *Pagado* y se
  libera al cancelar.

## Roles

`owner` · `admin` · `operator` (pueden escribir) · `viewer` (sólo lectura).
Los roles se gestionan en *Admin → Usuarios* (sólo owner/admin).

## Seguridad

- Row Level Security en todas las tablas (lectura pública sólo del catálogo activo).
- Rutas `/admin` protegidas por middleware + `requireAdmin`.
- Validación con Zod y recálculo de precios/stock en el servidor (no se confía en
  el cliente).
- Credenciales en variables de entorno; la service role nunca se expone al cliente.

## Mercado Pago Checkout Pro (confirmación automática)

El MVP funciona con el **link** + confirmación manual. Para confirmación automática:

1. Cargá `MERCADOPAGO_ACCESS_TOKEN` en las variables de entorno.
2. En *Admin → Configuración → Mercado Pago*, activá **Checkout Pro**.
3. Configurá el webhook en tu panel de Mercado Pago apuntando a
   `https://TU-DOMINIO/api/mercadopago/webhook`.

Al elegir Mercado Pago se crea una *preference* (`/api/mercadopago/preference`), el
cliente paga y el webhook marca el pedido como **pagado** y descuenta el stock. Si
el token no está, todo cae de forma transparente al flujo por link.

## Roadmap

- **Fase 1 + 2 (incluidas)**: storefront, checkout con cupones y cálculo de envío,
  transferencia con descuento, Mercado Pago (link **y** Checkout Pro + webhook),
  WhatsApp, pedidos web y manuales, dashboard completo, productos, stock,
  promociones, rentabilidad, gastos, Ads, analítica, contenido editable, CSV.
- **Fase 3 (futuro)**: emails transaccionales, recupero de carrito abandonado,
  integraciones logísticas y facturación.

## Checklist de producción

- [ ] Migraciones aplicadas (schema, RLS, seed, storage).
- [ ] Variables de entorno cargadas en Vercel.
- [ ] Usuario owner creado y verificado.
- [ ] Datos de transferencia reales cargados (alias, CBU, titular).
- [ ] Número de WhatsApp real.
- [ ] Meta Pixel ID (si aplica) y verificación de dominio.
- [ ] Fotos reales de productos cargadas.
- [ ] Datos legales (CUIT, razón social, domicilio) completados en Configuración.
- [ ] `NEXT_PUBLIC_SITE_URL` con el dominio final.
