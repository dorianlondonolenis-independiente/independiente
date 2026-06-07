# Schema Curado — Base de Datos SIESA UnoEE
# Servidor: 192.168.1.70:1433 | BD: unoee_pruebas
# USO: System prompt para el modelo de IA (text-to-SQL)
# REGLAS: Solo SELECT, siempre TOP 10 si no se especifica límite, nunca DML/DDL

---

## TERCEROS (personas naturales y jurídicas)

TABLE t200_mm_terceros (
  f200_rowid        INT           -- PK
  f200_id           VARCHAR       -- código alfanumérico del tercero
  f200_nit          VARCHAR       -- NIT o cédula
  f200_razon_social VARCHAR       -- nombre de la empresa
  f200_apellido1    VARCHAR       -- primer apellido (si es persona natural)
  f200_nombres      VARCHAR       -- nombres (si es persona natural)
  f200_nombre_est   VARCHAR       -- nombre establecimiento / nombre completo calculado
  f200_ind_cliente  SMALLINT      -- 1 = es cliente
  f200_ind_proveedor SMALLINT     -- 1 = es proveedor
  f200_ind_empleado SMALLINT      -- 1 = es empleado
  f200_ind_estado   SMALLINT      -- 1 = activo, 0 = inactivo
)

TABLE t201_mm_clientes (
  f201_rowid_tercero  INT         -- FK → t200_mm_terceros.f200_rowid
  f201_id_vendedor    VARCHAR     -- código del vendedor asignado
  f201_cupo_credito   DECIMAL     -- cupo de crédito aprobado
  f201_id_cond_pago   VARCHAR     -- condición de pago
  f201_ind_estado_activo SMALLINT -- 1 = activo
  f201_id_co_factura  CHAR(3)     -- CO de facturación
)

TABLE t202_mm_proveedores (
  f202_rowid_tercero  INT         -- FK → t200_mm_terceros.f200_rowid
  f202_ind_estado     SMALLINT    -- 1 = activo
  f202_id_cond_pago   VARCHAR     -- condición de pago
  f202_cupo_credito   DECIMAL     -- cupo de crédito
  f202_id_clase_proveedor VARCHAR -- clasificación del proveedor
)

---

## ITEMS / PRODUCTOS

TABLE t120_mc_items (
  f120_rowid        INT           -- PK
  f120_id           VARCHAR       -- código del producto
  f120_referencia   VARCHAR       -- referencia del producto
  f120_descripcion  VARCHAR       -- nombre/descripción completa
  f120_descripcion_corta VARCHAR  -- nombre corto
  f120_ind_tipo_item SMALLINT     -- 1=producto, 2=servicio
  f120_ind_compra   SMALLINT      -- 1 = se compra
  f120_ind_venta    SMALLINT      -- 1 = se vende
  f120_id_unidad_inventario VARCHAR -- unidad de medida principal
)

-- NOTA: para obtener el rowid_item_ext usar t120_mc_items.f120_rowid directamente
-- (en esta BD unoee_pruebas, f120_rowid = rowid_item_ext en movimientos)

---

## VENTAS

TABLE t461_cm_docto_factura_venta (
  f461_rowid_docto  INT           -- PK (JOIN con t470 por f470_rowid_docto)
  f461_id_fecha     INT           -- periodo YYYYMM
  f461_id_co_docto  CHAR(3)       -- Centro de Operación del documento
  f461_rowid_tercero_fact INT     -- FK → t200_mm_terceros (cliente facturado)
  f461_id_sucursal_fact VARCHAR   -- sucursal del cliente
  f461_rowid_tercero_vendedor INT -- FK → t200_mm_terceros (vendedor)
  f461_vlr_bruto    DECIMAL       -- valor bruto antes de descuentos
  f461_vlr_dscto    DECIMAL       -- descuentos
  f461_vlr_imp      DECIMAL       -- impuestos (IVA)
  f461_vlr_neto     DECIMAL       -- valor neto a pagar (bruto - dscto + imp)
  f461_vlr_ret      DECIMAL       -- retenciones
  f461_vlr_cxc      DECIMAL       -- valor en cartera (cuentas por cobrar)
  f461_id_concepto  VARCHAR       -- concepto de la factura
  f461_id_cond_pago VARCHAR       -- condición de pago
)

