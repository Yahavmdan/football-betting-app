import { Component, Input, forwardRef, ElementRef, HostListener, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslationService } from '../../../services/translation.service';

export interface SelectOption {
  value: any;
  label: string;
  labelHe?: string;
  icon?: string;
  image?: string;
  group?: string;
}

export interface SelectGroup {
  name: string;
  nameHe?: string;
  options: SelectOption[];
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true
    }
  ],
  templateUrl: './app-select.component.html',
  styleUrls: ['./app-select.component.css']
})
export class AppSelectComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Input() options: SelectOption[] = [];
  @Input() groups: SelectGroup[] = [];
  @Input() multiple = false;
  @Input() searchable = false;
  @Input() placeholder?: string;
  @Input() placeholderHe?: string;
  @Input() searchPlaceholder?: string;
  @Input() searchPlaceholderHe?: string;
  @Input() selectedText?: string;
  @Input() selectedTextHe?: string;
  @Input() disabled = false;

  isOpen = false;
  searchQuery = '';
  selectedOption: SelectOption | null = null;
  selectedValues: any[] = [];
  filteredOptions: SelectOption[] = [];
  filteredGroups: SelectGroup[] = [];

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private elementRef: ElementRef,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.initializeOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['groups']) {
      this.initializeOptions();
    }
  }

  private initializeOptions(): void {
    if (this.hasGroups) {
      this.filteredGroups = this.groups.map(g => ({ ...g, options: [...g.options] }));
    } else {
      this.filteredOptions = [...this.options];
    }
  }

  get hasGroups(): boolean {
    return this.groups && this.groups.length > 0;
  }

  get noResults(): boolean {
    if (this.hasGroups) {
      return this.filteredGroups.every(g => g.options.length === 0);
    }
    return this.filteredOptions.length === 0;
  }

  getOptionLabel(option: SelectOption): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'he' && option.labelHe) {
      return option.labelHe;
    }
    return option.label;
  }

  getGroupName(group: SelectGroup): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'he' && group.nameHe) {
      return group.nameHe;
    }
    return group.name;
  }

  getPlaceholder(): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'he' && this.placeholderHe) {
      return this.placeholderHe;
    }
    if (this.placeholder) {
      return this.placeholder;
    }
    return currentLang === 'he' ? 'בחר...' : 'Select...';
  }

  getSearchPlaceholder(): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'he' && this.searchPlaceholderHe) {
      return this.searchPlaceholderHe;
    }
    if (this.searchPlaceholder) {
      return this.searchPlaceholder;
    }
    return currentLang === 'he' ? 'חיפוש...' : 'Search...';
  }

  getSelectedText(): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'he' && this.selectedTextHe) {
      return this.selectedTextHe;
    }
    if (this.selectedText) {
      return this.selectedText;
    }
    return currentLang === 'he' ? 'נבחרו' : 'selected';
  }

  getNoResultsText(): string {
    const currentLang = this.translationService.getCurrentLanguage();
    return currentLang === 'he' ? 'לא נמצאו תוצאות' : 'No results found';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggleDropdown(): void {
    if (this.disabled) return;

    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.filterOptions();
      if (this.searchable) {
        setTimeout(() => {
          const input = this.elementRef.nativeElement.querySelector('.search-input');
          if (input) input.focus();
        }, 50);
      }
    }
  }

  filterOptions(): void {
    const query = this.searchQuery.toLowerCase().trim();

    if (this.hasGroups) {
      if (!query) {
        this.filteredGroups = this.groups.map(g => ({ ...g, options: [...g.options] }));
      } else {
        this.filteredGroups = this.groups.map(group => ({
          ...group,
          options: group.options.filter(option =>
            option.label.toLowerCase().includes(query) ||
            (option.labelHe && option.labelHe.toLowerCase().includes(query))
          )
        }));
      }
    } else {
      if (!query) {
        this.filteredOptions = [...this.options];
      } else {
        this.filteredOptions = this.options.filter(option =>
          option.label.toLowerCase().includes(query) ||
          (option.labelHe && option.labelHe.toLowerCase().includes(query))
        );
      }
    }
  }

  isSelected(option: SelectOption): boolean {
    if (this.multiple) {
      return this.selectedValues.includes(option.value);
    }
    return this.selectedOption?.value === option.value;
  }

  selectOption(option: SelectOption, event: Event): void {
    if (this.multiple) {
      event.stopPropagation();
      const index = this.selectedValues.indexOf(option.value);
      if (index === -1) {
        this.selectedValues = [...this.selectedValues, option.value];
      } else {
        this.selectedValues = this.selectedValues.filter(v => v !== option.value);
      }
      this.onChange(this.selectedValues);
      this.onTouched();
    } else {
      this.selectedOption = option;
      this.onChange(option.value);
      this.onTouched();
      this.isOpen = false;
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (this.multiple) {
      this.selectedValues = Array.isArray(value) ? value : [];
    } else {
      if (value !== null && value !== undefined) {
        // Find the option that matches this value
        const allOptions = this.hasGroups
          ? this.groups.flatMap(g => g.options)
          : this.options;
        this.selectedOption = allOptions.find(o => o.value === value) || null;
      } else {
        this.selectedOption = null;
      }
    }
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
