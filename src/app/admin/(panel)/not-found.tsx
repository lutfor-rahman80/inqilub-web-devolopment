import { AdminPanelNotFound } from "@/components/admin/panel-not-found";

/**
 * notFound() from any admin page without its own not-found file: shown inside
 * the panel layout (sidebar kept) instead of the public 404. Unknown /admin
 * URLs (no matching route) still use the root not-found page.
 */
export default function PanelNotFound() {
  return <AdminPanelNotFound />;
}
