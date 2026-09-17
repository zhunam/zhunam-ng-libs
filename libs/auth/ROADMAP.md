# ROADMAP: Auth

## Phase 3: v1 (in progress)

### In scope
- Email + contraseña como único método de autenticación (social login
  queda para v2)
- AuthUser con emailVerified expuesto como dato: la librería NUNCA
  bloquea el login por email sin verificar, el consumidor decide qué
  hacer con ese campo
- Dos entry points de proveedor: @zhunam/auth/firebase y
  @zhunam/auth/supabase, cada uno con su propio peerDependency del SDK
  correspondiente (@angular/fire, @supabase/supabase-js). El núcleo
  (@zhunam/auth) no depende de ninguno de los dos
- Entry point opcional @zhunam/auth/form-ui con login/registro
  prearmados usando @zhunam/form-builder (peerDependency opcional de
  ESE entry point únicamente)
- authGuard: Angular Route Guard funcional, protege rutas redirigiendo
  si no hay sesión activa
- resetPassword (recuperación de contraseña) vía el flujo nativo de
  cada proveedor

### Out of scope
- Login social (Google, GitHub, etc.) → v2
- Multi-factor authentication (MFA) → v2, evaluar si es free o Pro
- Roles/permisos granulares más allá de autenticado/no-autenticado → v2
- Verificación de email forzada/bloqueante → decisión de diseño explícita,
  NO se va a implementar; el consumidor decide sobre el campo
  emailVerified expuesto

### Tasks
- [x] Generar librería con tags + ajustar peerDependencies
- [x] Definir AuthUser, AuthState, y la interfaz base de AuthService
- [x] Entry point firebase/: implementación real sobre Firebase Auth
- [x] Entry point supabase/: implementación real sobre Supabase Auth
- [x] authGuard funcional
- [x] Entry point form-ui/: login + registro con form-builder
- [x] Estilos encapsulados con CSS custom properties (form-ui)
- [x] JSDoc completo en API pública de cada entry point
- [x] Unit tests
- [x] Demo consumiendo la librería en apps/portfolio-showcase
- [x] README público (documentar claramente los 4 entry points y cuál
      instalar según el caso)
- [x] Verificar build de producción de cada entry point
- [x] CHANGELOG.md desde el inicio (según la nueva regla de AGENTS.md)
- [x] `AuthFormsModule` NgModule wrapper para consumidores NgModule
      clásicos → `libs/auth/form-ui/src/lib/auth-forms.module.ts`,
      exportado desde `form-ui/src/index.ts`. Un solo módulo combinado
      (no uno por componente) porque un flujo de auth típico necesita
      login, registro, y reset password juntos, y el tree-shaking no se
      ve afectado por agruparlos en un mismo NgModule. `core`, `firebase/`,
      y `supabase/` no exponen componentes, así que no necesitan wrapper.
      Cambio aditivo, sin breaking change. Resuelve la deuda técnica
      anotada en el ROADMAP.md raíz bajo "Future ideas".
- [x] Renombradas todas las custom properties CSS de `form-ui/` al
      namespace compartido `--zhunam-*` (`--auth-error-color` →
      `--zhunam-error`, etc.), parte de una migración a nivel de
      workspace que unifica los roles de theming entre las 5 librerías
      `@zhunam/*`. Los campos de formulario en sí, renderizados por
      `<lib-form-builder>`, ya usaban las propiedades de esa librería y
      quedan afectados solo por su propio rename (ver el CHANGELOG.md de
      `@zhunam/form-builder`), no por este cambio directamente. El
      peerDependency `@zhunam/form-builder` se subió a `^2.0.0` (era
      `^1.0.0`), requerido para que `form-ui` reciba las `--zhunam-*` de
      esa librería. Todo `var()` ganó además un fallback en línea con el
      mismo valor que su `:host`. Sin alias de compatibilidad hacia los
      nombres viejos (breaking change, bump de versión major). Tabla
      completa de renames en `CHANGELOG.md`.
