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

/** Configures TestBed and returns the fixture for the given role. */
async function setup(role: typeof roleStub | typeof roleWithPerm) {
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
      { provide: MAT_DIALOG_DATA, useValue: { role } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ManagePermissionsDialog);
  return { fixture, component: fixture.componentInstance };
}

describe('ManagePermissionsDialog', () => {
  // Reset TestBed between tests so each can configure it independently
  beforeEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    const { fixture } = await setup(roleStub);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads all permissions on init and starts with no pre-checks when role has none', async () => {
    const { fixture, component } = await setup(roleStub);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component['allPermissions']()).toEqual([permStub]);
    expect(component['checkedIds']().size).toBe(0);
  });

  it('pre-checks permissions already assigned to the role', async () => {
    const { fixture, component } = await setup(roleWithPerm);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component['checkedIds']().has(permStub.id)).toBe(true);
  });

  it('toggle adds an unchecked permission to checkedIds', async () => {
    const { fixture, component } = await setup(roleStub);
    fixture.detectChanges();
    await fixture.whenStable();
    (component as unknown as { toggle: (id: number) => void }).toggle(permStub.id);
    expect(component['checkedIds']().has(permStub.id)).toBe(true);
  });

  it('save calls updatePermissions with computed diff and closes on success', async () => {
    const { fixture, component } = await setup(roleStub);
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
    const { fixture, component } = await setup(roleStub);
    fixture.detectChanges();
    await fixture.whenStable();
    // No toggles -- the selection matches the initial state (both empty)
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(rolesMock.updatePermissions).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(roleStub);
  });

  it('cancel closes the dialog without a server call', async () => {
    const { component } = await setup(roleStub);
    (component as unknown as { cancel: () => void }).cancel();
    expect(rolesMock.updatePermissions).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(roleStub);
  });

  it('shows business error inline and keeps dialog open on BUSINESS_RULE (422)', async () => {
    const error: AppError = { kind: 'BUSINESS_RULE', status: 422, message: 'Cannot assign' };
    rolesMock.updatePermissions.mockReturnValueOnce(throwError(() => error));

    const { fixture, component } = await setup(roleStub);
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

    const { fixture, component } = await setup(roleStub);
    fixture.detectChanges();
    await fixture.whenStable();
    (component as unknown as { toggle: (id: number) => void }).toggle(permStub.id);
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(component['saving']()).toBe(false);
  });
});
