import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ResetPasswordPage } from './reset-password.page';
import { environment } from '../../../../../environments/environment';

describe('ResetPasswordPage', () => {
  let fixture: ComponentFixture<ResetPasswordPage>;
  let httpCtrl: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: (k: string) => (k === 'token' ? 'test-token' : null) } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordPage);
    httpCtrl = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpCtrl.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows page error when backend returns 400', async () => {
    const inputs = fixture.debugElement.queryAll(By.css('input[type="password"]'));
    inputs.forEach((el) => {
      el.nativeElement.value = 'password123';
      el.nativeElement.dispatchEvent(new Event('input'));
    });
    fixture.detectChanges();

    fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement.click();
    fixture.detectChanges();

    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/reset-password`);
    req.flush(
      { success: false, message: 'Token is expired or invalid', data: null, timestamp: '' },
      { status: 400, statusText: 'Bad Request' },
    );
    // Vitest does not support fakeAsync/tick; whenStable() drains the microtask queue instead
    await fixture.whenStable();
    fixture.detectChanges();

    // Message text is covered by error-mapper.spec.ts; here we verify the error state is rendered
    const errEl = fixture.debugElement.query(By.css('.page-error'));
    expect(errEl).toBeTruthy();
  });
});
