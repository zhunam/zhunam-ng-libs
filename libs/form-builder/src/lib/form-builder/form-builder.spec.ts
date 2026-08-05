import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from './form-builder';
import { FieldConfig } from '../models/field-config';

interface TestModel {
  name: string;
}

describe('FormBuilder', () => {
  let component: FormBuilder<TestModel>;
  let fixture: ComponentFixture<FormBuilder<TestModel>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(FormBuilder<TestModel>);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('fields', [
      { key: 'name', label: 'Name', type: 'text' },
    ] satisfies FieldConfig<TestModel>[]);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
