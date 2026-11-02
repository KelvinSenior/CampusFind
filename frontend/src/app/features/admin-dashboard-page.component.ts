import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ReportsService } from '../core/reports.service';
import type { AdminStatistics, Claim, ItemReport } from '../core/models';
import { categories, labelFor } from '../core/models';

@Component({
  imports: [DatePipe],
  template: `
    <section class="dashboard-page admin-page">
      <div class="dashboard-heading">
        <div><span class="eyebrow">CAMPUSFIND ADMINISTRATION</span><h1>Campus overview</h1><p>Review reports, support claims, and keep campus recovery moving.</p></div>
        <span class="admin-chip">ADMIN CONSOLE</span>
      </div>
      @if (error) { <div class="notice" [class.notice-error]="!success" [class.notice-success]="success" role="status">{{ error }}</div> }
      @if (loading) { <div class="loading-state"><span class="spinner"></span> Loading campus activity…</div> }
      @if (!loading && stats) {
        <div class="stat-grid admin-stat-grid">
          <article class="stat-card"><span class="stat-icon blue-icon">♙</span><div><small>Students</small><strong>{{ stats.users }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon amber-icon">⌁</span><div><small>Lost reports</small><strong>{{ stats.lost }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon green-icon">⌕</span><div><small>Found reports</small><strong>{{ stats.found }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon violet-icon">✓</span><div><small>Recovered</small><strong>{{ stats.recovered }}</strong></div></article>
        </div>
        <div class="admin-queues">
          <section class="dashboard-panel">
            <div class="panel-heading"><div><h2>Reports awaiting review <span class="count-badge">{{ pendingReports.length }}</span></h2><p>New items are hidden from public browsing until approved.</p></div></div>
            @if (!pendingReports.length) { <div class="panel-empty"><p>All caught up — no pending reports.</p></div> }
            @for (report of pendingReports; track report.id) {
              <article class="admin-record">
                <div class="admin-record-main"><span class="type-mark" [class.found-row-icon]="report.reportType === 'FOUND'">{{ report.reportType }}</span><div><strong>{{ report.itemName }}</strong><p>{{ report.reference }} · {{ categoryName(report) }} · {{ report.createdAt | date:'MMM d, y' }}</p><small>{{ report.description }}</small></div></div>
                <div class="admin-actions"><button type="button" class="button button-primary button-small" (click)="moderate(report, 'APPROVED')" [disabled]="actionId === report.id">Approve</button><button type="button" class="button button-outline button-small" (click)="moderate(report, 'REJECTED')" [disabled]="actionId === report.id">Reject</button></div>
              </article>
            }
          </section>
          <section class="dashboard-panel">
            <div class="panel-heading"><div><h2>Ownership claims <span class="count-badge">{{ pendingClaims.length }}</span></h2><p>Only report owners and administrators can review claim evidence.</p></div></div>
            @if (!pendingClaims.length) { <div class="panel-empty"><p>No pending claims need review.</p></div> }
            @for (claim of pendingClaims; track claim.id) {
              <article class="admin-claim">
                <div class="admin-record-main"><span class="claim-review-mark">✦</span><div><strong>{{ claim.report.itemName }} · {{ claim.user?.name }}</strong><p>{{ claim.report.reference }}</p><small>{{ claim.explanation }}</small><small class="evidence-copy">Distinguishing detail: {{ claim.distinguishingFeatures }}</small></div></div>
                <div class="admin-actions"><button type="button" class="button button-primary button-small" (click)="review(claim, 'APPROVED')" [disabled]="actionId === claim.id">Approve</button><button type="button" class="button button-outline button-small" (click)="review(claim, 'REJECTED')" [disabled]="actionId === claim.id">Reject</button></div>
              </article>
            }
          </section>
          <section class="dashboard-panel handover-panel">
            <div class="panel-heading"><div><h2>Verify a handover</h2><p>Confirm the private code presented by an authorised participant.</p></div></div>
            @for (claim of approvedClaims; track claim.id) {
              <article class="handover-row">
                <div><strong>{{ claim.report.itemName }}</strong><small>{{ claim.report.reference }} · {{ claim.user?.name }}</small></div>
                <label class="handover-input"><span class="sr-only">Presented handover code for {{ claim.report.itemName }}</span><input type="text" autocomplete="off" placeholder="Enter presented code" [value]="handoverCodes[claim.id] ?? ''" (input)="setHandoverCode(claim.id, $event)" /></label>
                <button class="button button-primary button-small" type="button" (click)="verify(claim)" [disabled]="actionId === claim.id">Verify handover</button>
              </article>
            }
            @if (!approvedClaims.length) { <div class="panel-empty"><p>No approved handovers are waiting for verification.</p></div> }
          </section>
        </div>
      }
    </section>
  `,
})
export class AdminDashboardPage implements OnInit {
  private readonly api = inject(ReportsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected stats: AdminStatistics | null = null;
  protected pendingReports: ItemReport[] = [];
  protected pendingClaims: Claim[] = [];
  protected approvedClaims: Claim[] = [];
  protected loading = true;
  protected actionId = '';
  protected handoverCodes: Record<string, string> = {};
  protected error = '';
  protected success = false;

  ngOnInit() { this.load(); }

  protected categoryName(report: ItemReport) { return labelFor(categories, report.category); }

  private load() {
    this.loading = true;
    this.success = false;
    this.error = '';
    forkJoin({
      stats: this.api.adminStatistics(),
      reports: this.api.adminReports(),
      pendingClaims: this.api.adminClaims('PENDING'),
      approvedClaims: this.api.adminClaims('APPROVED'),
    }).subscribe({
      next: ({ stats, reports, pendingClaims, approvedClaims }) => {
        this.stats = stats;
        this.pendingReports = reports.reports;
        this.pendingClaims = pendingClaims.claims;
        this.approvedClaims = approvedClaims.claims;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: { error?: { error?: string } }) => {
        this.error = error.error?.error ?? 'Could not load the admin console. Check the API and refresh.';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  protected moderate(report: ItemReport, status: 'APPROVED' | 'REJECTED') {
    this.actionId = report.id;
    this.api.moderateReport(report.id, status).subscribe({
      next: () => { this.actionId = ''; this.load(); this.success = true; this.error = `Report ${status.toLowerCase()}.`; },
      error: (error) => { this.error = error?.error?.error ?? 'Unable to update report.'; this.success = false; this.actionId = ''; this.changeDetector.markForCheck(); },
    });
  }

  protected review(claim: Claim, status: 'APPROVED' | 'REJECTED') {
    this.actionId = claim.id;
    this.api.reviewClaim(claim.id, status).subscribe({
      next: () => { this.actionId = ''; this.load(); this.success = true; this.error = `Claim ${status.toLowerCase()}.`; },
      error: (error) => { this.error = error?.error?.error ?? 'Unable to review claim.'; this.success = false; this.actionId = ''; this.changeDetector.markForCheck(); },
    });
  }

  protected setHandoverCode(claimId: string, event: Event) {
    if (event.target instanceof HTMLInputElement) {
      this.handoverCodes = { ...this.handoverCodes, [claimId]: event.target.value };
    }
  }

  protected verify(claim: Claim) {
    const code = this.handoverCodes[claim.id]?.trim();
    if (!code) {
      this.error = 'Enter the code presented by the claimant before verifying handover.';
      this.success = false;
      return;
    }
    this.actionId = claim.id;
    this.api.verifyHandover(claim.id, code).subscribe({
      next: () => {
        delete this.handoverCodes[claim.id];
        this.actionId = '';
        this.load();
        this.success = true;
        this.error = 'Handover verified and item marked recovered.';
      },
      error: (error) => { this.error = error?.error?.error ?? 'Unable to verify this handover.'; this.success = false; this.actionId = ''; this.changeDetector.markForCheck(); },
    });
  }
}
