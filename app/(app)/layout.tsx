"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SearchProvider, useGlobalSearch } from "@/components/providers/search-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { canAccessRoute } from "@/lib/roles";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { globalSearch, setGlobalSearch } = useGlobalSearch();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAllowed = canAccessRoute(user.role, pathname);

  useEffect(() => {
    if (!isAllowed) {
      router.replace("/dashboard");
    }
  }, [isAllowed, router]);

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
          {isAllowed ? (
            children
          ) : (
            <div className="veltra-card p-8 text-center text-xs text-muted max-w-md mx-auto my-12">
              Redirecting to your {user.role} dashboard...
            </div>
          )}
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
