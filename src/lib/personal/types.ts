export interface Meeting {
  id: string;
  title: string;
  start: string;
  attendees: string[];
  description: string;
  source: "sample" | "manual" | "google";
}

export interface HelperConfig {
  name: string;
  taskId: string;
  goal: string;
  instructions: string;
  companyContext: string;
  sections: ("agenda" | "questions" | "checklist")[];
  source: Meeting["source"];
  meeting: Meeting;
  notes: string;
  flow?: FlowConfig;
}

export interface FlowConfig {
  trigger: { app: string; event: string };
  action: { app: string; action: string };
  checkpoint: string;
}

export interface MeetingBrief {
  summary: string;
  agenda: string[];
  questions: string[];
  checklist: string[];
  unknowns: string[];
}

export interface HelperRun {
  id: string;
  createdAt: string;
  meetingTitle: string;
  source: Meeting["source"];
  mode: "template" | "ai";
  brief: MeetingBrief;
  feedback?: "useful" | "needs-work";
  minutesSaved?: number;
}

export interface PersonalHelper {
  id: string;
  interviewId: string;
  kind: "skill";
  config: HelperConfig;
  createdAt: string;
  updatedAt: string;
  runs: HelperRun[];
}

export interface HelperDraft {
  helperId?: string;
  step: number;
  config: HelperConfig;
  testedFingerprint?: string;
  lastRun?: HelperRun;
}

export interface CalendarStatus {
  configured: boolean;
  connected: boolean;
  aiConfigured: boolean;
  redirectUri: string;
}
