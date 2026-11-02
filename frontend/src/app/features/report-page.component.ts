import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReportsService } from '../core/reports.service';
import { categories, locations } from '../core/models';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="form-page">
      <a class="back-link" routerLink="/browse">← Back to reports</a>
      <div class="page-intro form-intro-block"><span class="eyebrow">HELP YOUR COMMUNITY</span><h1>Tell us what <span>happened.</span></h1><p>Share the useful details. Your report will be reviewed before it appears to everyone.</p></div>
      @if (success) {
        <div class="success-panel"><span class="success-icon">✓</span><h2>Report submitted</h2><p>Your report is with the campus team for review. You can check its status in your reports.</p><a class="button button-primary" routerLink="/browse">Browse reports</a></div>
      } @else {
        @if (error) { <div class="notice notice-error" role="alert">{{ error }}</div> }
        <form class="report-form" [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-section"><span class="form-step">01</span><div class="form-section-content"><h2>What are you reporting?</h2><p>Choose the option that best describes your situation.</p>
            <div class="type-choice">
              <label class="choice-card" [class.choice-selected]="form.controls.reportType.value === 'LOST'"><input type="radio" formControlName="reportType" value="LOST" /><span class="choice-icon">⌁</span><strong>I lost something</strong><small>Help others identify your missing item</small></label>
              <label class="choice-card" [class.choice-selected]="form.controls.reportType.value === 'FOUND'"><input type="radio" formControlName="reportType" value="FOUND" /><span class="choice-icon">⌕</span><strong>I found something</strong><small>Help its owner find it again</small></label>
            </div>
          </div></div>
          <div class="form-section"><span class="form-step">02</span><div class="form-section-content"><h2>Item details</h2><p>Enough detail to recognise it, without sharing anything too sensitive.</p>
            <div class="form-grid">
              <label class="span-two">Item name<input formControlName="itemName" placeholder="e.g. Blue wireless headphones" /></label>
              <label>Category<select formControlName="category"><option value="">Choose category</option>@for (category of categories; track category.value) { <option [value]="category.value">{{ category.label }}</option> }</select></label>
              <label>Date {{ form.controls.reportType.value === 'LOST' ? 'lost' : 'found' }}<input formControlName="dateOccurred" type="date" /></label>
              <label class="span-two">Description<textarea formControlName="description" rows="4" placeholder="Colour, brand, size, or other helpful public details…"></textarea></label>
              <label class="span-two">Private identifying detail <span class="optional-label">Optional · visible only to reviewers</span><textarea formControlName="identifyingDetails" rows="2" placeholder="A detail an owner could use to verify this item"></textarea></label>
            </div>
          </div></div>
          <div class="form-section"><span class="form-step">03</span><div class="form-section-content"><h2>Where was it?</h2><p>Choose the closest campus location and add a little context if helpful.</p>
            <div class="form-grid">
              <label>Campus location<select formControlName="location"><option value="">Choose location</option>@for (location of locations; track location.value) { <option [value]="location.value">{{ location.label }}</option> }</select></label>
              <label>More specific location <span class="optional-label">Optional</span><input formControlName="locationDetails" placeholder="e.g. Second floor study area" /></label>
            </div>
          </div></div>
          @if (submitAttempted && form.invalid) {
            <div class="notice notice-error report-validation" role="alert">Please check: {{ invalidFieldNames.join(', ') }}.</div>
          }
          <div class="form-submit"><p>By submitting, you confirm these details are accurate and appropriate to share.</p><button class="button button-primary button-large" type="submit" [disabled]="busy">{{ busy ? 'Submitting…' : 'Submit for review' }} <span aria-hidden="true">→</span></button></div>
        </form>
      }
    </section>
  `,
})
export class ReportPage {
  private readonly fb = inject(FormBuilder);
  private readonly reportsService = inject(ReportsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly categories = categories;
  protected readonly locations = locations;
  protected readonly form = this.fb.nonNullable.group({
    reportType: ['LOST' as 'LOST' | 'FOUND', Validators.required],
    itemName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    category: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    identifyingDetails: ['', Validators.maxLength(1000)],
    dateOccurred: [new Date().toISOString().slice(0, 10), Validators.required],
    location: ['', Validators.required],
    locationDetails: ['', Validators.maxLength(200)],
  });
  protected busy = false;
  protected success = false;
  protected error = '';
  protected submitAttempted = false;

  protected get invalidFieldNames() {
    const controls = this.form.controls;
    const fields: string[] = [];
    if (controls.itemName.invalid) fields.push('item name (2-100 characters)');
    if (controls.category.invalid) fields.push('category');
    if (controls.dateOccurred.invalid) fields.push('date lost or found');
    if (controls.description.invalid) fields.push('description (10-2000 characters)');
    if (controls.identifyingDetails.invalid) fields.push('private identifying detail (up to 1000 characters)');
    if (controls.location.invalid) fields.push('campus location');
    if (controls.locationDetails.invalid) fields.push('specific location (up to 200 characters)');
    return fields;
  }

  protected submit() {
    this.submitAttempted = true;
    if (this.busy) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy = true;
    this.error = '';
    const value = this.form.getRawValue();
    const payload = {
      ...value,
      dateOccurred: new Date(`${value.dateOccurred}T12:00:00`).toISOString(),
    };
    this.reportsService.create(payload).subscribe({
      next: () => { this.success = true; this.busy = false; this.changeDetector.markForCheck(); },
      error: (error: unknown) => {
        this.error = error instanceof HttpErrorResponse
          ? error.error?.error ?? 'Unable to connect to CampusFind. Check that the API is running.'
          : 'Unable to submit your report. Please try again.';
        this.busy = false;
        this.changeDetector.markForCheck();
      },
    });
  }
}
