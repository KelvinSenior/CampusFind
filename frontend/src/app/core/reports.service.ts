import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AdminStatistics, Claim, ItemReport, PotentialMatch, ReportFilters } from './models';

const API_URL = 'http://localhost:3000/api';

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
}
