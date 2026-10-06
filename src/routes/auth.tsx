import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy sign-in path used by the protected-area gate; the admin login lives at /admin/login.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/login" });
  },
});
