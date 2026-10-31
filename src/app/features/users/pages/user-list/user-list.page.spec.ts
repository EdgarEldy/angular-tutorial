import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UserListPage } from './user-list.page';
import { Users } from '../../users';
import { Auth } from '../../../../core/auth/auth';
import { AppError } from '../../../../core/http/app-error.model';

const userStub = {
  id: 1,
  username: 'jane',
  email: 'jane@example.com',
  enabled: true,
  account_locked: false,
  roles: [],
};

const pageMock = {
  content: [userStub],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

const usersMock = {
  getUsers: () => of(pageMock),
  // lockUser and unlockUser now return the updated UserResponse
  lockUser: () => of({ ...userStub, account_locked: true }),
  unlockUser: () => of({ ...userStub, account_locked: false }),
  deleteUser: () => of(undefined),
};

const authMock = {
  currentUser: () => ({ email: 'admin@example.com' }),
};

describe('UserListPage', () => {
  let fixture: ComponentFixture<UserListPage>;
  let component: UserListPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListPage],
      providers: [
        provideAnimationsAsync(),
        { provide: Users, useValue: usersMock },
        { provide: Auth, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads users on init and renders rows', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(1);
  });

  it('shows error state on load failure', async () => {
    const error: AppError = { kind: 'SERVER', status: 500, message: 'Error' };
    vi.spyOn(usersMock, 'getUsers').mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('app-error-banner');
    expect(errorEl).toBeTruthy();
  });

  it('shows empty state when no users found', async () => {
    vi.spyOn(usersMock, 'getUsers').mockReturnValueOnce(
      of({ ...pageMock, content: [], totalElements: 0 }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty).toBeTruthy();
  });

  it('own-account lock/delete buttons are disabled for current user email', async () => {
    vi.spyOn(usersMock, 'getUsers').mockReturnValueOnce(
      of({ ...pageMock, content: [{ ...userStub, email: 'admin@example.com' }] }),
    );
    vi.spyOn(authMock, 'currentUser').mockReturnValue({ email: 'admin@example.com' });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // All disabled buttons in action column
    const disabledBtns = fixture.nativeElement.querySelectorAll('button[disabled]');
    // lock + delete = 2 disabled buttons for own row
    expect(disabledBtns.length).toBeGreaterThanOrEqual(2);
  });
});
