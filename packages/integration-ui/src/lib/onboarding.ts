import { graphql } from "@gaegaeting/ui-common";
import type { RouteKey } from "../components/Shell.js";

export type OnboardingStep = "profile" | "pet" | "ready";

export async function loadOnboarding(
  endpoint: string,
  token: string,
): Promise<OnboardingStep> {
  const data = await graphql<{
    myProfile: { id: string } | null;
    pets: { id: number }[];
  }>(endpoint, "query Onboarding { myProfile { id } pets { id } }", {}, token);
  if (!data.myProfile) return "profile";
  return data.pets.length ? "ready" : "pet";
}

export function onboardingRoute(
  requested: RouteKey,
  connected: boolean,
  step?: OnboardingStep,
): RouteKey {
  if (requested === "storyboard") return requested;
  if (!connected) return requested === "signup" ? "signup" : "login";
  if (step === "ready")
    return requested === "signup" || requested === "login"
      ? "recommendations"
      : requested;
  if (step === "pet" && requested === "profile") return "profile";
  return step === "pet" ? "pet" : "profile";
}
