import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Customers } from './customers';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/customers`;

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

const pageStub = {
  content: [{ ...customerStub, products: [] }],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
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

describe('Customers service', () => {
  let service: Customers;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Customers);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---- getCustomers --------------------------------------------------------

  it('getCustomers sends GET with page and size params', async () => {
    const promise = firstValueFrom(service.getCustomers(0, 10));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    const result = await promise;
    expect(result.content).toHaveLength(1);
    expect(result.totalElements).toBe(1);
  });

  it('getCustomers sends search param when non-empty', async () => {
    const promise = firstValueFrom(service.getCustomers(0, 10, 'alice'));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('search')).toBe('alice');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  it('getCustomers does NOT send search param when empty string', async () => {
    const promise = firstValueFrom(service.getCustomers(0, 10, ''));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    // An empty search must be omitted -- no search= in the query string
    expect(req.request.params.has('search')).toBe(false);
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  it('getCustomers does NOT send search param when undefined', async () => {
    const promise = firstValueFrom(service.getCustomers(0, 10));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.params.has('search')).toBe(false);
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  // ---- getCustomer ---------------------------------------------------------

  it('getCustomer sends GET /{id} and unwraps data', async () => {
    const promise = firstValueFrom(service.getCustomer(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', data: customerStub, timestamp: '' });
    const result = await promise;
    expect(result.first_name).toBe('Alice');
    expect(result.products).toHaveLength(1);
  });

  // ---- getCustomerOrders ---------------------------------------------------

  it('getCustomerOrders sends GET /{id}/orders with page and size params', async () => {
    const promise = firstValueFrom(service.getCustomerOrders(1, 0, 10));
    const req = httpCtrl.expectOne((r) => r.url === `${BASE}/1/orders`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ success: true, message: '', data: orderPageStub, timestamp: '' });
    const result = await promise;
    expect(result.content).toHaveLength(1);
    expect(result.content[0].quantity).toBe(2);
  });

  it('getCustomerOrders uses the customerId in the URL', async () => {
    const promise = firstValueFrom(service.getCustomerOrders(42, 1, 5));
    const req = httpCtrl.expectOne((r) => r.url === `${BASE}/42/orders`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('5');
    req.flush({ success: true, message: '', data: { ...orderPageStub, page: 1, size: 5 }, timestamp: '' });
    await promise;
  });

  // ---- createCustomer ------------------------------------------------------

  it('createCustomer sends POST with body', async () => {
    const body = {
      first_name: 'Bob',
      last_name: 'Jones',
      telephone: '+1-555-0200',
      email: 'bob@example.com',
      address: '2 Oak Ave',
    };
    const promise = firstValueFrom(service.createCustomer(body));
    const req = httpCtrl.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({
      success: true,
      message: '',
      data: { ...customerStub, id: 2, ...body },
      timestamp: '',
    });
    const result = await promise;
    expect(result.first_name).toBe('Bob');
  });

  // ---- updateCustomer ------------------------------------------------------

  it('updateCustomer sends PUT /{id} with body', async () => {
    const body = {
      first_name: 'Alice',
      last_name: 'Updated',
      telephone: '+1-555-0100',
      email: 'alice@example.com',
      address: '1 Main St',
    };
    const promise = firstValueFrom(service.updateCustomer(1, body));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({
      success: true,
      message: '',
      data: { ...customerStub, last_name: 'Updated' },
      timestamp: '',
    });
    const result = await promise;
    expect(result.last_name).toBe('Updated');
  });

  // ---- deleteCustomer ------------------------------------------------------

  it('deleteCustomer sends DELETE /{id}', async () => {
    const promise = firstValueFrom(service.deleteCustomer(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });
});
