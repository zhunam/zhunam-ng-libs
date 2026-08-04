# ROADMAP — Form Builder

## Phase 2 — v1 (in progress)

### In scope
- Campos: text, number, email, password, textarea, select, radio, checkbox, date
- Configuración declarativa por código vía FieldConfig<T>
- Validación nativa de Angular por campo (required, min, max, minLength,
  maxLength, pattern, email)
- Validación cruzada a nivel de formulario (ej. confirmar password)
- submit output con los valores tipados

### Out of scope
- UI visual drag & drop para armar formularios → Pro (private repo) o v2
- File upload, rich text editor, autocomplete con búsqueda, signature pad → Pro/v2
- Campos condicionales (mostrar/ocultar según otro campo) → v2, sin decidir free/Pro

### Tasks
- [x] Generar librería con tags + ajustar peerDependencies
- [ ] Crear FieldConfig<T> y tipos relacionados
- [ ] Componente base: renderizar campos desde el array de config
- [ ] Implementar validación nativa por campo
- [ ] Implementar validación cruzada (crossFieldValidators input)
- [ ] submit output con valores tipados
- [ ] Estilos encapsulados con CSS custom properties
- [ ] JSDoc completo en API pública
- [ ] Unit tests
- [ ] Demo consumiendo la librería en apps/portfolio-showcase
- [ ] README público
- [ ] Verificar build de producción
