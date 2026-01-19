import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Script from "next/script";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardNav from "@/components/dashboard/DashboardNav";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/sovereign");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)] text-[color:var(--foreground)]">
      <DashboardHeader />

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-8">
        <DashboardNav />

        <main className="flex-1">{children}</main>
      </div>

      <Script
        src="/ragnara-chat.js"
        strategy="afterInteractive"
        data-code="48470508"
        data-position="bottom-right"
        data-button-text="Chat"
      />

    </div>
  );
}
