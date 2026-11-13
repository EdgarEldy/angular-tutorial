import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ManageRolesDialog } from './manage-roles.dialog';
import { Users } from '../../users';
import { Roles } from '../../../roles/roles';
import { AppError } from '../../../../core/http/app-error.model';

const roleStub = { id: 10, role_name: 'ADMIN', permissions: [] };
const userStub = {
  id: 1, first_name: 'Jane', last_name: 'Doe',
  username: 'jane', email: 'jane@example.com',
  enabled: true, account_locked: false, roles: [],
};
const userWithRole = { ...userStub, roles: [roleStub] };

const usersMock = {
  getUser: vi.fn(() => of(userStub)),
  updateRoles: vi.fn(() => of(userWithRole)),
};

const rolesMock = {
  getRoles: () => of([roleStub]),
};

const dialogRefMock = { close: vi.fn() };

describe('ManageRolesDialog', () => {
  let fixture: ComponentFixture<ManageRolesDialog>;
  let component: ManageRolesDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();
    usersMock.getUser.mockClear();
    usersMock.updateRoles.mockClear();
    usersMock.getUser.mockReturnValue(of(userStub));
    usersMock.updateRoles.mockReturnValue(of(userWithRole));

    await TestBed.configureTestingModule({
      imports: [ManageRolesDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Users, useValue: usersMock },
        { provide: Roles, useValue: rolesMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { user: userStub } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageRolesDialog);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('fetches full user detail on init and loads all roles', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component['user']().email).toBe('jane@example.com');
    expect(component['allRoles']()).toEqual([roleStub]);
  });

  it('starts with no pre-checks when user has no roles', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component['checkedIds']().size).toBe(0);
  });

  it('toggle adds an unchecked role to checkedIds', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    (component as unknown as { toggle: (id: number) => void }).toggle(roleStub.id);
    expect(component['checkedIds']().has(roleStub.id)).toBe(true);
  });

  it('save calls updateRoles with computed diff and closes on success', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    // roleStub.id was initially unchecked; toggling adds it
    (component as unknown as { toggle: (id: number) => void }).toggle(roleStub.id);
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(usersMock.updateRoles).toHaveBeenCalledWith(userStub.id, {
      add: [roleStub.id],
      remove: [],
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith(userWithRole);
  });

  it('save closes without a server call when nothing changed', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    // No toggles -- the selection matches the initial state (both empty)
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(usersMock.updateRoles).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(userStub);
  });

  it('cancel closes the dialog without a server call', () => {
    (component as unknown as { cancel: () => void }).cancel();
    expect(usersMock.updateRoles).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith({ ...userStub, roles: [] });
  });

  it('shows business error inline and keeps dialog open on BUSINESS_RULE (422)', async () => {
    const error: AppError = { kind: 'BUSINESS_RULE', status: 422, message: 'Cannot assign' };
    usersMock.updateRoles.mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();
    (component as unknown as { toggle: (id: number) => void }).toggle(roleStub.id);
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
    expect(component['businessError']()).toBe('Cannot assign');
    expect(component['saving']()).toBe(false);
  });

  it('resets saving flag on non-business error', async () => {
    const error: AppError = { kind: 'SERVER', status: 500, message: 'Error' };
    usersMock.updateRoles.mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();
    (component as unknown as { toggle: (id: number) => void }).toggle(roleStub.id);
    (component as unknown as { save: () => void }).save();
    await fixture.whenStable();

    expect(component['saving']()).toBe(false);
  });
});
