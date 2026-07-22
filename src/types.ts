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
  unidade?: 'Peças' | 'Metro Quadrado';
}

export interface ItemOrcamento {
  id: string;
  descricao: string;
  valor: number;
  status: ItemStatus;
  unidade?: 'Peças' | 'Metro Quadrado';
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

export interface WorkflowMovimentacao {
  id: string;
  obraId: string;
  usuario: string;
  data: string;
  hora: string;
  etapaAnterior: string | null;
  novaEtapa: string;
  subetapa: string | null;
  descricao: string | null;
  observacao: string | null;
  createdAt?: string;
}

export interface ChecklistItem {
  id: string;
  descricao: string;
  feito: boolean;
}

export interface Obra {
  id: string;
  nome: string;
  cliente: string | null;
  observacoes: string | null;
  valorContrato: number;
  statusContrato: 'CONSOLIDADO' | 'A_FECHAR' | 'ENTREGUE' | 'EXCLUIDO_CONTRATO' | 'EXCLUIDO_ORCAMENTO';
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
  
  // Workflow-specific fields
  workflowEtapa?: string;
  workflowSubetapa?: string | null;
  workflowResponsavel?: string | null;
  workflowStatus?: 'Em Andamento' | 'Atrasado' | 'Aguardando' | 'Finalizado';
  workflowLogoUrl?: string | null;
  workflowObservacao?: string | null;
  workflowPrazo?: string | null;
  workflowChecklist?: ChecklistItem[];
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
  id?: string;
  material?: string;
  materialId?: string;
  qtdHD?: number;
  qtdM2?: number; // fallback/legacy
  valorUnitario: number;
  unidade?: 'Peças' | 'Metro Quadrado';
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
  statusContrato: 'CONSOLIDADO' | 'A_FECHAR' | 'ENTREGUE' | 'EXCLUIDO_CONTRATO' | 'EXCLUIDO_ORCAMENTO';
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
  
  // Workflow-specific fields
  workflowEtapa?: string;
  workflowSubetapa?: string | null;
  workflowResponsavel?: string | null;
  workflowStatus?: 'Em Andamento' | 'Atrasado' | 'Aguardando' | 'Finalizado';
  workflowLogoUrl?: string | null;
  workflowObservacao?: string | null;
  workflowPrazo?: string | null;
  workflowChecklist?: ChecklistItem[];
}

export type ProjetoSummary = ObraSummary;

export interface ContratoAtivo {
  id: string;
  obraId: string;
  cnpj: string | null;
  contato: string | null;
  nomeContato?: string | null;
  endereco: string | null; // Keeping it for compatibility but will hide in UI
  municipio?: string | null;
  uf?: string | null;
  bairro?: string | null;
  complemento?: string | null;
  itensInstalacao?: string | null;
  enderecoEntrega: string | null;
  condicoesComerciais: string | null;
  freteTipo: 'CIF' | 'FOB';
  entrada: number;
  saldoReceber: number;
  tipoObra?: string;
  metragemAInstalar?: string | null;
  observacoesGerais?: string | null;
  documentos?: any[];
  createdAt?: string;
  updatedAt?: string;
}

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
