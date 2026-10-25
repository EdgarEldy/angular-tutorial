import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Categories } from '../../categories';
import { CategoryResponse } from '../../models/category-response.model';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Data passed via MAT_DIALOG_DATA when editing an existing category.
 * Omitted (null) when creating a new category.
 */
export interface CategoryFormDialogData {
  /** Existing category to edit. Absent when creating. */
  category?: CategoryResponse;
}

/**
 * Dialog for creating or editing a category.
 *
 * Opened from CategoryListPage with no data for create, or with a
 * CategoryResponse for edit. The single field is category_name; the
 * backend validates it is not blank.
 *
 * On success the dialog closes with the server's CategoryResponse so the
 * parent page can update its list. On a VALIDATION (400) error the
 * field-level message is mapped onto the form control. On any other error
 * (including BUSINESS_RULE 422) the message is shown below the form.
 */
@Component({
  selector: 'app-category-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './category-form.dialog.html',
  styleUrl: './category-form.dialog.scss',
})
export class CategoryFormDialog {
  private readonly categoriesService = inject(Categories);
  private readonly dialogRef =
    inject<MatDialogRef<CategoryFormDialog, CategoryResponse>>(MatDialogRef);
  // MAT_DIALOG_DATA is null when no data is passed to the dialog
  protected readonly data = inject<CategoryFormDialogData | null>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  /** True when editing an existing category; false when creating. */
  protected readonly isEdit = !!this.data?.category;

  protected readonly form = this.fb.nonNullable.group({
    // Pre-fill with existing name when editing
    category_name: [
      this.data?.category?.category_name ?? '',
      Validators.required,
    ],
  });

  /**
   * Submits the form by either creating (POST) or updating (PUT) the category.
   *
   * Disables the submit button (via loading signal) while the request is in
   * flight to prevent double-submit. On success the dialog closes with the
   * server response. On VALIDATION errors the fieldErrors are applied to the
   * matching controls so the user sees them inline.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set(null);

    const { category_name } = this.form.getRawValue();
    const existingId = this.data?.category?.id;

    // Choose POST (create) or PUT (update) based on whether an id exists
    const op$ =
      this.isEdit && existingId !== undefined
        ? this.categoriesService.updateCategory(existingId, { category_name })
        : this.categoriesService.createCategory({ category_name });

    op$.subscribe({
      next: (result) => {
        this.dialogRef.close(result);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        if (err.kind === 'VALIDATION' && err.fieldErrors) {
          // Map each server field error onto the corresponding form control
          for (const [field, message] of Object.entries(err.fieldErrors)) {
            this.form.get(field)?.setErrors({ serverError: message });
          }
        } else {
          this.serverError.set(err.message);
        }
      },
    });
  }
}
