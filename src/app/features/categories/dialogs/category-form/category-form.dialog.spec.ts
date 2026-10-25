import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CategoryFormDialog } from './category-form.dialog';
import { Categories } from '../../categories';
import { AppError } from '../../../../core/http/app-error.model';

const categoryStub = {
  id: 1,
  category_name: 'Electronics',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  products: [],
};

const categoriesMock = {
  createCategory: () => of(categoryStub),
  updateCategory: () => of({ ...categoryStub, category_name: 'Updated' }),
};

const dialogRefMock = { close: vi.fn() };

describe('CategoryFormDialog -- create mode', () => {
  let fixture: ComponentFixture<CategoryFormDialog>;
  let component: CategoryFormDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();

    await TestBed.configureTestingModule({
      imports: [CategoryFormDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Categories, useValue: categoriesMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isEdit is false when no data provided', () => {
    expect(component['isEdit']).toBe(false);
  });

  it('form starts with empty category_name', () => {
    expect(component['form'].value.category_name).toBe('');
  });

  it('form is invalid when category_name is empty', () => {
    expect(component['form'].invalid).toBe(true);
  });

  it('closes dialog with created category on success', async () => {
    component['form'].setValue({ category_name: 'Electronics' });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    expect(dialogRefMock.close).toHaveBeenCalledWith(categoryStub);
  });

  it('shows serverError on BUSINESS_RULE failure', async () => {
    const error: AppError = {
      kind: 'BUSINESS_RULE',
      status: 422,
      message: 'Category already exists',
    };
    vi.spyOn(categoriesMock, 'createCategory').mockReturnValueOnce(
      throwError(() => error),
    );
    component['form'].setValue({ category_name: 'Electronics' });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['serverError']()).toBe('Category already exists');
  });

  it('maps VALIDATION fieldErrors onto form controls', async () => {
    const error: AppError = {
      kind: 'VALIDATION',
      status: 400,
      message: 'Validation failed',
      fieldErrors: { category_name: 'Name too long' },
    };
    vi.spyOn(categoriesMock, 'createCategory').mockReturnValueOnce(
      throwError(() => error),
    );
    component['form'].setValue({ category_name: 'x'.repeat(300) });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    fixture.detectChanges();
    const nameErrors = component['form'].get('category_name')?.errors;
    expect(nameErrors?.['serverError']).toBe('Name too long');
  });
});

describe('CategoryFormDialog -- edit mode', () => {
  let fixture: ComponentFixture<CategoryFormDialog>;
  let component: CategoryFormDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();

    await TestBed.configureTestingModule({
      imports: [CategoryFormDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Categories, useValue: categoriesMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { category: categoryStub } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('isEdit is true when category data provided', () => {
    expect(component['isEdit']).toBe(true);
  });

  it('pre-fills form with existing category_name', () => {
    expect(component['form'].value.category_name).toBe('Electronics');
  });

  it('closes with updated category on success', async () => {
    component['form'].setValue({ category_name: 'Updated' });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    expect(dialogRefMock.close).toHaveBeenCalledWith(
      expect.objectContaining({ category_name: 'Updated' }),
    );
  });
});
