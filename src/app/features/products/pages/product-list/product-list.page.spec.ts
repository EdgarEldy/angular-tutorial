import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProductListPage } from './product-list.page';
import { Products } from '../../products';
import { Categories } from '../../../categories/categories';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';

const productStub = {
  id: 1,
  product_name: 'Widget',
  unit_price: 9.99,
  category_id: 2,
  category_name: 'Electronics',
};

const pageStub = {
  content: [productStub],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };

const categoryPageStub = {
  content: [{ id: 2, category_name: 'Electronics', created_at: '', updated_at: '', products: [] }],
  page: 0, size: 200, totalElements: 1, totalPages: 1,
};

const productsMock = {
  getProducts: vi.fn(() => of(pageStub)),
  deleteProduct: vi.fn(() => of(undefined)),
};

const categoriesMock = {
  getCategories: vi.fn(() => of(categoryPageStub)),
};

const notificationMock = { success: vi.fn(), error: vi.fn() };
const dialogMock = { open: vi.fn(() => ({ afterClosed: () => of(undefined) })) };

describe('ProductListPage', () => {
  let fixture: ComponentFixture<ProductListPage>;
  let component: ProductListPage;

  beforeEach(async () => {
    vi.clearAllMocks();
    productsMock.getProducts.mockReturnValue(of(pageStub));

    await TestBed.configureTestingModule({
      imports: [ProductListPage],
      providers: [
        provideAnimationsAsync(),
        { provide: Products, useValue: productsMock },
        { provide: Categories, useValue: categoriesMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('shows loading state before data arrives', () => {
    // Before detectChanges the signal is still true (set in field declaration)
    expect(component['loading']()).toBe(true);
  });

  it('shows products in table after successful load', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['products']()).toHaveLength(1);
    expect(component['products']()[0].product_name).toBe('Widget');
  });

  it('shows empty state when page content is empty', async () => {
    productsMock.getProducts.mockReturnValue(of(emptyPage));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['products']()).toHaveLength(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
  });

  it('shows error state when service throws', async () => {
    const err: AppError = { kind: 'SERVER', status: 500, message: 'Server error' };
    productsMock.getProducts.mockReturnValue(throwError(() => err));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['error']()).toEqual(err);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-text')).toBeTruthy();
  });

  it('calls getProducts with categoryId when category filter changes', () => {
    fixture.detectChanges();
    component['onCategoryFilter'](5);
    expect(productsMock.getProducts).toHaveBeenCalledWith(
      0, 10, expect.objectContaining({ categoryId: 5 }),
    );
  });

  it('resets page to 0 when category filter changes', () => {
    fixture.detectChanges();
    component['page'].set(2);
    component['onCategoryFilter'](5);
    expect(component['page']()).toBe(0);
  });

  it('debounces product name filter -- does NOT call loadProducts immediately', fakeAsync(() => {
    fixture.detectChanges();
    // Clear the initial call
    vi.clearAllMocks();
    productsMock.getProducts.mockReturnValue(of(pageStub));
    component['onNameFilter']('Widget');
    // Before debounce fires, getProducts should not have been called again
    expect(productsMock.getProducts).not.toHaveBeenCalled();
    tick(300);
    expect(productsMock.getProducts).toHaveBeenCalled();
  }));

  it('calls getProducts with productName after debounce', fakeAsync(() => {
    fixture.detectChanges();
    vi.clearAllMocks();
    productsMock.getProducts.mockReturnValue(of(pageStub));
    component['onNameFilter']('Widget');
    tick(300);
    expect(productsMock.getProducts).toHaveBeenCalledWith(
      0, 10, expect.objectContaining({ productName: 'Widget' }),
    );
  }));

  it('does NOT send empty productName to service', fakeAsync(() => {
    fixture.detectChanges();
    vi.clearAllMocks();
    productsMock.getProducts.mockReturnValue(of(pageStub));
    component['onNameFilter']('');
    tick(300);
    const call = productsMock.getProducts.mock.calls[0] as [number, number, { productName?: string }];
    expect(call[2].productName).toBeUndefined();
  }));

  it('calls getProducts with minPrice and maxPrice when set', () => {
    fixture.detectChanges();
    component['filterMinPrice'].set(5);
    component['filterMaxPrice'].set(50);
    component['onPriceFilter']();
    expect(productsMock.getProducts).toHaveBeenCalledWith(
      0, 10, expect.objectContaining({ minPrice: 5, maxPrice: 50 }),
    );
  });
});
