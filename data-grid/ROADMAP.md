# ROADMAP — Data Grid

## Fase 1 — v1 (en curso)

### Qué SÍ incluye
- Mostrar datos desde un array recibido por input
- Ordenamiento por una sola columna (asc/desc)
- Paginación 100% client-side
- Click en fila → emite el registro clickeado (rowClick)
- Configuración de columnas vía input

### Qué NO incluye
- Virtual scroll, export a Excel, drag & drop de columnas → Pro (repo privado)
- Selección múltiple con checkboxes → Pro (repo privado)
- Paginación server-side, ordenamiento multi-columna, filtros por columna → v2, sin decidir free/Pro todavía

### Tareas
- [ ] Generar librería con tags + ajustar peerDependencies
- [ ] Crear ColumnConfig<T> en models/
- [ ] Componente base: tabla estática con datos hardcodeados
- [ ] Implementar data/columns, iterar filas y columnas en el template
- [ ] Sorting: click en header + computed() para sortedData
- [ ] Paginación: computed() para paginatedData/totalPages + controles
- [ ] rowClick output
- [ ] Estilos encapsulados con CSS custom properties
- [ ] JSDoc completo de toda la API pública
- [ ] Tests unitarios (Vitest) de sorting y paginación
- [ ] Demo dentro de portfolio-showcase
- [ ] README.md de la librería
- [ ] Verificar build de producción
