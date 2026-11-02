import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  AbuseReportRecord,
  ActivityRecord,
  AdminStatistics,
  Announcement,
  Claim,
  DemoConfig,
  ItemReport,
  PotentialMatch,
  ReportFilters,
  SavedItem,
  StudentAccount,
  StudentStatistics,
} from './models';

const API_URL = '/api';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  list(filters: ReportFilters): Observable<{ reports: ItemReport[] }> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<{ reports: ItemReport[] }>(`${API_URL}/reports`, { params });
  }

  get(id: string): Observable<{ report: ItemReport }> {
    return this.http.get<{ report: ItemReport }>(`${API_URL}/reports/${encodeURIComponent(id)}`);
  }

  create(input: Record<string, string>): Observable<{ report: ItemReport }> {
    return this.http.post<{ report: ItemReport }>(`${API_URL}/reports`, input);
  }

  update(reportId: string, input: { itemName: string; description: string }): Observable<{ report: ItemReport }> {
    return this.http.patch<{ report: ItemReport }>(`${API_URL}/reports/${encodeURIComponent(reportId)}`, input);
  }

  mine(): Observable<{ reports: ItemReport[] }> {
    return this.http.get<{ reports: ItemReport[] }>(`${API_URL}/my/reports`);
  }

  myClaims(): Observable<{ claims: Claim[] }> {
    return this.http.get<{ claims: Claim[] }>(`${API_URL}/my/claims`);
  }

  notifications() {
    return this.http.get<{ notifications: Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }> }>(`${API_URL}/notifications`);
  }

  demoConfig() {
    return this.http.get<DemoConfig>(`${API_URL}/demo/config`);
  }

  announcements() {
    return this.http.get<{ announcements: Announcement[] }>(`${API_URL}/announcements`);
  }

  savedItems() {
    return this.http.get<{ savedItems: SavedItem[] }>(`${API_URL}/saved-items`);
  }

  saveItem(reportId: string) {
    return this.http.post<{ savedItem: { id: string; reportId: string; createdAt: string } }>(`${API_URL}/saved-items/${encodeURIComponent(reportId)}`, {});
  }

  removeSavedItem(reportId: string) {
    return this.http.delete<void>(`${API_URL}/saved-items/${encodeURIComponent(reportId)}`);
  }

  createAbuseReport(reportId: string, input: { reason: string; details?: string }) {
    return this.http.post(`${API_URL}/reports/${encodeURIComponent(reportId)}/abuse-reports`, input);
  }

  myDashboard() {
    return this.http.get<StudentStatistics>(`${API_URL}/my/dashboard`);
  }

  matches(reportId: string): Observable<{ matches: PotentialMatch[] }> {
    return this.http.get<{ matches: PotentialMatch[] }>(`${API_URL}/reports/${encodeURIComponent(reportId)}/matches`);
  }

  claim(reportId: string, input: { explanation: string; distinguishingFeatures: string; additionalEvidence?: string }) {
    return this.http.post(`${API_URL}/reports/${encodeURIComponent(reportId)}/claims`, input);
  }

  claimsForReport(reportId: string): Observable<{ claims: Claim[] }> {
    return this.http.get<{ claims: Claim[] }>(`${API_URL}/reports/${encodeURIComponent(reportId)}/claims`);
  }

  reviewClaim(claimId: string, status: 'APPROVED' | 'REJECTED') {
    return this.http.patch<{ claim: Claim }>(`${API_URL}/claims/${encodeURIComponent(claimId)}/review`, { status });
  }

  delete(reportId: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/reports/${encodeURIComponent(reportId)}`);
  }

  adminStatistics(): Observable<AdminStatistics> {
    return this.http.get<AdminStatistics>(`${API_URL}/admin/dashboard`);
  }

  adminReports(status = 'PENDING'): Observable<{ reports: ItemReport[] }> {
    return this.http.get<{ reports: ItemReport[] }>(`${API_URL}/admin/reports`, { params: { status } });
  }

  adminClaims(status?: string): Observable<{ claims: Claim[] }> {
    return this.http.get<{ claims: Claim[] }>(`${API_URL}/admin/claims`, {
      params: status ? { status } : {},
    });
  }

  moderateReport(reportId: string, status: 'APPROVED' | 'REJECTED') {
    return this.http.patch(`${API_URL}/reports/${encodeURIComponent(reportId)}/moderate`, { status });
  }

  verifyHandover(claimId: string, handoverCode: string) {
    return this.http.post(`${API_URL}/admin/claims/${encodeURIComponent(claimId)}/verify-handover`, { handoverCode });
  }

  markNotificationRead(notificationId: string) {
    return this.http.patch(`${API_URL}/notifications/${encodeURIComponent(notificationId)}/read`, {});
  }

  adminAnnouncements() {
    return this.http.get<{ announcements: Announcement[] }>(`${API_URL}/admin/announcements`);
  }

  createAnnouncement(input: Pick<Announcement, 'title' | 'content' | 'category'> & { isPublished: boolean }) {
    return this.http.post<{ announcement: Announcement }>(`${API_URL}/admin/announcements`, input);
  }

  updateAnnouncement(id: string, input: Partial<Pick<Announcement, 'title' | 'content' | 'category' | 'isPublished'>>) {
    return this.http.patch<{ announcement: Announcement }>(`${API_URL}/admin/announcements/${encodeURIComponent(id)}`, input);
  }

  deleteAnnouncement(id: string) {
    return this.http.delete<void>(`${API_URL}/admin/announcements/${encodeURIComponent(id)}`);
  }

  adminAbuseReports(status?: string) {
    return this.http.get<{ abuseReports: AbuseReportRecord[] }>(`${API_URL}/admin/abuse-reports`, {
      params: status ? { status } : {},
    });
  }

  resolveAbuseReport(id: string, status: 'RESOLVED' | 'REJECTED') {
    return this.http.patch(`${API_URL}/admin/abuse-reports/${encodeURIComponent(id)}`, { status });
  }

  adminUsers(q = '') {
    return this.http.get<{ users: StudentAccount[] }>(`${API_URL}/admin/users`, { params: q ? { q } : {} });
  }

  setUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.http.patch<{ user: StudentAccount }>(`${API_URL}/admin/users/${encodeURIComponent(id)}/status`, { status });
  }

  adminActivity() {
    return this.http.get<{ activities: ActivityRecord[] }>(`${API_URL}/admin/activity`);
  }
}
