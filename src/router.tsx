import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { pickViewTransitionTypes } from "@/lib/view-transition";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultViewTransition: { types: pickViewTransitionTypes },
  });

  return router;
};
