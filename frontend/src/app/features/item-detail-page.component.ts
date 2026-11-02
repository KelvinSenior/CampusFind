import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ReportsService } from '../core/reports.service';
import { categories, labelFor, locations, type ItemReport } from '../core/models';

@Component({
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="detail-page">
      <a class="back-link" routerLink="/browse">← Browse reports</a>
      @if (error && !report) { <div class="notice notice-error">{{ error }}</div> }
      @if (loading) { <div class="loading-state"><span class="spinner"></span> Loading report…</div> }
      @if (report; as item) {
        <div class="detail-layout">
          <div class="detail-main">
            <div class="detail-image">
              @if (item.photoUrl) { <img [src]="item.photoUrl" [alt]="item.itemName" /> }
              @else { <span aria-hidden="true">{{ item.reportType === 'FOUND' ? '⌕' : '⌁' }}</span> }
              <span class="type-badge" [class.found-badge]="item.reportType === 'FOUND'">{{ item.reportType === 'FOUND' ? 'Found item' : 'Lost item' }}</span>
            </div>
            <div class="detail-copy">
              <span class="eyebrow">{{ categoryLabel }}</span><h1>{{ item.itemName }}</h1>
              <span class="status-pill" [class.status-green]="item.status === 'RECOVERED'">{{ item.status === 'RECOVERED' ? 'Recovered' : 'Available for recovery' }}</span>
              <p class="detail-description">{{ item.description }}</p>
              <div class="detail-meta"><span>⌖ {{ locationLabel }}{{ item.locationDetails ? ', ' + item.locationDetails : '' }}</span><span>◷ {{ item.dateOccurred | date:'longDate' }}</span></div>
              <div class="detail-reference"><span>Report reference</span><strong>{{ item.reference }}</strong></div>
            </div>
          </div>
          <aside class="detail-aside">
            <span class="aside-icon">✦</span>
            @if (item.reportType === 'FOUND') {
              <h2>Think it might be yours?</h2><p>Tell us a few details only the owner would know. Your evidence is kept private.</p>
              @if (!auth.user()) { <a class="button button-primary button-full" routerLink="/login">Log in to make a claim</a> }
              @else if (item.userId === auth.user()?.id) { <div class="notice notice-info">This is your report. Claims are reviewed from your reports page.</div> }
              @else if (claimSent) { <div class="notice notice-success">Claim submitted. The finder will review the details you shared.</div> }
              @else {
                @if (claimError) { <div class="notice notice-error">{{ claimError }}</div> }
                <form [formGroup]="claimForm" (ngSubmit)="submitClaim()" class="stack-form">
                  <label>Why do you think this is yours?<textarea formControlName="explanation" rows="3" placeholder="Where and when did you last have it?"></textarea></label>
                  <label>What details identify it?<textarea formControlName="distinguishingFeatures" rows="3" placeholder="Share a detail that is not in the public listing"></textarea></label>
                  <label>Anything else? <span class="optional-label">Optional</span><textarea formControlName="additionalEvidence" rows="2"></textarea></label>
                  <button class="button button-primary button-full" type="submit" [disabled]="sending || claimForm.invalid">{{ sending ? 'Sending…' : 'Submit private claim' }}</button>
                </form>
              }
            } @else {
              <h2>Have you seen this?</h2><p>A tip from the community can help reunite someone with their belongings.</p>
              <a class="button button-primary button-full" routerLink="/report">Share a found item</a>
            }
            @if (auth.user()?.role === 'STUDENT') {
              <button class="button button-outline button-full detail-save-button" type="button" (click)="toggleSavedItem()" [disabled]="saveBusy">{{ saveBusy ? 'Updating…' : (isSaved ? 'Remove saved item' : 'Save this item') }}</button>
              @if (saveError) { <div class="notice notice-error" role="alert">{{ saveError }}</div> }
              <details class="abuse-details">
                <summary>Report a concern</summary>
                @if (abuseSent) { <p class="abuse-confirmation">Report sent to the campus team.</p> }
                @else {
                  <form [formGroup]="abuseForm" (ngSubmit)="submitAbuseReport()" class="stack-form">
                    <label>What is the concern?<input formControlName="reason" maxlength="120" placeholder="e.g. Duplicate or misleading listing" /></label>
                    <label>Additional details <span class="optional-label">Optional</span><textarea formControlName="details" rows="3" maxlength="1000"></textarea></label>
                    @if (abuseError) { <div class="notice notice-error" role="alert">{{ abuseError }}</div> }
                    <button class="button button-outline button-small" type="submit" [disabled]="abuseBusy || abuseForm.invalid">{{ abuseBusy ? 'Sending…' : 'Send report' }}</button>
                  </form>
                }
              </details>
            }
            <div class="privacy-note">CampusFind keeps private identifying details out of public listings.</div>
          </aside>
        </div>
      }
    </section>
  `,
})
export class ItemDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly reportsService = inject(ReportsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly auth = inject(AuthService);
  protected report: ItemReport | null = null;
  protected loading = true;
  protected error = '';
  protected claimError = '';
  protected claimSent = false;
  protected sending = false;
  protected isSaved = false;
  protected saveBusy = false;
  protected saveError = '';
  protected abuseBusy = false;
  protected abuseSent = false;
  protected abuseError = '';
  protected readonly claimForm = this.fb.nonNullable.group({
    explanation: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1500)]],
    distinguishingFeatures: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(1000)]],
    additionalEvidence: ['', Validators.maxLength(1500)],
  });
  protected readonly abuseForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    details: ['', Validators.maxLength(1000)],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'That report could not be found.';
      this.loading = false;
      return;
    }
    this.reportsService.get(id).subscribe({
      next: ({ report }) => { this.report = report; this.loading = false; this.loadSavedState(); this.changeDetector.markForCheck(); },
      error: () => { this.error = 'That report could not be found or is no longer available.'; this.loading = false; this.changeDetector.markForCheck(); },
    });
  }

  protected get categoryLabel() { return this.report ? labelFor(categories, this.report.category) : ''; }
  protected get locationLabel() { return this.report ? labelFor(locations, this.report.location) : ''; }

  private loadSavedState() {
    if (!this.report) return;
    if (!this.auth.user()) {
      void this.auth.restoreSession().then((restored) => { if (restored) this.loadSavedState(); });
      return;
    }
    if (this.auth.user()?.role !== 'STUDENT') return;
    this.reportsService.savedItems().subscribe({
      next: ({ savedItems }) => { this.isSaved = savedItems.some((saved) => saved.report.id === this.report?.id); this.changeDetector.markForCheck(); },
    });
  }

  protected toggleSavedItem() {
    if (!this.report || this.saveBusy) return;
    this.saveBusy = true;
    this.saveError = '';
    const savedState = !this.isSaved;
    const complete = () => { this.isSaved = savedState; this.saveBusy = false; this.changeDetector.markForCheck(); };
    const fail = (error: unknown) => {
      this.saveError = error instanceof HttpErrorResponse ? error.error?.error ?? 'Unable to update saved items.' : 'Unable to update saved items.';
      this.saveBusy = false;
      this.changeDetector.markForCheck();
    };
    if (savedState) this.reportsService.saveItem(this.report.id).subscribe({ next: complete, error: fail });
    else this.reportsService.removeSavedItem(this.report.id).subscribe({ next: complete, error: fail });
  }

  protected submitAbuseReport() {
    if (!this.report || this.abuseForm.invalid || this.abuseBusy) return;
    this.abuseBusy = true;
    this.abuseError = '';
    this.reportsService.createAbuseReport(this.report.id, this.abuseForm.getRawValue()).subscribe({
      next: () => { this.abuseSent = true; this.abuseBusy = false; this.changeDetector.markForCheck(); },
      error: (error) => { this.abuseError = error?.error?.error ?? 'Unable to send this report.'; this.abuseBusy = false; this.changeDetector.markForCheck(); },
    });
  }

  protected submitClaim() {
    if (!this.report || this.claimForm.invalid || this.sending) return;
    this.sending = true;
    this.claimError = '';
    this.reportsService.claim(this.report.id, this.claimForm.getRawValue()).subscribe({
      next: () => { this.claimSent = true; this.sending = false; this.changeDetector.markForCheck(); },
      error: (error: unknown) => {
        this.claimError = error instanceof HttpErrorResponse
          ? error.error?.error ?? 'Unable to connect to CampusFind. Try again shortly.'
          : 'Unable to submit your claim. Please try again.';
        this.sending = false;
        this.changeDetector.markForCheck();
      },
    });
  }
}
