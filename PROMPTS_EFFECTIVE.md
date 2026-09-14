# Prompts Efectivos — Guía para trabajar con Claude

Este documento captura los patrones de prompts que **realmente funcionan** en este proyecto. No es genérico: cada ejemplo se probó y dejó evidencia de por qué fue efectivo.

## Patrón fundamental

**Ningún prompt debe dejar ambigüedad.** Los prompts que menos funcionaron fueron los que dejaban una decisión de interpretación a mi criterio. Los que sí funcionaron compartían:

1. **Especificaciones verificables** (convertibles a tests, no a descripciones vagas)
2. **Precedentes del repo** (citan algo que ya existe, no lo infieren)
3. **División clara de responsabilidades** (quién hace qué)
4. **Criterios de aceptación binarios** (o pasa o no pasa, sin zona gris)

---

## Ejemplo 1: Implementación de código (models + services)

**Contexto real**: Generar `models/coin.ts` + `services/coingecko.ts` para crypto-dashboard.

### Prompt (resumen, el original tenía 5 secciones):

```
Verificar cada firma contra los hallazgos ya confirmados en ROADMAP.md 
(no reinvestigar, ya está hecho).

CryptoCoin (id, symbol, name, image, currentPrice, rank, 
changePercentage24h, sparkline: number[])

Caché en memoria por clave (endpoint + params serializados), 
TTL de 45s, invalidable manualmente.

Cola simple: cualquier request real espera al menos 1.5s desde 
el último request real disparado.

Tests reales (vitest):
- Caché: dos llamadas a getMarkets() con los mismos params dentro 
  de la ventana de 45s disparan un solo fetch real (spy)
- getMarketChart(coinId, 'usd', 400) rechaza sin llegar a hacer fetch...
```

### Por qué funcionó:

✅ **Especificaciones verificables**: Cada comportamiento es una aserción de test ("dos llamadas disparan un solo fetch"), no "tenga caché". Eso convierte la especificación en criterio de aceptación binario.

✅ **Separó "no reinvestigues" de "verifica"**: "Verificar cada firma contra ROADMAP.md (no reinvestigar)" evitó trabajo redundante sin sacrificar rigor donde hacía falta.

✅ **Cero ambigüedad de tipos**: Cada campo del modelo y cada comportamiento del servicio estaba expresado como una aserción verificable.

**Resultado**: Implementación de punta a punta (tipos + servicio + 12 tests) sin ninguna ronda de ida y vuelta por ambigüedad de contrato.

---

## Ejemplo 2: Límite de seguridad

**Contexto real**: Usar la clave Demo real de CoinGecko durante investigación, sin que se filtre.

### Prompt (verbatim):

```
La clave Demo de CoinGecko del usuario está en su entorno local; 
usarla solo para las pruebas de este prompt, nunca commitearla en 
ningún archivo, nunca imprimirla en el reporte final.
```

### Por qué funcionó:

✅ **Una oración, tres restricciones explícitas y no ambiguas**:
- Dónde sí usarla (pruebas de este prompt)
- Dónde nunca escribirla (ningún archivo, nunca commitearla)
- Qué nunca mostrar (no en el reporte)

✅ **Sin casos borde a mi criterio**: Un límite de seguridad NECESITA esto, no puede haber zona gris.

**Resultado**: Usé la clave exactamente donde hacía falta, nunca la filteré.

---

## Ejemplo 3: Decisión de arquitectura (con precedente y trade-off)

**Contexto real**: ¿La clave de CoinGecko va commiteada o en .env?

### Prompt (verbatim, abreviado):

```
La clave real de CoinGecko va commiteada directo en environment.ts 
Y environment.production.ts (mismo valor en ambos), con un comentario 
explicando por qué es seguro (clave Demo pública, no un secreto de 
pago, mismo criterio ya aplicado al Client ID de Google en calendar).

El usuario va a pegar el valor real él mismo directamente en el archivo, 
vos dejá el placeholder con instrucción clara de qué reemplazar.
```

