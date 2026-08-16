import { NgModule } from '@angular/core';
import { FormBuilder } from './form-builder';

/**
 * NgModule wrapper for `FormBuilder<T>`, for consumers still on a
 * classic NgModule architecture. `FormBuilder` is a standalone
 * component; importing it directly (`imports: [FormBuilder]`) is still
 * the recommended way to consume this library. Use this module only if
 * your app doesn't use standalone components yet.
 *
 * The generic type parameter `T` is inferred per usage from the bound
 * `[fields]` input, the same way it is with standalone consumption:
 * this module only changes how the component is imported, not how its
 * generic is resolved.
 *
 * @example
 * @NgModule({
 *   imports: [FormBuilderModule],
 * })
 * export class SignupPageModule {}
 */
@NgModule({
  imports: [FormBuilder],
  exports: [FormBuilder],
})
export class FormBuilderModule {}
