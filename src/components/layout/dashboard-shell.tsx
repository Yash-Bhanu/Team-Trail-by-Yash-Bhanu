'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TeamTrailLogo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  AlertTriangle,
  Activity,
  ClipboardCheck,
  GitBranch,
  FileText,
  Settings,
  Shield,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENTOR_NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard/mentor', icon: LayoutDashboard },
  { label: 'Courses', href: '/dashboard/mentor?tab=courses', icon: BookOpen },
  { label: 'Teams', href: '/dashboard/mentor?tab=teams', icon: Users },
  { label: 'Risk Center', href: '/dashboard/mentor?tab=risks', icon: AlertTriangle },
  { label: 'Activity', href: '/dashboard/mentor?tab=activity', icon: Activity },
  { label: 'Weekly Check-ins', href: '/dashboard/mentor?tab=checkins', icon: ClipboardCheck },
  { label: 'GitHub Integrations', href: '/dashboard/mentor?tab=integrations', icon: GitBranch },
  { label: 'Reports', href: '/dashboard/mentor?tab=reports', icon: FileText },
  { label: 'Settings', href: '/dashboard/mentor?tab=settings', icon: Settings },
];

const STUDENT_NAV: NavItem[] = [
  { label: 'Overview', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'My Team', href: '/dashboard/student?tab=team', icon: Users },
  { label: 'Team Activity', href: '/dashboard/student?tab=activity', icon: Activity },
  { label: 'Weekly Check-in', href: '/dashboard/student?tab=checkin', icon: ClipboardCheck },
  { label: 'Check-in History', href: '/dashboard/student?tab=history', icon: FileText },
  { label: 'Risk Flags', href: '/dashboard/student?tab=flags', icon: AlertTriangle },
  { label: 'Privacy & Consent', href: '/dashboard/student?tab=privacy', icon: Shield },
  { label: 'Settings', href: '/dashboard/student?tab=settings', icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Admin Overview', href: '/dashboard/admin', icon: Shield },
  { label: 'Users & Roles', href: '/dashboard/admin?tab=users', icon: Users },
  { label: 'Operational Health', href: '/dashboard/admin?tab=health', icon: Activity },
  { label: 'Audit Metadata', href: '/dashboard/admin?tab=audit', icon: FileText },
];

export function DashboardShell({
  role,
  userName,
  children,
}: {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = role === 'admin' ? ADMIN_NAV : role === 'mentor' ? MENTOR_NAV : STUDENT_NAV;

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <aside
        className={cn(
          'flex flex-col border-r border-slate-200 bg-white transition-all duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
          {!collapsed && (
            <Link href="/">
              <TeamTrailLogo size="sm" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const active = pathname === item.href.split('?')[0];
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          {!collapsed && (
            <div className="mb-2 flex items-center justify-between">
              <span className="truncate text-xs font-medium text-slate-700">{userName}</span>
              <Badge variant="outline" className="capitalize">{role}</Badge>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start gap-2 text-slate-600">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
