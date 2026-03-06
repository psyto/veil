"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  options?: React.ReactNode;
}

const SelectContext = React.createContext<SelectContextValue>({});

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  // Extract options from SelectContent component
  const options = React.useMemo(() => {
    const childArray = React.Children.toArray(children);
    const contentChild = childArray.find((child: any) => child?.type === SelectContent);
    return contentChild ? (contentChild as any).props.children : null;
  }, [children]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, options }}>
      {children}
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  const { value, onValueChange, options } = React.useContext(SelectContext);

  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props}
    >
      {options}
    </select>
  );
});
SelectTrigger.displayName = "SelectTrigger";

// SelectContent is now invisible - just a wrapper to hold options for extraction
const SelectContent = ({ children }: { children: React.ReactNode }) => null;
const SelectValue = () => null; // Not used with native select
const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <option value={value}>{children}</option>
);

export { Select, SelectTrigger, SelectContent, SelectValue, SelectItem };
