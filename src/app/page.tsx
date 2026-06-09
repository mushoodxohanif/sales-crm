import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 p-8">
      <div className="space-y-3">
        <Badge variant="secondary">Scaffold ready</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Sales CRM</h1>
        <p className="text-muted-foreground text-lg">
          Lead funneling and management built with Next.js 16, Bun, Biome, Tailwind CSS 4,
          shadcn/ui, and Prisma 7 on Neon Postgres.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project scaffold</CardTitle>
          <CardDescription>
            Core tooling and folder structure are in place. Next steps: connect Neon, run
            migrations, and implement auth plus CRM features.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Get started</Button>
          <Button variant="outline">View README</Button>
        </CardContent>
      </Card>
    </main>
  );
}
