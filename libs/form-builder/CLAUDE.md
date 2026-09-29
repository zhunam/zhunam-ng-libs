# CLAUDE.md: Form Builder

## Finalidad de esta librería
Renderizar formularios reactivos dinámicos a partir de una configuración
declarativa, con validación nativa y cruzada entre campos, sin
dependencias de estilos externas.

## Alcance v1
Ver ROADMAP.md en esta misma carpeta para el detalle completo.

## Contrato de API pública
- `fields: input.required<FieldConfig<T>[]>`: configuración de campos
- `columns: input<number>`: cantidad de columnas del grid en desktop
  (default 1), siempre colapsa a 1 columna en mobile
- `crossFieldValidators: input<CrossFieldValidator<T>[]>`: validadores
  declarativos a nivel de formulario (sin exponer ValidatorFn/AbstractControl
  de Angular)
- `serverErrors: input<Partial<Record<keyof T, string>>>`: errores del
  backend por campo, se muestran sin depender de touched/submitted y se
  auto-limpian en cuanto el usuario edita el valor de ese campo
- `submitLabel: input<string>`: texto custom del botón de submit
- `hideSubmit: input<boolean>`: default false, oculta el botón interno
  para que el consumidor dispare el submit desde su propia UI vía el
  método público `submit()`
- `loading: input<boolean>`: default false, deshabilita el botón interno
  y vuelve `submit()` un no-op mientras es true
- `value: input<T>`: valor externo aplicado al formulario sin
  reconstruirlo (`patchValue` con `emitEvent: false`)
- `mode: input<'submit' | 'live'>`: default 'submit'. 'live' además
  emite `valueChange` de forma continua mientras el formulario es válido
- `formSubmit: output<T>` / `valueChange: output<T>`: valores tipados
- `submit(): void`: método público, misma lógica que el botón interno
- `FormBuilderModule`: wrapper NgModule para consumidores con arquitectura
  NgModule clásica (`imports: [FormBuilder]`, `exports: [FormBuilder]`).
  El componente standalone sigue siendo la forma recomendada de consumo;
  este módulo es solo compatibilidad hacia atrás. El genérico `T` se
  sigue infiriendo correctamente por uso desde el binding `[fields]`,
  igual que en consumo standalone, verificado con `strictTemplates`
  (no hace falta ningún ajuste especial en el wrapper para preservarlo).

### `FieldConfig<T>`
- `key`/`label`/`type`/`placeholder`/`options`/`validators`/
  `defaultValue`/`colSpan`/`disabled`/`showPasswordToggle`: contrato
  base, ver `field-config.ts` para el detalle completo de cada uno.
- `appearance: 'default' | 'switch' | 'segmented'`: variante puramente
  visual. `'switch'` solo afecta `type: 'checkbox'`, `'segmented'` solo
  afecta `type: 'radio'`. Campo plano opcional, no una unión
  discriminada con `type` (mismo patrón que `showPasswordToggle`, ver
  sección de abajo).
- `hint: string`: texto de ayuda bajo el campo, oculto si hay error
  activo. `aria-describedby` apunta a uno u otro, nunca a ambos.
- `readonly: boolean`: atributo HTML nativo `readonly`, solo tiene
  efecto en text/number/email/password/date/textarea. Sin efecto en
  select/radio/checkbox (no simulado).
- `FieldOption.description: string`: texto de ayuda bajo una opción de
  radio puntual, con su propio id y `aria-describedby`.

## Decisión: `appearance` como campo plano, no unión discriminada

Evaluado en el bloque que agregó `appearance` (switch/segmented):
tipar `FieldConfig` como una unión discriminada por `type` (para que
`appearance: 'switch'` solo sea válido junto a `type: 'checkbox'` a
nivel de tipos) hubiera complejizado la forma pública de
`FieldConfig<T>` para un beneficio marginal. Se eligió en cambio un
campo opcional suelto, documentado como "solo tiene efecto con el
`type` correspondiente, cualquier otra combinación se ignora sin
error", exactamente el mismo patrón que `showPasswordToggle` ya usaba
(opcional, solo relevante para un `type` puntual, sin runtime warning
si se usa mal). Consistente con el resto de la librería, no un caso
nuevo.

## Switch y segmented: input real oculto, nunca `display: none`

El `<input type="checkbox">`/`<input type="radio">` real sigue
existiendo en el DOM para ambas variantes, con la clase `.sr-only`
(agregada por primera vez a esta librería, mismo patrón ya usado en
`@zhunam/data-grid`), nunca `display: none` (que sacaría el control
del árbol de accesibilidad y rompería foco/teclado/lectura de
pantalla por completo). El elemento visual (track+thumb para switch,
píldora para segmented) es un hermano decorativo que lee `:checked`
del input real vía CSS (`input:checked + .fb-switch-track` /
`input:checked + .fb-segmented-pill`), sin duplicar el estado en
TypeScript.

`accent-color` (la personalización de color ya existente para
radio/checkbox planos) deja de tener efecto visible una vez que el
checkbox nativo está oculto: el track/thumb del switch relee la misma
variable `--zhunam-accent` pero como `background-color` en vez de
`accent-color`, para preservar el mismo resultado de color que un
consumidor ya obtiene hoy overrideando esa property.

El color de la píldora segmentada activa reusa `--zhunam-primary`/
`--zhunam-primary-content`, el mismo par que ya usa `.fb-submit`: no es
solo una referencia visual a "Tabs" de `DESIGN.md` (que inspiró la
forma píldora y la transición de 300ms, usada literalmente en vez del
`--zhunam-transition-duration` propio de la librería, que es 150ms),
sino una reutilización directa de un color ya establecido dentro de
esta misma librería.

## `FormBuilderMessages`: sin miembros nuevos en este bloque

A diferencia del bloque de selección de filas de `@zhunam/data-grid`
(que sí agregó `selectAll()`/`selectRow()` a `DataGridMessages`), este
bloque (appearance/hint/description/readonly) **no agrega ningún
miembro nuevo a `FormBuilderMessages`**: `hint` y
`FieldOption.description` son texto provisto por el propio consumidor
en su `FieldConfig`/`FieldOption` (igual que `label`/`placeholder`), no
texto genérico que la librería tenga que traducir. No hay, por lo
tanto, la misma salvedad de "romper una implementación manual completa
de la interfaz de mensajes" que sí aplica en `data-grid`.
