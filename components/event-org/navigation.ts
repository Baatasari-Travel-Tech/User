import {
  BarChart2,
  Calendar,
  Home,
  PlusCircle,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const dashboardNavItems: DashboardNavItem[] = [
  { name: "Home", icon: Home, href: "/organizer/dashboard" },
  { name: "Create event", icon: PlusCircle, href: "/organizer/create-event" },
  { name: "Manage Events", icon: Calendar, href: "/organizer/manage-events" },
  { name: "Analytics", icon: BarChart2, href: "/organizer/analytics" },
  { name: "Payments", icon: Wallet, href: "/organizer/payments" },
];
