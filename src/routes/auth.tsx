import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy sign-in path used by the protected-area gate; the internal portal login lives at /login.
export const Route = createFileRoute("/auth")({ staticData: { sitemap: false },
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
