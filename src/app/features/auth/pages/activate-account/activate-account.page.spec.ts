import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ActivateAccountPage } from './activate-account.page';
import { environment } from '../../../../../environments/environment';

function makeActivatedRoute(token: string | null) {
  return {
    provide: ActivatedRoute,
    useValue: {
      snapshot: {
        queryParamMap: { get: (key: string) => (key === 'token' ? token : null) },
      },
    },
  };
}

describe('ActivateAccountPage -- with token', () => {
  let fixture: ComponentFixture<ActivateAccountPage>;
  let httpCtrl: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivateAccountPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        makeActivatedRoute('valid-token'),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivateAccountPage);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
    localStorage.clear();
  });

  it('shows spinner during loading', () => {
    fixture.detectChanges();
    const spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(spinner).toBeTruthy();
    httpCtrl.expectOne(`${environment.identityApiUrl}/auth/activate-account?token=valid-token`).flush({});
  });

  it('shows success state after activation', () => {
    fixture.detectChanges();
    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/activate-account?token=valid-token`);
    req.flush({ success: true, message: 'Activated', data: null, timestamp: '' });
    fixture.detectChanges();

    const icon = fixture.debugElement.query(By.css('.success-icon'));
    expect(icon).toBeTruthy();
  });

  it('shows error message when activation fails', () => {
    fixture.detectChanges();
    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/activate-account?token=valid-token`);
    req.flush(
      { success: false, message: 'Token expired', data: null, timestamp: '' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('.error-text'));
    // Message extraction from the body is covered by error-mapper.spec.ts;
    // here we only verify that the error state is rendered.
    expect(errorEl).toBeTruthy();
  });
});

describe('ActivateAccountPage -- without token', () => {
  let fixture: ComponentFixture<ActivateAccountPage>;
  let httpCtrl: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivateAccountPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        makeActivatedRoute(null),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivateAccountPage);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('shows error when token query param is missing', () => {
    fixture.detectChanges();
    const errorEl = fixture.debugElement.query(By.css('.error-text'));
    expect(errorEl).toBeTruthy();
  });
});
