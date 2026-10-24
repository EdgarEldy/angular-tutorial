import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { RoleFormDialog } from './role-form.dialog';
import { Roles } from '../../roles';
import { AppError } from '../../../../core/http/app-error.model';

const roleStub = { id: 1, role_name: 'ADMIN', permissions: [] };

const rolesMock = {
  createRole: () => of(roleStub),
  updateRole: () => of({ ...roleStub, role_name: 'SUPERADMIN' }),
};

const dialogRefMock = { close: jest.fn() };

describe('RoleFormDialog -- create mode', () => {
  let fixture: ComponentFixture<RoleFormDialog>;
  let component: RoleFormDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();

    await TestBed.configureTestingModule({
      imports: [RoleFormDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Roles, useValue: rolesMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isEdit is false when no data provided', () => {
    expect(component['isEdit']).toBe(false);
  });

  it('closes dialog with created role on success', async () => {
    component['form'].setValue({ role_name: 'ADMIN' });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    expect(dialogRefMock.close).toHaveBeenCalledWith(roleStub);
  });

  it('shows serverError on failure', async () => {
    const error: AppError = { kind: 'BUSINESS_RULE', status: 422, message: 'Conflict' };
    jest.spyOn(rolesMock, 'createRole').mockReturnValueOnce(throwError(() => error));
    component['form'].setValue({ role_name: 'ADMIN' });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['serverError']()).toBe('Conflict');
  });
});

describe('RoleFormDialog -- edit mode', () => {
  let fixture: ComponentFixture<RoleFormDialog>;
  let component: RoleFormDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();

    await TestBed.configureTestingModule({
      imports: [RoleFormDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Roles, useValue: rolesMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { role: roleStub } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('isEdit is true when role data provided', () => {
    expect(component['isEdit']).toBe(true);
  });

  it('pre-fills form with existing role name', () => {
    expect(component['form'].value.role_name).toBe('ADMIN');
  });

  it('closes with updated role on success', async () => {
    component['form'].setValue({ role_name: 'SUPERADMIN' });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    expect(dialogRefMock.close).toHaveBeenCalledWith(
      expect.objectContaining({ role_name: 'SUPERADMIN' }),
    );
  });
});
