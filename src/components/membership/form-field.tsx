import type { ComponentProps, ReactNode } from "react";
import { Field } from "@/components/ui/field";

/**
 * The shared <Field> for the public membership forms: the "(optional)" marker
 * is passed in the page's language, and nothing is shown when it is omitted.
 */
export function FormField({
  optionalLabel,
  ...props
}: Omit<ComponentProps<typeof Field>, "optionalLabel"> & {
  /** Shown after the label of a field that is not required, e.g. "(ঐচ্ছিক)" / "(optional)". */
  optionalLabel?: ReactNode;
}) {
  return <Field {...props} optionalLabel={optionalLabel ?? null} />;
}
