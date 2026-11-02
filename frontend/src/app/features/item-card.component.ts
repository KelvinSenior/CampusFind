import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { categories, labelFor, locations, type ItemReport } from '../core/models';

@Component({
  selector: 'app-item-card',
  imports: [DatePipe, RouterLink],
  template: `
    <article class="item-card">
      <a class="item-card-image" [routerLink]="['/items', report().id]" [attr.aria-label]="'View ' + report().itemName">
        @if (report().photoUrl) { <img [src]="report().photoUrl" [alt]="report().itemName" /> }
        @else { <span class="item-placeholder" aria-hidden="true">{{ report().reportType === 'FOUND' ? '⌕' : '⌁' }}</span> }
        <span class="type-badge" [class.found-badge]="report().reportType === 'FOUND'">{{ report().reportType === 'FOUND' ? 'Found' : 'Lost' }}</span>
        @if (report().status === 'RECOVERED') { <span class="recovered-badge">Recovered</span> }
      </a>
      <div class="item-card-body">
        <div class="card-category">{{ categoryLabel }}</div>
        <a class="item-card-title" [routerLink]="['/items', report().id]">{{ report().itemName }}</a>
        <p class="item-card-description">{{ report().description }}</p>
        <div class="item-card-meta"><span>⌖ {{ locationLabel }}</span><span>{{ report().dateOccurred | date:'MMM d' }}</span></div>
      </div>
    </article>
  `,
})
export class ItemCard {
  readonly report = input.required<ItemReport>();
  protected get categoryLabel() { return labelFor(categories, this.report().category); }
  protected get locationLabel() { return labelFor(locations, this.report().location); }
}
