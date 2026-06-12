export const DEFAULT_ICP_PROFILE_ID = "default";

export const DEFAULT_ICP_PROFILE = {
  id: DEFAULT_ICP_PROFILE_ID,
  productDescription:
    "B2B AI logistics automation company offering AI-driven logistics, dispatch automation, warehouse optimization, and freight brokerage workflows.",
  targetIndustries: [
    "logistics",
    "freight brokerage",
    "3PL",
    "fulfillment",
    "transportation operator",
  ],
  idealEmployeeMin: 5,
  idealEmployeeMax: 60,
  scoringGuidelines: `Analyze ONLY based on:
- Company industry (must be logistics, freight brokerage, 3PL, fulfillment, or transportation operator)
- Employee size (ideal: 5–60 employees = SMB sweet spot)
- Revenue vs team imbalance (high revenue with low staff = strong ICP signal)
- Operational complexity (dispatching, warehousing, freight coordination, carrier management)
- Manual workflow intensity (high manual communication = strong ICP)
- Tech maturity (too advanced SaaS/TMS-heavy companies = lower ICP)
- Whether logistics is core business (not manufacturing, consulting, or associations)

Scoring System (0–10 ICP Fit Score):
- 9.0–10 = GOLD ICP (prioritize outreach immediately)
- 7.5–8.9 = STRONG ICP (good target, validate manually)
- 6.0–7.4 = MIXED ICP (secondary targeting)
- Below 6.0 = NOT ICP (exclude)

Be strict, not optimistic. Do NOT treat "logistics keywords" as ICP proof.
Only include companies that show real operational friction where AI automation would directly reduce manual coordination workload.`,
  exclusionGuidelines: `Ignore companies that are primarily:
- manufacturing
- consulting
- associations / nonprofits
- holding companies

Focus ONLY on operational logistics companies with real freight movement or fulfillment workflows.
Prioritize SMBs with lean teams and operational chaos.`,
  scoreThresholds: {
    gold: 9,
    strong: 7.5,
    mixed: 6,
  },
} as const;

export type IcpScoreThresholds = {
  gold: number;
  strong: number;
  mixed: number;
};
