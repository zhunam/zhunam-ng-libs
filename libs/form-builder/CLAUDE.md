# CLAUDE.md — Form Builder

## Finalidad de esta librería
Renderizar formularios reactivos dinámicos a partir de una configuración
declarativa, con validación nativa y cruzada entre campos, sin
dependencias de estilos externas.

## Alcance v1
Ver ROADMAP.md en esta misma carpeta para el detalle completo.

## Contrato de API pública
- `fields: input.required<FieldConfig<T>[]>` — configuración de campos
- `crossFieldValidators: input<CrossFieldValidator<T>[]>` — validadores
  declarativos a nivel de formulario (sin exponer ValidatorFn/AbstractControl
  de Angular)
- `formSubmit: output<T>` — emite los valores del formulario al enviar válido
