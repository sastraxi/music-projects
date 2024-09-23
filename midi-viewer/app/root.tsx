import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react"
import stylesheet from '~/tailwind.css?url'
import { LinksFunction } from "@remix-run/cloudflare"
import { NextUIProvider } from "@nextui-org/system"
import RandomProvider from "./util/RandomProvider"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>        
        <main className="min-h-screen dark text-foreground bg-background">
          <RandomProvider>
            <NextUIProvider>
              {children}
            </NextUIProvider>
          </RandomProvider>
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
