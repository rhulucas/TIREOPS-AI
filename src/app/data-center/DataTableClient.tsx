"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";

type CellValue = string | number | null;
type RoleKey = "sales" | "finance" | "engineering" | "admin";

export type DataCenterTable = {
  key: string;
  label: string;
  description: string;
  audience: string;
  count: number;
  columns: string[];
  rows: Record<string, CellValue>[];
};

type Props = {
  generatedAt: string;
  tables: DataCenterTable[];
};

const roleViews: { key: RoleKey; label: string; description: string; tableKeys: string[] }[] = [
  {
    key: "sales",
    label: "Sales",
    description: "Customer history, quotes, orders, and customer email context.",
    tableKeys: ["customers", "quotes", "orders", "email-threads"],
  },
  {
    key: "finance",
    label: "Finance",
    description: "Invoice, customer, and order records for billing review.",
    tableKeys: ["invoices", "orders", "customers"],
  },
  {
    key: "engineering",
    label: "Engineering",
    description: "Tread design, compound, change request, and production line data.",
    tableKeys: ["tread-designs", "compounds", "change-requests", "production-lines"],
  },
  {
    key: "admin",
    label: "Admin",
    description: "Full demo data access for system review and export.",
    tableKeys: [],
  },
];

function csvEscape(value: CellValue) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadCsv(table: DataCenterTable, rows: Record<string, CellValue>[]) {
  const csv = [
    table.columns.map(csvEscape).join(","),
    ...rows.map((row) => table.columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tireops-${table.key}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DataTableClient({ generatedAt, tables }: Props) {
  const [activeRole, setActiveRole] = useState<RoleKey>("sales");
  const [activeKey, setActiveKey] = useState(tables[0]?.key ?? "");
  const [query, setQuery] = useState("");

  const visibleTables = useMemo(() => {
    const view = roleViews.find((role) => role.key === activeRole);
    if (!view || activeRole === "admin") return tables;
    return tables.filter((table) => view.tableKeys.includes(table.key));
  }, [activeRole, tables]);

  const activeTable =
    visibleTables.find((table) => table.key === activeKey) ?? visibleTables[0] ?? tables[0];

  const filteredRows = useMemo(() => {
    if (!activeTable) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return activeTable.rows;
    return activeTable.rows.filter((row) =>
      activeTable.columns.some((column) =>
        String(row[column] ?? "").toLowerCase().includes(needle)
      )
    );
  }, [activeTable, query]);

  const totalRecords = tables.reduce((sum, table) => sum + table.count, 0);
  const primaryTables = visibleTables.slice(0, 4);
  const activeRoleView = roleViews.find((role) => role.key === activeRole) ?? roleViews[0];

  return (
    <div className="page-shell space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
            Role-Based Demo Records
          </div>
          <h1 className="mt-1 text-[30px] font-bold tracking-tight text-[var(--text)]">
            Data Center
          </h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            Live simulated PostgreSQL records organized for Sales, Finance, Engineering, and Admin review. Last refreshed{" "}
            {new Date(generatedAt).toLocaleString()}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="tool-btn inline-flex items-center gap-2 px-3 py-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {roleViews.map((role) => {
          const isActive = role.key === activeRole;
          const roleCount =
            role.key === "admin"
              ? totalRecords
              : tables
                  .filter((table) => role.tableKeys.includes(table.key))
                  .reduce((sum, table) => sum + table.count, 0);
          return (
            <button
              type="button"
              key={role.key}
              onClick={() => {
                setActiveRole(role.key);
                const nextTable =
                  role.key === "admin"
                    ? tables[0]
                    : tables.find((table) => role.tableKeys.includes(table.key));
                setActiveKey(nextTable?.key ?? "");
                setQuery("");
              }}
              className={`rounded-[10px] border p-4 text-left transition ${
                isActive
                  ? "border-[#bfdbfe] bg-[var(--accent-light)] shadow-sm"
                  : "border-[var(--border)] bg-white hover:bg-[var(--bg2)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-[var(--text)]">{role.label}</div>
                <span className={isActive ? "badge-blue" : "badge-neutral"}>
                  {roleCount.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-dim)]">{role.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="kpi-card p-4 xl:col-span-1">
          <div className="text-xs font-semibold text-[var(--text-dim)]">{activeRoleView.label} View</div>
          <div className="mt-2 text-[30px] font-bold leading-none text-[var(--text)]">
            {visibleTables.reduce((sum, table) => sum + table.count, 0).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[var(--text-dim)]">Across {visibleTables.length} visible tables</div>
        </div>
        {primaryTables.map((table) => (
          <button
            type="button"
            key={table.key}
            onClick={() => setActiveKey(table.key)}
            className="kpi-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-xs font-semibold text-[var(--text-dim)]">{table.label}</div>
            <div className="mt-2 text-[30px] font-bold leading-none text-[var(--accent)]">
              {table.count.toLocaleString()}
            </div>
            <div className="mt-1 line-clamp-1 text-xs text-[var(--text-dim)]">
              {table.audience}
            </div>
          </button>
        ))}
      </div>

      <div className="card panel-strong space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {visibleTables.map((table) => (
              <button
                type="button"
                key={table.key}
                onClick={() => {
                  setActiveKey(table.key);
                  setQuery("");
                }}
                className={`rounded-[7px] border px-3 py-2 text-xs font-semibold transition ${
                  activeTable?.key === table.key
                    ? "border-[#bfdbfe] bg-[var(--accent-light)] text-[var(--accent)]"
                    : "border-[var(--border2)] bg-white text-[var(--text-mid)] hover:bg-[var(--bg2)]"
                }`}
              >
                {table.label}
                <span className="ml-1 text-[var(--text-dim)]">{table.count}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTable && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--text)]">{activeTable.label}</h2>
                <p className="mt-1 text-sm text-[var(--text-dim)]">{activeTable.description}</p>
              </div>
              <div className="flex flex-1 flex-wrap justify-end gap-2">
                <label className="relative min-w-[260px] max-w-md flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-light)]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="form-input pl-9"
                    placeholder={`Search ${activeTable.label.toLowerCase()}...`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => downloadCsv(activeTable, filteredRows)}
                  className="btn-primary inline-flex items-center gap-2 rounded-[7px] px-3 py-2 text-sm font-semibold"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[10px] border border-[var(--border)]">
              <div className="max-h-[560px] overflow-auto">
                <table className="table-demo min-w-full">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {activeTable.columns.map((column) => (
                        <th key={column}>{column.replaceAll("_", " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, rowIndex) => (
                      <tr key={`${activeTable.key}-${rowIndex}`}>
                        {activeTable.columns.map((column) => (
                          <td key={column} className="max-w-[320px] truncate">
                            {row[column] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRows.length === 0 && (
                <div className="bg-white p-8 text-center text-sm text-[var(--text-dim)]">
                  No matching records found.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