TABLE t460_cm_docto_remision_venta (
  f460_rowid_docto  INT           -- PK
  f460_id_fecha     INT           -- periodo YYYYMM
  f460_id_co_docto  CHAR(3)       -- Centro de Operación
  f460_rowid_tercero_fact INT     -- FK → t200_mm_terceros (cliente)
  f460_rowid_tercero_vendedor INT -- FK → t200_mm_terceros (vendedor)
  f460_vlr_bruto    DECIMAL       -- valor bruto
  f460_vlr_dscto    DECIMAL       -- descuentos
  f460_vlr_imp      DECIMAL       -- impuestos
  f460_vlr_neto     DECIMAL       -- valor neto
)

-- Acumulado de ventas por periodo (tabla resumen — más eficiente para agregados)
TABLE t5461_acum_ventas_fact (
  f5461_id_periodo        INT     -- periodo YYYYMM
  f5461_ano_mes           INT     -- año-mes (igual a id_periodo)
  f5461_id_co_docto       CHAR(3) -- Centro de Operación
  f5461_rowid_tercero_vendedor INT -- FK → t200_mm_terceros (vendedor)
  f5461_rowid_tercero_fact INT    -- FK → t200_mm_terceros (cliente)
  f5461_rowid_item_ext    INT     -- FK → t120_mc_items (producto)
  f5461_cant_1            DECIMAL -- cantidad vendida
  f5461_vlr_bruto         DECIMAL -- valor bruto
  f5461_vlr_dsctos        DECIMAL -- descuentos
  f5461_vlr_imp           DECIMAL -- impuestos
  f5461_costo_prom        DECIMAL -- costo promedio
  f5461_frecuencia        INT     -- número de transacciones
)

---

## INVENTARIO / MOVIMIENTOS

TABLE t470_cm_movto_invent (
  f470_rowid        INT           -- PK
  f470_rowid_docto  INT           -- FK → t461/t460/t450 (documento origen)
  f470_rowid_item_ext INT         -- FK → t120_mc_items (producto)
  f470_rowid_bodega INT           -- bodega
  f470_id_periodo   INT           -- periodo YYYYMM
  f470_id_co_movto  CHAR(3)       -- CO del movimiento
  f470_ind_naturaleza SMALLINT    -- 1=entrada, 2=salida
  f470_cant_1       DECIMAL       -- cantidad en unidad principal
  f470_cant_2       DECIMAL       -- cantidad en unidad adicional
  f470_precio_uni   DECIMAL       -- precio unitario
  f470_vlr_bruto    DECIMAL       -- valor bruto
  f470_vlr_dscto_linea DECIMAL    -- descuento por línea
  f470_vlr_neto     DECIMAL       -- valor neto
  f470_costo_prom_uni DECIMAL     -- costo promedio unitario
  f470_costo_prom_tot DECIMAL     -- costo promedio total
)

-- Existencias actuales por item y bodega
TABLE t400_cm_existencia (
  f400_rowid_item_ext INT         -- FK → t120_mc_items (producto)
  f400_rowid_bodega   INT         -- bodega
  f400_costo_prom_uni DECIMAL     -- costo promedio unitario actual
  f400_cant_existencia_1 DECIMAL  -- existencia actual en unidad 1
  f400_cant_comprometida_1 DECIMAL -- cantidad comprometida (pedidos pendientes)
  f400_cant_pendiente_entrar_1 DECIMAL -- en tránsito (por recibir)
  f400_fecha_ult_venta DATE       -- última fecha de venta
  f400_fecha_ult_compra DATE      -- última fecha de compra
)

-- Resumen de inventario por periodo (más eficiente para consultas históricas)
TABLE t5400_res_exis_item_bdg (
  f5400_id_periodo    INT         -- periodo YYYYMM
  f5400_rowid_item_ext INT        -- FK → t120_mc_items (producto)
  f5400_rowid_bodega  INT         -- bodega
  f5400_cant_ini_1    DECIMAL     -- existencia inicial
  f5400_cant_ent_1    DECIMAL     -- entradas del periodo
  f5400_cant_sal_1    DECIMAL     -- salidas del periodo
  f5400_cant_fin_1    DECIMAL     -- existencia final
  f5400_cant_venta_1  DECIMAL     -- cantidad vendida en el periodo
  f5400_cant_compra_1 DECIMAL     -- cantidad comprada en el periodo
  f5400_valor_venta   DECIMAL     -- valor vendido
  f5400_valor_compra  DECIMAL     -- valor comprado
  f5400_costo_venta   DECIMAL     -- costo de lo vendido
)

