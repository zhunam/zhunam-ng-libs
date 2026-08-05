# ROADMAP — Form Builder

## Phase 2 — v1 (in progress)

### In scope
- Campos: text, number, email, password, textarea, select, radio, checkbox, date
- Configuración declarativa por código vía FieldConfig<T>
- Validación nativa de Angular por campo (required, min, max, minLength,
  maxLength, pattern, email)
- Validación cruzada a nivel de formulario (ej. confirmar password)
- formSubmit output con los valores tipados

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
- [ ] Demo consumiendo la librería en apps/portfolio-showcase
- [ ] README público
- [ ] Verificar build de producción
