import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Permissions } from './permissions';
import { environment } from '../../../environments/environment';

const BASE = `${environment.identityApiUrl}/permissions`;

const permStub = { id: 1, resource: 'PRODUCT', action: 'READ' };

describe('Permissions', () => {
  let service: Permissions;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Permissions);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getPermissions returns array from data field', async () => {
    const promise = firstValueFrom(service.getPermissions());
    const req = httpCtrl.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', data: [permStub], timestamp: '' });
    const result = await promise;
    expect(result).toEqual([permStub]);
  });

  it('createPermission calls POST with body and returns created permission', async () => {
    const promise = firstValueFrom(
      service.createPermission({ resource: 'PRODUCT', action: 'READ' }),
    );
    const req = httpCtrl.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ resource: 'PRODUCT', action: 'READ' });
    req.flush({ success: true, message: '', data: permStub, timestamp: '' });
    const result = await promise;
    expect(result).toEqual(permStub);
  });

  it('deletePermission calls DELETE /{id}', async () => {
    const promise = firstValueFrom(service.deletePermission(1));
    const req = httpCtrl.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    await promise;
  });
});
