# ROADMAP: Form Builder

## Phase 2: v1 (in progress)

### In scope
- Campos: text, number, email, password, textarea, select, radio, checkbox, date
- Configuración declarativa por código vía FieldConfig<T>
- Validación nativa de Angular por campo (required, min, max, minLength,
  maxLength, pattern, email)
- Validación cruzada a nivel de formulario (ej. confirmar password)
- formSubmit output con los valores tipados
- serverErrors: errores del backend por campo, mostrados sin depender de
  touched/submitted y con auto-limpieza al editar el campo
- Campos disabled individuales (excluidos de la validación nativa,
  incluidos igual en formSubmit vía getRawValue())
- Atributos ARIA (aria-invalid, aria-describedby, radiogroup) sincronizados
  con el mensaje de error activo de cada campo

### Out of scope
- UI visual drag & drop para armar formularios → Pro (private repo) o v2
- File upload, rich text editor, autocomplete con búsqueda, signature pad → Pro/v2
- Campos condicionales (mostrar/ocultar según otro campo) → v2, sin decidir free/Pro

### Tasks
- [x] Generar librería con tags + ajustar peerDependencies
- [x] Crear FieldConfig<T> y tipos relacionados
- [x] Componente base: renderizar campos desde el array de config
- [x] Implementar validación nativa por campo
- [x] Implementar validación cruzada (crossFieldValidators input)
- [x] formSubmit output con valores tipados
- [x] Estilos encapsulados con CSS custom properties
- [x] JSDoc completo en API pública
- [x] Unit tests
- [x] Demo consumiendo la librería en apps/portfolio-showcase
- [x] serverErrors input con auto-limpieza por campo
- [x] disabled por campo + formSubmit vía getRawValue()
- [x] Atributos ARIA (aria-invalid, aria-describedby, radiogroup) por campo
- [x] README público
- [x] Verificar build de producción
- [x] `FormBuilderModule` NgModule wrapper para consumidores NgModule
      clásicos → `libs/form-builder/src/lib/form-builder/form-builder.module.ts`,
      exportado desde `src/index.ts`. Cambio aditivo, sin breaking
      change al contrato standalone existente; todavía necesita bump de
      versión antes de republicar (nueva superficie pública). Se
      verificó empíricamente (spec temporal con un binding de tipo
      incorrecto, compilado con `strictTemplates`) que el genérico `T`
      se sigue infiriendo correctamente a través del NgModule, sin
      necesitar ningún ajuste especial. Resuelve la deuda técnica
      anotada en el ROADMAP.md raíz bajo "Future ideas".
- [x] `mode: input<'submit' | 'live'>('submit')` + `valueChange:
      output<T>`: modo en vivo, aditivo, activado explícitamente por el
      consumidor. Necesidad real detectada al intentar reusar la
      librería en `apps/portfolio-showcase` (fase 6, crypto-dashboard):
      `currency-converter` necesitaba valores en vivo mientras se
      escribe/selecciona, y el contrato existente (`formSubmit` solo al
      enviar) no lo permitía, ni siquiera parcialmente. Reusa
      `coerceNumberFields()`/cross-field validators ya existentes, sin
      exponer `FormGroup`/`AbstractControl` (respeta el principio de
      diseño ya documentado). Con `mode` en su default, comportamiento
      100% idéntico al existente, confirmado con test de regresión
      explícito. Sin dependencia nueva (`FormGroup.valueChanges` ya
      viene de `@angular/forms`). Todavía necesita bump de versión
      (minor) antes de republicar.
- [x] Renombradas todas las custom properties CSS al namespace
      compartido `--zhunam-*` (`--fb-primary-color` → `--zhunam-primary`,
      etc.), parte de una migración a nivel de workspace que unifica los
      roles de theming entre las 5 librerías `@zhunam/*`, para que un
      consumidor que use más de una vea el mismo nombre por rol en vez
      de un prefijo distinto por librería. Se agregó además
      `--zhunam-primary-content` (nueva, no un rename) para el color de
      texto de `.fb-submit`, que antes era `color: #fff` hardcodeado:
      corrige un bug de contraste latente si un consumidor retematiza
      `--zhunam-primary` a un color claro. `--fb-columns` no se tocó: no
      es una custom property de tema, es el canal interno por el que el
      componente pasa su input `columns` al grid vía
      `[style.--fb-columns]`. Todo `var()` ganó además un fallback en
      línea con el mismo valor que su `:host`. Sin alias de
      compatibilidad hacia los nombres viejos (breaking change, bump de
      versión major). Tabla completa de renames en `CHANGELOG.md`.
