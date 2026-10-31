import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Roles } from './roles';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/roles`;

const roleStub = { id: 1, role_name: 'ADMIN', permissions: [] };
const permStub = { id: 2, resource: 'PRODUCT', action: 'READ' };
const roleWithPerm = { id: 1, role_name: 'ADMIN', permissions: [permStub] };

describe('Roles', () => {
  let service: Roles;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Roles);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getRoles calls GET /roles?size=1000 and returns content array', async () => {
    const page = { content: [roleStub], page: 0, size: 1000, totalElements: 1, totalPages: 1 };
    const promise = firstValueFrom(service.getRoles());
    // The paginated endpoint receives size=1000 as a query parameter
    const req = httpCtrl.expectOne(`${BASE}?size=1000`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', data: page, timestamp: '' });
    const result = await promise;
    expect(result).toEqual([roleStub]);
  });

  it('createRole calls POST with body', async () => {
    const promise = firstValueFrom(service.createRole({ role_name: 'ADMIN' }));
    const req = httpCtrl.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ role_name: 'ADMIN' });
    req.flush({ success: true, message: '', data: roleStub, timestamp: '' });
    const result = await promise;
    expect(result.role_name).toBe('ADMIN');
  });

  it('updateRole calls PUT /{id} with body', async () => {
    const promise = firstValueFrom(service.updateRole(1, { role_name: 'SUPERADMIN' }));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ success: true, message: '', data: { ...roleStub, role_name: 'SUPERADMIN' }, timestamp: '' });
    const result = await promise;
    expect(result.role_name).toBe('SUPERADMIN');
  });

  it('deleteRole calls DELETE /{id}', async () => {
    const promise = firstValueFrom(service.deleteRole(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });

  it('addPermission calls POST /{roleId}/permissions/{permId}', async () => {
    const promise = firstValueFrom(service.addPermission(1, 2));
    const req = httpCtrl.expectOne(`${BASE}/1/permissions/2`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: '', data: roleWithPerm, timestamp: '' });
    const result = await promise;
    expect(result.permissions).toEqual([permStub]);
  });

  it('removePermission calls DELETE /{roleId}/permissions/{permId}', async () => {
    const promise = firstValueFrom(service.removePermission(1, 2));
    const req = httpCtrl.expectOne(`${BASE}/1/permissions/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: roleStub, timestamp: '' });
    const result = await promise;
    expect(result.permissions).toEqual([]);
  });
});
