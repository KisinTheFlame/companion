import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getSettings,
  updateSettings,
  _resetForTest,
} from "./settings-manager.js";

let tempDir: string;
let settingsPath: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "settings-manager-test-"));
  settingsPath = join(tempDir, "settings.json");
  _resetForTest(settingsPath);
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  _resetForTest();
});

describe("settings-manager", () => {
  it("returns defaults when file is missing", () => {
    expect(getSettings()).toEqual({
      claudeCodeOAuthToken: "",
      openaiApiKey: "",
      onboardingCompleted: false,
      publicUrl: "",
      updateChannel: "stable",
      dockerAutoUpdate: false,
      updatedAt: 0,
    });
  });

  it("updates and persists settings", () => {
    const updated = updateSettings({ claudeCodeOAuthToken: "oauth-tok" });
    expect(updated.claudeCodeOAuthToken).toBe("oauth-tok");
    expect(updated.updatedAt).toBeGreaterThan(0);

    const saved = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(saved.claudeCodeOAuthToken).toBe("oauth-tok");
  });

  it("loads existing settings from disk", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        claudeCodeOAuthToken: "existing",
        openaiApiKey: "sk-x",
        updatedAt: 123,
      }),
      "utf-8",
    );

    _resetForTest(settingsPath);

    expect(getSettings()).toEqual({
      claudeCodeOAuthToken: "existing",
      openaiApiKey: "sk-x",
      onboardingCompleted: false,
      publicUrl: "",
      updateChannel: "stable",
      dockerAutoUpdate: false,
      updatedAt: 123,
    });
  });

  it("falls back to defaults for invalid JSON", () => {
    writeFileSync(settingsPath, "not-json", "utf-8");
    _resetForTest(settingsPath);

    expect(getSettings()).toEqual({
      claudeCodeOAuthToken: "",
      openaiApiKey: "",
      onboardingCompleted: false,
      publicUrl: "",
      updateChannel: "stable",
      dockerAutoUpdate: false,
      updatedAt: 0,
    });
  });

  it("normalizes malformed file shape to defaults", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({
        claudeCodeOAuthToken: 123,
        openaiApiKey: null,
        updatedAt: "x",
      }),
      "utf-8",
    );
    _resetForTest(settingsPath);

    expect(getSettings()).toEqual({
      claudeCodeOAuthToken: "",
      openaiApiKey: "",
      onboardingCompleted: false,
      publicUrl: "",
      updateChannel: "stable",
      dockerAutoUpdate: false,
      updatedAt: 0,
    });
  });

  it("ignores undefined patch values and preserves existing values", () => {
    updateSettings({ claudeCodeOAuthToken: "tok-1" });
    const updated = updateSettings({
      claudeCodeOAuthToken: undefined,
      openaiApiKey: "sk-y",
    });

    expect(updated.claudeCodeOAuthToken).toBe("tok-1");
    expect(updated.openaiApiKey).toBe("sk-y");
  });

  it("updates updateChannel to prerelease", () => {
    const updated = updateSettings({ updateChannel: "prerelease" });
    expect(updated.updateChannel).toBe("prerelease");
  });

  it("defaults updateChannel to stable for invalid values", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({ updateChannel: "invalid" }),
      "utf-8",
    );
    _resetForTest(settingsPath);
    expect(getSettings().updateChannel).toBe("stable");
  });

  it("preserves updateChannel when updating other settings", () => {
    updateSettings({ updateChannel: "prerelease" });
    const updated = updateSettings({ openaiApiKey: "sk-z" });
    expect(updated.updateChannel).toBe("prerelease");
  });

  // ─── publicUrl tests ────────────────────────────────────────────────────────

  it("default settings include publicUrl as empty string", () => {
    expect(getSettings().publicUrl).toBe("");
  });

  it("saves publicUrl via updateSettings", () => {
    const updated = updateSettings({ publicUrl: "https://example.com" });
    expect(updated.publicUrl).toBe("https://example.com");

    const saved = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(saved.publicUrl).toBe("https://example.com");
  });

  it("strips trailing slashes from publicUrl", () => {
    const updated = updateSettings({ publicUrl: "https://example.com///" });
    expect(updated.publicUrl).toBe("https://example.com");
  });

  it("normalizes missing publicUrl in raw JSON to empty string", () => {
    writeFileSync(
      settingsPath,
      JSON.stringify({ claudeCodeOAuthToken: "tok" }),
      "utf-8",
    );
    _resetForTest(settingsPath);

    expect(getSettings().publicUrl).toBe("");
  });

  it("preserves publicUrl when updating other settings", () => {
    updateSettings({ publicUrl: "https://example.com" });
    const updated = updateSettings({ openaiApiKey: "sk-x" });
    expect(updated.publicUrl).toBe("https://example.com");
  });
});
