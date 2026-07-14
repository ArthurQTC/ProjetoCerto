import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Lock, 
  Mail, 
  Trash2, 
  Edit2, 
  User, 
  Check, 
  AlertTriangle,
  X,
  Eye,
  Key,
  FolderOpen,
  Shuffle,
  Calculator
} from "lucide-react";
import { useAuthStore, Usuario } from "../store";

const ROLES = [
  { value: "ADMIN", label: "Administrador", desc: "Acesso total irrestrito ao sistema." },
  { value: "GESTOR", label: "Gestor", desc: "Gerencia contratos, levantamentos e visualiza todos os indicadores." },
  { value: "OPERADOR", label: "Operador", desc: "Acesso operacional para criar e editar levantamentos e orçamentos." },
  { value: "LEITOR", label: "Leitor", desc: "Acesso exclusivo de leitura aos módulos selecionados." },
  { value: "ARQUITETO", label: "Arquiteto", desc: "Acesso focado em visualização e edição de Levantamentos/Orçamentos." }
];

const MODULE_OPTIONS = [
  { key: "dashboard", label: "Dashboard", tooltip: "Visualização dos painéis financeiros e operacionais (Leitura para gráficos, Edição para alterar metas se aplicável)." },
  { key: "contratosConsolidados", label: "Contratos Consolidados", tooltip: "Acesso à lista e detalhes de Obras ativas. Edição permite alterar, adicionar e remover itens e documentos do contrato." },
  { key: "orcamentosAFechar", label: "Orçamentos a Fechar", tooltip: "Acesso aos orçamentos pendentes. Edição permite alterar, excluir itens e documentos dentro de orçamentos." },
  { key: "etapasContrato", label: "Etapas do Contrato", tooltip: "Gestão do cronograma e macro-etapas. Edição permite criar e modificar etapas." },
  { key: "levantamentosOrcamentos", label: "Levantamentos/Orçamentos", tooltip: "Controle de levantamentos. Edição permite criar, editar e excluir levantamentos e alterar status." },
  { key: "fluxoOperacional", label: "Fluxo Operacional - Geral", tooltip: "Módulo pai do Fluxo Operacional." },
  { key: "fluxoOperacionalTradicional", label: "Fluxo Op. - Fluxograma Tradicional", tooltip: "Permite visualizar ou interagir com o Fluxograma Tradicional." },
  { key: "fluxoOperacionalExecutivo", label: "Fluxo Op. - Fluxograma Executivo", tooltip: "Permite visualizar ou editar o Fluxograma Executivo." },
  { key: "fluxoOperacionalPainel", label: "Fluxo Op. - Painel Operacional", tooltip: "Permite visualizar ou editar o Painel Operacional (Kanban)." },
  { key: "fluxoOperacionalWorkflow", label: "Fluxo Op. - Workflow", tooltip: "Permite gerenciar movimentações e listas de contratos no Workflow." },
  { key: "fluxoOperacionalHistorico", label: "Fluxo Op. - Histórico de Movimentações", tooltip: "Permite visualizar o histórico completo de movimentações de contratos." },
  { key: "fluxoOperacionalDashboard", label: "Fluxo Op. - Dashboard Operacional", tooltip: "Permite visualizar os indicadores e gráficos operacionais." },
  { key: "usuarios", label: "Gestão de Usuários", tooltip: "Acesso à tela de usuários. Edição permite criar e configurar permissões." }
];

const INDICATOR_OPTIONS = [
  { key: "totalContratos", label: "Faturamento Total (Contratos)", tooltip: "Exibir o card de Faturamento Total no Dashboard." },
  { key: "totalVisaoGeral", label: "Custo Total (Visão Geral)", tooltip: "Exibir o card de Custo Total Projetado." },
  { key: "totalMargem", label: "Margem Líquida Total", tooltip: "Exibir o card de Margem Líquida (R$ e %)." },
  { key: "percentualMedio", label: "% Médio de Margem", tooltip: "Exibir o percentual médio dos contratos." },
  { key: "totalAdm", label: "Despesa Adm Acumulada", tooltip: "Exibir a despesa administrativa total calculada." },
  { key: "kpiProjecao", label: "KPI de Projeção", tooltip: "Exibir as barras de progresso (metas)." },
  { key: "kpiAdm", label: "KPI de Administrativo", tooltip: "Exibir o medidor de despesas em relação ao faturamento." },
  { key: "graficoCustos", label: "Gráfico de Custos", tooltip: "Exibir o gráfico de composição (Materiais, MDO, Adm)." }
];

