import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ReportsService } from '../core/reports.service';
import type { AbuseReportRecord, ActivityRecord, AdminStatistics, Announcement, Claim, ItemReport, StudentAccount } from '../core/models';
import { categories, labelFor } from '../core/models';

@Component({
  imports: [DatePipe, ReactiveFormsModule],
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
          <article class="stat-card"><span class="stat-icon blue-icon">▤</span><div><small>Total reports</small><strong>{{ stats.totalReports }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon amber-icon">⌁</span><div><small>Lost reports</small><strong>{{ stats.lost }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon green-icon">⌕</span><div><small>Found reports</small><strong>{{ stats.found }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon amber-icon">◷</span><div><small>Pending reports</small><strong>{{ stats.pendingReports }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon amber-icon">✦</span><div><small>Pending claims</small><strong>{{ stats.pendingClaims }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon green-icon">✓</span><div><small>Recovered</small><strong>{{ stats.recovered }}</strong></div></article>
          <article class="stat-card"><span class="stat-icon violet-icon">!</span><div><small>Open concerns</small><strong>{{ stats.openAbuse }}</strong></div></article>
        </div>
        <section class="dashboard-panel admin-chart">
          <div class="panel-heading"><div><h2>Report status at a glance</h2><p>Counts from the current database</p></div></div>
          <div class="chart-bars">
            <div class="chart-row"><span>Lost</span><div><i class="chart-lost" [style.width.%]="barWidth(stats.lost)"></i></div><b>{{ stats.lost }}</b></div>
            <div class="chart-row"><span>Found</span><div><i class="chart-found" [style.width.%]="barWidth(stats.found)"></i></div><b>{{ stats.found }}</b></div>
            <div class="chart-row"><span>Pending review</span><div><i class="chart-pending" [style.width.%]="barWidth(stats.pendingReports)"></i></div><b>{{ stats.pendingReports }}</b></div>
            <div class="chart-row"><span>Recovered</span><div><i class="chart-recovered" [style.width.%]="barWidth(stats.recovered)"></i></div><b>{{ stats.recovered }}</b></div>
          </div>
        </section>
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
          <section class="dashboard-panel">
            <div class="panel-heading"><div><h2>Campus announcements</h2><p>Create, publish, edit, or remove a notice.</p></div></div>
            <form class="admin-announcement-form" [formGroup]="announcementForm" (ngSubmit)="saveAnnouncement()">
              <label>Title<input formControlName="title" maxlength="120" /></label>
              <label>Category<input formControlName="category" maxlength="40" /></label>
              <label>Message<textarea formControlName="content" rows="3" maxlength="3000"></textarea></label>
              <label class="publish-toggle"><input type="checkbox" formControlName="isPublished" /> Publish immediately</label>
              <div class="admin-actions"><button class="button button-primary button-small" type="submit" [disabled]="announcementForm.invalid || actionId === 'announcement'">{{ editingAnnouncementId ? 'Save changes' : 'Create announcement' }}</button>@if (editingAnnouncementId) { <button class="button button-outline button-small" type="button" (click)="cancelAnnouncementEdit()">Cancel</button> }</div>
            </form>
            @for (announcement of announcements; track announcement.id) {
              <article class="admin-list-row"><div><strong>{{ announcement.title }}</strong><small>{{ announcement.category ?? 'Campus notice' }} · {{ announcement.isPublished ? 'Published' : 'Draft' }}</small><p>{{ announcement.content }}</p></div><div class="admin-actions"><button class="mini-action" type="button" (click)="editAnnouncement(announcement)">Edit</button><button class="mini-action" type="button" (click)="toggleAnnouncement(announcement)">{{ announcement.isPublished ? 'Unpublish' : 'Publish' }}</button><button class="mini-action danger-text" type="button" (click)="deleteAnnouncement(announcement)">Delete</button></div></article>
            }
            @if (!announcements.length) { <div class="panel-empty"><p>No announcements have been created.</p></div> }
          </section>
          <section class="dashboard-panel">
            <div class="panel-heading"><div><h2>Abuse reports <span class="count-badge">{{ abuseReports.length }}</span></h2><p>Review and close concerns raised by students.</p></div></div>
            @for (abuse of abuseReports; track abuse.id) {
              <article class="admin-list-row"><div><strong>{{ abuse.reason }} · {{ abuse.report.itemName }}</strong><small>{{ abuse.reporter.name }} · {{ abuse.createdAt | date:'MMM d, y' }} · {{ abuse.status }}</small>@if (abuse.details) { <p>{{ abuse.details }}</p> }</div>@if (abuse.status === 'OPEN') { <div class="admin-actions"><button class="button button-primary button-small" type="button" (click)="reviewAbuse(abuse, 'RESOLVED')">Resolve</button><button class="button button-outline button-small" type="button" (click)="reviewAbuse(abuse, 'REJECTED')">Dismiss</button></div> }</article>
            }
            @if (!abuseReports.length) { <div class="panel-empty"><p>No open concerns.</p></div> }
          </section>
          <section class="dashboard-panel">
            <div class="panel-heading"><div><h2>Student accounts <span class="count-badge">{{ students.length }}</span></h2><p>Suspended accounts cannot authenticate.</p></div></div>
            <form class="user-search" (ngSubmit)="searchUsers()"><label class="sr-only" for="student-search">Search students</label><input id="student-search" [value]="userSearch" (input)="setUserSearch($event)" placeholder="Search name or email" /><button class="button button-outline button-small" type="submit">Search</button></form>
            @for (student of students; track student.id) {
              <article class="admin-list-row"><div><strong>{{ student.name }}</strong><small>{{ student.email }} · {{ student._count.reports }} reports · {{ student._count.claims }} claims</small></div><div class="admin-actions"><span class="status-pill" [class.status-green]="student.status === 'ACTIVE'" [class.status-red]="student.status === 'SUSPENDED'">{{ student.status }}</span><button class="mini-action" type="button" (click)="toggleStudentStatus(student)">{{ student.status === 'ACTIVE' ? 'Suspend' : 'Reactivate' }}</button></div></article>
            }
          </section>
          <section class="dashboard-panel">
            <div class="panel-heading"><div><h2>Recent activity</h2><p>Recorded actions across the platform.</p></div></div>
            @for (activity of activities; track activity.id) {
              <article class="activity-row"><div><strong>{{ activity.action.replaceAll('_', ' ') }}</strong><small>{{ activity.actor?.name ?? 'System' }} · {{ activity.entityType }}</small></div><small>{{ activity.createdAt | date:'MMM d, h:mm a' }}</small></article>
            }
            @if (!activities.length) { <div class="panel-empty"><p>No activity recorded yet.</p></div> }
          </section>
        </div>
      }
    </section>
  `,
})
export class AdminDashboardPage implements OnInit {
  private readonly api = inject(ReportsService);
  private readonly fb = inject(FormBuilder);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly announcementForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(120)]],
    category: ['Community', Validators.maxLength(40)],
    content: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
    isPublished: [true],
  });
  protected stats: AdminStatistics | null = null;
  protected pendingReports: ItemReport[] = [];
  protected pendingClaims: Claim[] = [];
  protected approvedClaims: Claim[] = [];
  protected announcements: Announcement[] = [];
  protected abuseReports: AbuseReportRecord[] = [];
  protected students: StudentAccount[] = [];
  protected activities: ActivityRecord[] = [];
  protected userSearch = '';
  protected loading = true;
  protected actionId = '';
  protected editingAnnouncementId = '';
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
      announcements: this.api.adminAnnouncements(),
      abuseReports: this.api.adminAbuseReports('OPEN'),
      students: this.api.adminUsers(this.userSearch),
      activities: this.api.adminActivity(),
    }).subscribe({
      next: ({ stats, reports, pendingClaims, approvedClaims, announcements, abuseReports, students, activities }) => {
        this.stats = stats;
        this.pendingReports = reports.reports;
        this.pendingClaims = pendingClaims.claims;
        this.approvedClaims = approvedClaims.claims;
        this.announcements = announcements.announcements;
        this.abuseReports = abuseReports.abuseReports;
        this.students = students.users;
        this.activities = activities.activities;
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

  protected barWidth(value: number) {
    if (!this.stats?.totalReports) return 0;
    return Math.max(value ? 4 : 0, Math.min(100, Math.round(value / this.stats.totalReports * 100)));
  }

  protected editAnnouncement(announcement: Announcement) {
    this.editingAnnouncementId = announcement.id;
    this.announcementForm.setValue({
      title: announcement.title,
      category: announcement.category ?? '',
      content: announcement.content,
      isPublished: announcement.isPublished ?? true,
    });
  }

  protected cancelAnnouncementEdit() {
    this.editingAnnouncementId = '';
    this.announcementForm.reset({ title: '', category: 'Community', content: '', isPublished: true });
  }

  protected saveAnnouncement() {
    if (this.announcementForm.invalid || this.actionId) return;
    this.actionId = 'announcement';
    const input = this.announcementForm.getRawValue();
    const complete = () => {
      this.actionId = '';
      this.cancelAnnouncementEdit();
      this.load();
      this.success = true;
      this.error = 'Announcement saved.';
      this.changeDetector.markForCheck();
    };
    const fail = (error: { error?: { error?: string } }) => {
      this.actionId = '';
      this.error = error.error?.error ?? 'Unable to save the announcement.';
      this.success = false;
      this.changeDetector.markForCheck();
    };
    if (this.editingAnnouncementId) {
      this.api.updateAnnouncement(this.editingAnnouncementId, input).subscribe({ next: complete, error: fail });
    } else {
      this.api.createAnnouncement(input).subscribe({ next: complete, error: fail });
    }
  }

  protected toggleAnnouncement(announcement: Announcement) {
    this.actionId = announcement.id;
    this.api.updateAnnouncement(announcement.id, { isPublished: !announcement.isPublished }).subscribe({
      next: () => { this.actionId = ''; this.load(); this.success = true; this.error = announcement.isPublished ? 'Announcement unpublished.' : 'Announcement published.'; },
      error: (error) => { this.actionId = ''; this.success = false; this.error = error?.error?.error ?? 'Unable to update announcement.'; this.changeDetector.markForCheck(); },
    });
  }

  protected deleteAnnouncement(announcement: Announcement) {
    if (!window.confirm(`Delete the announcement "${announcement.title}"?`)) return;
    this.actionId = announcement.id;
    this.api.deleteAnnouncement(announcement.id).subscribe({
      next: () => { this.actionId = ''; this.load(); this.success = true; this.error = 'Announcement deleted.'; },
      error: (error) => { this.actionId = ''; this.success = false; this.error = error?.error?.error ?? 'Unable to delete announcement.'; this.changeDetector.markForCheck(); },
    });
  }

  protected reviewAbuse(abuse: AbuseReportRecord, status: 'RESOLVED' | 'REJECTED') {
    this.actionId = abuse.id;
    this.api.resolveAbuseReport(abuse.id, status).subscribe({
      next: () => { this.actionId = ''; this.load(); this.success = true; this.error = status === 'RESOLVED' ? 'Concern resolved.' : 'Concern dismissed.'; },
      error: (error) => { this.actionId = ''; this.success = false; this.error = error?.error?.error ?? 'Unable to update the concern.'; this.changeDetector.markForCheck(); },
    });
  }

  protected setUserSearch(event: Event) {
    if (event.target instanceof HTMLInputElement) this.userSearch = event.target.value;
  }

  protected searchUsers() {
    this.api.adminUsers(this.userSearch).subscribe({
      next: ({ users }) => { this.students = users; this.changeDetector.markForCheck(); },
      error: (error) => { this.error = error?.error?.error ?? 'Unable to search student accounts.'; this.success = false; this.changeDetector.markForCheck(); },
    });
  }

  protected toggleStudentStatus(student: StudentAccount) {
    const status = student.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (status === 'SUSPENDED' && !window.confirm(`Suspend ${student.name}? They will no longer be able to sign in.`)) return;
    this.actionId = student.id;
    this.api.setUserStatus(student.id, status).subscribe({
      next: () => {
        this.students = this.students.map((user) => user.id === student.id ? { ...user, status } : user);
        this.actionId = '';
        this.success = true;
        this.error = status === 'SUSPENDED' ? 'Student suspended.' : 'Student reactivated.';
        this.changeDetector.markForCheck();
      },
      error: (error) => { this.actionId = ''; this.success = false; this.error = error?.error?.error ?? 'Unable to update the student account.'; this.changeDetector.markForCheck(); },
    });
  }
}
