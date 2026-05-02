import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { COMPANION_HOME } from "./paths.js";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

export type UpdateChannel = "stable" | "prerelease";

export interface CompanionSettings {
  anthropicApiKey: string;
  anthropicModel: string;
  /** OAuth token obtained via `claude setup-token` — injected as CLAUDE_CODE_OAUTH_TOKEN */
  claudeCodeOAuthToken: string;
  /** OpenAI API key for Codex — injected as OPENAI_API_KEY */
  openaiApiKey: string;
  /** Whether the onboarding wizard has been completed */
  onboardingCompleted: boolean;
  aiValidationEnabled: boolean;
  aiValidationAutoApprove: boolean;
  aiValidationAutoDeny: boolean;
  publicUrl: string;
  updateChannel: UpdateChannel;
  dockerAutoUpdate: boolean;
  updatedAt: number;
}

const DEFAULT_PATH = join(COMPANION_HOME, "settings.json");

let loaded = false;
let filePath = DEFAULT_PATH;
let settings: CompanionSettings = {
  anthropicApiKey: "",
  anthropicModel: DEFAULT_ANTHROPIC_MODEL,
  claudeCodeOAuthToken: "",
  openaiApiKey: "",
  onboardingCompleted: false,
  aiValidationEnabled: false,
  aiValidationAutoApprove: true,
  aiValidationAutoDeny: false,
  publicUrl: "",
  updateChannel: "stable",
  dockerAutoUpdate: false,
  updatedAt: 0,
};

function normalize(raw: Partial<CompanionSettings> | null | undefined): CompanionSettings {
  return {
    anthropicApiKey: typeof raw?.anthropicApiKey === "string" ? raw.anthropicApiKey : "",
    anthropicModel:
      typeof raw?.anthropicModel === "string" && raw.anthropicModel.trim()
        ? raw.anthropicModel === "claude-sonnet-4.6" ? DEFAULT_ANTHROPIC_MODEL : raw.anthropicModel
        : DEFAULT_ANTHROPIC_MODEL,
    claudeCodeOAuthToken: typeof raw?.claudeCodeOAuthToken === "string" ? raw.claudeCodeOAuthToken : "",
    openaiApiKey: typeof raw?.openaiApiKey === "string" ? raw.openaiApiKey : "",
    onboardingCompleted: typeof raw?.onboardingCompleted === "boolean" ? raw.onboardingCompleted : false,
    aiValidationEnabled: typeof raw?.aiValidationEnabled === "boolean" ? raw.aiValidationEnabled : false,
    aiValidationAutoApprove: typeof raw?.aiValidationAutoApprove === "boolean" ? raw.aiValidationAutoApprove : true,
    aiValidationAutoDeny: typeof raw?.aiValidationAutoDeny === "boolean" ? raw.aiValidationAutoDeny : false,
    publicUrl: typeof raw?.publicUrl === "string" ? raw.publicUrl.trim().replace(/\/+$/, "") : "",
    updateChannel: raw?.updateChannel === "prerelease" ? "prerelease" : "stable",
    dockerAutoUpdate: typeof raw?.dockerAutoUpdate === "boolean" ? raw.dockerAutoUpdate : false,
    updatedAt: typeof raw?.updatedAt === "number" ? raw.updatedAt : 0,
  };
}

function ensureLoaded(): void {
  if (loaded) return;
  try {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, "utf-8");
      settings = normalize(JSON.parse(raw) as Partial<CompanionSettings>);
    }
  } catch {
    settings = normalize(null);
  }
  loaded = true;
}

function persist(): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
}

export function getSettings(): CompanionSettings {
  ensureLoaded();
  return { ...settings };
}

export function updateSettings(
  patch: Partial<Pick<CompanionSettings, "anthropicApiKey" | "anthropicModel" | "claudeCodeOAuthToken" | "openaiApiKey" | "onboardingCompleted" | "aiValidationEnabled" | "aiValidationAutoApprove" | "aiValidationAutoDeny" | "publicUrl" | "updateChannel" | "dockerAutoUpdate">>,
): CompanionSettings {
  ensureLoaded();
  settings = normalize({
    anthropicApiKey: patch.anthropicApiKey ?? settings.anthropicApiKey,
    anthropicModel: patch.anthropicModel ?? settings.anthropicModel,
    claudeCodeOAuthToken: patch.claudeCodeOAuthToken ?? settings.claudeCodeOAuthToken,
    openaiApiKey: patch.openaiApiKey ?? settings.openaiApiKey,
    onboardingCompleted: patch.onboardingCompleted ?? settings.onboardingCompleted,
    aiValidationEnabled: patch.aiValidationEnabled ?? settings.aiValidationEnabled,
    aiValidationAutoApprove: patch.aiValidationAutoApprove ?? settings.aiValidationAutoApprove,
    aiValidationAutoDeny: patch.aiValidationAutoDeny ?? settings.aiValidationAutoDeny,
    publicUrl: patch.publicUrl ?? settings.publicUrl,
    updateChannel: patch.updateChannel ?? settings.updateChannel,
    dockerAutoUpdate: patch.dockerAutoUpdate ?? settings.dockerAutoUpdate,
    updatedAt: Date.now(),
  });
  persist();
  return { ...settings };
}

export function _resetForTest(customPath?: string): void {
  loaded = false;
  filePath = customPath || DEFAULT_PATH;
  settings = normalize(null);
}
