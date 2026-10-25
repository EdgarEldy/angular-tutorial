import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CustomerFormDialog } from './customer-form.dialog';
import { Customers } from '../../customers';
import { AppError } from '../../../../core/http/app-error.model';

const customerStub = {
  id: 1,
  first_name: 'Alice',
  last_name: 'Smith',
  telephone: '+1-555-0100',
  email: 'alice@example.com',
  address: '1 Main St',
  products: [],
};

const customersMock = {
  createCustomer: vi.fn(() => of(customerStub)),
  updateCustomer: vi.fn(() => of(customerStub)),
};

const dialogRefMock = {
  close: vi.fn(),
};

/** Creates the TestBed configured in create or edit mode. */
async function setup(editData?: typeof customerStub): Promise<{
  fixture: ComponentFixture<CustomerFormDialog>;
  component: CustomerFormDialog;
}> {
  vi.clearAllMocks();
  customersMock.createCustomer.mockReturnValue(of(customerStub));
  customersMock.updateCustomer.mockReturnValue(of(customerStub));

  await TestBed.configureTestingModule({
    imports: [CustomerFormDialog],
    providers: [
      provideAnimationsAsync(),
      { provide: Customers, useValue: customersMock },
      { provide: MatDialogRef, useValue: dialogRefMock },
      { provide: MAT_DIALOG_DATA, useValue: editData ? { customer: editData } : null },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CustomerFormDialog);
  const component = fixture.componentInstance;
  return { fixture, component };
}

describe('CustomerFormDialog -- create mode', () => {
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
    expect(component['form'].invalid).toBe(true);
  });

  it('first_name required error fires when field is blank', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    const ctrl = component['form'].get('first_name');
    ctrl?.markAsTouched();
    fixture.detectChanges();
    expect(ctrl?.hasError('required')).toBe(true);
  });

  it('email error fires for invalid format', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    const ctrl = component['form'].get('email');
    ctrl?.setValue('not-an-email');
    ctrl?.markAsTouched();
    fixture.detectChanges();
    expect(ctrl?.hasError('email')).toBe(true);
  });

  it('telephone error fires for invalid pattern', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    const ctrl = component['form'].get('telephone');
    // 'abc' does not match ^\+?[0-9()\-\s]{7,20}$
    ctrl?.setValue('abc');
    ctrl?.markAsTouched();
    fixture.detectChanges();
    expect(ctrl?.hasError('pattern')).toBe(true);
  });

  it('telephone passes with valid international format', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();
    const ctrl = component['form'].get('telephone');
    ctrl?.setValue('+1-555-0100');
    ctrl?.markAsTouched();
    fixture.detectChanges();
    expect(ctrl?.hasError('pattern')).toBeFalsy();
  });

  it('calls createCustomer on submit with valid form', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();

    component['form'].setValue({
      first_name: 'Bob',
      last_name: 'Jones',
      email: 'bob@example.com',
      telephone: '+1-555-0200',
      address: '2 Oak Ave',
    });

    component['submit']();

    expect(customersMock.createCustomer).toHaveBeenCalledWith({
      first_name: 'Bob',
      last_name: 'Jones',
      email: 'bob@example.com',
      telephone: '+1-555-0200',
      address: '2 Oak Ave',
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith(customerStub);
  });

  it('shows backend message on 422 BUSINESS_RULE and keeps dialog open', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();

    const err: AppError = {
      kind: 'BUSINESS_RULE',
      status: 422,
      message: 'Email address is already in use.',
    };
    customersMock.createCustomer.mockReturnValue(throwError(() => err));

    component['form'].setValue({
      first_name: 'Bob',
      last_name: 'Jones',
      email: 'dup@example.com',
      telephone: '+1-555-0200',
      address: '2 Oak Ave',
    });
    component['submit']();

    expect(component['serverError']()).toBe('Email address is already in use.');
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });

  it('maps fieldErrors onto form controls on VALIDATION 400', async () => {
    const { component, fixture } = await setup();
    fixture.detectChanges();

    const err: AppError = {
      kind: 'VALIDATION',
      status: 400,
      message: 'Validation failed',
      fieldErrors: { email: 'Invalid email format' },
    };
    customersMock.createCustomer.mockReturnValue(throwError(() => err));

    component['form'].setValue({
      first_name: 'Bob',
      last_name: 'Jones',
      email: 'bad',
      telephone: '+1-555-0200',
      address: '2 Oak Ave',
    });
    component['submit']();

    expect(component['form'].get('email')?.getError('serverError')).toBe(
      'Invalid email format',
    );
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});

describe('CustomerFormDialog -- edit mode', () => {
  it('should create in edit mode', async () => {
    const { fixture } = await setup(customerStub);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('has isEdit true in edit mode', async () => {
    const { component, fixture } = await setup(customerStub);
    fixture.detectChanges();
    expect(component['isEdit']).toBe(true);
  });

  it('pre-fills the form with existing customer data', async () => {
    const { component, fixture } = await setup(customerStub);
    fixture.detectChanges();
    expect(component['form'].get('first_name')?.value).toBe('Alice');
    expect(component['form'].get('email')?.value).toBe('alice@example.com');
  });

  it('calls updateCustomer on submit with the existing id', async () => {
    const { component, fixture } = await setup(customerStub);
    fixture.detectChanges();

    component['submit']();

    expect(customersMock.updateCustomer).toHaveBeenCalledWith(1, {
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@example.com',
      telephone: '+1-555-0100',
      address: '1 Main St',
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith(customerStub);
  });

  it('shows 422 message in serverError and does not close on edit', async () => {
    const { component, fixture } = await setup(customerStub);
    fixture.detectChanges();

    const err: AppError = {
      kind: 'BUSINESS_RULE',
      status: 422,
      message: 'Email is already taken by another customer.',
    };
    customersMock.updateCustomer.mockReturnValue(throwError(() => err));

    component['submit']();

    expect(component['serverError']()).toBe(
      'Email is already taken by another customer.',
    );
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});
