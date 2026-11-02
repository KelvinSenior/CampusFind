import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ReportsService } from '../core/reports.service';
import type { Claim, ItemReport, PotentialMatch } from '../core/models';
import { categories, labelFor } from '../core/models';

@Component({
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="dashboard-page">
      <div class="dashboard-heading">
        <div><span class="eyebrow">YOUR CAMPUS ACTIVITY</span><h1>Welcome back, {{ firstName }}.</h1><p>Here’s what’s happening with your reports and claims.</p></div>
        <a class="button button-primary" routerLink="/report">＋ Report an item</a>
      </div>
      @if (error) { <div class="notice notice-error">{{ error }}</div> }
      @if (loading) { <div class="loading-state"><span class="spinner"></span> Loading your activity…</div> }
      @if (!loading) {
        <div class="stat-grid">
          <article class="stat-card"><span class="stat-icon blue-icon">⌁</span><div><small>My reports</small><strong>{{ reports.length }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon amber-icon">◷</span><div><small>Pending claims</small><strong>{{ pendingClaims }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon green-icon">✓</span><div><small>Items recovered</small><strong>{{ recovered }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon violet-icon">✦</span><div><small>Unread updates</small><strong>{{ unreadNotifications }}</strong></div></article>
        </div>

        <div class="dashboard-grid">
          <section class="dashboard-panel reports-panel">
            <div class="panel-heading"><div><h2>My reports</h2><p>Updates to your campus listings</p></div><a routerLink="/report">New report +</a></div>
            @if (!reports.length) { <div class="panel-empty"><p>You haven’t submitted a report yet.</p><a routerLink="/report">Create your first report →</a></div> }
            @for (report of reports; track report.id) {
              <article class="report-row">
                <span class="row-type-icon" [class.found-row-icon]="report.reportType === 'FOUND'">{{ report.reportType === 'FOUND' ? '⌕' : '⌁' }}</span>
                <div class="report-row-copy">
                  @if (report.status === 'APPROVED' || report.status === 'RECOVERED') { <a [routerLink]="['/items', report.id]">{{ report.itemName }}</a> }
                  @else { <strong>{{ report.itemName }}</strong> }
                  <small>{{ report.reference }} · {{ categoryName(report) }} · {{ report.createdAt | date:'MMM d' }}</small>
                </div>
                <span class="status-pill" [class.status-green]="report.status === 'APPROVED' || report.status === 'RECOVERED'" [class.status-red]="report.status === 'REJECTED'">{{ report.status }}</span>
                @if (report.status === 'PENDING' || report.status === 'REJECTED') {
                  <button class="mini-action" type="button" (click)="startEdit(report)">{{ editingReportId === report.id ? 'Close edit' : 'Edit' }}</button>
                  <button class="icon-button danger-action" type="button" aria-label="Delete report" title="Delete report" (click)="deleteReport(report)" [disabled]="actionId === report.id">×</button>
                }
                @if (report.reportType === 'LOST' && report.status !== 'REJECTED') {
                  <button class="mini-action" type="button" (click)="loadMatches(report)">{{ matchReportId === report.id ? 'Hide matches' : 'Find matches' }}</button>
                }
                @if (report.reportType === 'FOUND' && report.status === 'APPROVED') {
                  <button class="mini-action" type="button" (click)="toggleClaims(report)">{{ selectedReportId === report.id ? 'Hide claims' : 'Review claims' }}</button>
                }
              </article>
              @if (editingReportId === report.id) {
                <form class="inline-edit-form" [formGroup]="editForm" (ngSubmit)="saveEdit(report)">
                  <label>Item name<input formControlName="itemName" /></label>
                  <label>Description<textarea formControlName="description" rows="2"></textarea></label>
                  <div><button class="button button-primary button-small" type="submit" [disabled]="editForm.invalid || actionId === report.id">Save changes</button><button class="mini-action" type="button" (click)="editingReportId = ''">Cancel</button></div>
                </form>
              }
              @if (matchReportId === report.id) {
                <div class="inline-results">
                  <strong>Possible matches <span>Suggestions only — verify details before arranging a handover.</span></strong>
                  @if (matchLoading) { <small>Comparing reports…</small> }
                  @if (!matchLoading && !matches.length) { <small>No likely matches just yet.</small> }
                  @for (match of matches; track match.report.id) {
                    <a class="match-row" [routerLink]="['/items', match.report.id]"><span><strong>{{ match.report.itemName }}</strong><small>{{ match.reasons.join(' · ') }}</small></span><b>{{ match.score }}% match</b></a>
                  }
                </div>
              }
              @if (selectedReportId === report.id) {
                <div class="inline-results">
                  <strong>Ownership claims</strong>
                  @if (claimLoading) { <small>Loading claims…</small> }
                  @if (!claimLoading && !ownerClaims.length) { <small>No claims have been submitted.</small> }
                  @for (claim of ownerClaims; track claim.id) {
                    <article class="claim-row">
                      <div><strong>{{ claim.user?.name }} · {{ claim.status }}</strong><p>{{ claim.explanation }}</p><small>Identifying detail: {{ claim.distinguishingFeatures }}</small></div>
                      @if (claim.status === 'PENDING') {
                        <div class="claim-actions"><button type="button" class="button button-primary button-small" (click)="reviewClaim(claim, 'APPROVED')">Approve</button><button type="button" class="button button-outline button-small" (click)="reviewClaim(claim, 'REJECTED')">Decline</button></div>
                      }
                    </article>
                  }
                </div>
              }
            }
          </section>

          <aside class="dashboard-side">
            <section class="dashboard-panel">
              <div class="panel-heading"><div><h2>My claims</h2><p>Ownership claim progress</p></div></div>
              @if (!claims.length) { <div class="panel-empty"><p>No claims submitted yet.</p><a routerLink="/browse">Browse found items →</a></div> }
              @for (claim of claims; track claim.id) {
                <article class="claim-summary">
                  <div class="claim-summary-top"><strong>{{ claim.report.itemName }}</strong><span class="status-pill" [class.status-green]="claim.status === 'APPROVED' || claim.status === 'COMPLETED'" [class.status-red]="claim.status === 'REJECTED'">{{ claim.status }}</span></div>
                  @if (claim.handoverCode && claim.status === 'APPROVED') { <p class="handover-code">Handover code <strong>{{ claim.handoverCode }}</strong><small>Show this code during your authorised handover.</small></p> }
                  @if (claim.status === 'COMPLETED') { <p class="completed-note">Handover verified · item recovered ✓</p> }
                </article>
              }
            </section>
            <section class="dashboard-panel notifications-panel">
              <div class="panel-heading"><div><h2>Recent updates</h2><p>Notifications about your activity</p></div></div>
              @if (!notifications.length) { <div class="panel-empty"><p>You’re all caught up.</p></div> }
              @for (notification of notifications; track notification.id) {
                <article class="notification-row" [class.notification-unread]="!notification.isRead">
                  <span class="notification-dot"></span><div><strong>{{ notification.title }}</strong><p>{{ notification.message }}</p><small>{{ notification.createdAt | date:'MMM d, h:mm a' }}</small></div>
                  @if (!notification.isRead) { <button type="button" class="read-action" (click)="markRead(notification.id)">Mark read</button> }
                </article>
              }
            </section>
          </aside>
        </div>
      }
    </section>
  `,
})
export class DashboardPage implements OnInit {
  private readonly api = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly editForm = this.fb.nonNullable.group({
    itemName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });
  protected reports: ItemReport[] = [];
  protected claims: Claim[] = [];
  protected notifications: Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }> = [];
  protected ownerClaims: Claim[] = [];
  protected matches: PotentialMatch[] = [];
  protected loading = true;
  protected matchLoading = false;
  protected claimLoading = false;
  protected error = '';
  protected actionId = '';
  protected editingReportId = '';
  protected selectedReportId = '';
  protected matchReportId = '';
  protected get pendingClaims() { return this.claims.filter((claim) => claim.status === 'PENDING').length; }
  protected get recovered() {
    return this.reports.filter((report) => report.status === 'RECOVERED').length
      + this.claims.filter((claim) => claim.status === 'COMPLETED').length;
  }
  protected get unreadNotifications() { return this.notifications.filter((notification) => !notification.isRead).length; }
  protected get firstName() { return this.auth.user()?.name.split(' ')[0] ?? 'there'; }

  ngOnInit() { this.load(); }

  protected categoryName(report: ItemReport) { return labelFor(categories, report.category); }

  protected startEdit(report: ItemReport) {
    if (this.editingReportId === report.id) {
      this.editingReportId = '';
      return;
    }
    this.editingReportId = report.id;
    this.editForm.setValue({ itemName: report.itemName, description: report.description });
  }

  protected saveEdit(report: ItemReport) {
    if (this.editForm.invalid || this.actionId) return;
    this.actionId = report.id;
    this.api.update(report.id, this.editForm.getRawValue()).subscribe({
      next: ({ report: updated }) => {
        this.reports = this.reports.map((item) => item.id === updated.id ? updated : item);
        this.editingReportId = '';
        this.actionId = '';
        this.error = 'Your report has been updated and returned to moderation.';
        this.changeDetector.markForCheck();
      },
      error: (error) => {
        this.error = error?.error?.error ?? 'Unable to update this report.';
        this.actionId = '';
        this.changeDetector.markForCheck();
      },
    });
  }

  protected load() {
    this.loading = true;
    forkJoin({
      reports: this.api.mine(),
      claims: this.api.myClaims(),
      notifications: this.api.notifications(),
    }).subscribe({
      next: (data) => {
        this.reports = data.reports.reports;
        this.claims = data.claims.claims;
        this.notifications = data.notifications.notifications;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.error = 'Your dashboard could not load. Check the API connection and refresh.';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  protected deleteReport(report: ItemReport) {
    if (!window.confirm(`Delete "${report.itemName}"? This cannot be undone.`)) return;
    this.actionId = report.id;
    this.api.delete(report.id).subscribe({
      next: () => { this.reports = this.reports.filter((item) => item.id !== report.id); this.actionId = ''; this.changeDetector.markForCheck(); },
      error: (error) => { this.error = error?.error?.error ?? 'Unable to delete this report.'; this.actionId = ''; this.changeDetector.markForCheck(); },
    });
  }

  protected loadMatches(report: ItemReport) {
    if (this.matchReportId === report.id) {
      this.matchReportId = '';
      return;
    }
    this.matchReportId = report.id;
    this.matchLoading = true;
    this.matches = [];
    this.api.matches(report.id).subscribe({
      next: ({ matches }) => { this.matches = matches; this.matchLoading = false; this.changeDetector.markForCheck(); },
      error: (error) => { this.error = error?.error?.error ?? 'Unable to calculate potential matches.'; this.matchLoading = false; this.changeDetector.markForCheck(); },
    });
  }

  protected toggleClaims(report: ItemReport) {
    if (this.selectedReportId === report.id) {
      this.selectedReportId = '';
      return;
    }
    this.selectedReportId = report.id;
    this.claimLoading = true;
    this.ownerClaims = [];
    this.api.claimsForReport(report.id).subscribe({
      next: ({ claims }) => { this.ownerClaims = claims; this.claimLoading = false; this.changeDetector.markForCheck(); },
      error: (error) => { this.error = error?.error?.error ?? 'Unable to load ownership claims.'; this.claimLoading = false; this.changeDetector.markForCheck(); },
    });
  }

  protected reviewClaim(claim: Claim, status: 'APPROVED' | 'REJECTED') {
    this.api.reviewClaim(claim.id, status).subscribe({
      next: () => {
        this.error = status === 'APPROVED'
          ? 'Claim approved. The claimant can see the handover code in their dashboard.'
          : 'Claim declined.';
        this.api.claimsForReport(claim.report.id).subscribe({
          next: ({ claims }) => { this.ownerClaims = claims; },
          error: () => { this.error = 'Claim was reviewed, but the updated claim list could not be loaded.'; this.changeDetector.markForCheck(); },
        });
        this.changeDetector.markForCheck();
      },
      error: (error) => { this.error = error?.error?.error ?? 'Unable to review this claim.'; this.changeDetector.markForCheck(); },
    });
  }

  protected markRead(id: string) {
    this.api.markNotificationRead(id).subscribe({
      next: () => { this.notifications = this.notifications.map((notification) => notification.id === id ? { ...notification, isRead: true } : notification); this.changeDetector.markForCheck(); },
      error: (error) => { this.error = error?.error?.error ?? 'Unable to update the notification.'; this.changeDetector.markForCheck(); },
    });
  }
}
