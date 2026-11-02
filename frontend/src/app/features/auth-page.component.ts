import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ReportsService } from '../core/reports.service';
import type { DemoConfig } from '../core/models';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-layout">
      <div class="auth-side">
        <a class="brand auth-brand" routerLink="/"><span class="brand-mark">C</span><span>Campus<span class="brand-accent">Find</span></span></a>
        <div><span class="eyebrow">GOOD THINGS FIND THEIR WAY BACK</span><h1>Be part of the<br /><span>return story.</span></h1><p>Join your campus community and make lost-and-found a little more human.</p></div>
        <div class="auth-quote"><span>“</span><p>A small act can make a big difference to someone’s day.</p></div>
      </div>
      <div class="auth-main">
        <div class="auth-form-wrap">
          <span class="eyebrow">{{ registering ? 'GET STARTED' : 'WELCOME BACK' }}</span>
          <h2>{{ registering ? 'Create your account' : 'Log in to CampusFind' }}</h2>
          <p class="form-intro">{{ registering ? 'Join with your university email and help keep campus connected.' : 'Pick up where you left off.' }}</p>
          @if (error) { <div class="notice notice-error" role="alert">{{ error }}</div> }
          @if (!registering && demoConfig?.enabled && demoConfig.accounts?.length) {
            <section class="demo-access" aria-label="Demonstration accounts">
              <div class="demo-access-heading"><span class="demo-indicator">DEMO ENVIRONMENT</span><p>Select an account to fill the login form.</p></div>
              <div class="demo-account-list">
                @for (account of demoConfig.accounts; track account.email) {
                  <button type="button" class="demo-account" (click)="selectDemoAccount(account.email)">
                    <span><strong>{{ account.name }}</strong><small>{{ account.email }}</small></span><b>{{ account.role }}</b>
                  </button>
                }
              </div>
              @if (demoConfig.password) { <p class="demo-password">Shared demo password <code>{{ demoConfig.password }}</code></p> }
            </section>
          }
          <form [formGroup]="form" (ngSubmit)="submit()" class="stack-form">
            @if (registering) {
              <div class="name-fields">
                <label>First name<input formControlName="firstName" autocomplete="given-name" placeholder="Jamie" /></label>
                <label>Last name<input formControlName="lastName" autocomplete="family-name" placeholder="Taylor" /></label>
              </div>
              @if (form.controls.firstName.touched && form.controls.firstName.invalid) { <small class="field-error">Enter your first name.</small> }
              @if (form.controls.lastName.touched && form.controls.lastName.invalid) { <small class="field-error">Enter your last name.</small> }
            }
            <label>Email address<input formControlName="email" type="email" autocomplete="email" placeholder="you@university.edu" /></label>
            @if (form.controls.email.touched && form.controls.email.invalid) { <small class="field-error">Enter a valid email address.</small> }
            <label>Password
              <span class="password-control"><input formControlName="password" [type]="showPassword ? 'text' : 'password'" [autocomplete]="registering ? 'new-password' : 'current-password'" placeholder="At least 10 characters" /><button type="button" class="password-toggle" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'">{{ showPassword ? 'Hide' : 'Show' }}</button></span>
            </label>
            @if (form.controls.password.touched && form.controls.password.invalid) { <small class="field-error">Use 10+ characters with uppercase, lowercase, and a number.</small> }
            @if (registering) {
              <label>Confirm password<input formControlName="confirmPassword" [type]="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Re-enter your password" /></label>
              @if (form.controls.confirmPassword.touched && form.controls.confirmPassword.value !== form.controls.password.value) { <small class="field-error">Passwords do not match.</small> }
              <label class="terms-control"><input formControlName="acceptedTerms" type="checkbox" /><span>I agree to the campus community terms and respectful use policy.</span></label>
              @if (form.controls.acceptedTerms.touched && !form.controls.acceptedTerms.value) { <small class="field-error">Please accept the terms to create an account.</small> }
            }
            <button class="button button-primary button-full button-large" type="submit" [disabled]="busy || !validForSubmit">{{ busy ? 'Please wait…' : (registering ? 'Create student account' : 'Log in') }} <span aria-hidden="true">→</span></button>
          </form>
          <p class="auth-switch">{{ registering ? 'Already have an account?' : 'New to CampusFind?' }} <a [routerLink]="registering ? '/login' : '/register'">{{ registering ? 'Log in' : 'Create an account' }}</a></p>
          <p class="privacy-note">Your claim details are only shared with the people responsible for returning an item.</p>
        </div>
      </div>
    </section>
  `,
})
export class AuthPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ReportsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected demoConfig: DemoConfig | null = null;
  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(40)]],
    lastName: ['', [Validators.required, Validators.maxLength(40)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(10), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
    confirmPassword: [''],
    acceptedTerms: [false],
  });
  protected busy = false;
  protected error = '';
  protected showPassword = false;

  constructor() {
    this.api.demoConfig().subscribe({ next: (config) => { this.demoConfig = config; this.changeDetector.markForCheck(); } });
  }

  protected get registering() { return this.router.url.startsWith('/register'); }

  protected selectDemoAccount(email: string) {
    this.form.patchValue({ email, password: this.demoConfig?.password ?? '' });
  }
  protected get validForSubmit() {
    const controls = this.form.controls;
    const coreValid = controls.email.valid && controls.password.valid;
    if (!this.registering) return coreValid;
    return coreValid
      && controls.firstName.valid
      && controls.lastName.valid
      && controls.confirmPassword.value === controls.password.value
      && controls.acceptedTerms.value;
  }

  protected async submit() {
    if (!this.validForSubmit || this.busy) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy = true;
    this.error = '';
    const { firstName, lastName, email, password } = this.form.getRawValue();
    try {
      if (this.registering) await this.auth.register(firstName, lastName, email, password);
      else await this.auth.login(email, password);
      await this.router.navigateByUrl(this.auth.user()?.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (error) {
      this.error = error instanceof HttpErrorResponse
        ? error.error?.error ?? 'Unable to connect to CampusFind. Check that the API is running.'
        : 'Something went wrong. Please try again.';
    } finally {
      this.busy = false;
      this.changeDetector.markForCheck();
    }
  }
}
