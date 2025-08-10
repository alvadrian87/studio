
'use client';

import Link from "next/link"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trophy, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [residence, setResidence] = useState("");
  const [dominantHand, setDominantHand] = useState("");
  const [club, setClub] = useState("");
  
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: "Las contraseñas no coinciden.",
      });
      return;
    }
    if (!firstName || !lastName || !email || !password || !dateOfBirth || !gender || !phoneNumber || !residence) {
        toast({
            variant: "destructive",
            title: "Error de Registro",
            description: "Por favor, completa todos los campos obligatorios.",
        });
        return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const displayName = `${firstName} ${lastName}`;
      await updateProfile(user, {
        displayName: displayName,
      });

      // Create a document for the user in the 'users' collection
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        firstName,
        lastName,
        displayName,
        dateOfBirth,
        gender,
        phoneNumber,
        residence,
        dominantHand,
        club,
        role: "player", // Default role
        globalWins: 0,
        globalLosses: 0,
        rankPoints: 1000, // Initial ELO points
      });

      toast({
        title: "¡Cuenta Creada!",
        description: "Tu cuenta ha sido creada exitosamente.",
      });
      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
       toast({
        variant: "destructive",
        title: "Error de Registro",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen py-8">
      <Card className="mx-auto max-w-lg w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Crea tu Cuenta</CardTitle>
          <CardDescription className="text-center">
            Introduce tu información para crear una cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup}>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input 
                    id="firstName" 
                    placeholder="Rafa" 
                    required 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                 <div className="grid gap-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input 
                    id="lastName" 
                    placeholder="Nadal" 
                    required 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
               <div className="grid gap-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="dateOfBirth">Fecha de Nacimiento</Label>
                    <Input 
                        id="dateOfBirth" 
                        type="date" 
                        required 
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="gender">Género</Label>
                    <Select onValueChange={setGender} value={gender} required>
                        <SelectTrigger id="gender">
                            <SelectValue placeholder="Selecciona tu género" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="femenino">Femenino</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                            <SelectItem value="prefiero-no-decir">Prefiero no decir</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="phoneNumber">Celular</Label>
                    <Input 
                        id="phoneNumber" 
                        type="tel"
                        placeholder="+54 9 11 1234-5678"
                        required 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="residence">Lugar de Residencia</Label>
                  <Input 
                    id="residence" 
                    placeholder="Manacor, España" 
                    required 
                    value={residence}
                    onChange={(e) => setResidence(e.target.value)}
                  />
                </div>
               </div>
               <h3 className="text-sm font-medium text-muted-foreground pt-4">Información Opcional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="dominantHand">Mano Hábil</Label>
                        <Select onValueChange={setDominantHand} value={dominantHand}>
                            <SelectTrigger id="dominantHand">
                                <SelectValue placeholder="Selecciona tu mano hábil" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="diestro">Diestro/a</SelectItem>
                                <SelectItem value="zurdo">Zurdo/a</SelectItem>
                                <SelectItem value="ambidiestro">Ambidiestro/a</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="club">Club donde Juegas</Label>
                        <Input 
                            id="club" 
                            placeholder="Club de Tenis" 
                            value={club}
                            onChange={(e) => setClub(e.target.value)}
                        />
                    </div>
                </div>

              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear una cuenta
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="underline">
              Iniciar Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
