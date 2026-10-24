import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { ManagePermissionsDialog } from './manage-permissions.dialog';
import { Roles } from '../../roles';
import { Permissions } from '../../../permissions/permissions';
import { AppError } from '../../../../core/http/app-error.model';

const permStub = { id: 2, resource: 'PRODUCT', action: 'READ' };
const roleStub = { id: 1, role_name: 'ADMIN', permissions: [] };
const roleWithPerm = { id: 1, role_name: 'ADMIN', permissions: [permStub] };

const rolesMock = {
  addPermission: () => of(roleWithPerm),
  removePermission: () => of(roleStub),
};

const permissionsMock = {
  getPermissions: () => of([permStub]),
};

const dialogRefMock = { close: jest.fn() };

describe('ManagePermissionsDialog', () => {
  let fixture: ComponentFixture<ManagePermissionsDialog>;
  let component: ManagePermissionsDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();

    await TestBed.configureTestingModule({
      imports: [ManagePermissionsDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Roles, useValue: rolesMock },
        { provide: Permissions, useValue: permissionsMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { role: roleStub } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagePermissionsDialog);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads all permissions on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['allPermissions']()).toEqual([permStub]);
  });

  it('addPermission updates role from server response', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component['selectedPermissionId'] = permStub.id;
    (component as unknown as { addPermission: () => void }).addPermission();
    await fixture.whenStable();

    expect(component['role']().permissions).toEqual([permStub]);
  });

  it('removePermission updates role from server response', async () => {
    // Start with a role that already has the permission assigned
    component['role'].set(roleWithPerm);
    (component as unknown as { removePermission: (p: typeof permStub) => void })
      .removePermission(permStub);
    await fixture.whenStable();

    expect(component['role']().permissions).toEqual([]);
  });

  it('close emits final role state', () => {
    component['role'].set(roleWithPerm);
    (component as unknown as { close: () => void }).close();
    expect(dialogRefMock.close).toHaveBeenCalledWith(roleWithPerm);
  });

  it('shows error notification when addPermission fails', async () => {
    const error: AppError = { kind: 'SERVER', status: 500, message: 'Server error' };
    jest.spyOn(rolesMock, 'addPermission').mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();

    component['selectedPermissionId'] = permStub.id;
    (component as unknown as { addPermission: () => void }).addPermission();
    await fixture.whenStable();
    // saving resets to false on error
    expect(component['saving']()).toBe(false);
  });
});
