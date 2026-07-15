import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ItemOrcamento, SubItemOrcamento } from "./types";

interface UIState {
  activeView: "dashboard" | "projects" | "project-detail" | "steps" | "supabase" | "levantamentos" | "usuarios" | "fluxo-operacional" | "contratos-ativos";
  fluxoSubView: "dashboard" | "tradicional" | "executivo" | "painel" | "workflow" | "historico";
  fluxoMenuExpanded: boolean;
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
  navigateToUsuarios: () => void;
  navigateToContratosAtivos: () => void;
  navigateToFluxoOperacional: (subView?: "dashboard" | "tradicional" | "executivo" | "painel" | "workflow" | "historico") => void;
  setFluxoSubView: (subView: "dashboard" | "tradicional" | "executivo" | "painel" | "workflow" | "historico") => void;
  setFluxoMenuExpanded: (expanded: boolean) => void;
  setSearchTerm: (term: string) => void;
  setProjectFilter: (filter: "CONSOLIDADO" | "A_FECHAR") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeView: "dashboard",
      fluxoSubView: "dashboard",
      fluxoMenuExpanded: false,
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
      navigateToUsuarios: () => set({ activeView: "usuarios", selectedProjectId: null, selectedObraId: null, searchTerm: "" }),
      navigateToContratosAtivos: () => set({ activeView: "contratos-ativos", selectedProjectId: null, selectedObraId: null, searchTerm: "" }),
      navigateToFluxoOperacional: (subView = "dashboard") => set({ activeView: "fluxo-operacional", fluxoSubView: subView, fluxoMenuExpanded: true, selectedProjectId: null, selectedObraId: null, searchTerm: "" }),
      setFluxoSubView: (subView) => set({ fluxoSubView: subView }),
      setFluxoMenuExpanded: (expanded) => set({ fluxoMenuExpanded: expanded }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setProjectFilter: (filter) => set({ projectFilter: filter }),
    }),
    {
      name: 'ui-storage',
    }
  )
);

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
        const newTotal = updatedSubs.reduce((acc, s) => {
          if (s.unidade === 'Peças') return acc;
          return acc + (Number(s.qtd !== undefined ? s.qtd : 1) * Number(s.valor || 0));
        }, 0);
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
        const newTotal = updatedSubs.reduce((acc, s) => {
          if (s.unidade === 'Peças') return acc;
          return acc + (Number(s.qtd !== undefined ? s.qtd : 1) * Number(s.valor || 0));
        }, 0);
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
        const newTotal = updatedSubs.reduce((acc, s) => {
          if (s.unidade === 'Peças') return acc;
          return acc + (Number(s.qtd !== undefined ? s.qtd : 1) * Number(s.valor || 0));
        }, 0);
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

export interface Usuario {
  id: string;
  nome: string;
  nome_usuario: string;
  email: string;
  nivel: 'ADMIN' | 'GESTOR' | 'OPERADOR' | 'LEITOR' | 'ARQUITETO';
  permissoes: {
    modulos: {
      dashboard: boolean | 'visualizar' | 'editar' | 'nenhum';
      contratosConsolidados: boolean | 'visualizar' | 'editar' | 'nenhum';
      contratosAtivos?: boolean | 'visualizar' | 'editar' | 'nenhum';
      orcamentosAFechar: boolean | 'visualizar' | 'editar' | 'nenhum';
      etapasContrato: boolean | 'visualizar' | 'editar' | 'nenhum';
      levantamentosOrcamentos: boolean | 'visualizar' | 'editar' | 'nenhum';
      usuarios: boolean | 'visualizar' | 'editar' | 'nenhum';
      exportarExcelContratos?: boolean | 'visualizar' | 'editar' | 'nenhum';
      exportarExcelOrcamentos?: boolean | 'visualizar' | 'editar' | 'nenhum';
      fluxoOperacional?: boolean | 'visualizar' | 'editar' | 'nenhum';
      fluxoOperacionalTradicional?: boolean | 'visualizar' | 'editar' | 'nenhum';
      fluxoOperacionalExecutivo?: boolean | 'visualizar' | 'editar' | 'nenhum';
      fluxoOperacionalPainel?: boolean | 'visualizar' | 'editar' | 'nenhum';
      fluxoOperacionalWorkflow?: boolean | 'visualizar' | 'editar' | 'nenhum';
      fluxoOperacionalHistorico?: boolean | 'visualizar' | 'editar' | 'nenhum';
      fluxoOperacionalDashboard?: boolean | 'visualizar' | 'editar' | 'nenhum';
    };
    indicadores: {
      totalContratos: boolean | 'visualizar' | 'editar' | 'nenhum';
      totalVisaoGeral: boolean | 'visualizar' | 'editar' | 'nenhum';
      totalMargem: boolean | 'visualizar' | 'editar' | 'nenhum';
      percentualMedio: boolean | 'visualizar' | 'editar' | 'nenhum';
      totalAdm: boolean | 'visualizar' | 'editar' | 'nenhum';
      kpiProjecao: boolean | 'visualizar' | 'editar' | 'nenhum';
      kpiAdm: boolean | 'visualizar' | 'editar' | 'nenhum';
      graficoCustos: boolean | 'visualizar' | 'editar' | 'nenhum';
    };
    colunas: {
      valorContrato: boolean | 'visualizar' | 'editar' | 'nenhum';
      margemLiquida: boolean | 'visualizar' | 'editar' | 'nenhum';
      custoAdm: boolean | 'visualizar' | 'editar' | 'nenhum';
      valorItens: boolean | 'visualizar' | 'editar' | 'nenhum';
      subestruturas: boolean | 'visualizar' | 'editar' | 'nenhum';
    };
    acoes: {
      visualizar: boolean | 'visualizar' | 'editar' | 'nenhum';
      editar: boolean | 'visualizar' | 'editar' | 'nenhum';
    };
  };
}

interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isChecking: boolean;
  setUser: (user: Usuario | null) => void;
  setToken: (token: string | null) => void;
  login: (token: string, user: Usuario) => void;
  logout: () => void;
  hasPermission: (
    type: 'modulos' | 'indicadores' | 'colunas' | 'acoes',
    key: string,
    action?: 'visualizar' | 'editar'
  ) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem("auth_token"),
  isAuthenticated: false,
  isChecking: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isChecking: false }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
    set({ token });
  },
  login: (token, user) => {
    localStorage.setItem("auth_token", token);
    set({ token, user, isAuthenticated: true, isChecking: false });
  },
  logout: () => {
    localStorage.removeItem("auth_token");
    set({ token: null, user: null, isAuthenticated: false, isChecking: false });
  },
  hasPermission: (type, key, action = 'visualizar') => {
    const { user } = get();
    if (!user) return false;
    if (user.nivel === 'ADMIN') return true; // Admin has all permissions
    
    const category = user.permissoes?.[type] as Record<string, any> | undefined;
    if (!category) return false;
    
    const val = category[key];
    if (val === undefined || val === null || val === false || val === 'nenhum') {
      return false;
    }
    
    if (val === true) {
      if (action === 'editar') {
        const acoes = user.permissoes?.acoes as Record<string, any> | undefined;
        return !!(acoes?.editar === true || acoes?.editar === 'editar');
      }
      return true;
    }
    
    if (action === 'editar') {
      return val === 'editar';
    }
    return val === 'visualizar' || val === 'editar';
  }
}));
