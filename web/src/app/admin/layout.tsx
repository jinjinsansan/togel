"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bell, Star, LogOut, Menu, X, Home, Gift, Boxes, Coins } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    {
      href: "/admin",
      label: "ダッシュボード",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/admin/featured",
      label: "PickUp管理",
      icon: Star,
    },
    {
      href: "/admin/notifications",
      label: "お知らせ配信",
      icon: Bell,
    },
    {
      href: "/admin/services",
      label: "サービス管理",
      icon: Boxes,
    },
    {
      href: "/admin/recommendations",
      label: "レコメンデーション",
      icon: Gift,
    },
    {
      href: "/admin/points",
      label: "ポイント管理",
      icon: Coins,
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Header - positioned above SiteHeader */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 text-white flex items-center justify-between px-4 z-[100]">
        <h1 className="text-lg font-bold">Togel Admin</h1>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white hover:bg-slate-800"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-[90]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-slate-900 text-white flex flex-col fixed h-full z-[95]
        transition-transform duration-300
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-wider">Togel Admin</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href
              : pathname.startsWith(item.href);
              
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-[#E91E63] text-white font-bold" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link href="/">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-3"
            >
              <Home size={20} />
              <span>サイトに戻る</span>
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-3"
            onClick={handleSignOut}
          >
            <LogOut size={20} />
            <span>ログアウト</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 p-4 lg:p-8 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
