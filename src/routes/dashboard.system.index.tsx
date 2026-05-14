import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/system/")({
  beforeLoad: () => { throw redirect({ to: "/dashboard/system/archive" }); },
});
