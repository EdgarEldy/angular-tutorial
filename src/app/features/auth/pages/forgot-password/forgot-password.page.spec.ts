import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ForgotPasswordPage } from './forgot-password.page';
import { environment } from '../../../../../environments/environment';

describe('ForgotPasswordPage', () => {
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let httpCtrl: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    httpCtrl = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows confirmation message on success', () => {
    const input = fixture.debugElement.query(By.css('input[type="email"]'));
    input.nativeElement.value = 'test@example.com';
    input.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement.click();
    fixture.detectChanges();

    const req = httpCtrl.expectOne(`${environment.apiUrl}/auth/forgot-password`);
    req.flush({ success: true, message: '', data: null, timestamp: '' });
    fixture.detectChanges();

    const msg = fixture.debugElement.query(By.css('.confirmation'));
    expect(msg).toBeTruthy();
  });

  it('shows the same confirmation message even on a server error', () => {
    const input = fixture.debugElement.query(By.css('input[type="email"]'));
    input.nativeElement.value = 'test@example.com';
    input.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement.click();
    fixture.detectChanges();

    const req = httpCtrl.expectOne(`${environment.apiUrl}/auth/forgot-password`);
    req.error(new ProgressEvent('error'));
    fixture.detectChanges();

    // Must show the same neutral message regardless of outcome
    const msg = fixture.debugElement.query(By.css('.confirmation'));
    expect(msg).toBeTruthy();
  });
});
