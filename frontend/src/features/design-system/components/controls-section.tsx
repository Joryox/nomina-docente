"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileDown, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";

import { Money } from "@/components/domain/money";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, Fieldset, FormField, FormRequiredNote } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput, TimeRangeInput } from "@/components/ui/time-input";
import { toast } from "@/components/ui/toast";
import { DESIGN_GUIDE, DESIGN_GUIDE_OPTIONS } from "@/constants/design-guide";
import { TEXTS } from "@/constants/texts";
import { FIELD_LIMITS } from "@/constants/validation";

import { guideFormSchema, type GuideFormValues } from "../schemas/guide-form";
import { GuideExample, GuideSection } from "./guide-section";

const texts = DESIGN_GUIDE;

export function ButtonsSection() {
  return (
    <GuideSection id="botones" title={texts.sections.buttons}>
      <GuideExample title={texts.buttons.variants}>
        <Button>{texts.buttons.primary}</Button>
        <Button variant="secondary">{texts.buttons.secondary}</Button>
        <Button variant="outline">{texts.buttons.outline}</Button>
        <Button variant="ghost">{texts.buttons.ghost}</Button>
        <Button variant="danger">{texts.buttons.danger}</Button>
        <Button variant="link">{texts.buttons.link}</Button>
      </GuideExample>
      <GuideExample title={texts.buttons.sizes} className="items-center">
        <Button size="sm">{texts.buttons.primary}</Button>
        <Button size="md">{texts.buttons.primary}</Button>
        <Button size="lg">{texts.buttons.primary}</Button>
        <Button size="icon" variant="outline" aria-label={texts.buttons.iconOnly}>
          <Plus aria-hidden="true" />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label={texts.buttons.iconOnly}>
          <Plus aria-hidden="true" />
        </Button>
      </GuideExample>
      <GuideExample title={texts.buttons.states} className="items-center">
        <Button variant="outline">
          <FileDown aria-hidden="true" />
          {texts.buttons.withIcon}
        </Button>
        <Button loading loadingLabel={texts.buttons.loading}>
          {texts.buttons.primary}
        </Button>
        <Button variant="outline" loading>
          {texts.buttons.outline}
        </Button>
        <Button disabled>{texts.buttons.disabled}</Button>
        <Button variant="outline" disabled>
          {texts.buttons.disabled}
        </Button>
        <Button variant="danger" disabled>
          {texts.buttons.disabled}
        </Button>
      </GuideExample>
    </GuideSection>
  );
}

const DEFAULTS: GuideFormValues = {
  subject: null,
  career: null,
  rate: null,
  date: null,
  start_time: null,
  end_time: null,
  fortnight: "2",
  notes: "",
  confirm: false,
};

