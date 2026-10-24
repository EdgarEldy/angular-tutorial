import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Users } from './users';
import { environment } from '../../../environments/environment';

const BASE = `${environment.identityApiUrl}/users`;

const userStub = {
  id: 1,
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  enabled: true,
  account_locked: false,
  roles: [],
};

const roleStub = { id: 10, role_name: 'ADMIN', permissions: [] };

describe('Users', () => {
  let service: Users;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Users);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getUsers calls GET /users with page and size params', async () => {
    const page = { content: [userStub], page: 0, size: 10, totalElements: 1, totalPages: 1 };
    const promise = firstValueFrom(service.getUsers(0, 10));
    const req = httpCtrl.expectOne(`${BASE}?page=0&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', data: page, timestamp: '' });
    const result = await promise;
    expect(result.content).toEqual([userStub]);
  });

  it('getUser calls GET /users/{id}', async () => {
    const promise = firstValueFrom(service.getUser(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', data: userStub, timestamp: '' });
    const result = await promise;
    expect(result.email).toBe('jane@example.com');
  });

  it('updateUser calls PUT /users/{id} with body', async () => {
    const promise = firstValueFrom(
      service.updateUser(1, { first_name: 'Janet', last_name: 'Doe' }),
    );
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ success: true, message: '', data: { ...userStub, first_name: 'Janet' }, timestamp: '' });
    const result = await promise;
    expect(result.first_name).toBe('Janet');
  });

  it('deleteUser calls DELETE /users/{id}', async () => {
    const promise = firstValueFrom(service.deleteUser(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });

  it('lockUser calls PATCH /users/{id}/lock', async () => {
    const promise = firstValueFrom(service.lockUser(1));
    const req = httpCtrl.expectOne(`${BASE}/1/lock`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });

  it('unlockUser calls PATCH /users/{id}/unlock', async () => {
    const promise = firstValueFrom(service.unlockUser(1));
    const req = httpCtrl.expectOne(`${BASE}/1/unlock`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });

  it('addRole calls POST /users/{userId}/roles/{roleId}', async () => {
    const userWithRole = { ...userStub, roles: [roleStub] };
    const promise = firstValueFrom(service.addRole(1, 10));
    const req = httpCtrl.expectOne(`${BASE}/1/roles/10`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: '', data: userWithRole, timestamp: '' });
    const result = await promise;
    expect(result.roles).toEqual([roleStub]);
  });

  it('removeRole calls DELETE /users/{userId}/roles/{roleId}', async () => {
    const promise = firstValueFrom(service.removeRole(1, 10));
    const req = httpCtrl.expectOne(`${BASE}/1/roles/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: userStub, timestamp: '' });
    const result = await promise;
    expect(result.roles).toEqual([]);
  });
});
