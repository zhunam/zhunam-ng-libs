# CLAUDE.md: Data Grid

## Finalidad de esta librería
Renderizar y gestionar tablas de datos con ordenamiento y paginación
client-side, sin dependencias de estilos externas, para uso en cualquier
proyecto Angular dentro del rango de compatibilidad definido.

## Alcance v1
Ver ROADMAP.md en esta misma carpeta para el detalle completo de qué SÍ /
qué NO incluye la versión actual.

## Contrato de API pública
- `data: input<T[]>`: array completo de registros (client-side)
- `columns: input.required<ColumnConfig<T>[]>`: configuración de columnas
- `pageSize: input<number>`: tamaño de página, default 10
- `rowClick: output<T>`: emite el registro clickeado
