import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PermissionFormDialog } from './permission-form.dialog';
import { Permissions } from '../../permissions';
import { AppError } from '../../../../core/http/app-error.model';

const permStub = { id: 1, resource: 'PRODUCT', action: 'READ' };

const permissionsMock = {
  createPermission: () => of(permStub),
};

const dialogRefMock = { close: vi.fn() };

describe('PermissionFormDialog', () => {
  let fixture: ComponentFixture<PermissionFormDialog>;
  let component: PermissionFormDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();

    await TestBed.configureTestingModule({
      imports: [PermissionFormDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Permissions, useValue: permissionsMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PermissionFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submit does nothing when form is invalid', () => {
    const spy = vi.spyOn(permissionsMock, 'createPermission');
    // form is empty by default -- both fields invalid
    (component as unknown as { submit: () => void }).submit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('closes dialog with created permission on success', async () => {
    // Fill the form
    component['form'].setValue({ resource: 'PRODUCT', action: 'READ' });
    fixture.detectChanges();

    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();

    expect(dialogRefMock.close).toHaveBeenCalledWith(permStub);
  });

  it('shows serverError on BUSINESS_RULE (422) response', async () => {
    const error: AppError = {
      kind: 'BUSINESS_RULE',
      status: 422,
      message: 'Already exists',
    };
    vi.spyOn(permissionsMock, 'createPermission').mockReturnValueOnce(
      throwError(() => error),
    );

    component['form'].setValue({ resource: 'PRODUCT', action: 'READ' });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['serverError']()).toBe('Already exists');
  });
});
