"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Home,
  LogOut,
  Settings,
  Store,
  Trophy,
  User,
  Users,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useDocument } from "@/hooks/use-firestore";
import type { Player } from "@/hooks/use-firestore";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Panel", icon: Home },
  { href: "/dashboard/tournaments", label: "Torneos", icon: Trophy },
  { href: "/dashboard/marketplace", label: "Mercado", icon: Store },
  { href: "/dashboard/profile", label: "Perfil", icon: User },
];

const adminNavItems = [
    { href: "/dashboard/admin/users", label: "Usuarios", icon: ShieldCheck },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole } = useAuth();
  const { data: player } = useDocument<Player>(user ? `users/${user.uid}` : 'users/dummy');


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };
  
  const getAvatarFallback = () => {
    if (!player) return user?.email?.substring(0, 1).toUpperCase() || 'U';
    const first = player.firstName ? player.firstName.substring(0, 1) : '';
    const last = player.lastName ? player.lastName.substring(0, 1) : '';
    return `${first}${last}`;
  }


  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Trophy className="h-6 w-6 text-primary" />
              <span className="">EvoLadder</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname === item.href && "bg-muted text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            {userRole === 'admin' && (
              <>
                <div className="my-2 px-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Admin</p>
                </div>
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                   {adminNavItems.map((item) => (
                        <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                            pathname.startsWith(item.href) && "bg-muted text-primary"
                        )}
                        >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        </Link>
                    ))}
                </nav>
              </>
            )}
          </div>
          <div className="mt-auto p-4">
             <div className="flex items-center gap-4">
                <ThemeToggle />
                <Button variant="ghost" size="icon" className="rounded-full" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Cerrar Sesión</span>
                </Button>
             </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Users className="h-5 w-5" />
                <span className="sr-only">Alternar menú de navegación</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Trophy className="h-6 w-6 text-primary" />
                  <span className="">EvoLadder</span>
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                       pathname === item.href && "bg-muted text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
                 {userRole === 'admin' && (
                    <>
                        <div className="my-2 px-4">
                            <p className="text-sm font-semibold text-muted-foreground uppercase">Admin</p>
                        </div>
                        {adminNavItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                                pathname.startsWith(item.href) && "bg-muted text-foreground"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                    </>
                 )}
              </nav>
              <div className="mt-auto">
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                        <span className="sr-only">Cerrar Sesión</span>
                    </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Can be used for a global search */}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={player?.avatar || "https://placehold.co/40x40.png"} alt={player?.displayName || "Usuario"} />
                  <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Alternar menú de usuario</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/dashboard/profile">Perfil</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/dashboard/settings">Configuración</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Cerrar Sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
