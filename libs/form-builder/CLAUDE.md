# CLAUDE.md — Form Builder

## Finalidad de esta librería
Renderizar formularios reactivos dinámicos a partir de una configuración
declarativa, con validación nativa y cruzada entre campos, sin
dependencias de estilos externas.

## Alcance v1
Ver ROADMAP.md en esta misma carpeta para el detalle completo.

## Contrato de API pública
- `fields: input.required<FieldConfig<T>[]>` — configuración de campos
- `columns: input<number>` — cantidad de columnas del grid en desktop
  (default 1), siempre colapsa a 1 columna en mobile
- `crossFieldValidators: input<CrossFieldValidator<T>[]>` — validadores
  declarativos a nivel de formulario (sin exponer ValidatorFn/AbstractControl
  de Angular)
- `serverErrors: input<Partial<Record<keyof T, string>>>` — errores del
  backend por campo, se muestran sin depender de touched/submitted y se
  auto-limpian en cuanto el usuario edita el valor de ese campo
- `formSubmit: output<T>` — emite los valores del formulario al enviar válido
