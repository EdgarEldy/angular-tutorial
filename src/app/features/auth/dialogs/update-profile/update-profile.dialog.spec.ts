import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { UpdateProfileDialog } from './update-profile.dialog';
import { environment } from '../../../../../environments/environment';

const dialogDataStub = { userId: 1, firstName: 'Jane', lastName: 'Doe' };

describe('UpdateProfileDialog', () => {
  let fixture: ComponentFixture<UpdateProfileDialog>;
  let httpCtrl: HttpTestingController;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<UpdateProfileDialog>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [UpdateProfileDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: dialogDataStub },
        { provide: MatDialogRef, useValue: dialogRefSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateProfileDialog);
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

  it('pre-populates form with dialog data', () => {
    const inputs = fixture.debugElement.queryAll(By.css('input'));
    expect(inputs[0].nativeElement.value).toBe('Jane');
    expect(inputs[1].nativeElement.value).toBe('Doe');
  });

  it('closes the dialog with updated user on success', () => {
    const updatedUser = {
      id: 1, first_name: 'Janet', last_name: 'Doe', email: 'jane@example.com',
      enabled: true, account_locked: false, roles: [],
    };
    const inputs = fixture.debugElement.queryAll(By.css('input'));
    inputs[0].nativeElement.value = 'Janet';
    inputs[0].nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.debugElement.query(By.css('button[color="primary"]')).nativeElement.click();
    fixture.detectChanges();

    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/users/1`);
    req.flush({ success: true, message: '', data: updatedUser, timestamp: '' });

    expect(dialogRefSpy.close).toHaveBeenCalledWith(updatedUser);
  });

  it('stays open and maps field errors on 400', () => {
    fixture.debugElement.query(By.css('button[color="primary"]')).nativeElement.click();
    fixture.detectChanges();

    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/users/1`);
    req.flush(
      { success: false, message: 'Validation error', data: { fieldErrors: { first_name: 'Too short' } }, timestamp: '' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    const firstNameControl = fixture.componentInstance['form'].get('first_name');
    expect(firstNameControl?.errors?.['serverError']).toBe('Too short');
  });
});
