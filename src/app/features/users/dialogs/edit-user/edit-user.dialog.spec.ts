import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { EditUserDialog } from './edit-user.dialog';
import { Users } from '../../users';
import { AppError } from '../../../../core/http/app-error.model';

const userStub = {
  id: 1, first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com',
  enabled: true, account_locked: false, roles: [],
};

const usersMock = {
  updateUser: () => of({ ...userStub, first_name: 'Janet' }),
};

const dialogRefMock = { close: jest.fn() };

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

  it('pre-fills form with existing user name', () => {
    expect(component['form'].value.first_name).toBe('Jane');
    expect(component['form'].value.last_name).toBe('Doe');
  });

  it('closes dialog with updated user on success', async () => {
    component['form'].setValue({ first_name: 'Janet', last_name: 'Doe' });
    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();
    expect(dialogRefMock.close).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: 'Janet' }),
    );
  });

  it('maps VALIDATION fieldErrors onto form controls', async () => {
    const error: AppError = {
      kind: 'VALIDATION',
      status: 400,
      message: 'Validation failed',
      fieldErrors: { first_name: 'Too long' },
    };
    jest.spyOn(usersMock, 'updateUser').mockReturnValueOnce(throwError(() => error));

    (component as unknown as { submit: () => void }).submit();
    await fixture.whenStable();

    expect(component['form'].get('first_name')?.hasError('serverError')).toBe(true);
  });
});