### Por qué funcionó:

✅ **Trajo el precedente en vez de dejarlo inferir**: "Mismo criterio ya aplicado al Client ID de Google" en vez de hacer que lo busque.

✅ **Reconoció el trade-off en voz alta**: "Clave Demo pública, no un secreto de pago" en lugar de ignorar por qué es seguro.

✅ **Separó quién hace qué con precisión**: Usuario pega el valor real, yo dejo el placeholder. Una decisión de este tipo dada como hecho consumado, con la justificación incluida, es más rápida de ejecutar que una pregunta abierta.

**Resultado**: Decisión ejecutada sin ronda de clarificación.

---

## Ejemplo 4: Investigaciones API (reutilizando criterio)

**Contexto real**: Investigar `/global` y `/search/trending` de CoinGecko.

### Prompt (verbatim, abreviado):

```
Investigación complementaria de API, mismo criterio de siempre 
(evidencia real, nunca memoria/documentación).

GET /global y GET /search/trending contra la API real con la clave Demo.
```

### Por qué funcionó:

✅ **"Mismo criterio de siempre" delega correctamente en contexto ya acordado**: Sin gastar espacio reexplicándolo.

✅ **Alcance muy acotado**: Dos endpoints, nada más. Resultado fácil de verificar contra lo pedido.

**Resultado**: Investigación empírica clara, con evidencia real documentada.

---

## Ejemplo 5: Control de progreso (checkpoint)

**Contexto real**: Detener antes de continuar sin commitear.

### Prompt (verbatim):

```
Antes de continuar dame el commit sugerido.
```

### Por qué funcionó:

✅ **Corto e interrumpe en el punto exacto**: Antes de acumular cambios sin commitear.

✅ **Se apoya en una regla ya establecida**: Yo nunca commiteo, solo sugiero el mensaje. Así que no tuvo que explicar nada, solo activar el hábito.

**Resultado**: Checkpoint claro, sin ambigüedad sobre cuándo.

---

## Ejemplo 6: Implementación con investigación previa (PDF generator)

**Contexto real**: Exponer `result` en PdfPreviewComponent.

### Prompt (resumen):

```
1. libs/pdf-generator/src/lib/pdf-preview/pdf-preview.ts:
   - Agregar un signal privado resultSignal = signal<PdfResult | null>(null)
     y su readonly result = this.resultSignal.asReadonly(), expuesto públicamente.
   - Dentro del effect() existente, en el mismo bloque try donde hoy se
     asigna safeUrl tras una generación exitosa, asignar también
     resultSignal.set(result) con el PdfResult real que ya devuelve
     generatePdf(), sin generar nada extra, es el mismo objeto que ya
     se usa para sacar el blob.
   - NO limpiar resultSignal en el catch ni al arrancar un nuevo
     intento (a diferencia de error, que sí se resetea): debe conservar
     el último PdfResult exitoso hasta que uno nuevo lo reemplace,
     mismo comportamiento que ya tiene safeUrl.
   - JSDoc explícito: result es el mismo PdfResult que generó el
     contenido actualmente visible en el iframe, expuesto para que el
     consumidor pueda agregar sus propias acciones (botón de descarga,
     abrir en pestaña nueva, adjuntar a un email) sin disparar una
     segunda generación completa.

2. pdf-preview.spec.ts, agregar:
   - result() es null antes de la primera generación exitosa.
   - Tras una generación exitosa, result() es el PdfResult real
     (no un mock nuevo, el mismo que resolvió generatePdf).
   - Condición de carrera (mismo patrón ya usado para safeUrl/status):
     dos cambios rápidos de input, la primera generación resuelve
     después que la segunda, result() final corresponde a la segunda,
     nunca la primera pisa a la segunda.
   - Un segundo intento que falla DESPUÉS de un primer intento exitoso:
     result() conserva el PdfResult del primer intento exitoso,
     no se limpia a null pese a que error() sí se puebla.

3. libs/pdf-generator/README.md:
   - Agregar result a la documentación pública de PdfPreviewComponent.
   - Agregar un ejemplo de uso mostrando el patrón de botón de descarga.

4. libs/pdf-generator/CHANGELOG.md: entrada en [Unreleased] → ### Added
   para PdfPreview.result. Aclarar que es un cambio aditivo, no rompe
   nada existente.

5. apps/portfolio-showcase/.../pdf-generator-demo/: agregar un botón
   "Download" siguiendo exactamente el patrón de arriba (#preview,
   [disabled]="!preview.result()",
   (click)="preview.result()?.download('invoice.pdf')"), ubicado junto
   al panel de preview, consistente con DESIGN.md.

6. Verificar:
   nx build pdf-generator --configuration=production
   nx lint pdf-generator
   [en WSL] nx test pdf-generator
   nx build portfolio-showcase --configuration=production

7. Verificación manual: confirmar que el botón Download está deshabilitado
   hasta la primera generación exitosa, habilitado después, y que clickearlo
   dispara una descarga real.
```

