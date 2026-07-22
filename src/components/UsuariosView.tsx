import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  Calculator,
  FileSpreadsheet,
  Layers
} from "lucide-react";
import { useAuthStore, Usuario } from "../store";

const ROLES = [
  { value: "ADMIN", label: "Administrador", desc: "Acesso total irrestrito ao sistema." },
  { value: "GESTOR", label: "Gestor", desc: "Gerencia contratos, levantamentos e visualiza todos os indicadores." },
  { value: "OPERADOR", label: "Operador", desc: "Permissão de edição e leitura exclusivamente do módulo de Contratos Ativos." },
  { value: "LEITOR", label: "Leitor", desc: "Acesso exclusivo de leitura aos módulos selecionados." },
  { value: "ARQUITETO", label: "Arquiteto", desc: "Permissão de edição e leitura dos módulos Levantamentos/Orçamentos e Contratos Ativos." },
  { value: "EDITOR_CA", label: "Editor CA", desc: "Permissão de edição e leitura exclusivamente do módulo de Contratos Ativos." }
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
    contratosAtivos: "editar",
    enviarEquipe: "editar",
    orcamentosAFechar: "editar",
    exportarExcelContratos: "editar",
    exportarExcelOrcamentos: "editar",
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
          { 
            key: "contratosConsolidados", 
            category: "modulos", 
            label: "Contratos Consolidados", 
            tooltip: "Acesso à lista e detalhes de Obras ativas. Edição permite alterar, adicionar e remover itens e documentos do contrato.",
            rlsFields: [
              { key: "valorContrato", category: "colunas", label: "Coluna: Valor Contratado (Fechado)", tooltip: "Controla a visibilidade e edição do valor de faturamento do contrato nas tabelas e detalhes." },
              { key: "margemLiquida", category: "colunas", label: "Coluna: Margem Líquida da Obra", tooltip: "Controla se o cálculo da margem de lucro (R$ e %) é exibido ou ocultado nas tabelas." },
              { key: "custoAdm", category: "colunas", label: "Coluna: Custo Administrativo", tooltip: "Controla a visibilidade e edição do valor do custo administrativo alocado à obra." },
              { key: "enviarEquipe", category: "modulos", label: "Botão: Enviar para Equipe", tooltip: "Permite ao usuário visualizar e/ou acionar o envio de dados do contrato para a equipe." },
              { key: "exportarExcelContratos", category: "modulos", label: "Função: Exportar para Excel (XLS)", tooltip: "Permite que o usuário exporte os dados financeiros e cadastrais de obras para planilhas excel." }
            ]
          },
          { 
            key: "contratosAtivos", 
            category: "modulos", 
            label: "Contratos Ativos", 
            tooltip: "Acesso à lista e preenchimento de Dados do Contrato (CNPJ, Endereço, CIF/FOB, Entrada e Saldo)."
          },
          { 
            key: "orcamentosAFechar", 
            category: "modulos", 
            label: "Orçamentos a Fechar", 
            tooltip: "Acesso aos orçamentos pendentes. Edição permite alterar, excluir itens e documentos dentro de orçamentos.",
            rlsFields: [
              { key: "valorContrato", category: "colunas", label: "Coluna: Valor Orçado (Proposta)", tooltip: "Controla a visibilidade do valor total orçado em propostas pendentes." },
              { key: "valorItens", category: "colunas", label: "Coluna: Valores Unitários de Itens", tooltip: "Mascara ou exibe os custos unitários das composições e insumos na lista de orçamento." },
              { key: "exportarExcelOrcamentos", category: "modulos", label: "Função: Exportar Propostas (XLS)", tooltip: "Permite exportar a lista de orçamentos a fechar para planilhas XLS." }
            ]
          }
        ]
      },
      {
        name: "Orçamentação e Cronograma",
        description: "Levantamento de materiais, composições e definição de cronograma",
        tools: [
          { 
            key: "levantamentosOrcamentos", 
            category: "modulos", 
            label: "Levantamentos / Orçamentos", 
            tooltip: "Controle de levantamentos. Edição permite criar, editar e excluir levantamentos e alterar status.",
            rlsFields: [
              { key: "valorItens", category: "colunas", label: "Coluna: Valores Unitários de Planilha", tooltip: "Mascara ou exibe os custos e preços unitários dos levantamentos de materiais/serviços." },
              { key: "subestruturas", category: "colunas", label: "Função: Expandir Subestruturas (m²)", tooltip: "Permite visualizar ou editar o desdobramento e memorial de cálculo de áreas (subestruturas)." }
            ]
          },
          { 
            key: "etapasContrato", 
            category: "modulos", 
            label: "Etapas do Contrato (Cronograma)", 
            tooltip: "Gestão do cronograma e macro-etapas. Edição permite criar e modificar etapas." 
          }
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
        name: "Workflow & Monitores Operacionais",
        description: "Pipelines, mesa de workflow e diagramas interativos de acompanhamento",
        tools: [
          { 
            key: "fluxoOperacionalWorkflow", 
            category: "modulos", 
            label: "Mesa de Workflow", 
            tooltip: "Permite gerenciar movimentações e listas de contratos no Workflow.",
            rlsFields: [
               { key: "fluxoOperacionalWorkflow", category: "modulos", label: "Controle: Acesso ao Workflow", tooltip: "Permite gerenciar movimentações e listas de contratos no Workflow." },
               { key: "fluxoOperacionalPainel", category: "modulos", label: "Controle: Acesso ao Painel", tooltip: "Permite visualizar ou editar o Painel Operacional (Kanban)." },
               { key: "fluxoOperacionalTradicional", category: "modulos", label: "Controle: Acesso ao Fluxograma Tradicional", tooltip: "Permite visualizar ou interagir com o Fluxograma Tradicional." },
               { key: "fluxoOperacionalExecutivo", category: "modulos", label: "Controle: Acesso ao Fluxograma Executivo", tooltip: "Permite visualizar ou editar o Fluxograma Executivo." }
            ]
          },
          { 
            key: "fluxoOperacionalPainel", 
            category: "modulos", 
            label: "Painel Operacional (Kanban)", 
            tooltip: "Permite visualizar ou editar o Painel Operacional (Kanban).",
            rlsFields: [
               { key: "fluxoOperacionalPainel", category: "modulos", label: "Controle: Acesso ao Painel", tooltip: "Permite visualizar ou editar o Painel Operacional (Kanban)." }
            ]
          },
          { 
            key: "fluxoOperacionalTradicional", 
            category: "modulos", 
            label: "Fluxograma Tradicional (BPMN)", 
            tooltip: "Permite visualizar ou interagir com o Fluxograma Tradicional.",
            rlsFields: [
               { key: "fluxoOperacionalTradicional", category: "modulos", label: "Controle: Acesso ao Fluxograma Tradicional", tooltip: "Permite visualizar ou interagir com o Fluxograma Tradicional." }
            ]
          },
          { 
            key: "fluxoOperacionalExecutivo", 
            category: "modulos", 
            label: "Fluxograma Executivo (Reduzido)", 
            tooltip: "Permite visualizar ou editar o Fluxograma Executivo.",
            rlsFields: [
               { key: "fluxoOperacionalExecutivo", category: "modulos", label: "Controle: Acesso ao Fluxograma Executivo", tooltip: "Permite visualizar ou editar o Fluxograma Executivo." }
            ]
          }
        ]
      },
      {
        name: "Coordenação & Auditoria",
        description: "Indicadores operacionais e histórico completo de movimentações",
        tools: [
          { 
            key: "fluxoOperacionalDashboard", 
            category: "modulos", 
            label: "Dashboard Operacional (KPIs)", 
            tooltip: "Permite visualizar os indicadores e gráficos operacionais do fluxo.",
            rlsFields: [
               { key: "fluxoOperacionalDashboard", category: "modulos", label: "Controle: Acesso ao Dashboard", tooltip: "Permite visualizar os indicadores e gráficos operacionais do fluxo." }
            ]
          },
          { 
            key: "fluxoOperacionalHistorico", 
            category: "modulos", 
            label: "Histórico de Movimentações", 
            tooltip: "Permite visualizar o histórico completo de movimentações de contratos no fluxo.",
            rlsFields: [
               { key: "fluxoOperacionalHistorico", category: "modulos", label: "Controle: Acesso ao Histórico", tooltip: "Permite visualizar o histórico completo de movimentações de contratos no fluxo." }
            ]
          }
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
        name: "Painel Principal de BI",
        description: "Dashboard unificado de indicadores estratégicos e metas de faturamento",
        tools: [
          { 
            key: "dashboard", 
            category: "modulos", 
            label: "Painel Geral de BI", 
            tooltip: "Acesso à tela de inteligência gerencial. Edição permite parametrizar metas e custos gerais.",
            rlsFields: [
              { key: "totalContratos", category: "indicadores", label: "Card: Faturamento Total (Contratos)", tooltip: "Exibir o card de Faturamento Total no Dashboard de BI." },
              { key: "totalVisaoGeral", category: "indicadores", label: "Card: Custo Total (Visão Geral)", tooltip: "Exibir o card de Custo Total Projetado de obras." },
              { key: "totalMargem", category: "indicadores", label: "Card: Margem Líquida Total (R$)", tooltip: "Exibir o card de Margem Líquida nominal no BI." },
              { key: "percentualMedio", category: "indicadores", label: "Card: % Média de Margem", tooltip: "Exibir o percentual médio de margem dos contratos." },
              { key: "totalAdm", category: "indicadores", label: "Card: Despesa Adm Acumulada", tooltip: "Exibir a despesa administrativa acumulada total calculada." },
              { key: "kpiProjecao", category: "indicadores", label: "KPI: Barra de Metas e Projeção", tooltip: "Exibir as barras de progresso comparando o faturado com as metas." },
              { key: "kpiAdm", category: "indicadores", label: "KPI: Velocímetro de Gasto ADM", tooltip: "Exibir o medidor analógico de despesas em relação ao faturamento." },
              { key: "graficoCustos", category: "indicadores", label: "Gráfico: Composição e Rateio", tooltip: "Exibir o gráfico circular de rateio (Materiais, MDO, Administrativo)." }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "seguranca",
    name: "Módulo Segurança, Configurações & Administração",
    description: "Configurações globais de usuários, privilégios globais e auditorias.",
    icon: "Lock",
    groups: [
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
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState<string>("");
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
    setDeleteConfirmationId(id);
    setDeleteConfirmationName(name);
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
      const copy = JSON.parse(JSON.stringify(prev || DEFAULT_PERMISSIONS));
      if (!copy[type]) {
        (copy as any)[type] = {};
      }
      (copy[type] as any)[key] = value;

      // Automatically sync parent 'fluxoOperacional' key
      if (type === "modulos") {
        const submodules = [
          "fluxoOperacionalDashboard",
          "fluxoOperacionalTradicional",
          "fluxoOperacionalExecutivo",
          "fluxoOperacionalPainel",
          "fluxoOperacionalWorkflow",
          "fluxoOperacionalHistorico"
        ];
        if (submodules.includes(key)) {
          let parentValue: 'visualizar' | 'editar' | 'nenhum' = 'nenhum';
          for (const sub of submodules) {
            const val = copy.modulos[sub];
            if (val === 'editar') {
              parentValue = 'editar';
              break; // 'editar' is the highest priority
            } else if (val === 'visualizar') {
              parentValue = 'visualizar';
            }
          }
          copy.modulos.fluxoOperacional = parentValue;
        }
      }

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
          
          // Cascading set for nested rlsFields inside the module
          if (tool.rlsFields && tool.rlsFields.length > 0) {
            tool.rlsFields.forEach(field => {
              if (!copy[field.category]) {
                copy[field.category] = {};
              }
              // Indicators/charts are usually read-only or blocked
              if (field.category === "indicadores") {
                copy[field.category][field.key] = value === "nenhum" ? "nenhum" : "visualizar";
              } else {
                copy[field.category][field.key] = value;
              }
            });
          }
        });
      });

      // Special handling: if we changed the Operational module, make sure the main parent permission key matches
      if (moduleId === "operacional") {
        copy.modulos.fluxoOperacional = value;
      }

      return copy;
    });
  };

  const renderPermissionPreview = (key: string, tooltipText?: string) => {
    switch (key) {
      case "enviarEquipe":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Enviar para Equipe</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">RECURSO</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100 text-[10px]">
                <span className="font-bold text-slate-700">Ação de Disparar Notificação</span>
                <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded-sm font-semibold">Botão</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "contratosAtivos":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Contratos Ativos</span>
              <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">MÓDULO</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100 text-[10px]">
                <span className="font-bold text-slate-700">CNPJ & Endereço</span>
                <span className="text-[8px] bg-indigo-100 text-indigo-800 px-1 rounded-sm font-semibold">Dados</span>
              </div>
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100 text-[10px]">
                <span className="font-bold text-slate-700">CIF / FOB</span>
                <span className="text-[8px] bg-indigo-100 text-indigo-800 px-1 rounded-sm font-semibold">Comercial</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "contratosConsolidados":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Tabela de Obras</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">MÓDULO</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100 text-[10px]">
                <span className="font-bold text-slate-700">Obra Alphaville</span>
                <span className="text-[8px] bg-blue-100 text-blue-800 px-1 rounded-sm font-semibold">Ativo</span>
              </div>
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100 text-[10px]">
                <span className="font-bold text-slate-700">Reforma Clínica</span>
                <span className="text-[8px] bg-blue-100 text-blue-800 px-1 rounded-sm font-semibold">Ativo</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "orcamentosAFechar":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Orçamentos Pendentes</span>
              <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">PENDENTE</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100 text-[10px]">
                <span className="font-bold text-slate-700">Galpão Logístico</span>
                <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded-sm font-semibold">Proposta</span>
              </div>
              <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100 text-[10px]">
                <span className="font-bold text-slate-700">Prédio Residencial</span>
                <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded-sm font-semibold">Proposta</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "exportarExcelContratos":
      case "exportarExcelOrcamentos":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Relatório XLS Planilhado</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">EXCEL</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="h-1.5 w-24 bg-emerald-200 rounded-xs"></div>
                <div className="h-1 w-16 bg-emerald-200 rounded-xs"></div>
                <div className="h-1 w-20 bg-emerald-200 rounded-xs"></div>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "levantamentosOrcamentos":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Planilha Quantitativa</span>
              <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">PLANILHA</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
              <div className="flex justify-between text-[8px] text-slate-400 font-bold border-b border-slate-200 pb-0.5 mb-1">
                <span>Item / Material</span>
                <span>Qtd</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>Cimento CP-II</span>
                <span className="font-mono font-bold">1.200 sc</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>Aço CA-50 10mm</span>
                <span className="font-mono font-bold">4.500 kg</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "etapasContrato":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Cronograma de Obra</span>
              <span className="text-[9px] bg-sky-100 text-sky-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">GANTT</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] text-slate-500 font-bold">
                  <span>Fundações</span>
                  <span>75%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: "75%" }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] text-slate-500 font-bold">
                  <span>Superestrutura</span>
                  <span>20%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: "20%" }}></div>
                </div>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "fluxoOperacionalPainel":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Painel Operacional (Kanban)</span>
              <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">PIPELINE</span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
              <div className="bg-white p-1 rounded border border-slate-100 text-center text-[7px] font-bold text-slate-400">
                <span>Estudo</span>
                <div className="bg-indigo-50 border border-indigo-100 p-0.5 rounded-xs mt-1 text-[6px] text-indigo-700">Nº 102</div>
              </div>
              <div className="bg-white p-1 rounded border border-slate-100 text-center text-[7px] font-bold text-slate-400">
                <span>Elabor.</span>
                <div className="bg-amber-50 border border-amber-100 p-0.5 rounded-xs mt-1 text-[6px] text-amber-700 font-bold">Nº 098</div>
              </div>
              <div className="bg-white p-1 rounded border border-slate-100 text-center text-[7px] font-bold text-slate-400">
                <span>Aprov.</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "fluxoOperacionalTradicional":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Fluxograma Tradicional BPMN</span>
              <span className="text-[9px] bg-teal-100 text-teal-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">DIAGRAMA</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-teal-500 bg-teal-50 flex items-center justify-center text-[7px] font-bold text-teal-700 shadow-xs">Início</div>
              <div className="w-3.5 h-px bg-teal-300"></div>
              <div className="w-9 h-6 border border-slate-400 bg-white flex items-center justify-center text-[6px] font-medium text-slate-700 rounded-sm shadow-2xs">Orçamento</div>
              <div className="w-3.5 h-px bg-teal-300"></div>
              <div className="w-5 h-5 rounded-sm border border-amber-500 bg-amber-50 flex items-center justify-center text-[8px] font-bold text-amber-700 rotate-45 shadow-xs"><span className="-rotate-45 font-bold">?</span></div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "fluxoOperacionalExecutivo":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Fluxograma Executivo</span>
              <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">RESUMIDO</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-around gap-1">
              <div className="bg-slate-200 text-slate-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full">1. Orçamento</div>
              <span className="text-slate-400 text-[9px]">&rarr;</span>
              <div className="bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">2. Execução</div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "fluxoOperacionalWorkflow":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Mesa de Workflow</span>
              <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">WF MESA</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
              <div className="flex justify-between items-center text-[9px] bg-white p-1 rounded shadow-3xs">
                <span className="font-medium text-slate-700">Fase 3: Elaborar Proposta</span>
                <span className="text-[7px] text-brand-primary font-black">&rarr; Próxima</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "fluxoOperacionalHistorico":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Histórico de Auditoria</span>
              <span className="text-[9px] bg-slate-100 text-slate-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">AUDITORIA</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
              <div className="flex gap-1 items-start text-[8px] text-slate-500 leading-none">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-0.5 shrink-0"></div>
                <div>
                  <strong className="text-slate-700 font-bold">Arthur</strong> aprovou proposta <span className="font-mono text-[7px]">14:15</span>
                </div>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "fluxoOperacionalDashboard":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Métricas de Gargalo</span>
              <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">KPI OPER</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-around gap-1.5">
              <div className="text-center">
                <span className="text-[8px] text-slate-400 block">Tempo Médio</span>
                <span className="text-[11px] font-black font-mono text-purple-700">4.5 dias</span>
              </div>
              <div className="w-px h-6 bg-slate-300"></div>
              <div className="text-center">
                <span className="text-[8px] text-slate-400 block">Gargalo</span>
                <span className="text-[10px] font-bold text-rose-600">Aprovação</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "totalContratos":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Faturamento Geral</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">TOP CARD</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-md">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Faturamento Total</span>
              <div className="text-xs font-black font-mono text-emerald-400 mt-0.5">R$ 14.580.000,00</div>
              <span className="text-[7px] text-emerald-500 font-semibold">&uarr; +12% este mês</span>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "totalVisaoGeral":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Custo Geral</span>
              <span className="text-[9px] bg-slate-100 text-slate-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">TOP CARD</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-md">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Custo Geral Projetado</span>
              <div className="text-xs font-black font-mono text-slate-100 mt-0.5">R$ 11.230.000,00</div>
              <span className="text-[7px] text-slate-400">Composições + ADM</span>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "totalMargem":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Margem de Lucro (R$)</span>
              <span className="text-[9px] bg-brand-primary/10 text-brand-primary font-extrabold px-1.5 py-0.5 rounded-sm uppercase">TOP CARD</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-md">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Margem Líquida Total</span>
              <div className="text-xs font-black font-mono text-brand-accent mt-0.5">R$ 3.350.000,00</div>
              <span className="text-[7px] text-brand-accent font-semibold">22.97% média nominal</span>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "percentualMedio":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Média de Margem (%)</span>
              <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">TOP CARD</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-md">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Média de Margem</span>
              <div className="text-xs font-black font-mono text-sky-400 mt-0.5">22.97%</div>
              <span className="text-[7px] text-sky-400">Eficiência geral</span>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "totalAdm":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Despesa ADM Acumulada</span>
              <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">TOP CARD</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-md">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Despesas Administrativas</span>
              <div className="text-xs font-black font-mono text-amber-400 mt-0.5">R$ 1.250.000,00</div>
              <span className="text-[7px] text-amber-400 font-semibold">Soma de rateio geral</span>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "kpiProjecao":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Gráfico de Metas</span>
              <span className="text-[9px] bg-orange-100 text-orange-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">KPI METAS</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
              <div className="flex justify-between text-[8px] font-bold text-slate-500">
                <span>Alvo Anual (R$ 15M)</span>
                <span>97.2%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: "97.2%" }}></div>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "kpiAdm":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Velocímetro de Gasto ADM</span>
              <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">DIAL KPI</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="w-14 h-7 overflow-hidden relative flex items-end justify-center">
                <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-b-transparent absolute"></div>
                <div className="w-14 h-14 rounded-full border-4 border-rose-500 border-b-transparent border-l-transparent border-t-transparent absolute rotate-45"></div>
                <span className="text-[8px] font-bold text-slate-600 mb-0.5 z-10">8.57%</span>
              </div>
              <span className="text-[7px] text-rose-600 font-bold mt-1">Limite Aceitável: 10%</span>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "graficoCustos":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Composição de Custos</span>
              <span className="text-[9px] bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">PIZZA BI</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-r-indigo-500 border-t-indigo-500"></div>
              <div className="text-[7px] space-y-0.5">
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-xs bg-emerald-500"></div><span>Materiais</span></div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-xs bg-indigo-500"></div><span>MDO</span></div>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "valorContrato":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Valores Contratados</span>
              <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">COLUNA RLS</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
              <div className="flex justify-between items-center bg-white p-1 rounded text-[10px] border border-slate-100">
                <span className="font-medium text-slate-600">Sem Permissão</span>
                <span className="font-mono text-slate-400">R$ ••••••••</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50 p-1 rounded text-[10px] border border-emerald-100">
                <span className="font-medium text-slate-700">Com Permissão</span>
                <span className="font-mono text-emerald-700 font-extrabold">R$ 1.580.000</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "margemLiquida":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Margem Líquida</span>
              <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">COLUNA RLS</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
              <div className="flex justify-between items-center bg-white p-1 rounded text-[10px] border border-slate-100">
                <span className="font-medium text-slate-600">Sem Permissão</span>
                <span className="font-mono text-slate-400">••••••••</span>
              </div>
              <div className="flex justify-between items-center bg-teal-50 p-1 rounded text-[10px] border border-teal-100">
                <span className="font-medium text-slate-700">Com Permissão</span>
                <span className="font-mono text-teal-700 font-extrabold">24.50% (R$ 387k)</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "custoAdm":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Custo Adm. de Obra</span>
              <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">COLUNA RLS</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
              <div className="flex justify-between items-center bg-white p-1 rounded text-[10px] border border-slate-100">
                <span className="font-medium text-slate-600">Sem Permissão</span>
                <span className="font-mono text-slate-400">R$ ••••••••</span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 p-1 rounded text-[10px] border border-amber-100">
                <span className="font-medium text-slate-700">Com Permissão</span>
                <span className="font-mono text-amber-700 font-bold">R$ 4.200 / mês</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "valorItens":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Composições Unitárias</span>
              <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">COLUNA RLS</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1">
              <div className="flex justify-between text-[9px] text-slate-400 font-bold border-b border-slate-200 pb-0.5 mb-1">
                <span>Composição</span>
                <span>Preço Unitário</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>Piso Cerâmico m²</span>
                <span className="font-mono text-slate-400">R$ ••••••</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "subestruturas":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Cálculo de Áreas (m²)</span>
              <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">SUBESTRUTURAS</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-700">Ala Sul</span>
                <span className="bg-indigo-100 text-indigo-800 text-[8px] font-bold px-1.5 rounded-sm">340 m²</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-700">Ala Norte</span>
                <span className="bg-indigo-100 text-indigo-800 text-[8px] font-bold px-1.5 rounded-sm">180 m²</span>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "usuarios":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Usuários & Permissões</span>
              <span className="text-[9px] bg-slate-100 text-slate-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">ADMIN</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs">A</div>
              <div className="leading-tight">
                <div className="font-bold text-slate-700 text-[9px]">Arthur Quântica</div>
                <div className="text-[7px] text-slate-400 font-mono">admin@quantica.eng.br</div>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "visualizar":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Leitura Global</span>
              <span className="text-[9px] bg-slate-100 text-slate-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">GLOBAL</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold shadow-xs">&checkmark;</div>
              <span className="text-[10px] font-extrabold text-slate-700">Pode Visualizar Telas</span>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "editar":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Modificações Globais</span>
              <span className="text-[9px] bg-brand-primary/10 text-brand-primary font-extrabold px-1.5 py-0.5 rounded-sm uppercase">GLOBAL</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-center gap-3">
              <div className="bg-white px-2 py-1 border border-slate-200 rounded text-[9px] font-bold text-slate-500 shadow-2xs">Adicionar</div>
              <div className="bg-brand-primary text-white px-2 py-1 rounded text-[9px] font-bold shadow-2xs">Salvar</div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "fluxoOperacional":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Workflow Geral</span>
              <span className="text-[9px] bg-slate-100 text-slate-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">GERAL</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-center">
              <Shuffle className="w-5 h-5 text-slate-600" />
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      case "dashboard":
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
              <span className="font-extrabold text-slate-800">Painel Principal BI</span>
              <span className="text-[9px] bg-slate-100 text-slate-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase">MÓDULO</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-around gap-2">
              <div className="w-7 h-7 rounded-full border-2 border-emerald-500 flex items-center justify-center text-[8px] font-black font-mono">BI</div>
              <div className="space-y-1 flex-1">
                <div className="h-1 bg-slate-300 rounded w-16"></div>
                <div className="h-1 bg-slate-300 rounded w-10"></div>
              </div>
            </div>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
      default:
        return (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1">
              <span className="font-extrabold text-slate-800">Recurso de Sistema</span>
              <span className="text-[8px] bg-slate-100 text-slate-600 font-bold px-1 rounded-sm uppercase">RLS</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Controle granular para as colunas e visões desse item de dados.</p>
            {tooltipText && <span className="text-[9px] text-slate-400 block mt-1.5 leading-snug">{tooltipText}</span>}
          </div>
        );
    }
  };

  const renderRLSFieldSelector = (
    parentKey: string,
    category: keyof Usuario["permissoes"], 
    key: string, 
    label: string,
    tooltip?: string,
    parentIsNone: boolean = false
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

    const disabled = parentIsNone;

    return (
      <div 
        key={key} 
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border transition-all shadow-3xs group relative overflow-visible ${
          disabled 
            ? "bg-slate-50/50 border-slate-100 opacity-60 pointer-events-none select-none" 
            : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-2xs"
        }`}
      >
        {/* Hover premium live preview */}
        {!disabled && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 text-left pointer-events-none transition-all duration-200 invisible opacity-0 translate-y-2 scale-95 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 z-50 border-t-4 border-t-brand-accent">
            {renderPermissionPreview(key, tooltip)}
            {/* Popover Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45 -mt-1.5 shadow-xs"></div>
          </div>
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${disabled ? 'bg-slate-300' : 'bg-brand-accent'}`}></div>
          <span className="text-[10px] font-bold text-slate-600 truncate">{label}</span>
          <span className="text-[8px] px-1 py-0.5 bg-slate-100 rounded text-slate-400 font-extrabold font-mono select-none uppercase shrink-0">
            {category === 'colunas' ? 'RLS Coluna' : category === 'indicadores' ? 'RLS Indicador' : 'RLS Recurso'}
          </span>
          {disabled && (
            <span className="text-[8px] bg-slate-100 text-slate-400 font-extrabold px-1 py-0.5 rounded flex items-center gap-1 shrink-0">
              <Lock className="w-2 h-2" /> Trancado
            </span>
          )}
        </div>
        
        <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/60 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPermissionValue(category, key, 'nenhum')}
            className={`flex-1 sm:flex-initial px-2 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
              currentVal === 'nenhum' 
                ? "bg-white text-slate-700 shadow-xs border border-slate-200/35 font-extrabold" 
                : "text-slate-400 hover:text-slate-500"
            }`}
          >
            Ocultar
          </button>
          
          {category === 'indicadores' ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPermissionValue(category, key, 'visualizar')}
              className={`flex-1 sm:flex-initial px-2 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                currentVal === 'visualizar' || currentVal === 'editar'
                  ? "bg-indigo-100 text-indigo-800 shadow-xs border border-indigo-200/20 font-extrabold" 
                  : "text-slate-400 hover:text-slate-500"
              }`}
            >
              Exibir Card
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setPermissionValue(category, key, 'visualizar')}
                className={`flex-1 sm:flex-initial px-2 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                  currentVal === 'visualizar' 
                    ? "bg-amber-100 text-amber-800 shadow-xs border border-amber-200/20 font-extrabold" 
                    : "text-slate-400 hover:text-slate-500"
                }`}
              >
                Ler
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setPermissionValue(category, key, 'editar')}
                className={`flex-1 sm:flex-initial px-2 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                  currentVal === 'editar' 
                    ? "bg-brand-accent text-slate-900 font-extrabold shadow-xs" 
                    : "text-slate-400 hover:text-slate-500"
                }`}
              >
                Escrever
              </button>
            </>
          )}
        </div>
      </div>
    );
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
      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-100 hover:border-slate-300 transition-all shadow-2xs group relative overflow-visible">
        {/* Hover premium live preview */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 text-left pointer-events-none transition-all duration-200 invisible opacity-0 translate-y-2 scale-95 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 z-50 border-t-4 border-t-brand-primary">
          {renderPermissionPreview(key, tooltip)}
          {/* Popover Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45 -mt-1.5 shadow-xs"></div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-700">{label}</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-slate-50 rounded-sm text-slate-400 font-extrabold font-mono select-none">RLS</span>
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
      updated.modulos.enviarEquipe = 'editar';
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
      Object.keys(updated).forEach(cat => {
        Object.keys(updated[cat as keyof typeof DEFAULT_PERMISSIONS]).forEach(k => {
          (updated[cat as keyof typeof DEFAULT_PERMISSIONS] as any)[k] = 'nenhum';
        });
      });
      updated.modulos.contratosAtivos = 'editar';
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
      Object.keys(updated.modulos).forEach(k => {
        (updated.modulos as any)[k] = 'nenhum';
      });
      updated.modulos.contratosAtivos = 'editar';
      updated.modulos.levantamentosOrcamentos = 'editar';

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
    } else if (role === "EDITOR_CA") {
      Object.keys(updated).forEach(cat => {
        Object.keys(updated[cat as keyof typeof DEFAULT_PERMISSIONS]).forEach(k => {
          (updated[cat as keyof typeof DEFAULT_PERMISSIONS] as any)[k] = 'nenhum';
        });
      });
      updated.modulos.contratosAtivos = 'editar';
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
        {/* MODAL: DELETE CONFIRMATION */}
        <AnimatePresence>
          {deleteConfirmationId && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-100 overflow-hidden p-6 space-y-4"
              >
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                  Excluir Usuário
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  Deseja excluir usuário?
                </p>
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmationId(null);
                      setDeleteConfirmationName("");
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                    onClick={() => {
                      deleteUserMutation.mutate(deleteConfirmationId!);
                      setDeleteConfirmationId(null);
                      setDeleteConfirmationName("");
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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
                      // HIDE operational module if user doesn't have permission for it
                      if (module.id === "operacional" && (!permissoes.modulos?.fluxoOperacional || permissoes.modulos.fluxoOperacional === 'nenhum')) {
                        return null;
                      }

                      // Determine the icon component dynamically
                      const IconComponent = 
                        module.icon === "FolderOpen" ? FolderOpen :
                        module.icon === "Shuffle" ? Shuffle :
                        module.icon === "Calculator" ? Calculator :
                        Lock;

                      return (
                        <div key={module.id} className="bg-slate-50/70 rounded-2xl border border-slate-200/60 shadow-xs overflow-visible">
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
                          <div className="p-4 space-y-6">
                            {module.groups.map((group, gIdx) => (
                              <div key={gIdx} className="space-y-3">
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

                                <div className="grid grid-cols-1 gap-4 pt-1">
                                  {group.tools.map((tool) => {
                                    const parentValRaw = permissoes[tool.category as keyof Usuario["permissoes"]]?.[tool.key as any];
                                    const parentIsNone = parentValRaw === 'nenhum' || parentValRaw === false || parentValRaw === undefined;
                                    
                                    return (
                                      <div key={tool.key} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all overflow-visible p-4 space-y-4">
                                        {/* Main Module Permission Header Row */}
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
                                          <div className="flex items-start gap-2.5 group relative min-w-0">
                                            {/* Hover premium live preview of parent */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 text-left pointer-events-none transition-all duration-200 invisible opacity-0 translate-y-2 scale-95 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 z-50 border-t-4 border-t-brand-primary">
                                              {renderPermissionPreview(tool.key, tool.tooltip)}
                                              {/* Popover Arrow */}
                                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45 -mt-1.5 shadow-xs"></div>
                                            </div>

                                            <div className="p-1.5 bg-slate-50 rounded-lg text-brand-primary shrink-0">
                                              <Shield className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5">
                                                <h5 className="text-[12px] font-black text-slate-800 uppercase tracking-tight truncate">{tool.label}</h5>
                                                <span className="text-[8px] px-1.5 py-0.5 bg-indigo-50 rounded text-brand-primary font-black font-mono uppercase tracking-wider select-none shrink-0">MÓDULO</span>
                                              </div>
                                              <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{tool.tooltip}</p>
                                            </div>
                                          </div>

                                          {/* Main Tool Selector Buttons */}
                                          <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/60 shrink-0 w-full lg:w-auto">
                                            <button
                                              type="button"
                                              onClick={() => setPermissionValue(tool.category as any, tool.key, 'nenhum')}
                                              className={`flex-1 lg:flex-initial px-3 py-1.5 text-[10px] font-black rounded-md transition-all cursor-pointer uppercase ${
                                                parentIsNone
                                                  ? "bg-white text-slate-800 shadow-xs border border-slate-200/30" 
                                                  : "text-slate-400 hover:text-slate-600"
                                              }`}
                                            >
                                              Bloqueado
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setPermissionValue(tool.category as any, tool.key, 'visualizar')}
                                              className={`flex-1 lg:flex-initial px-3 py-1.5 text-[10px] font-black rounded-md transition-all cursor-pointer uppercase ${
                                                parentValRaw === 'visualizar' 
                                                  ? "bg-amber-100 text-amber-800 shadow-xs border border-amber-200/20" 
                                                  : "text-slate-400 hover:text-slate-600"
                                              }`}
                                            >
                                              Somente Leitura
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setPermissionValue(tool.category as any, tool.key, 'editar')}
                                              className={`flex-1 lg:flex-initial px-3 py-1.5 text-[10px] font-black rounded-md transition-all cursor-pointer uppercase ${
                                                parentValRaw === 'editar' || parentValRaw === true
                                                  ? "bg-brand-primary text-white shadow-xs font-black" 
                                                  : "text-slate-400 hover:text-slate-600"
                                              }`}
                                            >
                                              Total (Leitura + Escrita)
                                            </button>
                                          </div>
                                        </div>

                                        {/* Nested RLS Fields inside the exact same Card block */}
                                        {tool.rlsFields && tool.rlsFields.length > 0 && (
                                          <div className="pt-3 border-t border-slate-100 space-y-2.5">
                                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 select-none">
                                              <Layers className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                                              <span>Controle de Dados Granulares & Colunas (RLS)</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                              {tool.rlsFields.map((field) => 
                                                renderRLSFieldSelector(tool.key, field.category as keyof Usuario["permissoes"], field.key, field.label, field.tooltip, parentIsNone)
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
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
