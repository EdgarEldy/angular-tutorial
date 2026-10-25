import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Orders } from './orders';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/orders`;

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

const pageStub = {
  content: [orderStub],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

describe('Orders service', () => {
  let service: Orders;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Orders);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---- getOrders -- URL and pagination params --------------------------------

  it('getOrders sends GET to /orders with page and size params', async () => {
    const promise = firstValueFrom(service.getOrders(0, 10));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    const result = await promise;
    expect(result.content).toHaveLength(1);
    expect(result.totalElements).toBe(1);
  });

  // ---- getOrders -- customerId filter ----------------------------------------

  it('getOrders sends customerId param when defined', async () => {
    const promise = firstValueFrom(service.getOrders(0, 10, 5));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    // customerId=5 must be present in the query string
    expect(req.request.params.get('customerId')).toBe('5');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  it('getOrders does NOT send customerId param when undefined', async () => {
    const promise = firstValueFrom(service.getOrders(0, 10, undefined));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    // An undefined customerId must be omitted -- no customerId= in the URL
    expect(req.request.params.has('customerId')).toBe(false);
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  // ---- getOrders -- productId filter -----------------------------------------

  it('getOrders sends productId param when defined', async () => {
    const promise = firstValueFrom(service.getOrders(0, 10, undefined, 7));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('productId')).toBe('7');
    // customerId must remain absent when not passed
    expect(req.request.params.has('customerId')).toBe(false);
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  it('getOrders does NOT send productId param when undefined', async () => {
    const promise = firstValueFrom(service.getOrders(0, 10, undefined, undefined));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.params.has('productId')).toBe(false);
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  it('getOrders sends both customerId and productId when both defined', async () => {
    const promise = firstValueFrom(service.getOrders(1, 5, 3, 8));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('customerId')).toBe('3');
    expect(req.request.params.get('productId')).toBe('8');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('5');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  // ---- getOrder --------------------------------------------------------------

  it('getOrder sends GET /{id} and unwraps data', async () => {
    const promise = firstValueFrom(service.getOrder(100));
    const req = httpCtrl.expectOne(`${BASE}/100`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', data: orderStub, timestamp: '' });
    const result = await promise;
    expect(result.id).toBe(100);
    expect(result.customer.first_name).toBe('Alice');
    expect(result.product.product_name).toBe('Widget');
    expect(result.total).toBe(19.98);
  });

  // ---- createOrder -----------------------------------------------------------

  it('createOrder sends POST with body and returns created order', async () => {
    const body = { customer_id: 1, product_id: 10, quantity: 2 };
    const promise = firstValueFrom(service.createOrder(body));
    const req = httpCtrl.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({
      success: true,
      message: '',
      data: orderStub,
      timestamp: '',
    });
    const result = await promise;
    expect(result.total).toBe(19.98);
  });

  // ---- updateOrder -----------------------------------------------------------

  it('updateOrder sends PUT /{id} with body', async () => {
    const body = { customer_id: 1, product_id: 10, quantity: 3 };
    const promise = firstValueFrom(service.updateOrder(100, body));
    const req = httpCtrl.expectOne(`${BASE}/100`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({
      success: true,
      message: '',
      data: { ...orderStub, quantity: 3, total: 29.97 },
      timestamp: '',
    });
    const result = await promise;
    expect(result.quantity).toBe(3);
    expect(result.total).toBe(29.97);
  });

  // ---- deleteOrder -----------------------------------------------------------

  it('deleteOrder sends DELETE /{id}', async () => {
    const promise = firstValueFrom(service.deleteOrder(100));
    const req = httpCtrl.expectOne(`${BASE}/100`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });
});
