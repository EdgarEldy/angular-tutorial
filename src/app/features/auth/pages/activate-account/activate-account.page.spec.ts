import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ActivateAccountPage } from './activate-account.page';
import { environment } from '../../../../../environments/environment';

describe('ActivateAccountPage', () => {
  let fixture: ComponentFixture<ActivateAccountPage>;
  let httpCtrl: HttpTestingController;

  function createFixture(token: string | null = 'valid-token') {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          queryParamMap: {
            get: (key: string) => (key === 'token' ? token : null),
          },
        },
      },
    });

    fixture = TestBed.createComponent(ActivateAccountPage);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivateAccountPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
    localStorage.clear();
  });

  it('shows spinner during loading', () => {
    createFixture();
    const spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(spinner).toBeTruthy();
    httpCtrl.expectOne(`${environment.identityApiUrl}/auth/activate-account?token=valid-token`).flush({});
  });

  it('shows success state after activation', () => {
    createFixture();
    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/activate-account?token=valid-token`);
    req.flush({ success: true, message: 'Activated', data: null, timestamp: '' });
    fixture.detectChanges();

    const icon = fixture.debugElement.query(By.css('.success-icon'));
    expect(icon).toBeTruthy();
  });

  it('shows error message when activation fails', () => {
    createFixture();
    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/activate-account?token=valid-token`);
    req.flush(
      { success: false, message: 'Token expired', data: null, timestamp: '' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('.error-text'));
    expect(errorEl).toBeTruthy();
    expect(errorEl.nativeElement.textContent).toContain('Token expired');
  });

  it('shows error when token query param is missing', () => {
    createFixture(null);
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('.error-text'));
    expect(errorEl).toBeTruthy();
  });
});
