"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "../dashboard/Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const hideSidebar = [
    "/organizer/email-verification",
    "/organizer/onboarding",
    "/organizer/document-upload",
    "/organizer/pending"
  ].includes(pathname);

  // Create-event renders its form inside a white card; on the default
  // stone-50 shell that card reads as a floating box. Use a plain white
  // shell here so the card blends into a single seamless white page.
  const whiteShell = pathname === "/organizer/create-event";

  // Profile is laid out on the warm brand background with its own container and
  // full-bleed sticky bars, so it takes the shell bare and supplies its own
  // padding rather than fighting the default p-4/md:p-8.
  const bareShell = pathname === "/organizer/profile";

  const shellBg = whiteShell ? "bg-white" : bareShell ? "bg-background" : "bg-slate-50";

  // `overflow-x: hidden` makes this element a scroll container, which breaks
  // `position: sticky` for any descendant (the sticky element has nothing to
  // scroll against, so it parks at the top). `overflow-x: clip` contains
  // horizontal overflow the same way WITHOUT creating a scroll container, so the
  // profile page's sticky rail keeps working. Scoped to that route to leave the
  // other organizer pages on their existing behaviour.
  const overflowX = bareShell ? "overflow-x-clip" : "overflow-x-hidden";

  return (
    <div className={`min-h-screen flex flex-col ${overflowX} ${shellBg}`}>
      <div className="flex flex-1 relative">
        {!hideSidebar ? (
          <Sidebar
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            positionMode="fixed"
          />
        ) : null}

        <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0 relative ${hideSidebar ? "" : "md:ml-24"}`}>
          {!hideSidebar ? (
            <div
              className={`fixed inset-0 md:left-24 bg-black/40 z-20 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
          ) : null}

          <main className="flex-1 mt-0 min-h-[calc(100vh-64px)] flex flex-col">
            <div className={`flex-1 ${bareShell ? "" : "p-4 md:p-8 pb-24 md:pb-10"}`}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
