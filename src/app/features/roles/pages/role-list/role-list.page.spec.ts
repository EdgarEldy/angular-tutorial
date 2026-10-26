import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { RoleListPage } from './role-list.page';
import { Roles } from '../../roles';
import { AppError } from '../../../../core/http/app-error.model';

const roleStub = { id: 1, role_name: 'ADMIN', permissions: [] };

const rolesMock = {
  getRoles: () => of([roleStub]),
  deleteRole: () => of(undefined),
};

describe('RoleListPage', () => {
  let fixture: ComponentFixture<RoleListPage>;
  let component: RoleListPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleListPage],
      providers: [
        provideAnimationsAsync(),
        { provide: Roles, useValue: rolesMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleListPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads roles on init and shows table rows', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(1);
  });

  it('shows error state on load failure', async () => {
    const error: AppError = { kind: 'SERVER', status: 500, message: 'Oops' };
    vi.spyOn(rolesMock, 'getRoles').mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('app-error-banner');
    expect(errorEl).toBeTruthy();
  });

  it('shows empty state when roles list is empty', async () => {
    vi.spyOn(rolesMock, 'getRoles').mockReturnValueOnce(of([]));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty).toBeTruthy();
  });
});

