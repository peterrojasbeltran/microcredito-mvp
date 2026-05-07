import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl place-items-center px-6 py-10">
      <section className="max-w-3xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-blue-600 text-xl font-bold text-white">M</div>
        <p className="mt-6 text-sm font-medium text-blue-700">Microcréditos MVP</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">Solicita tu crédito de forma simple y transparente</h1>
        <p className="mt-5 text-lg text-slate-600">Una primera versión para validar onboarding, solicitud de crédito y revisión administrativa.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700" href="/register">Crear cuenta</Link>
          <Link className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50" href="/login">Iniciar sesión</Link>
        </div>
      </section>
    </main>
  );
}
