import SignInForm from "./form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-neutral-400">
        This portfolio is private. Enter your email and we&apos;ll send a one-time link.
      </p>
      <div className="mt-8">
        <SignInForm />
      </div>
    </main>
  );
}
