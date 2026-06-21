import { create } from "zustand";
import { ItemOrcamento, SubItemOrcamento } from "./types";

interface UIState {
  activeView: "dashboard" | "projects" | "project-detail" | "steps" | "supabase" | "levantamentos";
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
  navigateToLevantamentos: () => void;
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
  navigateToLevantamentos: () => set({ activeView: "levantamentos", selectedProjectId: null, selectedObraId: null, searchTerm: "" }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setProjectFilter: (filter) => set({ projectFilter: filter }),
}));

interface ItemsState {
  items: ItemOrcamento[];
  setItems: (items: ItemOrcamento[]) => void;
  addSubItem: (itemId: string, subItem: Omit<SubItemOrcamento, "id">) => ItemOrcamento | undefined;
  updateSubItem: (itemId: string, subId: string, subItem: Partial<SubItemOrcamento>) => ItemOrcamento | undefined;
  deleteSubItem: (itemId: string, subId: string) => ItemOrcamento | undefined;
  updateItemValor: (itemId: string, newValor: number) => ItemOrcamento | undefined;
  removeItem: (itemId: string) => void;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  setItems: (items) => set({ items }),
  
  addSubItem: (itemId, subItemPayload) => {
    let updatedItem: ItemOrcamento | undefined;
    set((state) => {
      const newItems = state.items.map(item => {
        if (item.id !== itemId) return item;
        const currentSubs = item.subitens || [];
        const newSub = { id: `sub-${Date.now()}`, ...subItemPayload };
        const updatedSubs = [...currentSubs, newSub];
        const newTotal = updatedSubs.reduce((acc, s) => acc + s.valor, 0);
        updatedItem = { ...item, subitens: updatedSubs, valor: newTotal };
        return updatedItem;
      });
      return { items: newItems };
    });
    return updatedItem;
  },

  updateSubItem: (itemId, subId, payload) => {
    let updatedItem: ItemOrcamento | undefined;
    set((state) => {
      const newItems = state.items.map(item => {
        if (item.id !== itemId) return item;
        const currentSubs = item.subitens || [];
        const updatedSubs = currentSubs.map(s => s.id === subId ? { ...s, ...payload } : s);
        const newTotal = updatedSubs.reduce((acc, s) => acc + s.valor, 0);
        updatedItem = { ...item, subitens: updatedSubs, valor: newTotal };
        return updatedItem;
      });
      return { items: newItems };
    });
    return updatedItem;
  },

  deleteSubItem: (itemId, subId) => {
    let updatedItem: ItemOrcamento | undefined;
    set((state) => {
      const newItems = state.items.map(item => {
        if (item.id !== itemId) return item;
        const currentSubs = item.subitens || [];
        const updatedSubs = currentSubs.filter(s => s.id !== subId);
        const newTotal = updatedSubs.reduce((acc, s) => acc + s.valor, 0);
        updatedItem = { ...item, subitens: updatedSubs, valor: newTotal };
        return updatedItem;
      });
      return { items: newItems };
    });
    return updatedItem;
  },

  updateItemValor: (itemId, newValor) => {
    let updatedItem: ItemOrcamento | undefined;
    set((state) => {
      return {
        items: state.items.map(item => {
          if (item.id === itemId) {
            updatedItem = { ...item, valor: newValor };
            return updatedItem;
          }
          return item;
        })
      };
    });
    return updatedItem;
  },

  removeItem: (itemId) => set((state) => ({
    items: state.items.filter(i => i.id !== itemId)
  })),

  moveItem: (dragIndex, hoverIndex) => set((state) => {
    const newItems = [...state.items];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, removed);
    return { items: newItems };
  }),
}));
