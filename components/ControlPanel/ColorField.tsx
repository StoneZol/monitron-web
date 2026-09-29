import { ColorInput, type ColorInputProps } from "./ColorInput";

type ColorFieldProps = ColorInputProps & {
  /** Required for the described field variant */
  label: string;
};

/** Described color field — thin alias over `ColorInput` with a label. */
export function ColorField({ label, ...rest }: ColorFieldProps) {
  return <ColorInput label={label} {...rest} />;
}
