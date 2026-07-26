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

## Productos: por defecto IMPORTADO + "Producto no oficial."
Todo lo que se vende es **importado salvo que el dueño diga lo contrario**. Aclararlo (badge "Importada")
y terminar la descripción con **"Producto no oficial."**. Nunca decir "oficial" ni "licenciado".

## Stock de pedidos en camino
No cargar stock de productos cuyo pedido a proveedor **todavía no llegó**. Se publican como borrador o en
stock 0 (aparecen "agotado" + lista de espera) hasta que se marca el pedido "Recibido".
