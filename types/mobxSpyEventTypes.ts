export type MobxSpyEventType = "action" | "scheduled-reaction" | "reaction" | "error" | "update" | "add" | "remove" | "splice" | "delete" | "create" | "report-end";

type PureSpyEvent = {
  type: MobxSpyEventType;
  name?: string;
  object?: unknown;
  arguments?: unknown[];
  message?: string;
  error?: string;
  time?: number;
};

export type MobxSpyEvent = PureSpyEvent & {
  spyReportStart?: true;
};