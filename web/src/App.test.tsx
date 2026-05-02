// @vitest-environment jsdom
/**
 * Tests for the root App component.
 *
 * App is the top-level layout. The auth gate has been removed; the app
 * always renders the full chrome (Sidebar, TopBar, routed pages).
 *
 * Coverage targets:
 * - Render test and axe accessibility scan
 * - Home: renders Sidebar, TopBar, HomePage
 * - Session: renders ChatView within session layout
 * - Dark mode class toggling
 * - Playground route renders lazy Playground
 * - Various page routes (settings, environments, etc.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ─── Hoisted mocks (must be before vi.mock calls) ────────────────
const { mockStoreState, mockGetState } = vi.hoisted(() => {
  const mockGetState = vi.fn();
  const mockStoreState: Record<string, unknown> = {
    darkMode: false,
    currentSessionId: null,
    sidebarOpen: false,
    taskPanelOpen: false,
    homeResetKey: 0,
    activeTab: "chat" as string,
    setActiveTab: vi.fn(),
    sessionCreating: false,
    sessionCreatingBackend: null,
    creationProgress: null,
    creationError: null,
    updateOverlayActive: false,
    changedFilesTick: new Map(),
    diffBase: "HEAD",
    setGitChangedFilesCount: vi.fn(),
    sessions: new Map(),
    sdkSessions: [],
    setCurrentSession: vi.fn(),
    setSidebarOpen: vi.fn(),
    setTaskPanelOpen: vi.fn(),
    clearCreation: vi.fn(),
    setUpdateInfo: vi.fn(),
    setDockerUpdateDialogOpen: vi.fn(),
  };
  mockGetState.mockReturnValue(mockStoreState);
  return { mockStoreState, mockGetState };
});

// ─── Module mocks ────────────────────────────────────────────────

vi.mock("./store.js", () => {
  const useStore = Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) => selector(mockStoreState),
    { getState: () => mockGetState() },
  );
  return { useStore };
});

vi.mock("./ws.js", () => ({
  connectSession: vi.fn(),
}));

vi.mock("./api.js", () => ({
  api: {
    getChangedFiles: vi.fn().mockResolvedValue({ files: [] }),
    checkForUpdate: vi.fn().mockResolvedValue(null),
    getSettings: vi.fn().mockResolvedValue({ publicUrl: "" }),
  },
}));

vi.mock("./utils/routing.js", () => ({
  parseHash: vi.fn().mockReturnValue({ page: "home" }),
  navigateToSession: vi.fn(),
  navigateHome: vi.fn(),
}));

// ─── Component mocks ─────────────────────────────────────────────

vi.mock("./components/Sidebar.js", () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock("./components/TopBar.js", () => ({
  TopBar: () => <div data-testid="topbar">TopBar</div>,
}));

vi.mock("./components/HomePage.js", () => ({
  HomePage: () => <div data-testid="home-page">HomePage</div>,
}));

vi.mock("./components/ChatView.js", () => ({
  ChatView: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="chat-view">ChatView:{sessionId}</div>
  ),
}));

vi.mock("./components/TaskPanel.js", () => ({
  TaskPanel: () => <div data-testid="task-panel">TaskPanel</div>,
}));

vi.mock("./components/DiffPanel.js", () => ({
  DiffPanel: () => <div data-testid="diff-panel">DiffPanel</div>,
}));

vi.mock("./components/UpdateBanner.js", () => ({
  UpdateBanner: () => <div data-testid="update-banner">UpdateBanner</div>,
}));

vi.mock("./components/SessionLaunchOverlay.js", () => ({
  SessionLaunchOverlay: () => <div data-testid="session-launch-overlay">SessionLaunchOverlay</div>,
}));

vi.mock("./components/UpdateOverlay.js", () => ({
  UpdateOverlay: ({ active }: { active: boolean }) => (
    <div data-testid="update-overlay" data-active={active}>UpdateOverlay</div>
  ),
}));

vi.mock("./components/DockerUpdateDialog.js", () => ({
  DockerUpdateDialog: () => <div data-testid="docker-update-dialog">DockerUpdateDialog</div>,
}));

vi.mock("./components/OnboardingModal.js", () => ({
  OnboardingModal: () => <div data-testid="onboarding-modal">OnboardingModal</div>,
}));

// Lazy-loaded pages: mock each module so dynamic import() resolves immediately
vi.mock("./components/Playground.js", () => ({
  Playground: () => <div data-testid="playground">Playground</div>,
}));

vi.mock("./components/SettingsPage.js", () => ({
  SettingsPage: () => <div data-testid="settings-page">SettingsPage</div>,
}));

vi.mock("./components/EnvManager.js", () => ({
  EnvManager: () => <div data-testid="env-manager">EnvManager</div>,
}));

vi.mock("./components/SandboxManager.js", () => ({
  SandboxManager: () => <div data-testid="sandbox-manager">SandboxManager</div>,
}));

// ─── Import SUT after mocks ─────────────────────────────────────
import App from "./App.js";
import { parseHash } from "./utils/routing.js";

// ─── Helpers ─────────────────────────────────────────────────────

function setStoreValues(overrides: Record<string, unknown>) {
  Object.assign(mockStoreState, overrides);
  mockGetState.mockReturnValue(mockStoreState);
}

// ─── Setup ───────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mockStoreState, {
    darkMode: false,
    currentSessionId: null,
    sidebarOpen: false,
    taskPanelOpen: false,
    homeResetKey: 0,
    activeTab: "chat",
    setActiveTab: vi.fn(),
    sessionCreating: false,
    sessionCreatingBackend: null,
    creationProgress: null,
    creationError: null,
    updateOverlayActive: false,
    changedFilesTick: new Map(),
    diffBase: "HEAD",
    setGitChangedFilesCount: vi.fn(),
    sessions: new Map(),
    sdkSessions: [],
    setCurrentSession: vi.fn(),
    setSidebarOpen: vi.fn(),
    setTaskPanelOpen: vi.fn(),
    clearCreation: vi.fn(),
    setUpdateInfo: vi.fn(),
    setDockerUpdateDialogOpen: vi.fn(),
  });
  mockGetState.mockReturnValue(mockStoreState);
  (parseHash as ReturnType<typeof vi.fn>).mockReturnValue({ page: "home" });
  window.location.hash = "";
  localStorage.removeItem("companion_docker_prompt_pending");
});

// ─── Tests ───────────────────────────────────────────────────────

describe("App", () => {
  describe("layout", () => {
    it("renders Sidebar, TopBar, UpdateBanner, and HomePage on the home route with no session", () => {
      render(<App />);

      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("topbar")).toBeInTheDocument();
      expect(screen.getByTestId("update-banner")).toBeInTheDocument();
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
      expect(screen.getByTestId("update-overlay")).toBeInTheDocument();
    });

    it("renders ChatView when a session is active", () => {
      (parseHash as ReturnType<typeof vi.fn>).mockReturnValue({ page: "session", sessionId: "s1" });
      setStoreValues({ currentSessionId: "s1" });
      render(<App />);

      expect(screen.getByTestId("chat-view")).toBeInTheDocument();
      expect(screen.getByText("ChatView:s1")).toBeInTheDocument();
    });

    it("renders DiffPanel when activeTab is diff", () => {
      (parseHash as ReturnType<typeof vi.fn>).mockReturnValue({ page: "session", sessionId: "s1" });
      setStoreValues({ currentSessionId: "s1", activeTab: "diff" });
      render(<App />);

      expect(screen.getByTestId("diff-panel")).toBeInTheDocument();
    });

    it("renders TaskPanel when session active and taskPanelOpen", () => {
      (parseHash as ReturnType<typeof vi.fn>).mockReturnValue({ page: "session", sessionId: "s1" });
      setStoreValues({ currentSessionId: "s1", taskPanelOpen: true });
      render(<App />);

      expect(screen.getByTestId("task-panel")).toBeInTheDocument();
    });

    it("renders SessionLaunchOverlay during session creation", () => {
      setStoreValues({
        sessionCreating: true,
        creationProgress: [{ label: "Starting...", status: "done" }],
        creationError: null,
      });
      render(<App />);

      expect(screen.getByTestId("session-launch-overlay")).toBeInTheDocument();
    });
  });

  describe("route-level pages", () => {
    it("renders SettingsPage for settings route", async () => {
      (parseHash as ReturnType<typeof vi.fn>).mockReturnValue({ page: "settings" });
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId("settings-page")).toBeInTheDocument();
      });
    });

    it("renders EnvManager for environments route", async () => {
      (parseHash as ReturnType<typeof vi.fn>).mockReturnValue({ page: "environments" });
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId("env-manager")).toBeInTheDocument();
      });
    });

    it("renders Playground for playground route", async () => {
      (parseHash as ReturnType<typeof vi.fn>).mockReturnValue({ page: "playground" });
      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId("playground")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("topbar")).not.toBeInTheDocument();
    });
  });

  describe("docker update dialog activation", () => {
    it("opens DockerUpdateDialog and clears localStorage when companion_docker_prompt_pending is set", () => {
      localStorage.setItem("companion_docker_prompt_pending", "1");
      render(<App />);

      expect(mockStoreState.setDockerUpdateDialogOpen).toHaveBeenCalledWith(true);
      expect(localStorage.getItem("companion_docker_prompt_pending")).toBeNull();
    });

    it("does not open DockerUpdateDialog on normal page load", () => {
      render(<App />);
      expect(mockStoreState.setDockerUpdateDialogOpen).not.toHaveBeenCalled();
    });
  });

  describe("dark mode", () => {
    it("toggles dark class on document element based on darkMode state", () => {
      setStoreValues({ darkMode: true });
      render(<App />);
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      document.documentElement.classList.remove("dark");
    });
  });

  describe("accessibility", () => {
    it("passes axe accessibility checks on the home page", async () => {
      const { axe } = await import("vitest-axe");
      const { container } = render(<App />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
