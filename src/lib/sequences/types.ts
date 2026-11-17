import type { L10n } from "../../i18n/ui";

export type ActorKind = "device" | "edge" | "service" | "store" | "external";

export interface Actor {
  id: string;
  name: L10n;
  sub?: L10n;
  kind: ActorKind;
}

export type StepKind = "request" | "response" | "push" | "lost" | "self";

export interface Step {
  from: string;
  to: string;
  kind: StepKind;
  label: string | L10n;
  title: L10n;
  body: L10n;
  payload?: string;
}

export interface Sequence {
  id: string;
  actors: Actor[];
  steps: Step[];
}