### Por qué funcionó:

✅ **Especificación en múltiples niveles**:
- Código: qué asignar, dónde, qué NO limpiar (contraste explícito)
- Tests: comportamientos verificables (condición de carrera, persistencia en error)
- Documentación: qué va en README, CHANGELOG
- Verificación: qué build, lint, test, manual

✅ **Cita precedentes**: "Mismo patrón ya usado para safeUrl/status" en lugar de inventar uno nuevo.

✅ **Divide trabajo en 7 pasos claros**: Cada paso es independiente y verificable.

**Resultado**: Implementación completa (código, tests, docs, demo, verificación) en una sola pasada.

---

## Ejemplo 7: Corrección con investigación de dependencia externa

**Contexto real**: PdfTableColumn.width existe en el tipo pero se ignora en silencio.

### Prompt (resumen):

```
1. Antes de escribir código: confirmar contra pdfmake real (docs/tipos
   instalados) qué acepta el array widths de una tabla: números (puntos),
   el string 'auto', el string '*', y confirmar qué pasa si el array se
   omite por completo (cuál es el default real de pdfmake sin esa clave,
   para asegurar que el caso "ninguna columna define width" siga produciendo
   EXACTAMENTE el mismo resultado que hoy, cero regresión).

2. En el compilador (compile-template.ts): al construir el bloque de tabla,
   derivar el array widths a partir de block.columns:
   - Si NINGUNA columna define width: no incluir la clave widths en
     absoluto (preserva el comportamiento actual tal cual, ESTE CASO
     TIENE QUE QUEDAR IDÉNTICO A COMO ESTÁ HOY).
   - Si AL MENOS UNA columna define width: construir un array de la
     misma longitud que columns, con el número de puntos para cada
     columna que lo definió y 'auto' para las que no.

3. Tests nuevos:
   - Ninguna columna con width: el docDefinition resultante NO tiene
     la clave widths (test de regresión explícito, no solo "sigue pasando").
   - Todas las columnas con width: array de números en el orden correcto.
   - Mezcla (algunas con width, otras sin): array con números y 'auto'
     intercalados en el orden correcto.

4. Verificar que el template de la demo ya tiene columnas con width
   definido (Qty, Unit price, Total) y una sin (Description): con este fix,
   esos valores ahora se van a aplicar de verdad por primera vez. Confirmar
   con el mismo método de extracción de posiciones Tm ya usado que la tabla
   se sigue viendo bien (nada cortado, superpuesto), ajustar los valores
   de width en el template de la demo si el resultado se ve peor.

5. Verificar:
   nx build pdf-generator --configuration=production
   nx lint pdf-generator
   [en WSL] nx test pdf-generator
   nx build portfolio-showcase --configuration=production

6. libs/pdf-generator/CHANGELOG.md: entrada en [Unreleased] → ### Fixed
   (PdfTableColumn.width ahora se respeta, antes se ignoraba).
   libs/pdf-generator/ROADMAP.md: nota breve documentando que este campo
   estuvo muerto hasta esta corrección.

Reportar resultado y CONFIRMAR EXPLÍCITAMENTE que el caso sin ningún
width definido produce un docDefinition byte-a-byte igual al de antes
de este cambio.
```

