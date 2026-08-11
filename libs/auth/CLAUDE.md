# CLAUDE.md — Auth

## Finalidad de esta librería
Wrapper delgado y unificado sobre Firebase Auth y Supabase Auth (elegís
uno vía entry point secundario), con estado reactivo del usuario actual,
Route Guard listo para usar, y sin implementar ninguna lógica propia de
criptografía/sesión — toda la seguridad real la maneja el proveedor
elegido, no esta librería.

## Alcance v1
Ver ROADMAP.md en esta misma carpeta para el detalle completo.

## Contrato de API pública (núcleo, libs/auth/src)
- `AuthUser` — interfaz nativa (uid, email, emailVerified), sin exponer
  tipos de Firebase/Supabase.
- `AuthState` — signal/observable readonly con el usuario actual (o null).
- `AuthService` (abstracta/interfaz) — signIn, signUp, signOut,
  resetPassword — implementada por cada entry point de proveedor.
- `authGuard` — Angular Route Guard funcional, redirige si no hay sesión.

## Entry points secundarios
- `@zhunam/auth/firebase` — implementación sobre Firebase Auth.
- `@zhunam/auth/supabase` — implementación sobre Supabase Auth.
- `@zhunam/auth/form-ui` — login/registro prearmados, usa @zhunam/form-builder
  (peerDependency opcional, solo de este entry point).
