import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Piezas de tabla con el estilo del sistema. Para datos con orden y paginación, DataTable. */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-top border-collapse text-body", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-surface-sunken", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot
      className={cn("border-t-2 border-line-strong bg-surface font-semibold", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-line transition-colors duration-(--duration-fast) hover:bg-surface-hover",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-(--control-height-md) px-3 text-left align-middle text-overline whitespace-nowrap text-fg-muted uppercase",
        "data-[align=end]:text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 align-middle text-fg data-[align=end]:text-right data-[align=end]:figures",
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return (
    <caption
      className={cn("border-b border-line px-3 py-2.5 text-left text-label text-fg", className)}
      {...props}
    />
  );
}
