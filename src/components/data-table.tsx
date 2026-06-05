import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
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
    <section className="card table-card">
      {title ? (
        <div className="card__head">
          <div className="card__title">{title}</div>
        </div>
      ) : null}
      <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn(c.align === "right" && "num")}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={cn(c.align === "right" && "num")}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
