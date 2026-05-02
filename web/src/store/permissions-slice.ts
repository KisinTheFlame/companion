import type { StateCreator } from "zustand";
import type { AppState } from "./index.js";
import type { PermissionRequest } from "../types.js";

export interface PermissionsSlice {
  pendingPermissions: Map<string, Map<string, PermissionRequest>>;

  addPermission: (sessionId: string, perm: PermissionRequest) => void;
  removePermission: (sessionId: string, requestId: string) => void;
}

export const createPermissionsSlice: StateCreator<AppState, [], [], PermissionsSlice> = (set) => ({
  pendingPermissions: new Map(),

  addPermission: (sessionId, perm) =>
    set((s) => {
      const pendingPermissions = new Map(s.pendingPermissions);
      const sessionPerms = new Map(pendingPermissions.get(sessionId) || []);
      sessionPerms.set(perm.request_id, perm);
      pendingPermissions.set(sessionId, sessionPerms);
      return { pendingPermissions };
    }),

  removePermission: (sessionId, requestId) =>
    set((s) => {
      const pendingPermissions = new Map(s.pendingPermissions);
      const sessionPerms = pendingPermissions.get(sessionId);
      if (sessionPerms) {
        const updated = new Map(sessionPerms);
        updated.delete(requestId);
        pendingPermissions.set(sessionId, updated);
      }
      return { pendingPermissions };
    }),
});
