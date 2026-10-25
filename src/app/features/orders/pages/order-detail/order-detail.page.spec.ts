import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { OrderDetailPage } from './order-detail.page';
import { Orders } from '../../orders';
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

// ---- mock ------------------------------------------------------------------

const ordersMock = {
  getOrder: vi.fn(() => of(orderStub)),
};

// ---- helpers ----------------------------------------------------------------

/**
 * Builds a minimal ActivatedRoute stub with the given id param.
 * The snapshot.paramMap.get('id') pattern used in OrderDetailPage requires
 * a real paramMap object, not a plain value.
 */
function makeRoute(id: string): Partial<ActivatedRoute> {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
        has: () => true,
        getAll: () => [],
        keys: [],
      },
    } as unknown as ActivatedRoute['snapshot'],
  };
}

async function setup(id = '100'): Promise<{
  fixture: ComponentFixture<OrderDetailPage>;
  component: OrderDetailPage;
}> {
  vi.clearAllMocks();
  ordersMock.getOrder.mockReturnValue(of(orderStub));

  await TestBed.configureTestingModule({
    imports: [OrderDetailPage],
    providers: [
      provideAnimationsAsync(),
      provideRouter([]),
      { provide: Orders, useValue: ordersMock },
      { provide: ActivatedRoute, useValue: makeRoute(id) },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(OrderDetailPage);
  const component = fixture.componentInstance;
  return { fixture, component };
}

// ---- tests ------------------------------------------------------------------

describe('OrderDetailPage', () => {
  it('should create', async () => {
    const { fixture } = await setup();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads the order on init', async () => {
    const { fixture, component } = await setup();
    fixture.detectChanges();

    expect(ordersMock.getOrder).toHaveBeenCalledWith(100);
    expect(component['order']()?.id).toBe(100);
    expect(component['order']()?.total).toBe(19.98);
    expect(component['loading']()).toBe(false);
  });

  it('shows error state when getOrder fails', async () => {
    const { fixture, component } = await setup();
    const err: AppError = { kind: 'NOT_FOUND', status: 404, message: 'Order not found.' };
    ordersMock.getOrder.mockReturnValue(throwError(() => err));
    fixture.detectChanges();

    expect(component['error']()).toEqual(err);
    expect(component['order']()).toBeNull();
    expect(component['loading']()).toBe(false);
  });

  it('calls getOrder again on retry', async () => {
    const { fixture, component } = await setup();
    const err: AppError = { kind: 'NETWORK', status: 0, message: 'Network error.' };
    ordersMock.getOrder.mockReturnValue(throwError(() => err));
    fixture.detectChanges();

    expect(component['error']()).not.toBeNull();

    // Retry: now succeeds
    ordersMock.getOrder.mockReturnValue(of(orderStub));
    component['loadOrder']();

    expect(component['error']()).toBeNull();
    expect(component['order']()?.id).toBe(100);
  });
});
