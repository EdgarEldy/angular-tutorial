import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CategoryDetailPage } from './category-detail.page';
import { Categories } from '../../categories';
import { AppError } from '../../../../core/http/app-error.model';

const productStub = {
  id: 10,
  product_name: 'Laptop',
  unit_price: 999.99,
  category_id: 1,
  category_name: 'Electronics',
};

const categoryStub = {
  id: 1,
  category_name: 'Electronics',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  products: [productStub],
};

const categoriesMock = {
  getCategory: () => of(categoryStub),
};

describe('CategoryDetailPage', () => {
  let fixture: ComponentFixture<CategoryDetailPage>;
  let component: CategoryDetailPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryDetailPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: Categories, useValue: categoriesMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryDetailPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads category on init and shows name', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent.trim()).toBe('Electronics');
  });

  it('shows product rows when category has products', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(1);
  });

  it('shows empty state when category has no products', async () => {
    vi.spyOn(categoriesMock, 'getCategory').mockReturnValueOnce(
      of({ ...categoryStub, products: [] }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty).toBeTruthy();
  });

  it('shows error state on load failure', async () => {
    const error: AppError = { kind: 'NOT_FOUND', status: 404, message: 'Category not found' };
    vi.spyOn(categoriesMock, 'getCategory').mockReturnValueOnce(
      throwError(() => error),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('app-error-banner');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Category not found');
  });
});
