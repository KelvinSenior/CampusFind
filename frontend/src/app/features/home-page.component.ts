import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportsService } from '../core/reports.service';
import type { Announcement, ItemReport, ReportFilters } from '../core/models';
import { ItemCard } from './item-card.component';

const emptyFilters: ReportFilters = { q: '', type: '', category: '', location: '', status: '', date: '', sort: 'newest' };

@Component({
  imports: [DatePipe, RouterLink, ItemCard],
  template: `
    <section class="hero">
      <div class="hero-content">
        <span class="eyebrow"><span class="eyebrow-dot"></span> A better way to bring things back</span>
        <h1>Lost something?<br /><span>Let’s find it.</span></h1>
        <p class="hero-copy">The campus community is better at finding things together. Search recent reports or let others know what you’re missing.</p>
        <div class="hero-actions">
          <a class="button button-primary button-large" routerLink="/browse">Explore found items <span aria-hidden="true">→</span></a>
          <a class="button button-light button-large" routerLink="/report">Report an item</a>
        </div>
        <div class="hero-note"><span class="note-check">✓</span> Free for students · Verified campus community</div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="art-glow"></div>
        <div class="art-card art-card-back"><span class="art-card-icon">⌁</span><span class="art-line wide"></span><span class="art-line"></span></div>
        <div class="art-card art-card-front">
          <div class="art-card-top"><span class="art-mini-logo">C</span><span class="art-status">FOUND NEAR YOU</span></div>
          <div class="art-object">⌕</div>
          <strong>Something familiar?</strong>
          <span class="art-caption">A little help goes a long way.</span>
          <div class="art-card-bottom"><span>Campus community</span><span class="art-arrow">↗</span></div>
        </div>
        <div class="floating-tag"><span>✦</span> Good things find their way back</div>
      </div>
    </section>

    <section class="trust-strip">
      <div><span class="trust-icon">◎</span><span><strong>One campus community</strong><small>Students helping students</small></span></div>
      <div><span class="trust-icon">⌕</span><span><strong>Easy to search</strong><small>Find reports in a few clicks</small></span></div>
      <div><span class="trust-icon">✓</span><span><strong>Safer handovers</strong><small>Structured and verified</small></span></div>
    </section>

    <section class="section recent-section">
      <div class="section-heading">
        <div><span class="eyebrow">THE LATEST</span><h2>Recent campus reports</h2><p>Take a look — what someone found might be just what you’re looking for.</p></div>
        <a class="text-link" routerLink="/browse">Browse all reports <span>→</span></a>
      </div>
      @if (error) { <div class="notice notice-error">{{ error }}</div> }
      @if (loading) { <div class="loading-state"><span class="spinner"></span> Finding recent reports…</div> }
      @if (!loading && reports.length) {
        <div class="item-grid">
          @for (report of reports; track report.id) { <app-item-card [report]="report" /> }
        </div>
      }
      @if (!loading && !reports.length && !error) {
        <div class="empty-state"><span class="empty-icon">⌕</span><h3>It’s quiet around here</h3><p>There are no approved reports yet. Check back soon or share the first report.</p><a class="button button-primary" routerLink="/report">Report an item</a></div>
      }
    </section>

    @if (announcements.length) {
      <section class="announcements-section">
        <div class="announcements-heading"><div><span class="eyebrow">CAMPUS UPDATES</span><h2>Notices from the campus team</h2></div><a class="text-link" routerLink="/browse">Browse reports <span>→</span></a></div>
        <div class="announcements-list">
          @for (announcement of announcements.slice(0, 3); track announcement.id) {
            <article class="announcement-row"><div><small>{{ announcement.category ?? 'Campus notice' }} · {{ announcement.publishedAt | date:'MMM d, y' }}</small><strong>{{ announcement.title }}</strong><p>{{ announcement.content }}</p></div></article>
          }
        </div>
      </section>
    }

    <section class="how-section">
      <div class="how-intro"><span class="eyebrow">SIMPLE BY DESIGN</span><h2>From missing to<br /><span>back in your hands.</span></h2><p>CampusFind makes the process clear, so you can focus on getting on with campus life.</p></div>
      <div class="steps">
        <article class="step"><span class="step-number">01</span><h3>Search or report</h3><p>Look through recent finds, or post a clear report of what you lost or found.</p></article>
        <article class="step"><span class="step-number">02</span><h3>Make a connection</h3><p>Spot a match? Share details only the true owner would know to make a claim.</p></article>
        <article class="step"><span class="step-number">03</span><h3>Meet and return</h3><p>Coordinate a handover through the campus process and get your item home.</p></article>
      </div>
    </section>

    <section class="cta-band">
      <div><span class="eyebrow">A LITTLE KINDNESS GOES A LONG WAY</span><h2>Found something? Be someone’s good news.</h2><p>One quick report could turn someone’s whole day around.</p></div>
      <a class="button button-white button-large" routerLink="/report">Share a found item <span aria-hidden="true">→</span></a>
    </section>
  `,
})
export class HomePage implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected reports: ItemReport[] = [];
  protected announcements: Announcement[] = [];
  protected loading = true;
  protected error = '';

  ngOnInit() {
    this.reportsService.list(emptyFilters).subscribe({
      next: ({ reports }) => {
        this.reports = reports.slice(0, 3);
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.error = 'Recent reports are unavailable right now. Please try browsing again shortly.';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
    this.reportsService.announcements().subscribe({
      next: ({ announcements }) => { this.announcements = announcements; this.changeDetector.markForCheck(); },
    });
  }
}
