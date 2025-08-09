
"use client";

import { use, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, Trophy, BarChart3, Settings } from 'lucide-react';
import Loading from './loading';
import { useDocument } from '@/hooks/use-firestore';
import type { Tournament } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const resolvedParams = use(params);
  const pathname = usePathname();
  const { user, userRole } = useAuth();
  const { data: tournament } = useDocument<Tournament>(`tournaments/${resolvedParams.id}`);

  const canManage = userRole === 'admin' || tournament?.creatorId === user?.uid;

  const getNavItems = () => {
    const baseItems = [
      {
        href: `/dashboard/tournaments/${resolvedParams.id}/bracket`,
        label: 'Cuadro',
        icon: BarChart3,
      },
      {
        href: `/dashboard/tournaments/${resolvedParams.id}/ladder`,
        label: 'Escalera',
        icon: Trophy,
      },
    ];
    
    let specificItems;
    if (tournament?.tipoTorneo === 'Evento tipo Escalera') {
        specificItems = [baseItems[1]];
    } else {
        specificItems = [baseItems[0]];
    }

    if (canManage) {
        specificItems.push({
            href: `/dashboard/tournaments/${resolvedParams.id}/schedule`,
            label: 'Partidos',
            icon: Calendar,
        });
        specificItems.push({
            href: `/dashboard/tournaments/${resolvedParams.id}/edit`,
            label: 'Administrar',
            icon: Settings,
        });
    }

    return specificItems;
  }

  const navItems = getNavItems();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b mb-4">
        <nav className="flex items-center space-x-2 lg:space-x-4 px-1 -mb-px overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap px-3 py-3 border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary transition-colors',
                pathname === item.href ? 'text-primary border-primary' : ''
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </div>
  );
}

    
