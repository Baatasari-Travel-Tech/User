import DashboardLayout from "@/components/event-org/layout/DashboardLayout";

export default function EventOrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
