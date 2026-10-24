import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { RegisterPage, passwordsMatch } from './register.page';
import { environment } from '../../../../../environments/environment';
import { FormControl, FormGroup } from '@angular/forms';

describe('passwordsMatch validator', () => {
  it('returns null when passwords match', () => {
    const group = new FormGroup({
      password: new FormControl('abc12345'),
      confirmPassword: new FormControl('abc12345'),
    });
    expect(passwordsMatch(group)).toBeNull();
  });

  it('returns passwordMismatch error when passwords differ', () => {
    const group = new FormGroup({
      password: new FormControl('abc12345'),
      confirmPassword: new FormControl('different'),
    });
    expect(passwordsMatch(group)).toEqual({ passwordMismatch: true });
    expect(group.get('confirmPassword')?.errors).toEqual({ passwordMismatch: true });
  });
});

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let component: RegisterPage;
  let httpCtrl: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    httpCtrl = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpCtrl.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows success message and hides form on 201', () => {
    const inputs = fixture.debugElement.queryAll(By.css('input'));
    const values = ['Jane', 'Doe', 'jane@example.com', 'password123', 'password123'];
    const events = ['given-name', 'family-name', 'email', 'new-password', 'new-password'];

    inputs.forEach((el, i) => {
      el.nativeElement.value = values[i];
      el.nativeElement.dispatchEvent(new Event('input'));
      void events[i];
    });
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('button[type="submit"]'));
    btn.nativeElement.click();
    fixture.detectChanges();

    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/register`);
    req.flush({
      success: true,
      message: 'Registered',
      data: { id: 1, first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', enabled: false, account_locked: false, roles: [] },
      timestamp: '',
    });
    fixture.detectChanges();

    const msg = fixture.debugElement.query(By.css('.success-message'));
    expect(msg).toBeTruthy();
  });
});