- [x] Botón de envío configurable (`submitLabel`, `hideSubmit`,
      `loading`, método público `submit()`) + `--zhunam-submit-width`;
      toggle de mostrar/ocultar contraseña en campos `password`
      (`showPasswordToggle` por campo, `messages.showPassword()` /
      `hidePassword()`); `--zhunam-accent` independiente de
      `--zhunam-primary` para el accent-color de radio/checkbox; input
      `value: input<T>` para aplicar un valor externo sin recrear el
      formulario (`patchValue` con `emitEvent: false`, nunca dispara
      `valueChange` en modo `'live'`); y `formGroup` migrado de
      `computed()` a `linkedSignal()` para que un rebuild de `fields()`
      conserve el valor de cada control cuya key sigue existiendo, en
      vez de resetearlo a `defaultValue` (breaking change de
      comportamiento, sin cambio de forma en la API pública existente).
      `currency-converter` (`apps/portfolio-showcase`) migrado para usar
      `value` en su swap en vez de reconstruir `fields()` con nuevos
      `defaultValue`, mismo resultado visible. Todavía necesita bump de
      versión (major, por el cambio de comportamiento en el rebuild) y
      republicación antes de que un consumidor externo lo reciba.

## Phase 3: switch, segmented, hints, and read-only fields (done)

### In scope

- `FieldConfig.appearance` (`'default' | 'switch' | 'segmented'`):
  purely visual variant, `'switch'` only for `type: 'checkbox'`,
  `'segmented'` only for `type: 'radio'`.
- `FieldConfig.hint` and `FieldOption.description`: helper text at the
  field and per-option level, with `aria-describedby` wired to
  whichever is currently relevant.
- `FieldConfig.readonly`: native HTML `readonly`, only where it
  natively applies (text/number/email/password/date/textarea).

### Out of scope

- A lock icon or any other decorative indicator for `readonly`:
  evaluated, not added. The design system has no existing visual
  treatment that makes `readonly` perceptible today (browsers render a
  `readonly` field identically to a normal one, no default dimming
  unlike `disabled`), so this is a real gap, but adding a decorative
  icon without evidence it's the right fix wasn't in scope for this
  task; a minimal `:read-only` CSS treatment would be a cheaper,
  non-decorative alternative worth a future task.
- Any new `FormBuilderMessages` member: `hint`/`description` are
  consumer-authored text (like `label`/`placeholder`), not generic
  library text needing translation.

### Tasks

- [x] `FieldAppearance` type + `FieldConfig.appearance`, flat optional
      field (not a discriminated union tied to `type`), same pattern
      already used by `showPasswordToggle`
      → `field-config.ts`
- [x] Switch: `.sr-only` class added to this library for the first
      time (same technique `@zhunam/data-grid` already uses), the real
      checkbox input stays in the DOM, visually hidden, a decorative
      track+thumb sibling reads `:checked` via CSS, no state duplicated
      in TypeScript; `--zhunam-accent` reapplied as the track's
      `background-color` instead of `accent-color`, since the latter
      has no visible effect once the native box is hidden
      → `form-builder.html`, `form-builder.scss`
- [x] Segmented: same `.sr-only` technique for radio inputs, pill
      styling matches DESIGN.md's "Tabs" pattern (shape, colors, 300ms
      transition used literally instead of this library's own 150ms
      `--zhunam-transition-duration`); the active pill reuses
      `--zhunam-primary`/`--zhunam-primary-content`, the same pair
      `.fb-submit` already uses; new `--zhunam-segmented-bg` custom
      property for the inactive pill fill
      → `form-builder.html`, `form-builder.scss`
- [x] `hint`/`hintId()`/`describedByFor()`: single source of truth for
      a field's `aria-describedby`, refactored out of the ternary that
      used to be repeated in every `@switch` case
      → `form-builder.ts`, `form-builder.html`
- [x] `FieldOption.description`/`optionDescriptionId()`/
      `optionDescribedByFor()`: per-option id, combined with the
      field-level id via a space-separated `aria-describedby` when both
      apply
      → `field-config.ts`, `form-builder.ts`, `form-builder.html`
- [x] `readonly` applied via `[readOnly]` on the four `@switch` cases
      where it natively works (`@default`, `password`, `textarea`);
      deliberately not bound at all on `select`/`radio`/`checkbox`,
      where the native property doesn't exist
      → `form-builder.html`
- [x] Unit tests: switch/segmented rendering and real
      checkbox/radio behavior (click toggles, `requiredTrue`/grouping
      unaffected), hint shown/hidden by error with `aria-describedby`
      switching correctly, option description id and combined
      `aria-describedby`, `readonly` on all 6 supported types
      (attribute present, `FormControl` still enabled, validation still
      runs, value still submitted) and explicitly no effect on
      `select`/`radio`/`checkbox`
      → `form-builder.spec.ts`
- [x] README "Switch and segmented appearance", "Field hints and
      option descriptions", "Read-only fields" sections; JSDoc on every
      new/changed public member
      → `libs/form-builder/README.md`, `field-config.ts`
- [x] Verified production build (both `form-builder` and
      `portfolio-showcase`), lint clean, and a real-browser Playwright
      check of the switch (click/Space), the segmented control (click
      per option, Tab/arrow keyboard navigation), and the hint
      disappearing when the field becomes invalid
      → see `CHANGELOG.md` `[Unreleased]`
