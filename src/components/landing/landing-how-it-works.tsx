import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    step: "01",
    title: "Define campaign types",
    description:
      "Create schemas for the kinds of leads you work — outbound, events, partnerships — with the exact fields your team needs.",
  },
  {
    step: "02",
    title: "Launch campaigns",
    description:
      "Spin up a campaign from a type, configure pipeline stages, and start capturing or importing leads into a structured funnel.",
  },
  {
    step: "03",
    title: "Import and advance",
    description:
      "Bulk-upload spreadsheets with AI-assisted mapping, then move leads through stages as conversations progress toward close.",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-b py-20 md:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">How it works</h2>
          <p className="text-muted-foreground mt-3 text-pretty">
            A simple flow from schema to pipeline — designed for teams that handle many lead sources
            with different data formats.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((item) => (
            <Card key={item.step} className="relative overflow-hidden bg-card/50">
              <CardHeader>
                <span className="text-muted-foreground font-mono text-xs tracking-widest">
                  {item.step}
                </span>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
