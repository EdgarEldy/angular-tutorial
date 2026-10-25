import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { OrderListPage } from './order-list.page';
import { Orders } from '../../orders';
import { Customers } from '../../../customers/customers';
import { Products } from '../../../products/products';
import { AppError } from '../../../../core/http/app-error.model';

// ---- stubs ------------------------------------------------------------------

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
  products: [],
};

const orderStub = {
  id: 100,
  customer: customerStub,
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

const customerPageStub = {
  content: [customerStub],
  page: 0,
  size: 100,
  totalElements: 1,
  totalPages: 1,
};

const productPageStub = {
  content: [productStub],
  page: 0,
  size: 100,
  totalElements: 1,
  totalPages: 1,
};

// ---- mock services ----------------------------------------------------------

const ordersMock = {
  getOrders: vi.fn(() => of(orderPageStub)),
  deleteOrder: vi.fn(() => of(undefined)),
};

const customersMock = {
  getCustomers: vi.fn(() => of(customerPageStub)),
};

const productsMock = {
  getProducts: vi.fn(() => of(productPageStub)),
};

// ---- test setup -------------------------------------------------------------

async function setup(): Promise<{
  fixture: ComponentFixture<OrderListPage>;
  component: OrderListPage;
}> {
  vi.clearAllMocks();
  ordersMock.getOrders.mockReturnValue(of(orderPageStub));
  customersMock.getCustomers.mockReturnValue(of(customerPageStub));
  productsMock.getProducts.mockReturnValue(of(productPageStub));

  await TestBed.configureTestingModule({
    imports: [OrderListPage],
    providers: [
      provideAnimationsAsync(),
      provideRouter([]),
      { provide: Orders, useValue: ordersMock },
      { provide: Customers, useValue: customersMock },
      { provide: Products, useValue: productsMock },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(OrderListPage);
  const component = fixture.componentInstance;
  return { fixture, component };
}

// ---- tests ------------------------------------------------------------------

describe('OrderListPage', () => {
  it('should create', async () => {
    const { fixture } = await setup();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows loading spinner initially', async () => {
    const { fixture, component } = await setup();
    // Before detectChanges the loading signal starts as true
    expect(component['loading']()).toBe(true);
    fixture.detectChanges();
    // After detectChanges ngOnInit fires and the mock resolves synchronously
    expect(component['loading']()).toBe(false);
  });

  it('shows error state when getOrders fails', async () => {
    const { fixture, component } = await setup();
    const err: AppError = { kind: 'SERVER', status: 500, message: 'Server error' };
    ordersMock.getOrders.mockReturnValue(throwError(() => err));
    fixture.detectChanges();

    expect(component['error']()).toEqual(err);
    expect(component['loading']()).toBe(false);
  });

  it('shows empty state when content is empty', async () => {
    const { fixture, component } = await setup();
    ordersMock.getOrders.mockReturnValue(
      of({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
    );
    fixture.detectChanges();

    expect(component['orders']().length).toBe(0);
  });

  it('renders orders in data state', async () => {
    const { fixture, component } = await setup();
    fixture.detectChanges();

    expect(component['orders']().length).toBe(1);
    expect(component['orders']()[0].id).toBe(100);
    expect(component['totalElements']()).toBe(1);
  });

  it('loads customer and product options on init', async () => {
    const { fixture, component } = await setup();
    fixture.detectChanges();

    expect(component['customerOptions']().length).toBe(1);
    expect(component['productOptions']().length).toBe(1);
  });

  it('calls getOrders with customerId when customer filter changes', async () => {
    const { fixture, component } = await setup();
    fixture.detectChanges();
    vi.clearAllMocks();
    ordersMock.getOrders.mockReturnValue(of(orderPageStub));

    component['onCustomerFilter'](1);

    expect(ordersMock.getOrders).toHaveBeenCalledWith(0, 10, 1, undefined);
    expect(component['filterCustomerId']()).toBe(1);
    expect(component['page']()).toBe(0);
  });

  it('calls getOrders without customerId when customer filter cleared', async () => {
    const { fixture, component } = await setup();
    fixture.detectChanges();
    vi.clearAllMocks();
    ordersMock.getOrders.mockReturnValue(of(orderPageStub));

    // First set a filter, then clear it
    component['filterCustomerId'].set(1);
    component['onCustomerFilter'](undefined);

    expect(ordersMock.getOrders).toHaveBeenCalledWith(0, 10, undefined, undefined);
  });

  it('calls getOrders with productId when product filter changes', async () => {
    const { fixture, component } = await setup();
    fixture.detectChanges();
    vi.clearAllMocks();
    ordersMock.getOrders.mockReturnValue(of(orderPageStub));

    component['onProductFilter'](10);

    expect(ordersMock.getOrders).toHaveBeenCalledWith(0, 10, undefined, 10);
    expect(component['filterProductId']()).toBe(10);
    expect(component['page']()).toBe(0);
  });

  it('calls getOrders without productId when product filter cleared', async () => {
    const { fixture, component } = await setup();
    fixture.detectChanges();
    vi.clearAllMocks();
    ordersMock.getOrders.mockReturnValue(of(orderPageStub));

    component['filterProductId'].set(10);
    component['onProductFilter'](undefined);

    expect(ordersMock.getOrders).toHaveBeenCalledWith(0, 10, undefined, undefined);
  });
});
