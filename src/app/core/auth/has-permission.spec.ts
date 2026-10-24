import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { HasPermissionDirective, HasRoleDirective } from './has-permission';
import { Auth } from './auth';

function buildJwt(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `h.${body}.s`;
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;

// ---------------------------------------------------------------------------
// HasPermissionDirective
// ---------------------------------------------------------------------------

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `<span *appHasPermission="'PRODUCT:WRITE'" id="target">Visible</span>`,
})
class PermissionHostComponent {}

describe('HasPermissionDirective', () => {
  let auth: Auth;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [PermissionHostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(Auth);
  });

  afterEach(() => localStorage.clear());

  it('renders the template when the user has the permission', () => {
    auth.storeToken(buildJwt({ sub: 'u@e.com', roles: [], permissions: ['PRODUCT:WRITE'], exp: FUTURE_EXP, jti: 'x' }));
    const fixture = TestBed.createComponent(PermissionHostComponent);
    fixture.detectChanges();
    const el = fixture.debugElement.query(By.css('#target'));
    expect(el).toBeTruthy();
  });

  it('does not render when the user lacks the permission', () => {
    auth.storeToken(buildJwt({ sub: 'u@e.com', roles: [], permissions: ['PRODUCT:READ'], exp: FUTURE_EXP, jti: 'x' }));
    const fixture = TestBed.createComponent(PermissionHostComponent);
    fixture.detectChanges();
    const el = fixture.debugElement.query(By.css('#target'));
    expect(el).toBeNull();
  });

  it('does not render when not authenticated', () => {
    const fixture = TestBed.createComponent(PermissionHostComponent);
    fixture.detectChanges();
    const el = fixture.debugElement.query(By.css('#target'));
    expect(el).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// HasRoleDirective
// ---------------------------------------------------------------------------

@Component({
  standalone: true,
  imports: [HasRoleDirective],
  template: `<a *appHasRole="'ADMIN'" id="admin-link">Admin</a>`,
})
class RoleHostComponent {}

describe('HasRoleDirective', () => {
  let auth: Auth;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [RoleHostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(Auth);
  });

  afterEach(() => localStorage.clear());

  it('renders when the user has the ADMIN role', () => {
    auth.storeToken(buildJwt({ sub: 'u@e.com', roles: ['ADMIN'], permissions: [], exp: FUTURE_EXP, jti: 'x' }));
    const fixture = TestBed.createComponent(RoleHostComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('#admin-link'))).toBeTruthy();
  });

  it('does not render when the user lacks the ADMIN role', () => {
    auth.storeToken(buildJwt({ sub: 'u@e.com', roles: ['USER'], permissions: [], exp: FUTURE_EXP, jti: 'x' }));
    const fixture = TestBed.createComponent(RoleHostComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('#admin-link'))).toBeNull();
  });
});
