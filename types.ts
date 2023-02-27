import { EventHandleError, ScenarioHandleError } from "./Errors";

type InstructionPrototype = "login" | "logout";

type ParamType = "number" | "string" | "object" | "array";

type InstructionPublicFields = {
  id: string;
  prototype?: InstructionPrototype;
  parametersDescription?: {[key: string]: ParamType};
  description?: string;
}

export type Instruction = InstructionPublicFields & {
  handler: (...args: any[]) => any;
};

export type InstructionsTable = {[key: string]: Instruction};

export type SpecialInstructionId = "condition" | "delay" | "forwardData";

export type SpecialInstructionsTable = {[id in SpecialInstructionId]: Instruction};

export type RemoteEvent = {
  id: string;
  eventType: "default" | "special";
  instructionId: string | SpecialInstructionId;
  args?: any[];
};

export type OnEventUsersCustomCallback = (event: RemoteEvent) => void;

export type ClientType = "CLIENT" | "ADMIN_PANEL";

export type ConnectionInfoPacket = {
  apiKey: string; 
  clientType: ClientType;
  availableInstructions: InstructionPublicFields[];
  specialInstructions: InstructionPublicFields[];
};

export type EventLog = {
  event: RemoteEvent;
  ok: boolean;
  result?: any;
  error?: EventHandleError;
  startTimestamp?: number;
  endTimestamp?: number;
  elapsedTime?: number;
};

export type RemoteScenario = {
  id: string;
  events: RemoteEvent[];
};

export type ScenarioLog = {
  scenario: RemoteScenario;
  ok: boolean;
  error?: ScenarioHandleError;
  startTimestamp?: number;
  endTimestamp?: number;
  elapsedTime?: number;
};

export type EventListenersTable = {[key: string]: (event: RemoteEvent) => any};