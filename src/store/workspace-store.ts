import { create } from "zustand";

type WorkspaceState = {
  workspaceId: string | null;
  slug: string | null;
  staffMode: boolean;
  setWorkspace: (workspaceId: string | null, slug: string | null) => void;
  setStaffMode: (staffMode: boolean) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaceId: null,
  slug: null,
  staffMode: false,
  setWorkspace: (workspaceId, slug) => set({ workspaceId, slug }),
  setStaffMode: (staffMode) => set({ staffMode }),
}));
