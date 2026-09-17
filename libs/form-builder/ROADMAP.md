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
