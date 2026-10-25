import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Categories } from './categories';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/categories`;

const categoryStub = {
  id: 1,
  category_name: 'Electronics',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  products: [],
};

const pageStub = {
  content: [categoryStub],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
};

describe('Categories service', () => {
  let service: Categories;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Categories);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getCategories sends GET with page and size params', async () => {
    const promise = firstValueFrom(service.getCategories(0, 10));
    const req = httpCtrl.expectOne((r) => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ success: true, message: '', data: pageStub, timestamp: '' });
    const result = await promise;
    expect(result.content).toHaveLength(1);
    expect(result.totalElements).toBe(1);
  });

  it('getCategory sends GET /{id} and unwraps data', async () => {
    const promise = firstValueFrom(service.getCategory(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', data: categoryStub, timestamp: '' });
    const result = await promise;
    expect(result.category_name).toBe('Electronics');
  });

  it('createCategory sends POST with body', async () => {
    const promise = firstValueFrom(service.createCategory({ category_name: 'Books' }));
    const req = httpCtrl.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ category_name: 'Books' });
    req.flush({
      success: true,
      message: '',
      data: { ...categoryStub, id: 2, category_name: 'Books' },
      timestamp: '',
    });
    const result = await promise;
    expect(result.category_name).toBe('Books');
  });

  it('updateCategory sends PUT /{id} with body', async () => {
    const promise = firstValueFrom(service.updateCategory(1, { category_name: 'Updated' }));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ category_name: 'Updated' });
    req.flush({
      success: true,
      message: '',
      data: { ...categoryStub, category_name: 'Updated' },
      timestamp: '',
    });
    const result = await promise;
    expect(result.category_name).toBe('Updated');
  });

  it('deleteCategory sends DELETE /{id}', async () => {
    const promise = firstValueFrom(service.deleteCategory(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });
});
