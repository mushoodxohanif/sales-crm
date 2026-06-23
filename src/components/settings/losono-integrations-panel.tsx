"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revokeLosonoConnection } from "@/lib/actions/integrations";
import type { LosonoIntegrationGrant } from "@/lib/data/integrations";

type LosonoIntegrationsPanelProps = {
  grants: LosonoIntegrationGrant[];
};

function formatScopes(scopes: string[]): string {
  return scopes.join(", ");
}

export function LosonoIntegrationsPanel({ grants }: LosonoIntegrationsPanelProps) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRevoke(grantId: string) {
    setRevokingId(grantId);

    try {
      const result = await revokeLosonoConnection(grantId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Losono connection revoked");
      router.refresh();
    } catch {
      toast.error("Failed to revoke connection");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-medium">Before connecting Losono</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Create a campaign type for web leads with a unique{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">
              losono_submission_id
            </code>{" "}
            field.
          </li>
          <li>Create a campaign under that type with a default pipeline stage.</li>
          <li>
            In Losono, open an agent&apos;s Forms page, enter this Sales CRM URL, connect, select
            the campaign, and map pre-chat fields.
          </li>
        </ol>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="space-y-1">
          <h2 className="text-base font-medium">Connected accounts</h2>
          <p className="text-sm text-muted-foreground">
            Users who authorized Losono to create leads in this workspace.
          </p>
        </div>

        {grants.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No Losono connections yet.
          </p>
        ) : (
          <div className="space-y-3">
            {grants.map((grant) => {
              const isActive = grant.revokedAt === null && grant.activeTokenCount > 0;

              return (
                <article
                  key={grant.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{grant.user.name ?? grant.user.email}</p>
                    <p className="text-muted-foreground">{grant.user.email}</p>
                    <p className="text-muted-foreground">Scopes: {formatScopes(grant.scopes)}</p>
                    <p className="text-muted-foreground">
                      Connected {grant.createdAt.toLocaleString()}
                      {grant.revokedAt
                        ? ` · Revoked ${grant.revokedAt.toLocaleString()}`
                        : isActive
                          ? " · Active"
                          : " · Inactive"}
                    </p>
                  </div>

                  {isActive ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={revokingId === grant.id}
                      onClick={() => void handleRevoke(grant.id)}
                    >
                      {revokingId === grant.id ? "Revoking…" : "Revoke access"}
                    </Button>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
