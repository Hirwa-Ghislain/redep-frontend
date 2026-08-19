import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------- Field wrapper ------------------------------- */

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, id, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
          {required && <span className="text-clay ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12.5px] text-clay-deep" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full rounded-(--radius-ctl) border border-line-strong bg-surface text-ink text-[13.5px] placeholder:text-faint shadow-(--shadow-card) " +
  "transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/45 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 focus:shadow-[0_5px_16px_rgb(15_23_18_/_0.06)] " +
  "disabled:opacity-50 disabled:bg-paper aria-invalid:border-clay";

/* ---------------------------------- Input ------------------------------------ */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, showPasswordToggle = false, className, required, id: idProp, type, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const canTogglePassword = showPasswordToggle && type === "password";
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={className}>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint [&>svg]:size-4">{icon}</span>}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          type={canTogglePassword && passwordVisible ? "text" : type}
          className={cn(controlBase, "h-9 px-3", icon ? "pl-9" : undefined, canTogglePassword ? "pr-10" : undefined)}
          required={required}
          {...rest}
        />
        {canTogglePassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-faint transition-all duration-200 hover:bg-primary-soft hover:text-primary-deep hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible}
          >
            {passwordVisible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>
    </Field>
  );
});

/* --------------------------------- Textarea ---------------------------------- */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, required, id: idProp, rows = 4, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={className}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(controlBase, "px-3 py-2.5 resize-y min-h-20")}
        required={required}
        {...rest}
      />
    </Field>
  );
});

/* ---------------------------------- Select ----------------------------------- */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, required, id: idProp, children, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn(controlBase, "h-9 pl-3 pr-9 appearance-none cursor-pointer")}
          required={required}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-faint pointer-events-none" aria-hidden />
      </div>
    </Field>
  );
});

/* --------------------------------- Checkbox ---------------------------------- */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <label htmlFor={id} className={cn("flex items-start gap-2.5 cursor-pointer group", className)}>
      <input
        ref={ref}
        type="checkbox"
        id={id}
        className="mt-0.5 size-4 shrink-0 rounded accent-primary cursor-pointer"
        {...rest}
      />
      <span className="flex flex-col">
        <span className="text-sm text-ink font-medium group-hover:text-primary-deep transition-colors">{label}</span>
        {description && <span className="text-[12.5px] text-muted">{description}</span>}
      </span>
    </label>
  );
});

/* ---------------------------------- Switch ----------------------------------- */

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-[background-color,box-shadow,transform] duration-200 hover:shadow-[0_0_0_4px_rgb(27_122_83_/_0.1)] active:scale-95",
        checked ? "bg-primary" : "bg-line-strong",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block size-4.5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
