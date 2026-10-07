import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/activities")({ staticData: { sitemap: false },
  component: () => <Outlet />,
});
