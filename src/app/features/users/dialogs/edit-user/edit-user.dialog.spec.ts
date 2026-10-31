import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { EditUserDialog } from './edit-user.dialog';
import { Users } from '../../users';
import { AppError } from '../../../../core/http/app-error.model';

const userStub = {
  id: 1, username: 'jane', email: 'jane@example.com',
  enabled: true, account_locked: false, roles: [],
};

const usersMock = {
  updateUser: () => of({ ...userStub, username: 'janet' }),
};

const dialogRefMock = { close: vi.fn() };

describe('EditUserDialog', () => {
  let fixture: ComponentFixture<EditUserDialog>;
  let component: EditUserDialog;

  beforeEach(async () => {
    dialogRefMock.close.mockClear();

    await TestBed.configureTestingModule({
      imports: [EditUserDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: Users, useValue: usersMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { user: userStub } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditUserDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('pre-fills form with existing username and email', () => {
    expect(component['form'].value.username).toBe('jane');
    expect(component['form'].value.email).toBe('jane@example.com');
  });

  it('closes dialog with updated user on success', async () => {
    component['form'].setValue({ username: 'janet', email: 'jane@example.com' });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    expect(dialogRefMock.close).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'janet' }),
    );
  });

  it('maps VALIDATION fieldErrors onto form controls', async () => {
    const error: AppError = {
      kind: 'VALIDATION',
      status: 400,
      message: 'Validation failed',
      fieldErrors: { username: 'Too long' },
    };
    vi.spyOn(usersMock, 'updateUser').mockReturnValueOnce(throwError(() => error));

    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();

    expect(component['form'].get('username')?.hasError('serverError')).toBe(true);
  });
});
