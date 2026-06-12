import { create } from "zustand";

interface UIState {
  activeView: "dashboard" | "projects" | "project-detail" | "steps" | "supabase";
  projectFilter: "CONSOLIDADO" | "A_FECHAR";
  selectedProjectId: String | null;
  selectedObraId: String | null;
  searchTerm: string;
  navigateToDashboard: () => void;
  navigateToProjects: (filter?: "CONSOLIDADO" | "A_FECHAR") => void;
  navigateToProject: (id: string) => void;
  navigateToObra: (id: string) => void;
  navigateToSteps: (id?: string) => void;
  navigateToSupabase: () => void;
  setSearchTerm: (term: string) => void;
  setProjectFilter: (filter: "CONSOLIDADO" | "A_FECHAR") => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: "dashboard",
  projectFilter: "CONSOLIDADO",
  selectedProjectId: null,
  selectedObraId: null,
  searchTerm: "",
  navigateToDashboard: () => set({ activeView: "dashboard", selectedProjectId: null, selectedObraId: null, searchTerm: "" }),
  navigateToProjects: (filter = "CONSOLIDADO") => set({ activeView: "projects", projectFilter: filter, selectedProjectId: null, selectedObraId: null, searchTerm: "" }),
  navigateToProject: (id) => set({ activeView: "project-detail", selectedProjectId: id, selectedObraId: id, searchTerm: "" }),
  navigateToObra: (id) => set({ activeView: "project-detail", selectedProjectId: id, selectedObraId: id, searchTerm: "" }),
  navigateToSteps: (id) => set({ activeView: "steps", selectedProjectId: id || null, selectedObraId: id || null, searchTerm: "" }),
  navigateToSupabase: () => set({ activeView: "supabase", selectedProjectId: null, selectedObraId: null, searchTerm: "" }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setProjectFilter: (filter) => set({ projectFilter: filter }),
}));
