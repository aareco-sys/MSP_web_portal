import { Card, CardTitle } from "./ui";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  /** alineación */
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  title,
  columns,
  rows,
}: {
  title?: string;
  columns: Column<T>[];
  rows: T[];
}) {
  return (
    <Card className="overflow-hidden p-0">
      {title ? (
        <div className="border-b border-neutral-100 px-4 pt-4 dark:border-neutral-800">
          <CardTitle>{title}</CardTitle>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-2 font-medium",
                    c.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-2 tabular-nums",
                      c.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
