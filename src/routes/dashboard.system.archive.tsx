import { createFileRoute } from "@tanstack/react-router";
import { ArchiveView } from "@/components/system/archive-view";

export const Route = createFileRoute("/dashboard/system/archive")({
  component: ArchiveView,
});
