import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ManagePermissionsDialog } from './manage-permissions.dialog';
import { Roles } from '../../roles';
import { Permissions } from '../../../permissions/permissions';
import { AppError } from '../../../../core/http/app-error.model';

const permStub = { id: 2, resource: 'PRODUCT', action: 'READ' };
const roleStub = { id: 1, role_name: 'ADMIN', permissions: [] };
const roleWithPerm = { id: 1, role_name: 'ADMIN', permissions: [permStub] };

const rolesMock = {
  updatePermissions: vi.fn(() => of(roleWithPerm)),
};

const permissionsMock = {
  getPermissions: () => of([permStub]),
};

const dialogRefMock = { close: vi.fn() };

describe('ManagePermissionsDialog', () => {
  let fixture: ComponentFixture<ManagePermissionsDialog>;
  let component: ManagePermissionsDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();
    rolesMock.updatePermissions.mockClear();
    rolesMock.updatePermissions.mockReturnValue(of(roleWithPerm));

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

  it('loads all permissions on init and starts with no pre-checks when role has none', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component['allPermissions']()).toEqual([permStub]);
    expect(component['checkedIds']().size).toBe(0);
  });

  it('pre-checks permissions already assigned to the role', async () => {
    // Reconfigure with a role that already has the permission assigned
    await TestBed.configureTestingModule({
      imports: [ManagePermissionsDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Roles, useValue: rolesMock },
        { provide: Permissions, useValue: permissionsMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { role: roleWithPerm } },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(ManagePermissionsDialog);
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance['checkedIds']().has(permStub.id)).toBe(true);
  });

  it('toggle adds an unchecked permission to checkedIds', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    (component as unknown as { toggle: (id: number) => void }).toggle(permStub.id);
    expect(component['checkedIds']().has(permStub.id)).toBe(true);
  });

  it('save calls updatePermissions with computed diff and closes on success', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    // permStub.id was initially unchecked; toggling adds it
    (component as unknown as { toggle: (id: number) => void }).toggle(permStub.id);
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(rolesMock.updatePermissions).toHaveBeenCalledWith(roleStub.id, {
      add: [permStub.id],
      remove: [],
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith(roleWithPerm);
  });

  it('save closes without a server call when nothing changed', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    // No toggles -- the selection matches the initial state (both empty)
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(rolesMock.updatePermissions).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(roleStub);
  });

  it('cancel closes the dialog without a server call', () => {
    (component as unknown as { cancel: () => void }).cancel();
    expect(rolesMock.updatePermissions).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(roleStub);
  });

  it('shows business error inline and keeps dialog open on BUSINESS_RULE (422)', async () => {
    const error: AppError = { kind: 'BUSINESS_RULE', status: 422, message: 'Cannot assign' };
    rolesMock.updatePermissions.mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();
    (component as unknown as { toggle: (id: number) => void }).toggle(permStub.id);
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
    expect(component['businessError']()).toBe('Cannot assign');
    expect(component['saving']()).toBe(false);
  });

  it('resets saving flag on non-business error', async () => {
    const error: AppError = { kind: 'SERVER', status: 500, message: 'Server error' };
    rolesMock.updatePermissions.mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();
    (component as unknown as { toggle: (id: number) => void }).toggle(permStub.id);
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(component['saving']()).toBe(false);
  });
});
