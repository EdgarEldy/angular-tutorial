import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { OrderFormDialog } from './order-form.dialog';
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

const productStub2 = {
  id: 20,
  product_name: 'Gadget',
  unit_price: 25.00,
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

const customerPageStub = {
  content: [customerStub],
  page: 0, size: 100, totalElements: 1, totalPages: 1,
};

const productPageStub = {
  content: [productStub, productStub2],
  page: 0, size: 100, totalElements: 2, totalPages: 1,
};

// ---- mock services ----------------------------------------------------------

const ordersMock = {
  createOrder: vi.fn(() => of(orderStub)),
  updateOrder: vi.fn(() => of(orderStub)),
};

const customersMock = {
  getCustomers: vi.fn(() => of(customerPageStub)),
};

const productsMock = {
  getProducts: vi.fn(() => of(productPageStub)),
};

const dialogRefMock = {
  close: vi.fn(),
};

// ---- test setup -------------------------------------------------------------

async function setup(editData?: typeof orderStub): Promise<{
  fixture: ComponentFixture<OrderFormDialog>;
  component: OrderFormDialog;
}> {
  vi.clearAllMocks();
  ordersMock.createOrder.mockReturnValue(of(orderStub));
  ordersMock.updateOrder.mockReturnValue(of(orderStub));
  customersMock.getCustomers.mockReturnValue(of(customerPageStub));
  productsMock.getProducts.mockReturnValue(of(productPageStub));

  await TestBed.configureTestingModule({
    imports: [OrderFormDialog],
    providers: [
      provideAnimationsAsync(),
      { provide: Orders, useValue: ordersMock },
      { provide: Customers, useValue: customersMock },
      { provide: Products, useValue: productsMock },
      { provide: MatDialogRef, useValue: dialogRefMock },
      {
        provide: MAT_DIALOG_DATA,
        useValue: editData ? { order: editData } : null,
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(OrderFormDialog);
  const component = fixture.componentInstance;
  return { fixture, component };
}

// ---- create mode tests -------------------------------------------------------

describe('OrderFormDialog -- create mode', () => {
  it('should create', async () => {
    const { fixture } = await setup();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('has isEdit false in create mode', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    expect(component['isEdit']).toBe(false);
  });

  it('form is invalid when required fields are empty', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    // Reset to null values to simulate empty state
    component['form'].get('customer_id')?.setValue(null as unknown as number);
    component['form'].get('product_id')?.setValue(null as unknown as number);
    component['form'].get('quantity')?.setValue(null as unknown as number);
    expect(component['form'].invalid).toBe(true);
  });

  it('quantity min=1 validation fires for value 0', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    const ctrl = component['form'].get('quantity');
    ctrl?.setValue(0);
    ctrl?.markAsTouched();
    fixture.detectChanges();
    expect(ctrl?.hasError('min')).toBe(true);
  });

  it('quantity passes validation for value 1', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    const ctrl = component['form'].get('quantity');
    ctrl?.setValue(1);
    ctrl?.markAsTouched();
    fixture.detectChanges();
    expect(ctrl?.hasError('min')).toBeFalsy();
    expect(ctrl?.hasError('required')).toBeFalsy();
  });

  it('calls createOrder on submit with valid form', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();

    component['form'].setValue({ customer_id: 1, product_id: 10, quantity: 3 });
    component['submit']();

    expect(ordersMock.createOrder).toHaveBeenCalledWith({
      customer_id: 1,
      product_id: 10,
      quantity: 3,
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith(orderStub);
  });

  it('does not call createOrder when form is invalid', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    // Leave form invalid (null customer_id)
    component['form'].get('customer_id')?.setValue(null as unknown as number);
    component['submit']();
    expect(ordersMock.createOrder).not.toHaveBeenCalled();
  });

  it('shows backend message on 422 BUSINESS_RULE and keeps dialog open', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();

    const err: AppError = {
      kind: 'BUSINESS_RULE',
      status: 422,
      message: 'Product is out of stock.',
    };
    ordersMock.createOrder.mockReturnValue(throwError(() => err));

    component['form'].setValue({ customer_id: 1, product_id: 10, quantity: 3 });
    component['submit']();

    expect(component['serverError']()).toBe('Product is out of stock.');
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });

  it('maps fieldErrors onto form controls on VALIDATION 400', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();

    const err: AppError = {
      kind: 'VALIDATION',
      status: 400,
      message: 'Validation failed',
      fieldErrors: { quantity: 'Must be a positive integer' },
    };
    ordersMock.createOrder.mockReturnValue(throwError(() => err));

    component['form'].setValue({ customer_id: 1, product_id: 10, quantity: 5 });
    component['submit']();

    expect(component['form'].get('quantity')?.getError('serverError')).toBe(
      'Must be a positive integer',
    );
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });

  // ---- preview total --------------------------------------------------------

  it('previewTotal is null when no product selected', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    // Wait for ngOnInit to load productOptions
    component['form'].get('product_id')?.setValue(null as unknown as number);
    component['formValues'].set({ product_id: null, quantity: 2 });
    expect(component['previewTotal']()).toBeNull();
  });

  it('previewTotal is computed from unit_price * quantity', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    // productStub has unit_price=9.99; quantity=3 => preview=29.97
    component['formValues'].set({ product_id: 10, quantity: 3 });
    // previewTotal is computed() so it re-evaluates on the next access
    expect(component['previewTotal']()).toBeCloseTo(29.97, 2);
  });

  it('previewTotal for productStub2 (25.00) * 2 = 50.00', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    component['formValues'].set({ product_id: 20, quantity: 2 });
    expect(component['previewTotal']()).toBeCloseTo(50.0, 2);
  });

  it('previewTotal is null when quantity is less than 1', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    component['formValues'].set({ product_id: 10, quantity: 0 });
    expect(component['previewTotal']()).toBeNull();
  });
});

// ---- edit mode tests ---------------------------------------------------------

describe('OrderFormDialog -- edit mode', () => {
  it('should create in edit mode', async () => {
    const { fixture } = await setup(orderStub);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('has isEdit true in edit mode', async () => {
    const { component, fixture } = await setup(orderStub);
    fixture.detectChanges();
    expect(component['isEdit']).toBe(true);
  });

  it('pre-fills the form with existing order data', async () => {
    const { component, fixture } = await setup(orderStub);
    fixture.detectChanges();
    expect(component['form'].get('customer_id')?.value).toBe(1);
    expect(component['form'].get('product_id')?.value).toBe(10);
    expect(component['form'].get('quantity')?.value).toBe(2);
  });

  it('calls updateOrder with the existing id on submit', async () => {
    const { component, fixture } = await setup(orderStub);
    fixture.detectChanges();

    component['submit']();

    expect(ordersMock.updateOrder).toHaveBeenCalledWith(100, {
      customer_id: 1,
      product_id: 10,
      quantity: 2,
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith(orderStub);
  });

  it('shows 422 message in serverError and does not close on edit', async () => {
    const { component, fixture } = await setup(orderStub);
    fixture.detectChanges();

    const err: AppError = {
      kind: 'BUSINESS_RULE',
      status: 422,
      message: 'Cannot change order once shipped.',
    };
    ordersMock.updateOrder.mockReturnValue(throwError(() => err));

    component['submit']();

    expect(component['serverError']()).toBe('Cannot change order once shipped.');
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});
