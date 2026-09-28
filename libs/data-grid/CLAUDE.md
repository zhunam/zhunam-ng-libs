# CLAUDE.md: Data Grid

## Finalidad de esta librería
Renderizar y gestionar tablas de datos con ordenamiento y paginación
client-side, sin dependencias de estilos externas, para uso en cualquier
proyecto Angular dentro del rango de compatibilidad definido.

## Alcance v1
Ver ROADMAP.md en esta misma carpeta para el detalle completo de qué SÍ /
qué NO incluye la versión actual.

## Contrato de API pública
- `data: input<T[]>`: registros a renderizar. En `mode="server"`, solo la
  página actual, no el dataset completo.
- `columns: input.required<ColumnConfig<T>[]>`: configuración de columnas
- `pageSize: input<number>`: tamaño de página, default 10. Unidireccional
  en los dos modos.
- `filterFn: input<((row: T) => boolean) | undefined>`: predicado de fila
  aplicado antes de ordenar/paginar, solo en `mode="client"`. Sin efecto
  en `mode="server"` (ahí filtrar es responsabilidad de la app). Sin
  debounce interno.
- `mode: input<'client' | 'server'>`: default `'client'` (ordena/pagina
  `data()` internamente, sin cambios respecto a antes). `'server'`: la
  grilla renderiza `data()` tal cual llega, sin ordenar ni cortar; reporta
  `currentPage`/`sortState` para que la app haga el fetch real. Fijo
  durante la vida del componente.
- `totalCount: input<number>`: total de filas real, requerido en la
  práctica solo en `mode="server"` (`console.error` si falta).
- `currentPage: model<number>`: página actual, 1-based. Bidireccional en
  los dos modos, solo relevante bindear desde afuera en `mode="server"`.
- `sortState: model<DataGridSortState<T>>`: orden actual
  (`{ key: string; direction: 'asc' | 'desc' } | null`). Mismo criterio
  que `currentPage`.
- `selectable: input<boolean>`: default false. Agrega la columna propia
  de checkbox (header "seleccionar todo" + uno por fila). Requiere
  `rowKey`; sin él, `console.error` y se trata como false.
- `rowKey: input<((row: T) => string | number) | undefined>`: identificador
  estable de fila, usado como clave en `selection`. Requerido en la
  práctica si `selectable` es true.
- `selection: model<Set<string | number>>`: claves seleccionadas, en
  todas las páginas, no solo la actual. Bidireccional. No se purga sola
  cuando una fila deja de estar cargada; la app la limpia si hace falta.
  "Seleccionar todo" opera solo sobre `paginatedData()` (la página
  actual ya filtrada/ordenada), nunca sobre el dataset completo.
- `loading: input<boolean>`: default false. Muestra el estado de carga en
  lugar de las filas, sin importar el tamaño de `data()`. Tiene prioridad
  sobre el estado vacío.
- `loadingTemplate: input<TemplateRef<void> | undefined>` /
  `emptyTemplate: input<TemplateRef<void> | undefined>`: contenido
  custom para cada estado, sin contexto/`$implicit` (primer template de
  esta librería sin fila asociada). Sin ellos, texto default vía
  `DATA_GRID_MESSAGES`.
- `rowClick: output<T>`: emite el registro clickeado
- `DataGridModule`: wrapper NgModule para consumidores con arquitectura
  NgModule clásica (`imports: [DataGrid]`, `exports: [DataGrid]`). El
  componente standalone sigue siendo la forma recomendada de consumo;
  este módulo es solo compatibilidad hacia atrás.

## Modo servidor (`mode="server"`)

`currentPage` y `sortState` son `model()` en los dos modos (no solo en
server), incluyendo cuando `mode="client"`. Decisión tomada al agregar
el modo servidor: la alternativa (mantener `sortState` como signal
interno solo en client, model() solo en server) hubiera exigido dos
caminos de código distintos en `sortBy()`/`ariaSortFor()`/etc. según
`mode()`, además de dos tipos distintos para el mismo miembro de clase,
imposible de expresar en TypeScript sin un getter condicional. Un único
`model()` usado siempre es exactamente el mismo patrón que ya usa
`currentPage`: sin nada bindeado desde afuera, se comporta como el
signal interno que reemplaza, verificado con la suite completa de tests
de modo `client` sin modificar ninguna aserción.

## Selección de filas (`selectable`)

`[indeterminate]` del checkbox de header se resuelve con un binding de
propiedad normal de Angular (`[indeterminate]="pageSelectionState() === 'some'"`),
sin `ElementRef`/`viewChild` ni código imperativo: `indeterminate` es una
propiedad real del DOM de `HTMLInputElement` (no un atributo HTML
declarativo), y el binding de Angular ya setea propiedades del DOM
directamente cuando no coincide con un input de alguna directiva.
Confirmado con un test real que lee `checkbox.indeterminate` (la
propiedad, no el atributo) después de renderizar, no solo con lectura de
tipos.

`aria-checked="mixed"` se bindea solo cuando la selección de la página
es parcial (`[attr.aria-checked]="pageSelectionState() === 'some' ? 'mixed' : null"`);
en "todas" o "ninguna" no se setea el atributo, la semántica nativa del
checkbox (`checked`) ya alcanza.

## Estados de carga y vacío (`loading`)

`colspan` de la fila única de loading/empty usa `showSelectionColumn()`,
no `selectable()` a secas: si `selectable` es true pero `rowKey` no está
definido, la columna de checkbox no se renderiza (ver arriba), y contar
`selectable()` igual hubiera dejado el `colspan` de más por una columna
en ese caso puntual de configuración incompleta. Ajuste hecho al
implementar, no estaba en el prompt original tal cual.

El `[disabled]="loading()"` del checkbox por fila es, en la práctica,
inalcanzable hoy: mientras `loading()` es true, `<tbody>` completo se
reemplaza por la fila de estado (`@switch`), así que ninguna fila real
(ni su checkbox) llega a existir en el DOM para que ese binding importe.
Se dejó igual, por consistencia con lo pedido y por si en el futuro el
reemplazo deja de ser todo-o-nada, pero no hay (ni puede haber) un test
real que lo ejercite: no hay un checkbox de fila renderizado durante
loading para inspeccionar.

Mismo hallazgo de `NG0100` que ya apareció con `currentPage`/`sortState`
en modo servidor, esta vez con un input unidireccional común (`loading`),
no un `model()`: un host de test que reasigna un campo plano
(`this.loading = true`) y llama `detectChanges()` inmediatamente después
dispara `ExpressionChangedAfterItHasBeenCheckedError`. La causa exacta no
se investigó a fondo (no parecía depender de que `loading` sea
bidireccional, a diferencia del caso anterior), pero el mismo fix ya
conocido (usar `signal()` en el campo del host de test en vez de un
campo plano) lo resuelve igual. Aplica, en principio, a cualquier futuro
host de test de esta librería que reasigne un input plano del grid y
llame `detectChanges()` a continuación, sea o no bidireccional.
