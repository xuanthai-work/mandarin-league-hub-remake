import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/courses/hsk")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
