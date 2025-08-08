import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, BrainCircuit, CheckCircle, ListOrdered, Shield, Swords, Trophy, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { TennisBallIcon } from '@/components/icons';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <Trophy className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-bold">EvoLadder Manager</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Features
          </Link>
          <Link href="#ai-management" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            AI Management
          </Link>
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Login
          </Link>
          <Button asChild>
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    The Ultimate Tournament Ladder System
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    EvoLadder Manager provides a seamless, engaging, and fair platform for all your competitive gaming needs. Create, manage, and participate in tournaments with ease.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/dashboard">Create a Tournament</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#features">Learn More</Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x400.png"
                width="600"
                height="400"
                alt="Hero"
                data-ai-hint="esports tournament"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need to Run a Tournament</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From player dashboards to intelligent management tools, we've got you covered.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <ListOrdered className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Dynamic Ladders</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize tournament progress with our interactive ladder display, showing rankings and challenge status in real-time.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Player Dashboards</h3>
                <p className="text-sm text-muted-foreground">
                  Players can track their profile, challenge history, rankings, and detailed performance statistics.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Swords className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Challenge System</h3>
                <p className="text-sm text-muted-foreground">
                  Enable players to issue challenges to others, with backend rules to ensure fair and competitive matches.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">CRUD Operations</h3>
                <p className="text-sm text-muted-foreground">
                  Full control over users, tournaments, and matches with comprehensive Create, Read, Update, and Delete functionality.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <TennisBallIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Marketplace</h3>
                <p className="text-sm text-muted-foreground">
                  An integrated marketplace for users to trade, sell, or buy gaming-related items and services.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <BarChart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Advanced Statistics</h3>
                <p className="text-sm text-muted-foreground">
                  In-depth analytics on sets won, game win percentages, and more to help players improve their strategy.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="ai-management" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Smarter Tournament Management with <span className="text-primary">AI</span>
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Let our AI assistant validate your tournament configurations, detect misconfigurations, and suggest improvements for a perfectly balanced event.
              </p>
            </div>
            <div className="mx-auto w-full max-w-4xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                    AI-Powered Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-left space-y-4">
                      <p className="text-muted-foreground">Simply input your tournament details, and our AI will analyze the setup for fairness, balance, and logistical soundness. It's like having a professional tournament organizer by your side.</p>
                      <div className="flex items-start space-x-4 rounded-md bg-secondary p-4">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                        <div>
                          <p className="font-semibold">Suggestion Example</p>
                          <p className="text-sm text-muted-foreground">Consider changing the format to Double Elimination for a tournament of this size to increase player engagement.</p>
                        </div>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 EvoLadder Manager. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
