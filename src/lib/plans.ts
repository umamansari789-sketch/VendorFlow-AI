import type { PlanId } from "./types";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number | null;
  vendors: string;
  highlight?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 49,
    vendors: "50 vendors",
    features: ["Document storage", "Expiry alerts", "Basic vendor portal"],
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 149,
    vendors: "300 vendors",
    highlight: true,
    features: [
      "AI document extraction",
      "Automated follow-ups",
      "Gap resolution workflow",
      "Multiple users",
    ],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 399,
    vendors: "1,000 vendors",
    features: ["Multiple locations", "Advanced analytics", "Custom workflows", "API access"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: null,
    vendors: "Custom",
    features: ["SSO", "Advanced access controls", "Audit exports", "Custom integrations", "Dedicated support"],
  },
];