const COLUMN_OPTIONS = [
  { key: "valorContrato", label: "Valor do Contrato (Obras)", tooltip: "Ver (visualizar) ou alterar (editar) os valores fechados do contrato." },
  { key: "margemLiquida", label: "Margem Líquida", tooltip: "Ver (visualizar) a margem líquida da obra." },
  { key: "custoAdm", label: "Custo Adm Unitário (Obras)", tooltip: "Ver (visualizar) ou alterar (editar) o custo administrativo na edição de obra." },
  { key: "valorItens", label: "Valor Unitário de Itens/Subitens", tooltip: "Ver (visualizar) ou alterar (editar) o valor unitário das composições (R$). Se removido, mascara valores." },
  { key: "subestruturas", label: "Subestruturas & Valores", tooltip: "Controla a visualização e edição da expansão de subestruturas e cálculo de m² (HD e PC)." }
];

const ACTION_OPTIONS = [
  { key: "visualizar", label: "Visualização Completa", tooltip: "Permissão base para ler e exibir os dados nas telas em que possui acesso." },
  { key: "editar", label: "Criação / Edição de Dados", tooltip: "Permissão global para interagir com botões de Salvar, Excluir, Adicionar e Editar onde possuir acesso aos módulos." }
];

const DEFAULT_PERMISSIONS = {
  modulos: {
    dashboard: "editar",
    contratosConsolidados: "editar",
    orcamentosAFechar: "editar",
    etapasContrato: "nenhum",
    levantamentosOrcamentos: "editar",
    usuarios: "nenhum",
    fluxoOperacional: "editar",
    fluxoOperacionalTradicional: "editar",
    fluxoOperacionalExecutivo: "editar",
    fluxoOperacionalPainel: "editar",
    fluxoOperacionalWorkflow: "editar",
    fluxoOperacionalHistorico: "editar",
    fluxoOperacionalDashboard: "editar"
  },
  indicadores: {
    totalContratos: "visualizar",
    totalVisaoGeral: "visualizar",
    totalMargem: "visualizar",
    percentualMedio: "visualizar",
    totalAdm: "nenhum",
    kpiProjecao: "visualizar",
    kpiAdm: "nenhum",
    graficoCustos: "visualizar"
  },
  colunas: {
    valorContrato: "visualizar",
    margemLiquida: "visualizar",
    custoAdm: "nenhum",
    valorItens: "editar",
    subestruturas: "editar"
  },
  acoes: {
    visualizar: "visualizar",
    editar: "editar"
  }
};

