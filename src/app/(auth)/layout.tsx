export default function LayoutAcceso({ children }: LayoutProps<"/">) {
  const producto = process.env.NOMBRE_PRODUCTO ?? "CL-CRM";
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <p className="text-center text-sm font-semibold tracking-wide text-zinc-500 uppercase">{producto}</p>
        <section className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {children}
        </section>
      </div>
    </main>
  );
}
