import type { MetaFunction } from "@remix-run/cloudflare";
import App from "~/core/App";

export const meta: MetaFunction = () => {
  return [
    { title: "jam-shuffle" },
    {
      name: "description",
      content: "Break through creative block. Jam with your friends",
    },
  ];
};

export default function Index() {
  return (
    <App />
  );
}