### Por qué funcionó:

✅ **Investigación primero, código después**: Verifica contra la API real de pdfmake, no asume.

✅ **Casos explícitos**: nil, algunos, todos. No "soporte widths".

✅ **Test de regresión explícito**: "NO tiene la clave widths (test de regresión explícito, no solo 'sigue pasando')". Distingue entre "sigue pasando" y "sin regresión verificada".

✅ **Confirmación manual visual**: Verifica que el resultado se ve bien, no solo que compila.

✅ **Confirmación final de no-regresión**: "Confirmar EXPLÍCITAMENTE que el caso sin ningún width... produce un docDefinition byte-a-byte igual al de antes". Sin eso, no estaría 100% seguro.

**Resultado**: Corrección de bug muerto sin introducir regresión.

---

## Template: Cómo escribir un prompt efectivo

Usa este template según el tipo de tarea:

### Para IMPLEMENTACIÓN (código + tests):

```markdown
## [Archivo/Componente]: [Descripción breve]

### Código:
- [Archivo:línea] — Qué cambiar y por qué en una frase
  - Detalle 1 (si hay ambigüedad, convierte en test verificable)
  - Detalle 2 (cita precedentes del repo, no inventos nuevos)

### Tests:
- [Comportamiento 1]: Aserción verificable
- [Comportamiento 2]: Aserción verificable (especialmente casos edge)

### Documentación:
- [README/JSDoc]: Qué agregar/actualizar

### Verificación:
- nx build [proyecto] --configuration=production
- nx lint [proyecto]
- [en WSL] nx test [proyecto]

### Verificación manual:
- [Criterio observable, no solo "verifica que funciona"]
```

### Para DECISIÓN (arquitectura/scope):

```markdown
## Problema: [Qué decisión se necesita]

### Opciones consideradas:
1. Opción A — Pro: X, Con: Y
2. Opción B — Pro: X, Con: Y

### Precedente en el repo:
[Dónde se aplicó algo similar antes]

### Trade-off:
[Qué se gana/pierde con la decisión elegida]

### Decisión:
[Haz X porque Y, no Z porque...]

### Implementar:
[Quién hace qué, en qué orden]
```

### Para INVESTIGACIÓN (API, librería, feature):

```markdown
## Investigar: [Qué se desconoce]

### Criterio:
Evidencia real, nunca memoria/documentación. 
[O repite el criterio acordado: "mismo criterio que...]

### Qué verificar:
- [Claim A] contra la API/docs/código real
- [Claim B] contra la API/docs/código real

### Reportar:
[Qué debe incluir el reporte: evidencia real, no suposiciones]
```

---

## Checklist antes de enviar un prompt

- [ ] ¿Puedo convertir cada requisito en un test o criterio verificable?
- [ ] ¿Cite un precedente del repo o lo estoy inventando?
- [ ] ¿Dejé alguna decisión a criterio en lugar de especificarla?
- [ ] ¿Dividí el trabajo en pasos claros?
- [ ] ¿Incluí cómo verificar que está correcto (test, build, manual)?
- [ ] ¿Si es una decisión, expliqué el trade-off en voz alta?

---

## Patrón común en todos: **Cero ambigüedad**

Los prompts que funcionaron compartían una cosa: **no dependían de que yo adivinara el criterio correcto.** O bien:
- Citaban un precedente ya en el repo
- Convertían el requisito en algo verificable (un test, una firma exacta, un "tiene que quedar idéntico")
- Activaban una regla de proceso ya acordada de antemano

Si tu prompt tiene una zona gris "usa tu criterio aquí", es un prompt que va a necesitar una ronda de clarificación. Los mejores prompts los evitan.
