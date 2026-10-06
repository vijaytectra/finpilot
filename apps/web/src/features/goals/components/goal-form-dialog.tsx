"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { toast } from "sonner";

import { DatePicker } from "@/components/date-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, humanizeEnum, toIsoDate } from "@/lib/format";

import { useCreateGoal, useUpdateGoal } from "../hooks";
import {
  emptyGoalValues,
  goalToFormValues,
  makeGoalSchema,
  mapGoalServerError,
  normalizeAmount,
  toCreatePayload,
  toUpdatePayload,
  type GoalFormValues,
} from "../schema";
import { GOAL_TYPES, PRIORITIES, type Goal } from "../types";

interface GoalFormDialogProps {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode. */
  goal?: Goal | null;
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIsoDate(d);
}

/** Create/edit a goal. Remount per goal (via `key`) so default values are always fresh. */
export function GoalFormDialog({ customerId, open, onOpenChange, goal }: GoalFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        {open ? (
          <GoalForm key={goal?.goal_id ?? "new"} customerId={customerId} goal={goal ?? null} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({ customerId, goal, onDone }: { customerId: string; goal: Goal | null; onDone: () => void }) {
  const isEdit = goal !== null;
  const schema = useMemo(
    () => makeGoalSchema({ today: todayIso(), originalTargetDate: goal?.target_date }),
    [goal?.target_date],
  );
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: goal ? goalToFormValues(goal) : emptyGoalValues(),
    mode: "onTouched",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreateGoal(customerId);
  const update = useUpdateGoal(customerId);
  const pending = create.isPending || update.isPending;

  const handleServerError = (error: unknown) => {
    const mapped = mapGoalServerError(error);
    mapped.fieldErrors.forEach(({ field, message }, index) =>
      form.setError(field, { type: "server", message }, { shouldFocus: index === 0 }),
    );
    setFormError(mapped.formError);
  };

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    if (goal) {
      const payload = toUpdatePayload(goal, values);
      if (Object.keys(payload).length === 0) {
        onDone();
        return;
      }
      update.mutate(
        { goalId: goal.goal_id, payload },
        {
          onSuccess: (saved) => {
            toast.success("Goal updated", { description: saved.goal_name });
            onDone();
          },
          onError: handleServerError,
        },
      );
    } else {
      create.mutate(toCreatePayload(values), {
        onSuccess: (saved) => {
          toast.success("Goal created", { description: `${saved.goal_name} · ${saved.goal_id}` });
          onDone();
        },
        onError: handleServerError,
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit goal" : "Add goal"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? `Only changed fields are saved. ${goal.goal_id}`
            : "Set a financial goal for this customer. All amounts are in rupees."}
        </DialogDescription>
      </DialogHeader>

      {formError ? (
        <Alert variant="destructive" aria-live="assertive">
          <AlertCircle aria-hidden />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className="gap-4">
        <Controller
          name="goal_name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="goal_name">Goal name</FieldLabel>
              <Input
                {...field}
                id="goal_name"
                maxLength={120}
                placeholder="e.g. Retirement corpus"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? "goal_name-error" : undefined}
              />
              <FieldError id="goal_name-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="goal_type"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="goal_type">Goal type</FieldLabel>
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="goal_type"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.error ? "goal_type-error" : undefined}
                  >
                    <SelectValue placeholder="Choose a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {humanizeEnum(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id="goal_type-error" errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="priority"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="priority">Priority</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="priority" ref={field.ref} onBlur={field.onBlur} className="w-full" aria-invalid={fieldState.invalid}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {humanizeEnum(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AmountField control={form.control} name="target_amount" label="Target amount" />
          <AmountField control={form.control} name="current_funded_amount" label="Funded so far" />
        </div>

        <Controller
          name="target_date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="target_date">Target date</FieldLabel>
              <DatePicker
                id="target_date"
                value={field.value || undefined}
                onChange={(v) => {
                  field.onChange(v ?? "");
                  field.onBlur();
                }}
                min={tomorrowIso()}
                max="2100-12-31"
                invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? "target_date-error" : "target_date-help"}
              />
              {fieldState.error ? (
                <FieldError id="target_date-error" errors={[fieldState.error]} />
              ) : (
                <FieldDescription id="target_date-help">Must be a future date.</FieldDescription>
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending || (isEdit && !form.formState.isDirty)}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AmountField({
  control,
  name,
  label,
}: {
  control: Control<GoalFormValues>;
  name: "target_amount" | "current_funded_amount";
  label: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const normalized = normalizeAmount(field.value);
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>₹</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                {...field}
                id={name}
                inputMode="decimal"
                autoComplete="off"
                className="tabular"
                aria-invalid={fieldState.invalid}
                aria-describedby={`${name}-hint`}
              />
            </InputGroup>
            {fieldState.error ? (
              <FieldError id={`${name}-hint`} errors={[fieldState.error]} />
            ) : (
              <FieldDescription id={`${name}-hint`} className="tabular text-xs">
                {normalized ? formatMoney(Number(normalized)) : "Up to 2 decimals"}
              </FieldDescription>
            )}
          </Field>
        );
      }}
    />
  );
}
