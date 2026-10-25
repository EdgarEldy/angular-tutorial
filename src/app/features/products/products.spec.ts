import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Products } from './products';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/products`;

const productStub = {
  id: 1,
  product_name: 'Widget',
  unit_price: 9.99,
  category_id: 2,
  category_name: 'Electronics',
};

const pageStub = {
  content: [productStub],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

describe('Products service', () => {
  let service: Products;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Products);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getProducts sends GET with page and size params', async () => {
    const promise = firstValueFrom(service.getProducts(0, 10));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    const result = await promise;
    expect(result.content).toHaveLength(1);
    expect(result.totalElements).toBe(1);
  });

  it('getProducts sends categoryId filter when provided', async () => {
    const promise = firstValueFrom(service.getProducts(0, 10, { categoryId: 5 }));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('categoryId')).toBe('5');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  it('getProducts sends productName filter when provided', async () => {
    const promise = firstValueFrom(service.getProducts(0, 10, { productName: 'Widget' }));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('productName')).toBe('Widget');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  it('getProducts sends minPrice and maxPrice filters when provided', async () => {
    const promise = firstValueFrom(service.getProducts(0, 10, { minPrice: 5, maxPrice: 50 }));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('minPrice')).toBe('5');
    expect(req.request.params.get('maxPrice')).toBe('50');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  it('getProducts does NOT send empty filter params', async () => {
    // Empty string productName and undefined category must not appear in query
    const promise = firstValueFrom(
      service.getProducts(0, 10, { productName: '', categoryId: undefined }),
    );
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.params.has('productName')).toBe(false);
    expect(req.request.params.has('categoryId')).toBe(false);
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    await promise;
  });

  it('getProduct sends GET /{id} and unwraps data', async () => {
    const promise = firstValueFrom(service.getProduct(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', data: productStub, timestamp: '' });
    const result = await promise;
    expect(result.product_name).toBe('Widget');
  });

  it('createProduct sends POST with body', async () => {
    const body = { category_id: 2, product_name: 'Gadget', unit_price: 19.99 };
    const promise = firstValueFrom(service.createProduct(body));
    const req = httpCtrl.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({
      success: true,
      message: '',
      data: { ...productStub, id: 2, product_name: 'Gadget', unit_price: 19.99 },
      timestamp: '',
    });
    const result = await promise;
    expect(result.product_name).toBe('Gadget');
  });

  it('updateProduct sends PUT /{id} with body', async () => {
    const body = { category_id: 2, product_name: 'Updated', unit_price: 14.99 };
    const promise = firstValueFrom(service.updateProduct(1, body));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({
      success: true,
      message: '',
      data: { ...productStub, product_name: 'Updated', unit_price: 14.99 },
      timestamp: '',
    });
    const result = await promise;
    expect(result.product_name).toBe('Updated');
  });

  it('updateProduct propagates 409 as CONFLICT AppError', async () => {
    const promise = firstValueFrom(
      service.updateProduct(1, { category_id: 2, product_name: 'X', unit_price: 1 }),
    );
    const req = httpCtrl.expectOne(`${BASE}/1`);
    req.flush(
      { success: false, message: 'Conflict', data: { title: 'Conflict', status: 409, detail: 'Modified elsewhere', instance: '' } },
      { status: 409, statusText: 'Conflict' },
    );
    try {
      await promise;
      throw new Error('Expected error was not thrown');
    } catch (err: unknown) {
      const appError = err as { kind: string; status: number };
      expect(appError.kind).toBe('CONFLICT');
      expect(appError.status).toBe(409);
    }
  });

  it('deleteProduct sends DELETE /{id}', async () => {
    const promise = firstValueFrom(service.deleteProduct(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });
});
