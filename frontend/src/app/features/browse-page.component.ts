import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReportsService } from '../core/reports.service';
import { categories, locations, type ItemReport, type ReportFilters } from '../core/models';
import { ItemCard } from './item-card.component';

@Component({
  imports: [ReactiveFormsModule, ItemCard],
  template: `
    <section class="page-intro browse-intro">
      <span class="eyebrow">CAMPUS LOST & FOUND</span>
      <h1>Find what you’re <span>looking for.</span></h1>
      <p>Search recent reports from across campus. A few details can make all the difference.</p>
    </section>
    <section class="browse-wrap">
      <form class="filter-panel" [formGroup]="filters" (ngSubmit)="search()">
        <label class="search-control"><span aria-hidden="true">⌕</span><input formControlName="q" placeholder="Search items or details" aria-label="Search item reports" /></label>
        <label><span class="sr-only">Report type</span><select formControlName="type"><option value="">All reports</option><option value="LOST">Lost</option><option value="FOUND">Found</option></select></label>
        <label><span class="sr-only">Category</span><select formControlName="category"><option value="">All categories</option>@for (category of categories; track category.value) { <option [value]="category.value">{{ category.label }}</option> }</select></label>
        <label><span class="sr-only">Location</span><select formControlName="location"><option value="">All locations</option>@for (location of locations; track location.value) { <option [value]="location.value">{{ location.label }}</option> }</select></label>
        <label><span class="sr-only">Report status</span><select formControlName="status"><option value="">All statuses</option><option value="APPROVED">Available</option><option value="RECOVERED">Recovered</option></select></label>
        <label><span class="sr-only">Date</span><input formControlName="date" type="date" aria-label="Filter by date" /></label>
        <label><span class="sr-only">Sort order</span><select formControlName="sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="updated">Recently updated</option></select></label>
        <button class="button button-primary" type="submit">Search</button>
      </form>

      <div class="results-heading"><div><h2>Community reports</h2><p>{{ reports.length }} {{ reports.length === 1 ? 'report' : 'reports' }} found</p></div><span class="safe-note">🔒 Private details stay private</span></div>
      @if (error) { <div class="notice notice-error">{{ error }}</div> }
      @if (loading) { <div class="loading-state"><span class="spinner"></span> Searching reports…</div> }
      @if (!loading && reports.length) { <div class="item-grid">@for (report of reports; track report.id) { <app-item-card [report]="report" /> }</div> }
      @if (!loading && !reports.length && !error) {
        <div class="empty-state"><span class="empty-icon">⌕</span><h3>No matching reports</h3><p>Try a different search or clear a filter to see more items.</p><button class="button button-outline" type="button" (click)="clearFilters()">Clear filters</button></div>
      }
    </section>
  `,
})
export class BrowsePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly reportsService = inject(ReportsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly categories = categories;
  protected readonly locations = locations;
  protected readonly filters = this.fb.nonNullable.group({
    q: '',
    type: '',
    category: '',
    location: '',
    status: '',
    date: '',
    sort: 'newest',
  });
  protected reports: ItemReport[] = [];
  protected loading = true;
  protected error = '';

  ngOnInit() { this.search(); }

  protected search() {
    this.loading = true;
    this.error = '';
    this.reportsService.list(this.filters.getRawValue() as ReportFilters).subscribe({
      next: ({ reports }) => { this.reports = reports; this.loading = false; this.changeDetector.markForCheck(); },
      error: () => { this.error = 'We could not load reports. Check the API connection and try again.'; this.loading = false; this.changeDetector.markForCheck(); },
    });
  }

  protected clearFilters() {
    this.filters.reset({ q: '', type: '', category: '', location: '', status: '', date: '', sort: 'newest' });
    this.search();
  }
}