const PERMISSION_HIERARCHY = [
  {
    id: "comercial",
    name: "Módulo Comercial & Engenharia de Obras",
    description: "Gestão integrada de propostas, quantitativos e cronogramas físicos.",
    icon: "FolderOpen",
    groups: [
      {
        name: "Gestão de Projetos e Obras",
        description: "Lista de contratos de obras ativas e documentos vinculados",
        tools: [
          { key: "contratosConsolidados", category: "modulos", label: "Contratos Consolidados", tooltip: "Acesso à lista e detalhes de Obras ativas. Edição permite alterar, adicionar e remover itens e documentos do contrato." },
          { key: "orcamentosAFechar", category: "modulos", label: "Orçamentos a Fechar", tooltip: "Acesso aos orçamentos pendentes. Edição permite alterar, excluir itens e documentos dentro de orçamentos." }
        ]
      },
      {
        name: "Orçamentação e Cronograma",
        description: "Levantamento de materiais, composições e definição de cronograma",
        tools: [
          { key: "levantamentosOrcamentos", category: "modulos", label: "Levantamentos / Orçamentos", tooltip: "Controle de levantamentos. Edição permite criar, editar e excluir levantamentos e alterar status." },
          { key: "etapasContrato", category: "modulos", label: "Etapas do Contrato (Cronograma)", tooltip: "Gestão do cronograma e macro-etapas. Edição permite criar e modificar etapas." }
        ]
      }
    ]
  },
  {
    id: "operacional",
    name: "Módulo Workflow & Fluxo Operacional",
    description: "Gestão de pipeline de obras, diagramas operacionais e BPMN interativo.",
    icon: "Shuffle",
    groups: [
      {
        name: "Monitores Visuais",
        description: "Pipelines e diagramas visuais e interativos de acompanhamento",
        tools: [
          { key: "fluxoOperacionalPainel", category: "modulos", label: "Painel Operacional (Kanban)", tooltip: "Permite visualizar ou editar o Painel Operacional (Kanban)." },
          { key: "fluxoOperacionalTradicional", category: "modulos", label: "Fluxograma Tradicional (BPMN)", tooltip: "Permite visualizar ou interagir com o Fluxograma Tradicional." },
          { key: "fluxoOperacionalExecutivo", category: "modulos", label: "Fluxograma Executivo (Reduzido)", tooltip: "Permite visualizar ou editar o Fluxograma Executivo." }
        ]
      },
      {
        name: "Coordenação & Auditoria",
        description: "Log de histórico e movimentações no fluxo",
        tools: [
          { key: "fluxoOperacionalWorkflow", category: "modulos", label: "Mesa de Workflow", tooltip: "Permite gerenciar movimentações e listas de contratos no Workflow." },
          { key: "fluxoOperacionalHistorico", category: "modulos", label: "Histórico de Movimentações (Logs)", tooltip: "Permite visualizar o histórico completo de movimentações de contratos." }
        ]
      },
      {
        name: "Geral & Configurações de Fluxo",
        description: "Módulos pai e inteligência integrada do fluxo operacional",
        tools: [
          { key: "fluxoOperacional", category: "modulos", label: "Fluxo Operacional - Geral", tooltip: "Módulo pai do Fluxo Operacional." },
          { key: "fluxoOperacionalDashboard", category: "modulos", label: "Dashboard Operacional (KPIs)", tooltip: "Permite visualizar os indicadores e gráficos operacionais." }
        ]
      }
    ]
  },
  {
    id: "bi",
    name: "Módulo Inteligência Estratégica & BI",
    description: "Relatórios analíticos, gráficos de rateio e indicadores gerenciais.",
    icon: "Calculator",
    groups: [
      {
        name: "Indicadores de Cartões (Top Cards)",
        description: "Visualização individual das métricas do Dashboard",
        tools: [
          { key: "totalContratos", category: "indicadores", label: "Faturamento Total (Contratos)", tooltip: "Exibir o card de Faturamento Total no Dashboard." },
          { key: "totalVisaoGeral", category: "indicadores", label: "Custo Total (Visão Geral)", tooltip: "Exibir o card de Custo Total Projetado." },
          { key: "totalMargem", category: "indicadores", label: "Margem Líquida Total (R$ e %)", tooltip: "Exibir o card de Margem Líquida." },
          { key: "percentualMedio", category: "indicadores", label: "% Médio de Margem", tooltip: "Exibir o percentual médio dos contratos." },
          { key: "totalAdm", category: "indicadores", label: "Despesa Adm Acumulada", tooltip: "Exibir a despesa administrativa total calculada." }
        ]
      },
      {
        name: "KPIs e Metas",
        description: "Velocímetros e barras de progresso comparativas",
        tools: [
          { key: "kpiProjecao", category: "indicadores", label: "KPI de Projeção (Barra de Metas)", tooltip: "Exibir as barras de progresso (metas)." },
          { key: "kpiAdm", category: "indicadores", label: "KPI de Administrativo (Medidor)", tooltip: "Exibir o medidor de despesas em relação ao faturamento." }
        ]
      },
      {
        name: "Gráficos de rateio",
        description: "Gráficos de rateio e pizza do Dashboard",
        tools: [
          { key: "graficoCustos", category: "indicadores", label: "Gráfico de Composição de Custos", tooltip: "Exibir o gráfico de composição (Materiais, MDO, Adm)." }
        ]
      }
    ]
  },
  {
    id: "seguranca",
    name: "Módulo Segurança, Colunas Críticas & Operações",
    description: "Restrição de acesso a dados confidenciais e privilégios administrativos.",
    icon: "Lock",
    groups: [
      {
        name: "Colunas Críticas (Restrição Financeira)",
        description: "Exibição de valores, custos e margens confidenciais em tabelas",
        tools: [
          { key: "valorContrato", category: "colunas", label: "Valores Fechados do Contrato (Obras)", tooltip: "Ver (visualizar) ou alterar (editar) os valores fechados do contrato." },
          { key: "margemLiquida", category: "colunas", label: "Margem Líquida da Obra", tooltip: "Ver (visualizar) a margem líquida da obra." },
          { key: "custoAdm", category: "colunas", label: "Custo Adm Unitário (Obras)", tooltip: "Ver (visualizar) ou alterar (editar) o custo administrativo na edição de obra." },
          { key: "valorItens", category: "colunas", label: "Valor de Itens/Subitens (Planilhas)", tooltip: "Ver (visualizar) ou alterar (editar) o valor unitário das composições (R$). Se removido, mascara valores." },
          { key: "subestruturas", category: "colunas", label: "Subestruturas & Cálculo de m²", tooltip: "Controla a visualização e edição da expansão de subestruturas e cálculo de m² (HD e PC)." }
        ]
      },
      {
        name: "Operações Globais & Administração",
        description: "Privilégios de modificações de dados e controle de usuários",
        tools: [
          { key: "usuarios", category: "modulos", label: "Gestão de Usuários e Permissões", tooltip: "Acesso à tela de usuários. Edição permite criar e configurar permissões." },
          { key: "visualizar", category: "acoes", label: "Visualização Completa (Global)", tooltip: "Permissão base para ler e exibir os dados nas telas em que possui acesso." },
          { key: "editar", category: "acoes", label: "Criação / Edição de Dados (Global)", tooltip: "Permissão geral para interagir com botões de Salvar, Excluir, Adicionar e Editar onde possuir acesso aos módulos." }
        ]
      }
    ]
  }
];