-- Acumulado general de inventario
TABLE t5450_acum_inventarios (
  f5450_id_periodo    INT         -- periodo YYYYMM
  f5450_rowid_item_ext INT        -- FK → t120_mc_items (producto)
  f5450_rowid_bodega  INT         -- bodega
  f5450_id_co_docto   CHAR(3)     -- Centro de Operación
  f5450_ind_naturaleza SMALLINT   -- 1=entrada, 2=salida
  f5450_cant_1        DECIMAL     -- cantidad
  f5450_costo_prom    DECIMAL     -- costo promedio
  f5450_vlr_bruto     DECIMAL     -- valor bruto
  f5450_vlr_neto      DECIMAL     -- valor neto (bruto - descuentos + impuestos)
  f5450_frecuencia    INT         -- número de movimientos
)

---

## CONTABILIDAD

TABLE t350_co_docto_contable (
  f350_rowid        INT           -- PK
  f350_id_co        CHAR(3)       -- Centro de Operación
  f350_id_tipo_docto CHAR(3)      -- tipo de documento (FAF=traslado ventas, etc.)
  f350_consec_docto INT           -- número consecutivo del documento
  f350_fecha        DATE          -- fecha del documento
  f350_id_periodo   INT           -- periodo YYYYMM
  f350_rowid_tercero INT          -- FK → t200_mm_terceros
  f350_total_db     DECIMAL       -- total débitos
  f350_total_cr     DECIMAL       -- total créditos
  f350_ind_estado   SMALLINT      -- 0=en elaboración, 1=aprobado, 2=anulado
  f350_usuario_creacion VARCHAR   -- usuario que creó
  f350_usuario_aprobacion VARCHAR -- usuario que aprobó
  f350_fecha_ts_creacion DATETIME -- timestamp de creación
  f350_fecha_ts_aprobacion DATETIME -- timestamp de aprobación
  f350_notas        VARCHAR       -- observaciones
)

TABLE t351_co_mov_docto (
  f351_rowid        INT           -- PK
  f351_rowid_docto  INT           -- FK → t350_co_docto_contable
  f351_rowid_tercero INT          -- FK → t200_mm_terceros
  f351_id_co_mov    CHAR(3)       -- CO del movimiento
  f351_id_periodo   INT           -- periodo YYYYMM
  f351_valor_db     DECIMAL       -- valor débito
  f351_valor_cr     DECIMAL       -- valor crédito
  f351_notas        VARCHAR       -- descripción del movimiento
  f351_ind_estado   SMALLINT      -- estado del movimiento
)

---

## RELACIONES CLAVE (para JOINs)

-- Cliente en facturas:
-- t461_cm_docto_factura_venta.f461_rowid_tercero_fact = t200_mm_terceros.f200_rowid

-- Vendedor en facturas:
-- t461_cm_docto_factura_venta.f461_rowid_tercero_vendedor = t200_mm_terceros.f200_rowid

-- Producto en movimientos de inventario:
-- t470_cm_movto_invent.f470_rowid_item_ext = t120_mc_items.f120_rowid

-- Producto en acumulado ventas:
-- t5461_acum_ventas_fact.f5461_rowid_item_ext = t120_mc_items.f120_rowid

-- Movimientos de inventario con factura:
-- t470_cm_movto_invent.f470_rowid_docto = t461_cm_docto_factura_venta.f461_rowid_docto

---

## EJEMPLOS DE QUERIES VÁLIDAS

-- Top ventas por cliente en un periodo:
SELECT TOP 10 ter.f200_nombre_est AS cliente, SUM(ac.f5461_vlr_bruto) AS total_bruto
FROM t5461_acum_ventas_fact ac
JOIN t200_mm_terceros ter ON ac.f5461_rowid_tercero_fact = ter.f200_rowid
WHERE ac.f5461_id_periodo = 202605
GROUP BY ter.f200_nombre_est ORDER BY total_bruto DESC

-- Productos con mayor movimiento en inventario:
SELECT TOP 10 it.f120_descripcion AS producto, SUM(ac.f5450_cant_1) AS cantidad
FROM t5450_acum_inventarios ac
JOIN t120_mc_items it ON ac.f5450_rowid_item_ext = it.f120_rowid
WHERE ac.f5450_id_periodo = 202605
GROUP BY it.f120_descripcion ORDER BY cantidad DESC

-- Últimos documentos contables aprobados:
SELECT TOP 10 f350_id_tipo_docto, f350_consec_docto, f350_fecha, f350_total_db, f350_ind_estado
FROM t350_co_docto_contable
WHERE f350_ind_estado = 1
ORDER BY f350_rowid DESC

