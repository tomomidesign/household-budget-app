import { yen } from "@/lib/date";

type StatCardProps = {
  label: string;
  value: number;
  tone?: "default" | "income" | "expense" | "balance";
};

const toneClass = {
  default: "border-line bg-white text-ink",
  income: "border-green-100 bg-green-50 text-success",
  expense: "border-red-100 bg-red-50 text-danger",
  balance: "border-blue-100 bg-blue-50 text-primary"
};

export function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <section className={`rounded-lg border p-4 shadow-material ${toneClass[tone]}`}>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-normal">{yen(value)}</p>
    </section>
  );
}
