import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  forwardRef,
  Host,
  OnDestroy,
  OnInit,
  Provider,
  Renderer2
} from '@angular/core';

import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator
} from '@angular/forms';

import {
  formatDate,
  getLocale,
  isAfter,
  isBefore,
  isDate,
  isDateValid,
  parseDate,
  utcAsLocal
} from 'ngx-bootstrap/chronos';

import { BsDatepickerDirective } from './bs-datepicker.component';
import { BsLocaleService } from './bs-locale.service';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

const BS_DATEPICKER_VALUE_ACCESSOR: Provider = {
  provide: NG_VALUE_ACCESSOR,
  /* tslint:disable-next-line: no-use-before-declare */
  useExisting: forwardRef(() => BsDatepickerInputDirective),
  multi: true
};

const BS_DATEPICKER_VALIDATOR: Provider = {
  provide: NG_VALIDATORS,
  /* tslint:disable-next-line: no-use-before-declare */
  useExisting: forwardRef(() => BsDatepickerInputDirective),
  multi: true
};

@Directive({
  selector: `input[bsDatepicker]`,
  host: {
    '(change)': 'onChange($event)',
    '(keyup.esc)': 'hide()',
    '(keydown)': 'onKeydownEvent($event)',
    '(blur)': 'onBlur()'
  },
  providers: [BS_DATEPICKER_VALUE_ACCESSOR, BS_DATEPICKER_VALIDATOR]
})
export class BsDatepickerInputDirective
  implements ControlValueAccessor, Validator, OnInit, OnDestroy {
  private _onChange = Function.prototype;
  private _onTouched = Function.prototype;
  /* tslint:disable-next-line: no-unused-variable */
  private _validatorChange = Function.prototype;
  private _value: Date;
  private _subs = new Subscription();

  constructor(@Host() private _picker: BsDatepickerDirective,
              private _localeService: BsLocaleService,
              private _renderer: Renderer2,
              private _elRef: ElementRef,
              private changeDetection: ChangeDetectorRef) {}

  ngOnInit() {
    // update input value on datepicker value update
    this._subs.add(
      this._picker.bsValueChange.subscribe((value: Date) => {
        this._setInputValue(value);
        if (this._value !== value) {
          this._value = value;
          this._onChange(value);
          this._onTouched();
        }
        this.changeDetection.markForCheck();
      })
    );

    // update input value on locale change
    this._subs.add(
      this._localeService.localeChange.subscribe(() => {
        this._setInputValue(this._value);
      })
    );

    this._subs.add(
    this._picker.dateInputFormat$.pipe(distinctUntilChanged()).subscribe(() => {
      this._setInputValue(this._value);
    })
  );
}

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onKeydownEvent(event) {
    if (event.keyCode === 13 || event.code === 'Enter') {
      this.hide();
    }
  }

  _setInputValue(value: Date): void {
    const initialDate = !value ? ''
      : formatDate(value, this._picker._config.dateInputFormat, this._localeService.currentLocale);

    this._renderer.setProperty(this._elRef.nativeElement, 'value', initialDate);
  }

  onChange(event: Event) {
    /* tslint:disable-next-line: no-any*/
    this.writeValue((event.target as any).value);
    this._onChange(this._value);
    if (this._picker._config.returnFocusToInput) {
      this._renderer.selectRootElement(this._elRef.nativeElement).focus();
    }
    this._onTouched();
  }

  validate(c: AbstractControl): ValidationErrors | null {
    const _value: Date | string = c.value;

    /* tslint:disable-next-line: prefer-switch */
    if (_value === null || _value === undefined || _value === '') {
      return null;
    }

    if (isDate(_value)) {
      const _isDateValid = isDateValid(_value);
      if (!_isDateValid) {
        return { bsDate: { invalid: _value } };
      }

      if (this._picker && this._picker.minDate && isBefore(_value, this._picker.minDate, 'date')) {
        this.writeValue(this._picker.minDate);

        return { bsDate: { minDate: this._picker.minDate } };
      }

      if (this._picker && this._picker.maxDate && isAfter(_value, this._picker.maxDate, 'date')) {
        this.writeValue(this._picker.maxDate);

        return { bsDate: { maxDate: this._picker.maxDate } };
      }
    }
  }

  registerOnValidatorChange(fn: () => void): void {
    this._validatorChange = fn;
  }

  writeValue(value: Date | string) {
    if (!value) {
      this._value = null;
    } else {
      const _localeKey = this._localeService.currentLocale;
      const _locale = getLocale(_localeKey);
      if (!_locale) {
        throw new Error(
          `Locale "${_localeKey}" is not defined, please add it with "defineLocale(...)"`
        );
      }

      this._value = parseDate(value, this._picker._config.dateInputFormat, this._localeService.currentLocale);

      if (this._picker._config.useUtc) {
        this._value = utcAsLocal(this._value);
      }
    }

    this._picker.bsValue = this._value;
  }

  setDisabledState(isDisabled: boolean): void {
    this._picker.isDisabled = isDisabled;
    if (isDisabled) {
      this._renderer.setAttribute(this._elRef.nativeElement, 'disabled', 'disabled');

      return;
    }
    this._renderer.removeAttribute(this._elRef.nativeElement, 'disabled');
  }

  registerOnChange(fn: () => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  onBlur() {
    this._onTouched();
  }

  hide() {
    this._picker.hide();
    this._renderer.selectRootElement(this._elRef.nativeElement).blur();
    if (this._picker._config.returnFocusToInput) {
      this._renderer.selectRootElement(this._elRef.nativeElement).focus();
    }
  }
}
