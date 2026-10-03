import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // The document never scrolls; the screen region is what can. Without
    // this a page could open part-way down, at the previous page's offset.
    scrollToTopSelectors: ["#screen"],
    defaultPreloadStaleTime: 0,
  });

  return router;
};
