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
- `AuthUser` — interfaz nativa (uid, email, emailVerified, displayName),
  sin exponer tipos de Firebase/Supabase ni tokens/credenciales.
- `AuthService` (interfaz) — el estado reactivo del usuario actual vive
  acá directamente como `currentUser: Signal<AuthUser | null>` y
  `isAuthenticated: Signal<boolean>` (no existe un tipo `AuthState`
  separado), más `signIn`, `signUp`, `signOut`, `resetPassword`,
  `getIdToken` — implementada por cada entry point de proveedor, el
  núcleo solo define el contrato.
- `AUTH_SERVICE` — `InjectionToken<AuthService>` sin factory por defecto.
  Cada entry point de proveedor registra su implementación bajo este
  token; `authGuard` y cualquier consumidor lo inyectan igual sin
  importar qué proveedor se eligió.
- `authGuard` — Angular Route Guard funcional, redirige si no hay sesión.
- `AUTH_LOGIN_PATH` — `InjectionToken<string>` configurable, ruta de login
  a la que redirige `authGuard` (`/login` por default).

## Entry points secundarios
- `@zhunam/auth/firebase` — implementación sobre Firebase Auth (SDK
  modular `firebase`, no `@angular/fire`). Expone `provideFirebaseAuth(config)`
  y `FirebaseAuthConfig`. El peerDependency `firebase` vive en la raíz de
  `libs/auth/package.json` marcado `optional` vía `peerDependenciesMeta`
  — ng-packagr publica un único `package.json` para todos los entry
  points, no hay forma nativa de aislar un peerDependency a un solo
  subpath (mismo patrón que usa `@angular/fire`).
- `@zhunam/auth/supabase` — implementación sobre Supabase Auth (`@supabase/supabase-js`).
  Expone `provideSupabaseAuth(config)` y `SupabaseAuthConfig`. Mismo
  patrón de peerDependency opcional en la raíz vía `peerDependenciesMeta`
  que `firebase`. A diferencia de Firebase, Supabase no tiene un campo
  `displayName` de primera clase: se lee de `user_metadata.full_name` o
  `user_metadata.name` (lo que exista), cae a `null` si no hay ninguno —
  ver el comentario en `toAuthUser()` del entry point. Los errores de
  Supabase no se lanzan como excepción (vienen como `{ data, error }`);
  la implementación los relanza (`throw error`) sin traducirlos, para
  cumplir el contrato de `AuthService` (Promise que rechaza) sin alterar
  el objeto de error real.
- `@zhunam/auth/form-ui` — login/registro prearmados, usa @zhunam/form-builder
  (peerDependency opcional, solo de este entry point).