export function FormsSection() {
  const form = useForm<GuideFormValues>({
    resolver: zodResolver(guideFormSchema) as unknown as Resolver<GuideFormValues>,
    mode: "onTouched",
    defaultValues: DEFAULTS,
  });
  const [reminder, setReminder] = useState(true);
  const [standaloneTime, setStandaloneTime] = useState<string | null>("07:00");
  const errors = form.formState.errors;
  const startTime = useWatch({ control: form.control, name: "start_time" });
  const endTime = useWatch({ control: form.control, name: "end_time" });

  const onSubmit = form.handleSubmit(() => toast.success(texts.forms.submitted));

  return (
    <GuideSection id="formularios" title={texts.sections.forms}>
      <GuideExample title={texts.forms.states} className="grid sm:grid-cols-3">
        <Field label={texts.forms.normal} hint={texts.forms.notesHint}>
          <Input defaultValue="SCD-1004" />
        </Field>
        <Field label={texts.forms.error} required error={texts.forms.errorMessage}>
          <Input defaultValue="SCD 1004" />
        </Field>
        <Field label={texts.forms.disabledLabel}>
          <Input defaultValue="TESH-0042" disabled />
        </Field>
      </GuideExample>

      <GuideExample title={texts.forms.timeTitle} className="grid sm:grid-cols-2">
        <Field label={TEXTS.ui.timeRange.start} hint={texts.forms.timeHint}>
          <TimeInput value={standaloneTime} onChange={setStandaloneTime} />
        </Field>
        <Switch
          label={texts.forms.reminder}
          description={texts.forms.reminderHint}
          checked={reminder}
          onCheckedChange={setReminder}
        />
      </GuideExample>

      <div className="grid gap-3">
        <h3 className="text-overline text-fg-muted uppercase">{texts.forms.demoTitle}</h3>
        <form
          noValidate
          onSubmit={onSubmit}
          className="grid max-w-form gap-(--field-gap) rounded-lg border border-line bg-surface p-5"
        >
          <p className="text-body text-fg-muted">{texts.forms.demoDescription}</p>
          <FormRequiredNote />
          <div className="grid gap-(--field-gap) sm:grid-cols-2">
            <FormField
              control={form.control}
              name="subject"
              label={texts.forms.subject}
              hint={texts.forms.subjectHint}
              required
              render={(field) => (
                <Combobox
                  options={DESIGN_GUIDE_OPTIONS.subjects}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <FormField
              control={form.control}
              name="career"
              label={texts.forms.career}
              required
              render={(field) => (
                <Combobox
                  options={DESIGN_GUIDE_OPTIONS.careers}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <FormField
              control={form.control}
              name="rate"
              label={texts.forms.rate}
              required
              render={(field) => (
                <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                  <SelectTrigger onBlur={field.onBlur}>
                    <SelectValue placeholder={TEXTS.ui.select.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGN_GUIDE_OPTIONS.rates.map((rate) => (
                      <SelectItem key={rate} value={rate}>
                        <Money amount={rate} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              label={texts.forms.date}
              hint={texts.forms.dateHint}
              required
              render={(field) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disableFuture
                />
              )}
            />
          </div>
          <TimeRangeInput
            required
            value={{ start: startTime, end: endTime }}
            onChange={({ start, end }) => {
              form.setValue("start_time", start, { shouldValidate: form.formState.isSubmitted });
              form.setValue("end_time", end, { shouldValidate: form.formState.isSubmitted });
            }}
            minDurationMinutes={30}
            maxDurationMinutes={300}
            errors={{ start: errors.start_time?.message, end: errors.end_time?.message }}
          />
          <Controller
            control={form.control}
            name="fortnight"
            render={({ field }) => (
              <Fieldset label={texts.forms.fortnight} required>
                <RadioGroup value={field.value} onValueChange={field.onChange}>
                  <RadioGroupItem
                    value="1"
                    label={TEXTS.calendar.fortnights[1]}
                    description={texts.forms.firstFortnight}
                  />
                  <RadioGroupItem
                    value="2"
                    label={TEXTS.calendar.fortnights[2]}
                    description={texts.forms.secondFortnight}
                  />
                </RadioGroup>
              </Fieldset>
            )}
          />
          <Field
            label={texts.forms.notes}
            hint={texts.forms.notesHint}
            error={errors.notes?.message}
          >
            <Textarea showCount maxLength={FIELD_LIMITS.logbookNotes} {...form.register("notes")} />
          </Field>
          <Controller
            control={form.control}
            name="confirm"
            render={({ field, fieldState }) => (
              <div className="grid gap-1">
                <Checkbox
                  label={texts.forms.confirm}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-invalid={fieldState.error ? true : undefined}
                />
                {fieldState.error ? (
                  <p role="alert" className="pl-7 text-small text-danger-ink">
                    {fieldState.error.message}
                  </p>
                ) : null}
              </div>
            )}
          />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => form.reset(DEFAULTS)}>
              {texts.buttons.ghost}
            </Button>
            <Button type="submit">{texts.forms.submit}</Button>
          </div>
        </form>
      </div>
    </GuideSection>
  );
}
