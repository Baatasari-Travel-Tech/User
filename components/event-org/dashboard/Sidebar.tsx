"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dashboardNavItems } from "../navigation";

// Simple class merger if utils doesn't exist yet
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  positionMode?: "fixed" | "absolute";
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, positionMode = "fixed" }) => {
  const pathname = usePathname();

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={classNames(
          "hidden md:block transition-all duration-300 ease-in-out shrink-0 bg-slate-900 text-white border-r border-slate-200 shadow-sm z-30",
          isOpen ? "w-64" : "w-20",
          positionMode === "fixed"
            ? "fixed top-16 left-0 bottom-0"
            : "absolute top-16 left-0 bottom-0"
        )}
      >
        <div className="h-full flex flex-col items-center pt-4">
          {/* Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute -right-3 top-6 bg-white rounded-full p-1 shadow-sm hover:shadow-md transition-all z-40"
          >
            {isOpen ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {/* Brand */}
          <div className="flex w-full shrink-0 items-center gap-3 border-b border-slate-800/60 px-3.5 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10">
              <Image
                src="/nlogo.png"
                alt="Baatasari"
                width={256}
                height={256}
                className="h-8 w-8 object-contain"
              />
            </div>
            <div
              className={classNames(
                "flex flex-col overflow-hidden whitespace-nowrap transition-opacity duration-300",
                isOpen ? "opacity-100" : "w-0 opacity-0"
              )}
            >
              <span className="truncate text-sm font-bold tracking-wide text-white leading-tight">
                Baatasari
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Event Organizer
              </span>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3 w-full">
            {dashboardNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={classNames(
                    "flex items-center justify-between gap-2 px-3 py-3 rounded-xl transition-colors w-full",
                    isActive
                      ? "bg-slate-700/70 text-white font-medium"
                      : "text-slate-200 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className={classNames("w-6 h-6 min-w-6", isActive ? "text-white" : "text-slate-300")} />
                    <span
                      className={classNames(
                        "whitespace-nowrap transition-opacity duration-300 font-poppins text-[15px]",
                        isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                      )}
                    >
                      {item.name}
                    </span>
                  </div>
                  {item.comingSoon && isOpen ? (
                    <span className="rounded-full border border-sky-300/30 bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-100">
                      Coming soon
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-foreground border-t border-gray-800 z-50 px-6 py-2">
        <div className="flex justify-between items-center">
          {dashboardNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 p-2"
              >
                <item.icon className={classNames("w-6 h-6", isActive ? "text-white" : "text-gray-500")} />
                {/* Optional label for mobile */}
                {/* <span className={classNames("text-[10px]", isActive ? "text-[#0c1b33] font-medium" : "text-gray-400")}>{item.name}</span> */}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
