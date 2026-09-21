/** Plain HTML form → POST /auth/signout. Works without JS and can't be triggered by a link. */
export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={`rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100/60 ${className}`}>
        Sign out
      </button>
    </form>
  );
}
