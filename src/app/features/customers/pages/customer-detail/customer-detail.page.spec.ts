import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CustomerDetailPage } from './customer-detail.page';
import { Customers } from '../../customers';
import { AppError } from '../../../../core/http/app-error.model';

const productStub = {
  id: 10,
  product_name: 'Widget',
  unit_price: 9.99,
  category_id: 2,
  category_name: 'Electronics',
};

const customerStub = {
  id: 1,
  first_name: 'Alice',
  last_name: 'Smith',
  telephone: '+1-555-0100',
  email: 'alice@example.com',
  address: '1 Main St',
  products: [productStub],
};

const orderStub = {
  id: 100,
  customer: { ...customerStub, products: [] },
  product: productStub,
  quantity: 2,
  total: 19.98,
};

const orderPageStub = {
  content: [orderStub],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

const customersMock = {
  getCustomer: vi.fn(() => of(customerStub)),
  getCustomerOrders: vi.fn(() => of(orderPageStub)),
};

/** Creates an ActivatedRoute stub with the given id param. */
function makeRouteStub(id: string) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
      },
    },
  };
}

describe('CustomerDetailPage', () => {
  let fixture: ComponentFixture<CustomerDetailPage>;
  let component: CustomerDetailPage;

  beforeEach(async () => {
    vi.clearAllMocks();
    customersMock.getCustomer.mockReturnValue(of(customerStub));
    customersMock.getCustomerOrders.mockReturnValue(of(orderPageStub));

    await TestBed.configureTestingModule({
      imports: [CustomerDetailPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: Customers, useValue: customersMock },
        { provide: ActivatedRoute, useValue: makeRouteStub('1') },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerDetailPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads customer data on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['customer']()).toEqual(customerStub);
    expect(component['loadingCustomer']()).toBe(false);
  });

  it('loads products from CustomerResponse after customer loads', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component['products']()).toHaveLength(1);
    expect(component['products']()[0].product_name).toBe('Widget');
  });

  it('loads orders after customer loads', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(customersMock.getCustomerOrders).toHaveBeenCalledWith(1, 0, 10);
    expect(component['orders']()).toHaveLength(1);
    expect(component['loadingOrders']()).toBe(false);
  });

  it('shows error state if customer is not found', async () => {
    const err: AppError = { kind: 'NOT_FOUND', status: 404, message: 'Customer not found' };
    customersMock.getCustomer.mockReturnValue(throwError(() => err));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['errorCustomer']()).toEqual(err);
    expect(component['loadingCustomer']()).toBe(false);
    // Orders must not be loaded when the customer does not exist
    expect(customersMock.getCustomerOrders).not.toHaveBeenCalled();
  });

  it('shows error state for orders section independently', async () => {
    const err: AppError = { kind: 'SERVER', status: 500, message: 'Server error' };
    customersMock.getCustomerOrders.mockReturnValue(throwError(() => err));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    // Customer should still load successfully
    expect(component['customer']()).toBeTruthy();
    // Orders section shows error
    expect(component['errorOrders']()).toEqual(err);
    expect(component['loadingOrders']()).toBe(false);
  });

  it('shows not-found error message in DOM', async () => {
    const err: AppError = { kind: 'NOT_FOUND', status: 404, message: 'Customer not found' };
    customersMock.getCustomer.mockReturnValue(throwError(() => err));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-error-banner')?.textContent).toContain('Customer not found');
  });
});
