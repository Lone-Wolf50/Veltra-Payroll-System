"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SearchProvider, useGlobalSearch } from "@/components/providers/search-provider";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { globalSearch, setGlobalSearch } = useGlobalSearch();

  return (
    <div className="min-h-screen bg-page text-text">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          onOpenMobileMenu={() => setMobileOpen(true)}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SearchProvider>
      <AppShellInner>{children}</AppShellInner>
    </SearchProvider>
  );
}
