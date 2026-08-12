# Casaca de Cancha — Notas operativas

Reglas que hay que respetar siempre al operar la tienda (carga de datos, productos, stock).

## Pedidos a proveedor (supplier_orders) → SIEMPRE linkear a la variante
Al cargar un pedido a proveedor, **cada línea DEBE tener `variant_id`** apuntando a la variante
(producto + talle) del catálogo.
- Si el producto todavía no existe en el catálogo, **crearlo primero** (producto + variantes) y recién
  ahí cargar el pedido linkeado.
- Motivo: marcar el batch como **"Recibido"** solo sube el stock a la página si la línea está linkeada
  (`adjustPhysicalStock` en `setSupplierBatchStatus` corre `if (r.variant_id)`). Sin `variant_id`, el
  stock NO sube y el aviso a la lista de espera (`notifyRestock`) tampoco se dispara.

## Nombres: la línea del pedido debe llamarse IGUAL que el ítem del encargo
La matriz de "Unidades por pedir" (`getStockMatrix`) cruza **por nombre + talle en texto**, no por
`variant_id`. Si el nombre no coincide exacto, el sistema cree que nunca lo pediste y muestra unidades
fantasma por pedir.
- Al cargar el pedido a proveedor de un encargo, usar **el mismo nombre exacto** que el ítem del encargo.
- **No** agregarle aclaraciones al nombre (ej. `... (encargo Stefano)`): eso va en el campo **notas**.

## Productos: por defecto IMPORTADO + "Producto no oficial."
Todo lo que se vende es **importado salvo que el dueño diga lo contrario**. Aclararlo (badge "Importada")
y terminar la descripción con **"Producto no oficial."**. Nunca decir "oficial" ni "licenciado".

## Stock de pedidos en camino
No cargar stock de productos cuyo pedido a proveedor **todavía no llegó**. Se publican como borrador o en
stock 0 (aparecen "agotado" + lista de espera) hasta que se marca el pedido "Recibido".
