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
  id: 1, username: 'jane', email: 'jane@example.com',
  enabled: true, account_locked: false, roles: [],
};
const userWithRole = { ...userStub, roles: [roleStub] };

const usersMock = {
  getUser: () => of(userStub),
  // assignRoles replaces the old addRole/removeRole pair
  assignRoles: () => of(userWithRole),
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

  it('fetches full user detail on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component['user']().email).toBe('jane@example.com');
  });

  it('addRole calls assignRoles with current roles + selected id', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const spy = vi.spyOn(usersMock, 'assignRoles').mockReturnValueOnce(of(userWithRole));
    component['selectedRoleId'] = roleStub.id;
    (component as unknown as { addRole: () => void }).addRole();
    await fixture.whenStable();

    expect(spy).toHaveBeenCalledWith(userStub.id, [roleStub.id]);
    expect(component['user']().roles).toEqual([roleStub]);
  });

  it('removeRole calls assignRoles with current roles minus removed id', async () => {
    component['user'].set(userWithRole);
    const spy = vi.spyOn(usersMock, 'assignRoles').mockReturnValueOnce(of(userStub));
    (component as unknown as { removeRole: (r: typeof roleStub) => void })
      .removeRole(roleStub);
    await fixture.whenStable();

    expect(spy).toHaveBeenCalledWith(userStub.id, []);
    expect(component['user']().roles).toEqual([]);
  });

  it('close emits final user state', () => {
    component['user'].set(userWithRole);
    (component as unknown as { close: () => void }).close();
    expect(dialogRefMock.close).toHaveBeenCalledWith(userWithRole);
  });

  it('shows error notification when assignRoles fails on add', async () => {
    const error: AppError = { kind: 'SERVER', status: 500, message: 'Error' };
    vi.spyOn(usersMock, 'assignRoles').mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();
    component['selectedRoleId'] = roleStub.id;
    (component as unknown as { addRole: () => void }).addRole();
    await fixture.whenStable();

    expect(component['saving']()).toBe(false);
  });
});
