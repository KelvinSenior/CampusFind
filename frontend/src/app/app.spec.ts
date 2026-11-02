import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClientTesting()],
    })
      .compileComponents();
  });

  it('renders CampusFind navigation and public links', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('CampusFind');
    expect(compiled.querySelector('a[href="/browse"]')?.textContent).toContain('Browse items');
    expect(compiled.querySelector('a[href="/register"]')?.textContent).toContain('Get started');
  });
});
