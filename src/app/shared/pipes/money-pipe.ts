import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a numeric amount as a locale-aware currency string.
 *
 * Uses the Intl.NumberFormat API so no external currency library is needed.
 * The default currency and locale can be overridden per-usage in templates.
 *
 * Usage in templates:
 *   {{ product.unit_price | money }}           --> $1,234.56
 *   {{ product.unit_price | money:'EUR':'fr' }} --> 1 234,56 €
 *
 * @example
 *   // In a standalone component imports array:
 *   imports: [MoneyPipe]
 */
@Pipe({
  name: 'money',
  standalone: true,
  pure: true,
})
export class MoneyPipe implements PipeTransform {
  /**
   * @param value    - The numeric amount to format. Null and undefined render as an em-dash.
   * @param currency - ISO 4217 currency code. Defaults to USD.
   * @param locale   - BCP 47 locale tag. Defaults to the browser locale.
   * @returns The formatted currency string.
   */
  transform(
    value: number | null | undefined,
    currency = 'USD',
    locale?: string,
  ): string {
    if (value == null) {
      return '–'; // en-dash for missing values
    }

    return new Intl.NumberFormat(locale ?? navigator.language, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
