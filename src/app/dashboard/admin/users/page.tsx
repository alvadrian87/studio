
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { useCollection } from "@/hooks/use-firestore";
import type { Player } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsersPage() {
  const { data: players, loading } = useCollection<Player>("users");
  const { userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && userRole !== "admin") {
      router.push("/dashboard");
    }
  }, [userRole, authLoading, router]);

  const handleRoleChange = async (uid: string, newRole: "admin" | "player") => {
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        role: newRole,
      });
      toast({
        title: "¡Éxito!",
        description: "El rol del usuario ha sido actualizado.",
      });
    } catch (error) {
      console.error("Error al cambiar el rol del usuario:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el rol del usuario.",
      });
    }
  };

  if (authLoading || loading || userRole !== 'admin') {
    return <div>Cargando y verificando permisos...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div className="flex flex-col w-full">
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Administra los roles y permisos de los usuarios del sistema.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>
            Una lista de todos los usuarios de la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players?.map((player) => (
                <TableRow key={player.uid}>
                  <TableCell className="font-medium">
                    {player.displayName}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {player.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={player.role === "admin" ? "default" : "secondary"}>
                      {player.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Alternar menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {player.role !== 'admin' && (
                           <DropdownMenuItem
                            onSelect={() => handleRoleChange(player.uid, "admin")}
                          >
                            Hacer Admin
                          </DropdownMenuItem>
                        )}
                        {player.role !== 'player' && (
                          <DropdownMenuItem
                            onSelect={() => handleRoleChange(player.uid, "player")}
                          >
                            Hacer Jugador
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
