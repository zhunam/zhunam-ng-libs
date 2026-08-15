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
- [ ] README público (documentar claramente los 4 entry points y cuál
      instalar según el caso)
- [ ] Verificar build de producción de cada entry point
- [ ] CHANGELOG.md desde el inicio (según la nueva regla de AGENTS.md)
