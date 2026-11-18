import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PermissionFormDialog } from './permission-form.dialog';
import { Permissions } from '../../permissions';
import { AppError } from '../../../../core/http/app-error.model';

const makeStub = (action: string) => ({ id: 1, resource: 'CATEGORY', action });

const permissionsMock = {
  createPermission: vi.fn((body: { resource: string; action: string }) =>
    of(makeStub(body.action)),
  ),
};

const dialogRefMock = { close: vi.fn() };

describe('PermissionFormDialog', () => {
  let fixture: ComponentFixture<PermissionFormDialog>;
  let component: PermissionFormDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();
    permissionsMock.createPermission.mockClear();

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

  it('submit does nothing when resource is empty', () => {
    // form invalid -- resource is required
    (component as unknown as { submit: () => void }).submit();
    expect(permissionsMock.createPermission).not.toHaveBeenCalled();
  });

  it('submit does nothing when no action is selected', () => {
    component['form'].setValue({ resource: 'CATEGORY' });
    // selectedActions is empty by default
    (component as unknown as { submit: () => void }).submit();
    expect(permissionsMock.createPermission).not.toHaveBeenCalled();
  });

  it('closes dialog with array of created permissions on success', async () => {
    component['form'].setValue({ resource: 'CATEGORY' });
    // Select CREATE and READ
    component['toggleAction']('CREATE');
    component['toggleAction']('READ');

    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();

    // forkJoin calls createPermission once per selected action
    expect(permissionsMock.createPermission).toHaveBeenCalledTimes(2);
    expect(dialogRefMock.close).toHaveBeenCalledWith([
      makeStub('CREATE'),
      makeStub('READ'),
    ]);
  });

  it('shows serverError on BUSINESS_RULE (422) response', async () => {
    const error: AppError = {
      kind: 'BUSINESS_RULE',
      status: 422,
      message: 'Already exists',
    };
    permissionsMock.createPermission.mockReturnValueOnce(
      throwError(() => error),
    );

    component['form'].setValue({ resource: 'CATEGORY' });
    component['toggleAction']('READ');

    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['serverError']()).toBe('Already exists');
  });
});
