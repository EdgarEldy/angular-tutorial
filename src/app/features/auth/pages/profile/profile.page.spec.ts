import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ProfilePage } from './profile.page';
import { environment } from '../../../../../environments/environment';

const userStub = {
  id: 1,
  username: 'jane',
  email: 'jane@example.com',
  enabled: true,
  account_locked: false,
  roles: [],
};

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let httpCtrl: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
    localStorage.clear();
  });

  it('should create', () => {
    fixture.detectChanges();
    const req = httpCtrl.expectOne(`${environment.apiUrl}/auth/me`);
    req.flush({ success: true, message: '', data: userStub, timestamp: '' });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('displays username', () => {
    fixture.detectChanges();
    const req = httpCtrl.expectOne(`${environment.apiUrl}/auth/me`);
    req.flush({ success: true, message: '', data: userStub, timestamp: '' });
    fixture.detectChanges();

    const title = fixture.debugElement.query(By.css('mat-card-title'));
    expect(title.nativeElement.textContent).toContain('jane');
  });

  it('shows error state and retry button on failure', () => {
    fixture.detectChanges();
    const req = httpCtrl.expectOne(`${environment.apiUrl}/auth/me`);
    req.error(new ProgressEvent('error'));
    fixture.detectChanges();

    const retryBtn = fixture.debugElement.query(By.css('button'));
    expect(retryBtn.nativeElement.textContent).toContain('Retry');
  });
});
