import Image from "next/image";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,61,120,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,61,120,0.07) 1px, transparent 1px), radial-gradient(circle at top, rgba(31,103,200,0.15), transparent 36%)",
          backgroundPosition: "center",
          backgroundSize: "42px 42px, 42px 42px, auto",
        }}
      />

      <section className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-(--border) bg-(--surface) shadow-[0_28px_70px_-38px_rgba(15,39,73,0.55)] lg:min-h-155 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative z-10 grid min-h-80 place-items-center bg-white px-8 py-12 text-center lg:min-h-full lg:pr-24">
          <div className="flex flex-col items-center">
            <div className="grid size-28 place-items-center rounded-full bg-(--surface-soft) shadow-[0_16px_34px_-28px_rgba(15,39,73,0.65)] sm:size-32">
              <Image
                src="/logo-mundo-cupones.svg"
                alt="Logo Mundo Cupones"
                width={112}
                height={112}
                className="size-24 rounded-full object-contain sm:size-28"
                priority
              />
            </div>
            <h1 className="mt-7 text-3xl font-extrabold tracking-tight text-(--brand-blue) sm:text-4xl">
              Mundo Cupones
            </h1>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.28em] text-(--text-muted)">
              - Admin Dashboard -
            </p>
          </div>
        </div>

        <div className="relative z-20 grid min-h-110 place-items-center bg-[linear-gradient(135deg,var(--brand-blue)_0%,var(--accent)_100%)] px-7 py-12 text-white lg:-ml-24 lg:min-h-full lg:[clip-path:polygon(16%_0,100%_0,100%_100%,0_100%)] lg:pl-36 lg:pr-12">
          <div className="w-full max-w-md">
            <h2 className="text-center text-4xl font-extrabold tracking-tight drop-shadow-md">
              {"Inicio de sesi\u00f3n"}
            </h2>

            <p className="mt-3 text-center text-sm leading-6 text-white/80">
              Ingresa tus credenciales para acceder al panel
            </p>

            <div className="mt-8">
              <LoginForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