export default function UsuariosView() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
  const [nome, setNome] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nivel, setNivel] = useState<Usuario['nivel']>("OPERADOR");
  const [permissoes, setPermissoes] = useState<Usuario["permissoes"]>(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));

  // Fetch users query
  const { data: users = [], isLoading, error } = useQuery<Usuario[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/usuarios");
      if (!res.ok) {
        throw new Error("Erro ao carregar lista de usuários.");
      }
      return res.json();
    },
    enabled: currentUser?.nivel === "ADMIN"
  });

  const resetForm = () => {
    setNome("");
    setNomeUsuario("");
    setEmail("");
    setSenha("");
    setNivel("OPERADOR");
    setPermissoes(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
    setErrorMsg("");
    setEditingUser(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (user: Usuario) => {
    setEditingUser(user);
    setNome(user.nome);
    setNomeUsuario(user.nome_usuario || "");
    setEmail(user.email);
    setSenha("");
    setNivel(user.nivel);
    setPermissoes(JSON.parse(JSON.stringify(user.permissoes || DEFAULT_PERMISSIONS)));
    setErrorMsg("");
    setModalOpen(true);
  };

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar usuário.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSuccessMsg("Usuário criado com sucesso!");
      setModalOpen(false);
      resetForm();
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    }
  });

  // Edit User Mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar usuário.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSuccessMsg("Usuário atualizado com sucesso!");
      setModalOpen(false);
      resetForm();
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    }
  });

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir usuário.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSuccessMsg("Usuário excluído com sucesso!");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza de que deseja remover o usuário "${name}"?`)) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nome.trim() || !nomeUsuario.trim() || !email.trim() || (!editingUser && !senha)) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios, incluindo nome de usuário.");
      return;
    }

    const payload = {
      nome: nome.trim(),
      nome_usuario: nomeUsuario.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      senha: senha || undefined,
      nivel,
      permissoes
    };

    if (editingUser) {
      editUserMutation.mutate({ id: editingUser.id, payload });
    } else {
      createUserMutation.mutate(payload);
    }
  };

  const setPermissionValue = (
    type: keyof Usuario["permissoes"], 
    key: string, 
    value: 'visualizar' | 'editar' | 'nenhum'
  ) => {
    setPermissoes(prev => {
      const copy = { ...prev };
      if (!copy[type]) {
        (copy as any)[type] = {};
      }
      (copy[type] as any)[key] = value;
      return copy;
    });
  };

  const setModulePermissions = (moduleId: string, value: 'editar' | 'visualizar' | 'nenhum') => {
    const mod = PERMISSION_HIERARCHY.find(m => m.id === moduleId);
    if (!mod) return;
    setPermissoes(prev => {
      const copy = JSON.parse(JSON.stringify(prev || DEFAULT_PERMISSIONS));
      mod.groups.forEach(group => {
        group.tools.forEach(tool => {
          if (!copy[tool.category]) {
            copy[tool.category] = {};
          }
          copy[tool.category][tool.key] = value;
        });
      });
      return copy;
    });
  };

  const renderPermissionSelector = (
    category: keyof Usuario["permissoes"], 
    key: string, 
    label: string,
    tooltip?: string
  ) => {
    const valueRaw = permissoes[category]?.[key as any];
    let currentVal: 'visualizar' | 'editar' | 'nenhum' = 'nenhum';
    if (valueRaw === true) {
      currentVal = (category === 'modulos' || category === 'colunas' || category === 'indicadores') ? 'editar' : 'visualizar';
    } else if (valueRaw === false || valueRaw === undefined) {
      currentVal = 'nenhum';
    } else {
      currentVal = valueRaw as 'visualizar' | 'editar' | 'nenhum';
    }

    return (
      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-100 hover:border-slate-200/80 transition-all shadow-2xs" title={tooltip}>
        <div className="flex items-center gap-1.5 cursor-help">
          <span className="text-[11px] font-bold text-slate-700">{label}</span>
          {tooltip && <div className="w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 text-[8px] flex items-center justify-center font-bold font-mono group relative">?<div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-slate-800 text-white text-[9px] p-2 rounded shadow-xl font-sans text-center whitespace-normal z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity before:content-[''] before:absolute before:-bottom-1 before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-800">{tooltip}</div></div>}
        </div>
        
        <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/60 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setPermissionValue(category, key, 'nenhum')}
            className={`flex-1 sm:flex-initial px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${
              currentVal === 'nenhum' 
                ? "bg-white text-slate-800 shadow-xs border border-slate-200/30" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Nenhum
          </button>
          <button
            type="button"
            onClick={() => setPermissionValue(category, key, 'visualizar')}
            className={`flex-1 sm:flex-initial px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${
              currentVal === 'visualizar' 
                ? "bg-amber-100 text-amber-800 shadow-xs border border-amber-200/20" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Visualizar
          </button>
          <button
            type="button"
            onClick={() => setPermissionValue(category, key, 'editar')}
            className={`flex-1 sm:flex-initial px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer ${
              currentVal === 'editar' 
                ? "bg-brand-primary text-white shadow-xs font-black" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Editar
          </button>
        </div>
      </div>
    );
  };

  // Preset quick config by level
  const applyRolePreset = (role: Usuario["nivel"]) => {
    setNivel(role);
    const updated = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
    
    if (role === "ADMIN") {
      Object.keys(updated).forEach(cat => {
        Object.keys(updated[cat as keyof typeof DEFAULT_PERMISSIONS]).forEach(k => {
          (updated[cat as keyof typeof DEFAULT_PERMISSIONS] as any)[k] = 'editar';
        });
      });
    } else if (role === "GESTOR") {
      updated.modulos.dashboard = 'editar';
      updated.modulos.contratosConsolidados = 'editar';
      updated.modulos.orcamentosAFechar = 'editar';
      updated.modulos.etapasContrato = 'editar';
      updated.modulos.levantamentosOrcamentos = 'editar';
      updated.modulos.usuarios = 'nenhum';
      updated.modulos.fluxoOperacional = 'editar';
      updated.modulos.fluxoOperacionalTradicional = 'editar';
      updated.modulos.fluxoOperacionalExecutivo = 'editar';
      updated.modulos.fluxoOperacionalPainel = 'editar';
      updated.modulos.fluxoOperacionalWorkflow = 'editar';
      updated.modulos.fluxoOperacionalHistorico = 'editar';
      updated.modulos.fluxoOperacionalDashboard = 'editar';

      updated.indicadores.totalContratos = 'visualizar';
      updated.indicadores.totalVisaoGeral = 'visualizar';
      updated.indicadores.totalMargem = 'visualizar';
      updated.indicadores.percentualMedio = 'visualizar';
      updated.indicadores.totalAdm = 'visualizar';
      updated.indicadores.kpiProjecao = 'visualizar';
      updated.indicadores.kpiAdm = 'visualizar';
      updated.indicadores.graficoCustos = 'visualizar';

      updated.colunas.valorContrato = 'visualizar';
      updated.colunas.margemLiquida = 'visualizar';
      updated.colunas.custoAdm = 'editar';
      updated.colunas.valorItens = 'editar';
      updated.colunas.subestruturas = 'editar';

      updated.acoes.visualizar = 'visualizar';
      updated.acoes.editar = 'editar';
    } else if (role === "OPERADOR") {
      updated.modulos.dashboard = 'visualizar';
      updated.modulos.contratosConsolidados = 'nenhum';
      updated.modulos.orcamentosAFechar = 'editar';
      updated.modulos.etapasContrato = 'nenhum';
      updated.modulos.levantamentosOrcamentos = 'editar';
      updated.modulos.usuarios = 'nenhum';
      updated.modulos.fluxoOperacional = 'editar';
      updated.modulos.fluxoOperacionalTradicional = 'editar';
      updated.modulos.fluxoOperacionalExecutivo = 'visualizar';
      updated.modulos.fluxoOperacionalPainel = 'editar';
      updated.modulos.fluxoOperacionalWorkflow = 'editar';
      updated.modulos.fluxoOperacionalHistorico = 'visualizar';
      updated.modulos.fluxoOperacionalDashboard = 'visualizar';

      updated.indicadores.totalContratos = 'nenhum';
      updated.indicadores.totalVisaoGeral = 'nenhum';
      updated.indicadores.totalMargem = 'nenhum';
      updated.indicadores.percentualMedio = 'nenhum';
      updated.indicadores.totalAdm = 'nenhum';
      updated.indicadores.kpiProjecao = 'visualizar';
      updated.indicadores.kpiAdm = 'nenhum';
      updated.indicadores.graficoCustos = 'nenhum';

      updated.colunas.valorContrato = 'nenhum';
      updated.colunas.margemLiquida = 'nenhum';
      updated.colunas.custoAdm = 'nenhum';
      updated.colunas.valorItens = 'editar';
      updated.colunas.subestruturas = 'editar';

      updated.acoes.visualizar = 'visualizar';
      updated.acoes.editar = 'editar';
    } else if (role === "LEITOR") {
      updated.modulos.dashboard = 'visualizar';
      updated.modulos.contratosConsolidados = 'visualizar';
      updated.modulos.orcamentosAFechar = 'nenhum';
      updated.modulos.etapasContrato = 'nenhum';
      updated.modulos.levantamentosOrcamentos = 'nenhum';
      updated.modulos.usuarios = 'nenhum';
      updated.modulos.fluxoOperacional = 'visualizar';
      updated.modulos.fluxoOperacionalTradicional = 'visualizar';
      updated.modulos.fluxoOperacionalExecutivo = 'visualizar';
      updated.modulos.fluxoOperacionalPainel = 'visualizar';
      updated.modulos.fluxoOperacionalWorkflow = 'visualizar';
      updated.modulos.fluxoOperacionalHistorico = 'visualizar';
      updated.modulos.fluxoOperacionalDashboard = 'visualizar';

      updated.indicadores.totalContratos = 'visualizar';
      updated.indicadores.totalVisaoGeral = 'nenhum';
      updated.indicadores.totalMargem = 'nenhum';
      updated.indicadores.percentualMedio = 'nenhum';
      updated.indicadores.totalAdm = 'nenhum';
      updated.indicadores.kpiProjecao = 'nenhum';
      updated.indicadores.kpiAdm = 'nenhum';
      updated.indicadores.graficoCustos = 'visualizar';

      updated.colunas.valorContrato = 'visualizar';
      updated.colunas.margemLiquida = 'nenhum';
      updated.colunas.custoAdm = 'nenhum';
      updated.colunas.valorItens = 'nenhum';
      updated.colunas.subestruturas = 'nenhum';

      updated.acoes.visualizar = 'visualizar';
      updated.acoes.editar = 'nenhum';
    } else if (role === "ARQUITETO") {
      updated.modulos.dashboard = 'visualizar';
      updated.modulos.contratosConsolidados = 'nenhum';
      updated.modulos.orcamentosAFechar = 'nenhum';
      updated.modulos.etapasContrato = 'nenhum';
      updated.modulos.levantamentosOrcamentos = 'editar';
      updated.modulos.usuarios = 'nenhum';
      updated.modulos.fluxoOperacional = 'visualizar';
      updated.modulos.fluxoOperacionalTradicional = 'visualizar';
      updated.modulos.fluxoOperacionalExecutivo = 'visualizar';
      updated.modulos.fluxoOperacionalPainel = 'visualizar';
      updated.modulos.fluxoOperacionalWorkflow = 'visualizar';
      updated.modulos.fluxoOperacionalHistorico = 'visualizar';
      updated.modulos.fluxoOperacionalDashboard = 'visualizar';

      updated.indicadores.totalContratos = 'nenhum';
      updated.indicadores.totalVisaoGeral = 'nenhum';
      updated.indicadores.totalMargem = 'nenhum';
      updated.indicadores.percentualMedio = 'nenhum';
      updated.indicadores.totalAdm = 'nenhum';
      updated.indicadores.kpiProjecao = 'nenhum';
      updated.indicadores.kpiAdm = 'nenhum';
      updated.indicadores.graficoCustos = 'nenhum';

      updated.colunas.valorContrato = 'nenhum';
      updated.colunas.margemLiquida = 'nenhum';
      updated.colunas.custoAdm = 'nenhum';
      updated.colunas.valorItens = 'editar';
      updated.colunas.subestruturas = 'editar';

      updated.acoes.visualizar = 'visualizar';
      updated.acoes.editar = 'editar';
    }
    
    setPermissoes(updated);
  };

  if (currentUser?.nivel !== "ADMIN") {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 max-w-lg mx-auto text-center space-y-6 mt-12">
        <div className="w-16 h-16 bg-red-50 border border-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
          <p className="text-sm text-slate-500">
            Apenas administradores do sistema têm permissão para visualizar e gerenciar as contas de usuários e níveis de acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="usuarios_view_container">
      {/* Banner / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-primary">
            <Users className="w-6 h-6" />
            <h1 className="text-xl font-black tracking-tight uppercase">Controle de Acessos</h1>
          </div>
          <p className="text-xs text-slate-500">
            Cadastre novos usuários, configure permissões a nível de módulo, indicadores de desempenho, colunas de dados e permissões de edições.
          </p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-brand-primary text-white text-xs font-bold uppercase rounded-xl hover:bg-brand-secondary transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-brand-primary/10 hover:shadow-lg hover:shadow-brand-primary/20"
          id="btn_add_usuario"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs px-4 py-3 rounded-xl">
          Erro ao carregar usuários.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {users.map((u) => (
            <div 
              key={u.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-xs relative overflow-hidden group hover:border-slate-200 transition-all duration-300"
              id={`usuario_card_${u.id}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                    u.nivel === 'ADMIN' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    u.nivel === 'GESTOR' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    u.nivel === 'OPERADOR' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}>
                    {u.nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {u.nome}
                      {u.id === 'usr-admin-seed' && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded uppercase">Padrão</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold text-brand-primary">@{u.nome_usuario || 'admin'}</span>
                      <span className="text-slate-300">|</span>
                      <Mail className="w-3.5 h-3.5" />
                      {u.email}
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                  u.nivel === 'ADMIN' ? 'bg-amber-500/10 text-amber-700 border-amber-500/15' :
                  u.nivel === 'GESTOR' ? 'bg-blue-500/10 text-blue-700 border-blue-500/15' :
                  u.nivel === 'OPERADOR' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/15' :
                  'bg-slate-500/10 text-slate-700 border-slate-500/15'
                }`}>
                  {u.nivel}
                </span>
              </div>

              {/* Quick Permission Stats */}
              {(() => {
                const countActive = (categoryObj: Record<string, any>) => {
                  if (!categoryObj) return 0;
                  return Object.values(categoryObj).filter(val => val === true || val === 'visualizar' || val === 'editar').length;
                };
                const countWrite = (categoryObj: Record<string, any>) => {
                  if (!categoryObj) return 0;
                  return Object.values(categoryObj).filter(val => val === 'editar' || val === true).length;
                };

                return (
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Módulos Ativos:</span>
                      <span className="font-bold text-slate-700">
                        {countActive(u.permissoes?.modulos)} / {MODULE_OPTIONS.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Indicadores Ativos:</span>
                      <span className="font-bold text-slate-700">
                        {countActive(u.permissoes?.indicadores)} / {INDICATOR_OPTIONS.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Colunas Ativas:</span>
                      <span className="font-bold text-slate-700">
                        {countActive(u.permissoes?.colunas)} / {COLUMN_OPTIONS.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Ações Disponíveis:</span>
                      <span className="font-bold text-slate-700">
                        {countWrite(u.permissoes?.modulos) > 0 || countWrite(u.permissoes?.colunas) > 0 ? "Leitura & Escrita" : "Apenas Leitura"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-50 pt-3">
                <button
                  onClick={() => openEditModal(u)}
                  className="p-2 text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                  title="Editar Usuário"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                {u.id !== 'usr-admin-seed' && (
                  <button
                    onClick={() => handleDelete(u.id, u.nome)}
                    className="p-2 text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                    title="Excluir Usuário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8 max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-brand-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-accent" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  {editingUser ? `Editar Usuário: ${editingUser.nome}` : "Cadastrar Novo Usuário"}
                </h2>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {errorMsg && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Informações Gerais */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-brand-primary border-b border-slate-100 pb-1.5">1. Informações Gerais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500">Nome Completo *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500">Nome de Usuário *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={nomeUsuario}
                        onChange={(e) => setNomeUsuario(e.target.value.replace(/\s+/g, '').toLowerCase())}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500">E-mail *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500">
                      {editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha de Acesso *"}
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required={!editingUser}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder={editingUser ? "Senha inalterada" : "Mínimo 6 caracteres"}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      />
                    </div>
                  </div>

                  {/* Nível de Acesso */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black uppercase text-slate-500">Nível / Role *</label>
                    <select
                      value={nivel}
                      onChange={(e) => applyRolePreset(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Role Description */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2 text-slate-500 text-[11px]">
                  <Shield className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700">Perfil {nivel}: </span>
                    {ROLES.find(r => r.value === nivel)?.desc}
                  </div>
                </div>
              </div>

              {/* Níveis de Permissões Fine-Grained - Hierarquia RLS */}
              {nivel !== "ADMIN" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 gap-2">
                    <div>
                      <h3 className="text-xs font-black uppercase text-brand-primary">2. Configuração Fina de Permissões (Hierárquico)</h3>
                      <p className="text-[10px] text-slate-400 font-medium">Configure acessos e visibilidade organizados por Módulos, Grupos e Ferramentas.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {PERMISSION_HIERARCHY.map((module) => {
                      // Determine the icon component dynamically
                      const IconComponent = 
                        module.icon === "FolderOpen" ? FolderOpen :
                        module.icon === "Shuffle" ? Shuffle :
                        module.icon === "Calculator" ? Calculator :
                        Lock;

                      return (
                        <div key={module.id} className="bg-slate-50/70 rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
                          {/* Header do Módulo */}
                          <div className="bg-white p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-brand-primary shrink-0">
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{module.name}</h4>
                                <p className="text-[10px] text-slate-500 font-medium">{module.description}</p>
                              </div>
                            </div>

                            {/* Ações rápidas do módulo */}
                            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start lg:self-auto">
                              <span className="text-[8px] font-black uppercase text-slate-400 px-1.5">Ações Rápidas:</span>
                              <button
                                type="button"
                                onClick={() => setModulePermissions(module.id, 'editar')}
                                className="px-2 py-1 text-[9px] font-black uppercase bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-all cursor-pointer"
                              >
                                Liberar Tudo
                              </button>
                              <button
                                type="button"
                                onClick={() => setModulePermissions(module.id, 'visualizar')}
                                className="px-2 py-1 text-[9px] font-black uppercase bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-all cursor-pointer"
                              >
                                Somente Leitura
                              </button>
                              <button
                                type="button"
                                onClick={() => setModulePermissions(module.id, 'nenhum')}
                                className="px-2 py-1 text-[9px] font-black uppercase bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all cursor-pointer"
                              >
                                Bloquear Tudo
                              </button>
                            </div>
                          </div>

                          {/* Grupos e Ferramentas do Módulo */}
                          <div className="p-4 space-y-5">
                            {module.groups.map((group, gIdx) => (
                              <div key={gIdx} className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-px bg-slate-200 flex-1"></div>
                                  <div className="text-center px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                    Grupo: {group.name}
                                  </div>
                                  <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                                {group.description && (
                                  <p className="text-[9px] text-slate-400 font-semibold italic text-center -mt-1">{group.description}</p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                  {group.tools.map((tool) => 
                                    renderPermissionSelector(tool.category as keyof Usuario["permissoes"], tool.key, tool.label, tool.tooltip)
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {nivel === "ADMIN" && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-700 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Nota de Superusuário:</span> Administradores do sistema ignoram as permissões finas configuradas acima e possuem acesso irrestrito a visualizar e editar todos os módulos, indicadores e colunas de dados.
                  </div>
                </div>
              )}

              {/* Action footer inside form */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold uppercase rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending || editUserMutation.isPending}
                  className="px-5 py-2 bg-brand-primary text-white text-xs font-bold uppercase rounded-xl hover:bg-brand-secondary transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {createUserMutation.isPending || editUserMutation.isPending ? "Aguarde..." : editingUser ? "Salvar Alterações" : "Criar Conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
