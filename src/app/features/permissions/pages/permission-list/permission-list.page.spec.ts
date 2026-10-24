import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';

import { PermissionListPage } from './permission-list.page';
import { Permissions } from '../../permissions';
import { AppError } from '../../../../core/http/app-error.model';

const permStub = { id: 1, resource: 'PRODUCT', action: 'READ' };

const permissionsMock = {
  getPermissions: () => of([permStub]),
  createPermission: () => of(permStub),
  deletePermission: () => of(undefined),
};

describe('PermissionListPage', () => {
  let fixture: ComponentFixture<PermissionListPage>;
  let component: PermissionListPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionListPage],
      providers: [
        provideAnimationsAsync(),
        { provide: Permissions, useValue: permissionsMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PermissionListPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads permissions on init and renders rows', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(1);
  });

  it('shows error state and retry button on load failure', async () => {
    const error: AppError = {
      kind: 'SERVER',
      status: 500,
      message: 'Server error',
    };
    jest
      .spyOn(permissionsMock, 'getPermissions')
      .mockReturnValueOnce(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.error-text');
    expect(errorEl).toBeTruthy();
    const retryBtn = fixture.nativeElement.querySelector('button');
    expect(retryBtn).toBeTruthy();
  });

  it('shows empty state when permissions list is empty', async () => {
    jest
      .spyOn(permissionsMock, 'getPermissions')
      .mockReturnValueOnce(of([]));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty).toBeTruthy();
  });
});
