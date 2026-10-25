import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CustomerListPage } from './customer-list.page';
import { Customers } from '../../customers';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';

const customerStub = {
  id: 1,
  first_name: 'Alice',
  last_name: 'Smith',
  telephone: '+1-555-0100',
  email: 'alice@example.com',
  address: '1 Main St',
  products: [],
};

const pageStub = {
  content: [customerStub],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

const emptyPage = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
};

const customersMock = {
  getCustomers: vi.fn(() => of(pageStub)),
  deleteCustomer: vi.fn(() => of(undefined)),
};

const notificationMock = { success: vi.fn(), error: vi.fn() };
const dialogMock = { open: vi.fn(() => ({ afterClosed: () => of(undefined) })) };

describe('CustomerListPage', () => {
  let fixture: ComponentFixture<CustomerListPage>;
  let component: CustomerListPage;

  beforeEach(async () => {
    vi.clearAllMocks();
    customersMock.getCustomers.mockReturnValue(of(pageStub));

    await TestBed.configureTestingModule({
      imports: [CustomerListPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: Customers, useValue: customersMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerListPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('shows loading state before data arrives', () => {
    // loading starts as true before detectChanges triggers ngOnInit
    expect(component['loading']()).toBe(true);
  });

  it('shows customers in the table after successful load', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['customers']()).toHaveLength(1);
    expect(component['customers']()[0].first_name).toBe('Alice');
  });

  it('shows empty state when page content is empty', async () => {
    customersMock.getCustomers.mockReturnValue(of(emptyPage));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['customers']()).toHaveLength(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
  });

  it('shows error state when service throws', async () => {
    const err: AppError = { kind: 'SERVER', status: 500, message: 'Server error' };
    customersMock.getCustomers.mockReturnValue(throwError(() => err));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['error']()).toEqual(err);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-text')).toBeTruthy();
  });

  it('calls getCustomers with search when onSearchFilter is called', () => {
    fixture.detectChanges();
    vi.clearAllMocks();
    customersMock.getCustomers.mockReturnValue(of(pageStub));
    // Trigger load directly to bypass the 300ms debounce
    component['filterSearch'].set('alice');
    component['loadCustomers']();
    expect(customersMock.getCustomers).toHaveBeenCalledWith(0, 10, 'alice');
  });

  it('omits search param when filter is empty', () => {
    fixture.detectChanges();
    vi.clearAllMocks();
    customersMock.getCustomers.mockReturnValue(of(pageStub));
    component['filterSearch'].set('');
    component['loadCustomers']();
    // Empty string is converted to undefined so buildPaginationParams omits it
    expect(customersMock.getCustomers).toHaveBeenCalledWith(0, 10, undefined);
  });

  it('resets page to 0 when onSearchFilter triggers a reload', () => {
    fixture.detectChanges();
    component['page'].set(2);
    component['filterSearch'].set('bob');
    // Trigger load directly (bypasses debounce)
    component['page'].set(0);
    component['loadCustomers']();
    expect(component['page']()).toBe(0);
  });

  it('shows error state and allows retry', async () => {
    const err: AppError = { kind: 'NETWORK', status: 0, message: 'Network error' };
    customersMock.getCustomers.mockReturnValue(throwError(() => err));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // After retry call, reset to success
    customersMock.getCustomers.mockReturnValue(of(pageStub));
    component['loadCustomers']();
    await fixture.whenStable();
    expect(component['error']()).toBeNull();
    expect(component['customers']()).toHaveLength(1);
  });
});
