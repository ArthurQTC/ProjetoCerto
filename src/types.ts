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
  qtd?: number;
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
  statusContrato: 'CONSOLIDADO' | 'A_FECHAR' | 'EXCLUIDO_CONTRATO' | 'EXCLUIDO_ORCAMENTO';
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
  custoAdm?: number | null;
}

export type Projeto = Obra;

export interface Material {
  id: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LevantamentoSubestrutura {
  material?: string;
  materialId?: string;
  qtdHD?: number;
  qtdM2?: number; // fallback/legacy
  valorUnitario: number;
}

export interface LevantamentoSubestruturaPC {
  material: string;
  qtdPC: number;
  valorUnitario: number;
}

export interface Levantamento {
  id: string;
  ref: string;
  obra: string;
  cliente: string;
  dataSolicitacao: string; // "DD/MM/AAAA" or YYYY-MM-DD
  abc: string;
  solicitante: string;
  responsavel: "Andrew" | "Mayra";
  status: "Concluído" | "Em Desenvolvimento" | "Pendente" | "EXCLUIDO";
  previsao: string; // "DD/MM/AAAA" or YYYY-MM-DD
  materialId?: string | null;
  material?: Material | null;
  qtdM2?: number | null;
  statusEnvio: "Enviado" | "Proposta a Enviar";
  contratoAFecharId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  subestruturas?: LevantamentoSubestrutura[];
  subestruturas_pc?: LevantamentoSubestruturaPC[];
  origemLeads?: "Hunter Douglas" | "Projeto Certo";
}

export interface ObraSummary {
  id: string;
  nome: string;
  cliente: string | null;
  observacoes?: string | null;
  valorContrato: number;
  visaoGeral: number;
  margemLiquida: number;
  percentualMargem: number;
  statusContrato: 'CONSOLIDADO' | 'A_FECHAR' | 'EXCLUIDO_CONTRATO' | 'EXCLUIDO_ORCAMENTO';
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
  custoAdm?: number | null;
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
