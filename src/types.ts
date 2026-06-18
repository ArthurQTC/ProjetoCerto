export type GrupoCalculo =
  | 'MATERIAL'
  | 'MAO_OBRA'
  | 'ADMINISTRACAO'
  | 'IMPOSTOS'
  | 'LOGISTICA'
  | 'MARGEM'
  | 'OUTROS';

export type ItemStatus = 'ATIVO' | 'FORA_DO_ORCAMENTO' | 'LIXEIRA';

export interface Categoria {
  id: string;
  nome: string;
  grupoCalculo: GrupoCalculo;
}

export interface SubItemOrcamento {
  id: string;
  descricao: string;
  valor: number;
}

export interface ItemOrcamento {
  id: string;
  descricao: string;
  valor: number;
  status: ItemStatus;
  observacao: string | null;
  obraId: string;
  categoriaId: string;
  categoria: Categoria;
  createdAt: string;
  updatedAt: string;
  subitens?: SubItemOrcamento[];
}

export interface DocumentoAnexo {
  id: string;
  nome: string;
  data: string;
  tamanho: string;
  url: string;
}

export interface Obra {
  id: string;
  nome: string;
  cliente: string | null;
  observacoes: string | null;
  valorContrato: number;
  statusContrato: 'CONSOLIDADO' | 'A_FECHAR';
  documentos: DocumentoAnexo[];
  createdAt: string;
  updatedAt: string;
  itens: ItemOrcamento[];
  visaoGeral: number;
  margemLiquida: number;
  percentualMargem: number;
  etapaLevantamento?: boolean;
  etapaProjeto?: boolean;
  etapaCotacao?: boolean;
  etapaFabricacao?: boolean;
  prazo?: string | null;
  numeroPedido?: string | null;
  dataInicioContrato?: string | null;
  dataFimContrato?: string | null;
}

export type Projeto = Obra;

export interface ObraSummary {
  id: string;
  nome: string;
  cliente: string | null;
  observacoes?: string | null;
  valorContrato: number;
  visaoGeral: number;
  margemLiquida: number;
  percentualMargem: number;
  statusContrato: 'CONSOLIDADO' | 'A_FECHAR';
  etapaLevantamento?: boolean;
  etapaProjeto?: boolean;
  etapaCotacao?: boolean;
  etapaFabricacao?: boolean;
  prazo?: string | null;
  numeroPedido?: string | null;
  dataInicioContrato?: string | null;
  dataFimContrato?: string | null;
  createdAt?: string;
  updatedAt?: string;
  despesaAdm?: number;
  itens?: ItemOrcamento[];
}

export type ProjetoSummary = ObraSummary;

export interface DashboardStats {
  totalContratos: number;
  totalVisaoGeral: number;
  totalMargem: number;
  percentualMedio: number;
  totalAdm: number;
  kpiProjecao: {
    atual: number;
    meta: number;
    percentual: number;
  };
  kpiAdm: {
    atual: number;
    meta: number;
    percentual: number;
  };
  chartCosts: {
    name: string;
    value: number;
  }[];
  obras: ObraSummary[];
  projetos: ProjetoSummary[];
}
