import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Users } from './users';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/users`;

const userStub = {
  id: 1,
  username: 'jane',
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
      service.updateUser(1, { username: 'janet', email: 'janet@example.com' }),
    );
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ success: true, message: '', data: { ...userStub, username: 'janet' }, timestamp: '' });
    const result = await promise;
    expect(result.username).toBe('janet');
  });

  it('deleteUser calls DELETE /users/{id}', async () => {
    const promise = firstValueFrom(service.deleteUser(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });

  it('lockUser calls PATCH /users/{id}/lock and returns UserResponse', async () => {
    const locked = { ...userStub, account_locked: true };
    const promise = firstValueFrom(service.lockUser(1));
    const req = httpCtrl.expectOne(`${BASE}/1/lock`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, message: '', data: locked, timestamp: '' });
    const result = await promise;
    expect(result.account_locked).toBe(true);
  });

  it('unlockUser calls PATCH /users/{id}/unlock and returns UserResponse', async () => {
    const unlocked = { ...userStub, account_locked: false };
    const promise = firstValueFrom(service.unlockUser(1));
    const req = httpCtrl.expectOne(`${BASE}/1/unlock`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, message: '', data: unlocked, timestamp: '' });
    const result = await promise;
    expect(result.account_locked).toBe(false);
  });

  it('assignRoles calls PUT /users/{id}/roles with role_ids body', async () => {
    const userWithRole = { ...userStub, roles: [roleStub] };
    const promise = firstValueFrom(service.assignRoles(1, [10]));
    const req = httpCtrl.expectOne(`${BASE}/1/roles`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ role_ids: [10] });
    req.flush({ success: true, message: '', data: userWithRole, timestamp: '' });
    const result = await promise;
    expect(result.roles).toEqual([roleStub]);
  });

  it('assignRoles with empty array removes all roles', async () => {
    const promise = firstValueFrom(service.assignRoles(1, []));
    const req = httpCtrl.expectOne(`${BASE}/1/roles`);
    expect(req.request.body).toEqual({ role_ids: [] });
    req.flush({ success: true, message: '', data: userStub, timestamp: '' });
    const result = await promise;
    expect(result.roles).toEqual([]);
  });
});
