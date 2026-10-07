import { createFileRoute, redirect } from "@tanstack/react-router";

// Old admin login path; everyone signs in through the single internal portal at /login.
export const Route = createFileRoute("/admin/login")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
