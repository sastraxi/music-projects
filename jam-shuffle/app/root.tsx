import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import "./index.css";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

const queryClient = new QueryClient();

// FIXME: why doesn't this work when imported from App.tsx?
import './core/App.css'

export function HydrateFallback() {
  return (
    <>
      <p>Loading...</p>
      <Scripts />
    </>
  );
}

export default function Component() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Scripts />
    </QueryClientProvider>
  );
}
