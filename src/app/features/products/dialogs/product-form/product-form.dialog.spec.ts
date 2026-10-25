import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ProductFormDialog } from './product-form.dialog';
import { Products } from '../../products';
import { Categories } from '../../../categories/categories';
import { AppError } from '../../../../core/http/app-error.model';

const productStub = {
  id: 1,
  product_name: 'Widget',
  unit_price: 9.99,
  category_id: 2,
  category_name: 'Electronics',
};

const categoryPageStub = {
  content: [{ id: 2, category_name: 'Electronics', created_at: '', updated_at: '', products: [] }],
  page: 0, size: 200, totalElements: 1, totalPages: 1,
};

const productsMock = {
  createProduct: vi.fn(() => of(productStub)),
  updateProduct: vi.fn(() => of({ ...productStub, product_name: 'Updated' })),
};

const categoriesMock = {
  getCategories: vi.fn(() => of(categoryPageStub)),
};

const dialogRefMock = { close: vi.fn() };

describe('ProductFormDialog -- create mode', () => {
  let fixture: ComponentFixture<ProductFormDialog>;
  let component: ProductFormDialog;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ProductFormDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Products, useValue: productsMock },
        { provide: Categories, useValue: categoriesMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isEdit is false when no data provided', () => {
    expect(component['isEdit']).toBe(false);
  });

  it('form starts with empty product_name', () => {
    expect(component['form'].value.product_name).toBe('');
  });

  it('form is invalid when product_name is empty', () => {
    expect(component['form'].invalid).toBe(true);
  });

  it('form is invalid when unit_price is 0', () => {
    component['form'].setValue({ product_name: 'Widget', unit_price: 0, category_id: 2 });
    expect(component['form'].get('unit_price')?.hasError('min')).toBe(true);
  });

  it('form is invalid when unit_price is negative', () => {
    component['form'].setValue({ product_name: 'Widget', unit_price: -1, category_id: 2 });
    expect(component['form'].get('unit_price')?.hasError('min')).toBe(true);
  });

  it('form is invalid when category_id is missing', () => {
    component['form'].patchValue({ product_name: 'Widget', unit_price: 5 });
    expect(component['form'].get('category_id')?.hasError('required')).toBe(true);
  });

  it('form is valid with all required fields', () => {
    component['form'].setValue({ product_name: 'Widget', unit_price: 9.99, category_id: 2 });
    expect(component['form'].valid).toBe(true);
  });

  it('calls createProduct and closes dialog on success', async () => {
    component['form'].setValue({ product_name: 'Widget', unit_price: 9.99, category_id: 2 });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    expect(productsMock.createProduct).toHaveBeenCalledWith({
      product_name: 'Widget',
      unit_price: 9.99,
      category_id: 2,
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith(productStub);
  });

  it('shows serverError on BUSINESS_RULE failure', async () => {
    const error: AppError = {
      kind: 'BUSINESS_RULE',
      status: 422,
      message: 'Category not found',
    };
    vi.spyOn(productsMock, 'createProduct').mockReturnValueOnce(
      throwError(() => error),
    );
    component['form'].setValue({ product_name: 'Widget', unit_price: 9.99, category_id: 99 });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['serverError']()).toBe('Category not found');
  });

  it('maps VALIDATION fieldErrors onto form controls', async () => {
    const error: AppError = {
      kind: 'VALIDATION',
      status: 400,
      message: 'Validation failed',
      fieldErrors: { product_name: 'Name too long' },
    };
    vi.spyOn(productsMock, 'createProduct').mockReturnValueOnce(
      throwError(() => error),
    );
    component['form'].setValue({ product_name: 'Widget', unit_price: 9.99, category_id: 2 });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    fixture.detectChanges();
    const nameErrors = component['form'].get('product_name')?.errors;
    expect(nameErrors?.['serverError']).toBe('Name too long');
  });
});

describe('ProductFormDialog -- edit mode', () => {
  let fixture: ComponentFixture<ProductFormDialog>;
  let component: ProductFormDialog;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ProductFormDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Products, useValue: productsMock },
        { provide: Categories, useValue: categoriesMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { product: productStub } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('isEdit is true when product data provided', () => {
    expect(component['isEdit']).toBe(true);
  });

  it('pre-fills form with existing product values', () => {
    expect(component['form'].value.product_name).toBe('Widget');
    expect(component['form'].value.unit_price).toBe(9.99);
    expect(component['form'].value.category_id).toBe(2);
  });

  it('calls updateProduct and closes dialog on success', async () => {
    component['form'].setValue({ product_name: 'Updated', unit_price: 14.99, category_id: 2 });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    expect(productsMock.updateProduct).toHaveBeenCalledWith(1, {
      product_name: 'Updated',
      unit_price: 14.99,
      category_id: 2,
    });
    expect(dialogRefMock.close).toHaveBeenCalled();
  });

  it('shows conflict message and conflictError flag on 409', async () => {
    const error: AppError = {
      kind: 'CONFLICT',
      status: 409,
      message: 'Product was modified elsewhere.',
    };
    vi.spyOn(productsMock, 'updateProduct').mockReturnValueOnce(
      throwError(() => error),
    );
    component['form'].setValue({ product_name: 'Widget', unit_price: 9.99, category_id: 2 });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['conflictError']()).toBe(true);
    expect(component['serverError']()).toContain('Product was modified elsewhere.');
    // Dialog must stay open -- dialogRef.close is NOT called on conflict
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});
