import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  Handle, 
  Position, 
  MarkerType,
  NodeProps,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  EdgeChange,
  NodeChange,
  applyNodeChanges,
  applyEdgeChanges
} from "reactflow";
import "reactflow/dist/style.css";
import { 
  FileText, 
  Compass, 
  Home, 
  CheckSquare, 
  Calculator, 
  Send, 
  PenTool, 
  Layers, 
  Hammer, 
  Wrench, 
  Award, 
  DollarSign, 
  HeartHandshake, 
  Archive, 
  Trash, 
  User, 
  Clock, 
  ArrowUpRight, 
  HelpCircle, 
  X,
  AlertTriangle,
  Info,
  Maximize2,
  ChevronDown,
  Search,
  RefreshCw,
  FolderOpen,
  Lock,
  Unlock,
  Plus,
  Palette,
  Save,
  CornerUpLeft,
  CornerUpRight,
  GitCommit,
  ArrowRight,
  ArrowLeft,
  CornerLeftUp,
  CornerRightDown,
  Shuffle,
  CheckCircle,
  Move
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Obra } from "../../types";
import { useAuthStore } from "../../store";

interface WorkflowTraditionalProps {
  contracts: Obra[];
  onContractClick: (contractId: string) => void;
  onRefresh?: () => void;
}

// Full chronological alignment array to compute completed/highlighted paths
const CHRONO_ORDER = [
  "abertura_pasta",
  "solicitacao",
  "via_pc",
  "levantamento",
  "arquitetura",
  "envio_pedido",
  "valores_industria",
  "comercial",
  "confeccao_orc",
  "comite_orcamento",
  "arquitetura_comite",
  "comercial_comite",
  "execucao_comite",
  "cliente_dec",
  "declinado",
  "comercial_decl",
  "proposta_aprovada",
  "comercial_dados",
  "adm",
  "financeiro",
  "projeto_executivo",
  "medicao_loco",
  "folha_corte",
  "execucao",
  "planejamento",
  "bms",
  "termo_entrega",
  "financeiro_lancamento",
  "contrato_cliente",
  "mapa_cotacao",
  "analise_custo",
  "diretoria",
  "pos_vendas",
  "cliente_final"
];

// Mapping each contract database state to the exact visual Node ID in the PDF layout
const MAP_CONTRACT_TO_NODE_ID = (contract: Obra): string => {
  const stage = contract.workflowEtapa || "Solicitação";
  const sub = (contract.workflowSubetapa || "").toLowerCase();
  const status = (contract.workflowStatus || "").toLowerCase();

  if (stage === "Solicitação") {
    if (sub.includes("pasta") || sub.includes("abertura")) return "abertura_pasta";
    if (sub.includes("via") || sub.includes("pc") || sub.includes("hunter")) return "via_pc";
    return "solicitacao";
  }
  if (stage === "Arquitetura") {
    if (sub.includes("levantamento")) return "levantamento";
    if (sub.includes("comite")) return "arquitetura_comite";
    return "arquitetura";
  }
  if (stage === "Orçamento") {
    if (sub.includes("comite")) return "comite_orcamento";
    if (sub.includes("comercial")) return "comercial_comite";
    return "confeccao_orc";
  }
  if (stage === "Proposta") {
    if (status === "atrasado" || status === "aguardando" || sub.includes("recusa") || sub.includes("declinado")) return "declinado";
    if (sub.includes("valores")) return "valores_industria";
    return "proposta_aprovada";
  }
  if (stage === "Projeto Executivo") {
    return "projeto_executivo";
  }
  if (stage === "Produção") {
    if (sub.includes("pedido") || sub.includes("folha")) return "folha_corte";
    return "folha_corte"; // Default production node matching PDF
  }
  if (stage === "Execução") {
    if (sub.includes("medição") || sub.includes("medicao")) return "medicao_loco";
    if (sub.includes("planejamento") || sub.includes("equipe")) return "planejamento";
    if (sub.includes("bm") || sub.includes("bms")) return "bms";
    if (sub.includes("termo") || sub.includes("entrega")) return "termo_entrega";
    return "execucao";
  }
  if (stage === "Financeiro") {
    if (sub.includes("lançamento") || sub.includes("nf") || sub.includes("cobranca")) return "financeiro_lancamento";
    if (sub.includes("contrato")) return "contrato_cliente";
    return "financeiro";
  }
  if (stage === "Encerrado") {
    if (sub.includes("diretoria")) return "diretoria";
    if (sub.includes("pós") || sub.includes("pos") || sub.includes("venda")) return "pos_vendas";
    return "cliente_final";
  }
  return "solicitacao";
};

// Color styles and border config mapping based on category for faithful replication
const CATEGORY_STYLE_MAP = {
  blue: {
    bg: "bg-[#E3F2FD] border-[#1E88E5] text-[#0D47A1]",
    activeBg: "bg-[#BBDEFB] border-[#0D47A1] text-[#0D47A1] shadow-[0_0_15px_rgba(30,136,229,0.4)]",
    completedBg: "bg-emerald-50 border-emerald-500 text-emerald-800",
    badge: "bg-[#1976D2] text-white",
    name: "Azul (Solicitação)"
  },
  yellow: {
    bg: "bg-[#FFFDE7] border-[#FBC02D] text-[#F57F17]",
    activeBg: "bg-[#FFF9C4] border-[#F57F17] text-[#E65100] shadow-[0_0_15px_rgba(251,192,45,0.4)]",
    completedBg: "bg-emerald-50 border-emerald-500 text-emerald-800",
    badge: "bg-[#FBC02D] text-slate-800",
    name: "Amarelo (Arquitetura)"
  },
  orange: {
    bg: "bg-[#FFF3E0] border-[#FB8C00] text-[#E65100]",
    activeBg: "bg-[#FFE0B2] border-[#E65100] text-[#3E2723] shadow-[0_0_15px_rgba(251,140,0,0.4)]",
    completedBg: "bg-emerald-50 border-emerald-500 text-emerald-800",
    badge: "bg-[#EF6C00] text-white",
    name: "Laranja (Comercial)"
  },
  purple: {
    bg: "bg-[#F3E5F5] border-[#8E24AA] text-[#4A148C]",
    activeBg: "bg-[#E1BEE7] border-[#4A148C] text-[#4A148C] shadow-[0_0_15px_rgba(142,36,170,0.4)]",
    completedBg: "bg-emerald-50 border-emerald-500 text-emerald-800",
    badge: "bg-[#8E24AA] text-white",
    name: "Roxo (ADM/Contratos)"
  },
  green: {
    bg: "bg-[#E8F5E9] border-[#43A047] text-[#1B5E20]",
    activeBg: "bg-[#C8E6C9] border-[#1B5E20] text-[#1B5E20] shadow-[0_0_15px_rgba(67,160,73,0.4)]",
    completedBg: "bg-emerald-50 border-emerald-500 text-emerald-800",
    badge: "bg-[#43A047] text-white",
    name: "Verde (Financeiro)"
  },
  red: {
    bg: "bg-[#FFEBEE] border-[#E53935] text-[#B71C1C]",
    activeBg: "bg-[#FFCDD2] border-[#B71C1C] text-[#B71C1C] shadow-[0_0_15px_rgba(229,57,53,0.4)]",
    completedBg: "bg-emerald-50 border-emerald-500 text-emerald-800",
    badge: "bg-[#E53935] text-white",
    name: "Vermelho (Produção/Instal.)"
  },
  brown: {
    bg: "bg-[#EFEBE9] border-[#6D4C41] text-[#3E2723]",
    activeBg: "bg-[#D7CCC8] border-[#3E2723] text-[#3E2723] shadow-[0_0_15px_rgba(109,76,65,0.4)]",
    completedBg: "bg-emerald-50 border-emerald-500 text-emerald-800",
    badge: "bg-[#6D4C41] text-white",
    name: "Marrom (Diretoria/Custos)"
  },
  grey_diamond: {
    bg: "border-[#4A5568] bg-[#EDF2F7] text-[#2D3748]",
    activeBg: "border-[#1A202C] bg-[#E2E8F0] text-[#1A202C] ring-4 ring-blue-400/30 shadow-[0_0_15px_rgba(74,85,104,0.4)]",
    completedBg: "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20",
    badge: "bg-[#4A5568] text-white",
    name: "Losango Cinza (Decisão)"
  },
  black_diamond: {
    bg: "border-black bg-[#1A202C] text-white",
    activeBg: "border-black bg-black text-white ring-4 ring-blue-500/50 shadow-[0_0_15px_rgba(0,0,0,0.6)]",
    completedBg: "border-emerald-600 bg-emerald-850 text-white ring-2 ring-emerald-500/20",
    badge: "bg-black text-white",
    name: "Losango Preto (Decisão)"
  },
  hexagon: {
    bg: "border-black bg-white text-slate-900",
    activeBg: "border-blue-600 bg-blue-50 text-blue-900 ring-4 ring-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.4)]",
    completedBg: "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20",
    badge: "bg-black text-white",
    name: "Hexágono (Comitê)"
  }
};

// Default static nodes fallback schema (the official system map blueprint)
const DEFAULT_NODES_DEF: Node[] = [
  // ROW 0: PLANEJAMENTO (y = 50)
  { id: "planejamento", type: "process_rect", position: { x: 450, y: 50 }, data: { label: "PLANEJAMENTO\nEQUIPE\nINSTALAÇÃO", category: "red", subtitle: "" } },
  { id: "bms", type: "process_rect", position: { x: 700, y: 50 }, data: { label: "B.M'S", category: "red", subtitle: "" } },
  { id: "termo_entrega", type: "process_rect", position: { x: 920, y: 50 }, data: { label: "TERMO DE ENTREGA\nOBRA", category: "red", subtitle: "" } },
  { id: "pos_vendas", type: "process_rect", position: { x: 1140, y: 50 }, data: { label: "PÓS VENDAS", category: "orange", subtitle: "" } },

  // ROW 1: MEDICAO & EXECUCAO (y = 170)
  { id: "medicao_loco", type: "process_rect", position: { x: 450, y: 170 }, data: { label: "MEDIÇÃO IN LOCO\nP/ FOLHA DE CORTE", category: "red", subtitle: "" } },
  { id: "execucao", type: "process_rect", position: { x: 750, y: 170 }, data: { label: "EXECUÇÃO", category: "red", subtitle: "" } },

  // ROW 2: FOLHA DE CORTE & PROJETO EXECUTIVO (y = 290)
  { id: "folha_corte", type: "process_rect", position: { x: 450, y: 290 }, data: { label: "FOLHA DE CORTE P/\nPEDIDO INDÚSTRIA", category: "yellow", subtitle: "" } },
  { id: "projeto_executivo", type: "process_rect", position: { x: 950, y: 290 }, data: { label: "PROJETO EXECUTIVO\nLEV. DE MATS", category: "yellow", subtitle: "" } },

  // ROW 3: ABERTURA, ENVIO, VALORES, PROPOSTA APROVADA, COMERCIAL, ADM, FINANCEIRO, MAPA COTAÇAO, ANALISE (y = 440)
  { id: "abertura_pasta", type: "process_rect", position: { x: 100, y: 410 }, data: { label: "ABERTURA DE\nPASTA DO\nCLIENTE?????", category: "blue", subtitle: "" } },
  { id: "envio_pedido", type: "process_rect", position: { x: 330, y: 410 }, data: { label: "ENVIO PEDIDO\nINDÚSTRIA", category: "yellow", subtitle: "" } },
  { id: "valores_industria", type: "process_rect", position: { x: 540, y: 410 }, data: { label: "VALORES COM\nINDÚSTRIA", category: "orange", subtitle: "" } },
  { id: "proposta_aprovada", type: "decision_diamond", position: { x: 770, y: 395 }, data: { label: "PROPOSTA\nAPROVADA", category: "grey_diamond", subtitle: "" } },
  { id: "comercial_dados", type: "process_rect", position: { x: 950, y: 410 }, data: { label: "COMERCIAL", category: "orange", subtitle: "DADOS CLIENTE\nDADOS COMERCIAIS\nFICHA CADASTRAL PJ/PF" } },
  { id: "adm", type: "process_rect", position: { x: 1180, y: 350 }, data: { label: "ADM", category: "purple", subtitle: "" } },
  { id: "financeiro", type: "process_rect", position: { x: 1180, y: 470 }, data: { label: "FINANCEIRO", category: "green", subtitle: "" } },
  { id: "mapa_cotacao", type: "process_rect", position: { x: 1400, y: 310 }, data: { label: "MAPA DE\nCOTAÇÃO", category: "purple", subtitle: "" } },
  { id: "analise_custo", type: "process_rect", position: { x: 1620, y: 200 }, data: { label: "ANÁLISE\nCENTRO DE CUSTO", category: "brown", subtitle: "" } },

  // ROW 4: SOLICITACAO, ARQUITETURA, COMERCIAL, CLIENTE, CONTRATO CLIENTE, FINANCEIRO LANÇAMENTO, DIRETORIA, CLIENTE FINAL (y = 570)
  { id: "solicitacao", type: "process_rect", position: { x: 100, y: 570 }, data: { label: "SOLICITAÇÃO DE\nORÇAMENTO", category: "blue", subtitle: "" } },
  { id: "arquitetura", type: "process_rect", position: { x: 330, y: 570 }, data: { label: "ARQUITETURA", category: "yellow", subtitle: "" } },
  { id: "comercial", type: "process_rect", position: { x: 540, y: 570 }, data: { label: "COMERCIAL", category: "orange", subtitle: "" } },
  { id: "cliente_dec", type: "decision_diamond", position: { x: 770, y: 555 }, data: { label: "CLIENTE", category: "grey_diamond", subtitle: "" } },
  { id: "contrato_cliente", type: "process_rect", position: { x: 1400, y: 450 }, data: { label: "CONTRATO\nCLIENTE", category: "purple", subtitle: "" } },
  { id: "financeiro_lancamento", type: "process_rect", position: { x: 1400, y: 560 }, data: { label: "LANÇAMENTO\nACOMPANHAMENTO\nCOBRANÇA CLIENTE\nEMISSÃO NF", category: "green", subtitle: "" } },
  { id: "diretoria", type: "process_rect", position: { x: 1620, y: 450 }, data: { label: "DIRETORIA", category: "brown", subtitle: "" } },
  { id: "cliente_final", type: "decision_diamond", position: { x: 1840, y: 435 }, data: { label: "CLIENTE", category: "black_diamond", subtitle: "" } },

  // ROW 5: VIA PC, LEVANTAMENTO, CONFECÇÃO, DECLINADO, COMERCIAL DECL (y = 710)
  { id: "via_pc", type: "process_rect", position: { x: 100, y: 710 }, data: { label: "VIA PC\nVIA HUNTER\nVIA CLIENTE", category: "blue", subtitle: "" } },
  { id: "levantamento", type: "process_rect", position: { x: 330, y: 710 }, data: { label: "LEVANTAMENTO", category: "yellow", subtitle: "" } },
  { id: "confeccao_orc", type: "process_rect", position: { x: 540, y: 710 }, data: { label: "CONFECÇÃO DE\nORÇAMENTO", category: "orange", subtitle: "" } },
  { id: "declinado", type: "decision_diamond", position: { x: 770, y: 695 }, data: { label: "DECLINADO", category: "grey_diamond", subtitle: "" } },
  { id: "comercial_decl", type: "process_rect", position: { x: 950, y: 710 }, data: { label: "COMERCIAL", category: "orange", subtitle: "" } },

  // ROW 6: COMERCIAL COMITE, COMITE, ARQUITETURA COMITE, EXECUÇÃO COMITE (y = 850)
  { id: "comercial_comite", type: "process_rect", position: { x: 330, y: 850 }, data: { label: "COMERCIAL", category: "orange", subtitle: "" } },
  { id: "comite_orcamento", type: "comite_hexagon", position: { x: 540, y: 840 }, data: { label: "COMITÊ DE\nORÇAMENTO", category: "hexagon", subtitle: "" } },
  { id: "execucao_comite", type: "process_rect", position: { x: 770, y: 850 }, data: { label: "EXECUÇÃO", category: "red", subtitle: "" } },
  { id: "arquitetura_comite", type: "process_rect", position: { x: 540, y: 970 }, data: { label: "ARQUITETURA", category: "yellow", subtitle: "" } }
];

const DEFAULT_EDGES_DEF: Edge[] = [
  // Leftmost Blue/Yellow logic
  { id: "e-abertura-solicitacao", source: "abertura_pasta", target: "solicitacao" },
  { id: "e-solicitacao-viapc", source: "solicitacao", target: "via_pc" },
  { id: "e-solicitacao-arquitetura", source: "solicitacao", target: "arquitetura" },
  { id: "e-levantamento-arquitetura", source: "levantamento", target: "arquitetura", sourceHandle: "top", targetHandle: "bottom" },
  { id: "e-arquitetura-envio", source: "arquitetura", target: "envio_pedido" },
  { id: "e-arquitetura-comercial", source: "arquitetura", target: "comercial" },
  { id: "e-envio-valores", source: "envio_pedido", target: "valores_industria" },
  { id: "e-valores-proposta", source: "valores_industria", target: "proposta_aprovada" },
  { id: "e-comercial-confeccao", source: "comercial", target: "confeccao_orc" },
  { id: "e-comercial-cliente", source: "comercial", target: "cliente_dec" },

  // Diamond Decision & Returns
  { id: "e-cliente-proposta", source: "cliente_dec", sourceHandle: "top", target: "proposta_aprovada" },
  { id: "e-cliente-declinado", source: "cliente_dec", sourceHandle: "bottom", target: "declinado" },
  { id: "e-declinado-comercial", source: "declinado", sourceHandle: "right", target: "comercial_decl" },
  { id: "e-declinado-comite", source: "declinado", sourceHandle: "bottom", target: "comite_orcamento" },
  { id: "e-confeccao-comite", source: "confeccao_orc", target: "comite_orcamento" },

  // Hexagon Gate Directions
  { id: "e-comite-comercial", source: "comite_orcamento", sourceHandle: "bottom", target: "comercial_comite" },
  { id: "e-comite-execucao", source: "comite_orcamento", sourceHandle: "right", target: "execucao_comite" },
  { id: "e-comite-arquitetura", source: "comite_orcamento", sourceHandle: "bottom", target: "arquitetura_comite" },

  // Success path from Proposta Aprovada
  { id: "e-proposta-dados", source: "proposta_aprovada", sourceHandle: "right", target: "comercial_dados" },
  { id: "e-comercial-adm", source: "comercial_dados", target: "adm" },
  { id: "e-comercial-financeiro", source: "comercial_dados", target: "financeiro" },

  // Fulfillment flows
  { id: "e-adm-contrato", source: "adm", target: "contrato_cliente" },
  { id: "e-financeiro-lancamento", source: "financeiro", target: "financeiro_lancamento" },
  { id: "e-lancamento-contrato", source: "financeiro_lancamento", target: "contrato_cliente" },
  { id: "e-contrato-mapa", source: "contrato_cliente", target: "mapa_cotacao" },
  { id: "e-contrato-diretoria", source: "contrato_cliente", target: "diretoria" },
  { id: "e-mapa-analise", source: "mapa_cotacao", target: "analise_custo" },
  { id: "e-mapa-diretoria", source: "mapa_cotacao", target: "diretoria" },
  { id: "e-analise-diretoria", source: "analise_custo", target: "diretoria" },
  { id: "e-diretoria-cliente", source: "diretoria", target: "cliente_final" },

  // Production & Technical installation tracks (Top area of layout)
  { id: "e-medicao-folha", source: "medicao_loco", target: "folha_corte" },
  { id: "e-folha-projeto", source: "folha_corte", target: "projeto_executivo" },
  { id: "e-projeto-adm", source: "projeto_executivo", target: "adm" },
  { id: "e-execucao-medicao", source: "execucao", target: "medicao_loco" },
  { id: "e-execucao-projeto", source: "execucao", target: "projeto_executivo" },

  // Loop route from Proposal approval upwards to construction phase
  { id: "e-proposta-medicao", source: "proposta_aprovada", sourceHandle: "top", target: "medicao_loco" },

  // Planning & Post-sales Track (Row 0)
  { id: "e-execucao-planejamento", source: "execucao", sourceHandle: "top", target: "planejamento" },
  { id: "e-planejamento-bms", source: "planejamento", target: "bms" },
  { id: "e-bms-termo", source: "bms", target: "termo_entrega" },
  { id: "e-termo-posvenda", source: "termo_entrega", target: "pos_vendas" }
];

// Traditional Process Rectangle Node Component
const TraditionalRectangleNode = ({ id, data }: NodeProps) => {
  const isSelected = data.selected;
  const highlightState = data.highlightState; // "completed" | "active" | "none"
  const hasSelection = data.hasSelection;
  const cat = data.category || "blue";
  const count = data.count || 0;
  const stageContracts = data.contracts || [];

  const isConnectingMode = data.isConnectingMode;
  const isSource = data.connectionSourceNodeId === id;
  const isPossibleTarget = isConnectingMode && !isSource;

  const themeConfig = CATEGORY_STYLE_MAP[cat as keyof typeof CATEGORY_STYLE_MAP] || CATEGORY_STYLE_MAP.blue;
  
  let nodeStyle = themeConfig.bg;
  if (highlightState === "active") {
    nodeStyle = themeConfig.activeBg;
  } else if (highlightState === "completed") {
    nodeStyle = themeConfig.completedBg;
  }

  // Visual focus effect for active paths
  const fadeClass = hasSelection && highlightState === "none" ? "opacity-30 grayscale-[30%] scale-95" : "opacity-100";

  let extraClasses = "";
  if (isSelected && !isConnectingMode) {
    extraClasses = "ring-4 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] border-amber-500 scale-102 bg-amber-50/50";
  } else if (isSource) {
    extraClasses = "ring-4 ring-emerald-500 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.8)] border-emerald-500 scale-102 bg-emerald-50/60";
  } else if (isPossibleTarget) {
    extraClasses = "ring-2 ring-blue-500 border-blue-400 scale-102 animate-pulse hover:ring-4 cursor-cell bg-blue-50/60";
  }

  return (
    <div 
      className={`px-4 py-3 rounded-md border-2 font-black text-[10.5px] uppercase tracking-wide flex flex-col justify-between w-[190px] shadow-sm transition-all text-center leading-snug duration-300 ${nodeStyle} ${extraClasses || (isSelected ? "ring-2 ring-indigo-500 ring-offset-1 scale-102" : "")} ${fadeClass}`}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-slate-400 border-none" />
      <Handle type="target" position={Position.Top} id="top" className="w-2 h-2 !bg-slate-400 border-none" />
      
      <div className="flex flex-col items-center justify-center min-h-[40px]">
        <p className="whitespace-pre-wrap">{data.label}</p>
        
        {data.subtitle && (
          <p className="text-[7.5px] font-bold text-rose-500 lowercase leading-tight mt-1 pt-1 border-t border-slate-200/50 block w-full whitespace-pre-wrap">
            {data.subtitle}
          </p>
        )}
      </div>

      {stageContracts.length > 0 && (
        <div className="flex items-center justify-center -space-x-1 overflow-hidden pt-1.5 mt-1.5 border-t border-slate-300/40 w-full">
          {stageContracts.slice(0, 5).map((c: Obra) => (
            <div 
              key={c.id} 
              className="w-5.5 h-5.5 rounded-full bg-white border border-slate-300 flex items-center justify-center font-black text-[8px] text-slate-800 uppercase shadow-2xs hover:scale-115 transition-transform"
              title={`${c.nome} - ${c.cliente}`}
            >
              {c.workflowLogoUrl ? (
                <img src={c.workflowLogoUrl} alt={c.nome} className="w-full h-full rounded-full object-contain p-0.5" referrerPolicy="no-referrer" />
              ) : (
                c.nome.substring(0, 2)
              )}
            </div>
          ))}
          {stageContracts.length > 5 && (
            <div className="w-5.5 h-5.5 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-black text-[7px] text-slate-600 shrink-0">
              +{stageContracts.length - 5}
            </div>
          )}
        </div>
      )}

      {count > 0 && (
        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-600 text-white shadow-xs">
          {count}
        </span>
      )}

      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-slate-400 border-none" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2 !bg-slate-400 border-none" />
    </div>
  );
};

// Traditional Diamond Decision Node Component
const TraditionalDiamondNode = ({ id, data }: NodeProps) => {
  const isSelected = data.selected;
  const highlightState = data.highlightState;
  const hasSelection = data.hasSelection;
  const cat = data.category || "grey_diamond";
  const themeConfig = CATEGORY_STYLE_MAP[cat as keyof typeof CATEGORY_STYLE_MAP] || CATEGORY_STYLE_MAP.grey_diamond;

  const isConnectingMode = data.isConnectingMode;
  const isSource = data.connectionSourceNodeId === id;
  const isPossibleTarget = isConnectingMode && !isSource;

  let shapeStyle = themeConfig.bg;
  if (highlightState === "active") {
    shapeStyle = themeConfig.activeBg;
  } else if (highlightState === "completed") {
    shapeStyle = themeConfig.completedBg;
  }

  // Visual focus effect for active paths
  const fadeClass = hasSelection && highlightState === "none" ? "opacity-30 grayscale-[30%] scale-95" : "opacity-100";

  let extraClasses = "";
  if (isSelected && !isConnectingMode) {
    extraClasses = "ring-4 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] border-amber-500 scale-105";
  } else if (isSource) {
    extraClasses = "ring-4 ring-emerald-500 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.8)] border-emerald-500 scale-105";
  } else if (isPossibleTarget) {
    extraClasses = "ring-2 ring-blue-500 border-blue-400 scale-102 animate-pulse hover:ring-4 cursor-cell";
  }

  return (
    <div className={`relative w-24 h-24 flex items-center justify-center transition-all duration-300 ${isSource || isSelected || isPossibleTarget ? "scale-105" : ""} ${fadeClass}`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-slate-400 border-none z-10" />
      <Handle type="target" position={Position.Top} id="top_in" className="w-2 h-2 !bg-slate-400 border-none z-10" />
      
      <div 
        className={`w-18 h-18 rotate-45 border-2 rounded-sm transition-all duration-300 flex items-center justify-center ${shapeStyle} ${extraClasses || (isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : "")}`}
      >
        <div className="-rotate-45 text-center p-1 w-full">
          <p className="text-[8.5px] font-black uppercase tracking-tight leading-none">
            {data.label}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 !bg-slate-400 border-none z-10" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2 !bg-slate-400 border-none z-10" />
      <Handle type="source" position={Position.Top} id="top" className="w-2 h-2 !bg-slate-400 border-none z-10" />
    </div>
  );
};

// Traditional Hexagonal Committee Node Component
const TraditionalHexagonNode = ({ id, data }: NodeProps) => {
  const isSelected = data.selected;
  const highlightState = data.highlightState;
  const hasSelection = data.hasSelection;
  const themeConfig = CATEGORY_STYLE_MAP.hexagon;

  const isConnectingMode = data.isConnectingMode;
  const isSource = data.connectionSourceNodeId === id;
  const isPossibleTarget = isConnectingMode && !isSource;

  let hexagonStyle = "border-[#1A202C] bg-white text-[#1A202C]";
  if (highlightState === "active") {
    hexagonStyle = "border-blue-600 bg-blue-50 text-blue-900 ring-4 ring-blue-500/20";
  } else if (highlightState === "completed") {
    hexagonStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
  }

  // Visual focus effect for active paths
  const fadeClass = hasSelection && highlightState === "none" ? "opacity-30 grayscale-[30%] scale-95" : "opacity-100";

  let extraClasses = "";
  if (isSelected && !isConnectingMode) {
    extraClasses = "ring-4 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] border-amber-500 scale-105";
  } else if (isSource) {
    extraClasses = "ring-4 ring-emerald-500 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.8)] border-emerald-500 scale-105";
  } else if (isPossibleTarget) {
    extraClasses = "ring-2 ring-blue-500 border-blue-400 scale-102 animate-pulse hover:ring-4 cursor-cell";
  }

  return (
    <div className={`relative w-24 h-20 flex items-center justify-center transition-all duration-300 ${fadeClass}`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-slate-400 border-none z-10" />
      <Handle type="target" position={Position.Top} id="top_in" className="w-2 h-2 !bg-slate-400 border-none z-10" />

      <div 
        style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}
        className={`w-24 h-18 border-2 transition-all duration-300 flex items-center justify-center p-2 text-center ${hexagonStyle} ${extraClasses || (isSelected ? "scale-105 ring-2 ring-indigo-500 ring-offset-1" : "")}`}
      >
        <p className="text-[8px] font-extrabold uppercase leading-tight">
          {data.label}
        </p>
      </div>

      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 !bg-slate-400 border-none z-10" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2 !bg-slate-400 border-none z-10" />
    </div>
  );
};

// Mapping Nodes to React Flow NodeTypes
const NODE_TYPES = {
  process_rect: TraditionalRectangleNode,
  decision_diamond: TraditionalDiamondNode,
  comite_hexagon: TraditionalHexagonNode
};

function WorkflowTraditionalInner({ contracts, onContractClick, onRefresh }: WorkflowTraditionalProps) {
  const { setCenter, fitView } = useReactFlow();
  
  // Custom states for loading, locking, and saving diagram layout
  const [isLoadingLayout, setIsLoadingLayout] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [unlockMode, setUnlockMode] = useState<'edit' | 'pan-only'>('edit');
  
  // Connection creation mode states
  const [connectionSourceNodeId, setConnectionSourceNodeId] = useState<string | null>(null);
  const [connectionTargetNodeId, setConnectionTargetNodeId] = useState<string | null>(null);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);

  // Dragging node and operation mode tracking state
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  // Automatic/Manual contract stage advancement states
  const [isAdvancingContract, setIsAdvancingContract] = useState(false);
  const [advanceOptions, setAdvanceOptions] = useState<Node[]>([]);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  // Authorization permissions check
  const { hasPermission } = useAuthStore();
  const canEdit = hasPermission("modulos", "fluxoOperacionalTradicional", "editar");

  // ReactFlow Nodes and Edges controlled states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Selections state
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const activeSelectedEdgeId = useMemo(() => {
    if (selectedEdgeId) return selectedEdgeId;
    return edges.find(e => e.selected)?.id || null;
  }, [selectedEdgeId, edges]);

  // Custom Autocomplete Search Dropdown state
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Undo/Redo History Stacks
  const [historyStack, setHistoryStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as any)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced auto-save to avoid high-frequency database requests
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSave = useCallback((currentNodes: Node[], currentEdges: Edge[], currentLock: boolean) => {
    if (!canEdit) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const nodesToSave = currentNodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            label: n.data.label,
            subtitle: n.data.subtitle,
            category: n.data.category
          }
        }));

        await fetch("/api/workflow/traditional-layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: nodesToSave,
            edges: currentEdges,
            lockState: currentLock,
            zoom: 0.95
          })
        });
      } catch (err) {
        console.error("Erro no salvamento automático:", err);
      }
    }, 1000); // 1-second debounce
  }, [canEdit]);

  // Helper to push state to history before mutation
  const pushToHistory = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    const cleanNodes = currentNodes.map(n => ({
      id: n.id,
      type: n.type,
      position: { ...n.position },
      data: {
        label: n.data.label,
        subtitle: n.data.subtitle,
        category: n.data.category
      }
    }));
    const cleanEdges = currentEdges.map(e => ({ ...e }));
    
    setHistoryStack(prev => [...prev, { nodes: cleanNodes, edges: cleanEdges }]);
    setRedoStack([]); // Clear redo on new action
  }, []);

  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    
    // Capture current state for Redo
    const currentClean = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: { ...n.position },
        data: { label: n.data.label, subtitle: n.data.subtitle, category: n.data.category }
      })),
      edges: edges.map(e => ({ ...e }))
    };

    setRedoStack(prev => [...prev, currentClean]);
    setHistoryStack(prev => prev.slice(0, prev.length - 1));

    setNodes(previous.nodes);
    setEdges(previous.edges);
    triggerAutoSave(previous.nodes, previous.edges, isLocked);
  }, [historyStack, nodes, edges, isLocked, setNodes, setEdges, triggerAutoSave]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];

    // Capture current state for Undo
    const currentClean = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: { ...n.position },
        data: { label: n.data.label, subtitle: n.data.subtitle, category: n.data.category }
      })),
      edges: edges.map(e => ({ ...e }))
    };

    setHistoryStack(prev => [...prev, currentClean]);
    setRedoStack(prev => prev.slice(0, prev.length - 1));

    setNodes(next.nodes);
    setEdges(next.edges);
    triggerAutoSave(next.nodes, next.edges, isLocked);
  }, [redoStack, nodes, edges, isLocked, setNodes, setEdges, triggerAutoSave]);

  // Node/Edge Deletion
  const handleDeleteSelected = useCallback((forceType?: "node" | "edge") => {
    if (isLocked) return;
    const activeNodeId = selectedNodeId || nodes.find((n) => n.selected)?.id;
    const activeEdgeId = selectedEdgeId || edges.find((e) => e.selected)?.id;

    const shouldDeleteNode = forceType === "node" || (forceType === undefined && activeNodeId);
    const shouldDeleteEdge = forceType === "edge" || (forceType === undefined && !shouldDeleteNode && activeEdgeId);

    if (shouldDeleteNode && activeNodeId) {
      if (confirm("Tem certeza que deseja excluir este nó? Todas as conexões ligadas a ele serão removidas.")) {
        pushToHistory(nodes, edges);
        setNodes((nds) => {
          const nextNds = nds.filter((n) => n.id !== activeNodeId);
          setEdges((eds) => {
            const nextEds = eds.filter((e) => e.source !== activeNodeId && e.target !== activeNodeId);
            triggerAutoSave(nextNds, nextEds, isLocked);
            return nextEds;
          });
          return nextNds;
        });
        setSelectedNodeId(null);
      }
    } else if (shouldDeleteEdge && activeEdgeId) {
      if (confirm("Tem certeza que deseja remover esta conexão?")) {
        pushToHistory(nodes, edges);
        setEdges((eds) => {
          const nextEds = eds.filter((e) => e.id !== activeEdgeId);
          triggerAutoSave(nodes, nextEds, isLocked);
          return nextEds;
        });
        setSelectedEdgeId(null);
      }
    }
  }, [isLocked, selectedNodeId, selectedEdgeId, nodes, edges, pushToHistory, setNodes, setEdges, triggerAutoSave, setSelectedNodeId, setSelectedEdgeId]);

  // Keyboard Shortcuts for Undo/Redo (Ctrl+Z and Ctrl+Y), Delete, and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;

      // Escape key handles cancelling of modes or selections
      if (e.key === "Escape") {
        const hasActiveState = 
          connectionSourceNodeId || 
          connectionTargetNodeId || 
          selectedNodeId || 
          selectedEdgeId || 
          selectedContractId || 
          isDraggingNode ||
          isAdvanceModalOpen ||
          isConnectionModalOpen;

        if (hasActiveState) {
          e.preventDefault();
          setConnectionSourceNodeId(null);
          setConnectionTargetNodeId(null);
          setIsConnectionModalOpen(false);
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setSelectedContractId(null);
          setIsDraggingNode(false);
          setIsAdvanceModalOpen(false);
        }
        return;
      }

      // Do not trigger shortcuts if the user is typing in input or textarea
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey; // cmd/ctrl
      if (isCtrl) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          handleUndo();
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          handleRedo();
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const activeNodeId = selectedNodeId || nodes.find((n) => n.selected)?.id;
        const activeEdgeId = selectedEdgeId || edges.find((e) => e.selected)?.id;
        if (activeNodeId || activeEdgeId) {
          e.preventDefault();
          handleDeleteSelected(activeNodeId ? "node" : "edge");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleUndo, 
    handleRedo, 
    isLocked, 
    selectedNodeId, 
    selectedEdgeId, 
    nodes, 
    edges, 
    handleDeleteSelected,
    connectionSourceNodeId,
    connectionTargetNodeId,
    selectedContractId,
    isDraggingNode,
    isAdvanceModalOpen,
    isConnectionModalOpen
  ]);

  // Custom onNodesChange wrapper to save history & auto-save on removal
  const onNodesChangeCustom = useCallback((changes: NodeChange[]) => {
    const isRemoving = changes.some(c => c.type === 'remove');
    if (isRemoving) {
      pushToHistory(nodes, edges);
    }
    
    setNodes((currentNds) => {
      const nextNds = applyNodeChanges(changes, currentNds);
      if (isRemoving) {
        triggerAutoSave(nextNds, edges, isLocked);
      }
      return nextNds;
    });

    const selectChange = changes.find(c => c.type === 'select');
    if (selectChange && 'selected' in selectChange) {
      if (selectChange.selected) {
        setSelectedNodeId(selectChange.id);
        setSelectedEdgeId(null);
      } else if (selectedNodeId === selectChange.id) {
        setSelectedNodeId(null);
      }
    }
  }, [nodes, edges, pushToHistory, triggerAutoSave, isLocked, setNodes, selectedNodeId]);

  // Custom onEdgesChange wrapper to save history & auto-save on removal
  const onEdgesChangeCustom = useCallback((changes: EdgeChange[]) => {
    const isRemoving = changes.some(c => c.type === 'remove');
    if (isRemoving) {
      pushToHistory(nodes, edges);
    }
    
    setEdges((currentEds) => {
      const nextEds = applyEdgeChanges(changes, currentEds);
      if (isRemoving) {
        triggerAutoSave(nodes, nextEds, isLocked);
      }
      return nextEds;
    });

    const selectChange = changes.find(c => c.type === 'select');
    if (selectChange && 'selected' in selectChange) {
      if (selectChange.selected) {
        setSelectedEdgeId(selectChange.id);
        setSelectedNodeId(null);
      } else if (selectedEdgeId === selectChange.id) {
        setSelectedEdgeId(null);
      }
    }
  }, [nodes, edges, pushToHistory, triggerAutoSave, isLocked, setEdges, selectedEdgeId]);

  // Fetch / Load custom flowchart layout from Backend Database
  const fetchDiagramLayout = async () => {
    setIsLoadingLayout(true);
    try {
      const res = await fetch("/api/workflow/traditional-layout");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.layout) {
          const loadedNodes = data.layout.nodes || [];
          const loadedEdges = data.layout.edges || [];
          const loadedLock = data.layout.lockState !== undefined ? data.layout.lockState : true;
          
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setIsLocked(loadedLock);
          return;
        }
      }
    } catch (err) {
      console.error("Erro ao carregar o layout do fluxograma:", err);
    } finally {
      setIsLoadingLayout(false);
    }

    // Default Fallback mapping if no database record exists
    setNodes(DEFAULT_NODES_DEF);
    setEdges(DEFAULT_EDGES_DEF);
    setIsLocked(true);
  };

  // Run on mount
  useEffect(() => {
    fetchDiagramLayout();
  }, []);

  // Handle Save Layout to database API
  const handleSaveLayout = async () => {
    if (!canEdit) return;
    setIsSavingLayout(true);
    try {
      // Clear runtime operational overlays from data objects before saving to keep schema pristine
      const nodesToSave = nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          label: n.data.label,
          subtitle: n.data.subtitle,
          category: n.data.category
        }
      }));

      const res = await fetch("/api/workflow/traditional-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: nodesToSave,
          edges: edges,
          lockState: isLocked,
          zoom: 0.95
        })
      });

      if (res.ok) {
        alert("Layout do fluxograma salvo com sucesso!");
      } else {
        const errData = await res.json();
        alert(`Erro ao salvar layout: ${errData.error || "Ocorreu um erro."}`);
      }
    } catch (err) {
      console.error("Erro ao salvar layout:", err);
      alert("Falha técnica ao tentar salvar o desenho do fluxograma.");
    } finally {
      setIsSavingLayout(false);
    }
  };

  // Real-time search filter query (all matching contracts)
  const filteredSearchContracts = useMemo(() => {
    if (!searchQuery) return contracts;
    const term = searchQuery.toLowerCase();
    return contracts.filter(c => 
      c.nome?.toLowerCase().includes(term) || 
      c.cliente?.toLowerCase().includes(term)
    );
  }, [contracts, searchQuery]);

  // Handle contract select action
  const handleSelectContract = useCallback((contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    setSelectedContractId(contractId);
    setIsDropdownOpen(false);
    setSearchQuery(contract.nome);

    // Calculate which flowchart node this contract is on
    const targetNodeId = MAP_CONTRACT_TO_NODE_ID(contract);
    setSelectedNodeId(targetNodeId);

    // Smooth scroll and zoom view to focus on the target stage node
    const nodePosition = nodes.find(n => n.id === targetNodeId);
    if (nodePosition) {
      setCenter(nodePosition.position.x + 95, nodePosition.position.y + 35, { zoom: 0.95, duration: 800 });
    }

    // Automatically open the side details Drawer/panel
    onContractClick(contractId);
  }, [contracts, nodes, setCenter, onContractClick]);

  // Full reset option (returns to "all contracts highlighted" state)
  const handleClearSelection = useCallback(() => {
    setSelectedContractId(null);
    setSelectedNodeId(null);
    setSearchQuery("");
    fitView({ duration: 800, padding: 0.1 });
  }, [fitView]);

  // Retrieve active selected contract
  const selectedContract = useMemo(() => {
    if (!selectedContractId) return null;
    return contracts.find(c => c.id === selectedContractId) || null;
  }, [selectedContractId, contracts]);

  // Fetch the active target node ID for selected contract
  const selectedContractNodeId = useMemo(() => {
    if (!selectedContract) return null;
    return MAP_CONTRACT_TO_NODE_ID(selectedContract);
  }, [selectedContract]);

  // Highlight computation logic for the flowchart route
  const getNodeHighlightState = useCallback((nodeId: string): "completed" | "active" | "none" => {
    if (!selectedContractNodeId) {
      // Default / "All" selected state:
      // Highlight any node that actually contains contracts
      const hasContracts = contracts.some(c => MAP_CONTRACT_TO_NODE_ID(c) === nodeId);
      return hasContracts ? "active" : "none";
    }
    
    // Specific contract is selected:
    if (nodeId === selectedContractNodeId) return "active";

    const targetIndex = CHRONO_ORDER.indexOf(selectedContractNodeId);
    const nodeIndex = CHRONO_ORDER.indexOf(nodeId);

    if (nodeIndex !== -1 && targetIndex !== -1 && nodeIndex < targetIndex) {
      return "completed";
    }
    return "none";
  }, [selectedContractNodeId, contracts]);

  // List of contracts placed inside the selected stage node
  const contractsInSelectedNode = useMemo(() => {
    if (!selectedNodeId) return [];
    return contracts.filter(c => MAP_CONTRACT_TO_NODE_ID(c) === selectedNodeId);
  }, [selectedNodeId, contracts]);

  // Triggered when clicking a box in the diagram
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (connectionSourceNodeId) {
      event.stopPropagation();
      if (node.id === connectionSourceNodeId) {
        alert("Não é possível criar uma conexão para o mesmo elemento de origem.");
        return;
      }
      setConnectionTargetNodeId(node.id);
      setIsConnectionModalOpen(true);
      return;
    }
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, [connectionSourceNodeId]);

  // Triggered when clicking a connection line
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  // Triggered when clicking on canvas empty space
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  // Whenever contracts or highlight configurations change, dynamically update nodes data object properties
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const isNodeSelected = selectedNodeId === node.id;
        const highlightState = getNodeHighlightState(node.id);
        const stageContracts = contracts.filter((c) => MAP_CONTRACT_TO_NODE_ID(c) === node.id);
        
        return {
          ...node,
          selected: isNodeSelected,
          data: {
            ...node.data,
            count: stageContracts.length,
            contracts: stageContracts,
            highlightState,
            selected: isNodeSelected,
            hasSelection: !!selectedContractId,
            connectionSourceNodeId,
            isConnectingMode: !!connectionSourceNodeId
          }
        };
      })
    );
  }, [contracts, selectedContractNodeId, selectedNodeId, getNodeHighlightState, setNodes, selectedContractId, connectionSourceNodeId]);

  // Generate connection edges dynamically mapping highlight colors
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      let animated = false;
      let stroke = "#64748B"; // default Slate 500 arrow style for crisp visibility
      let strokeWidth = 2.5;  // thicker gray lines
      let opacity = 1.0;

      if (selectedContractNodeId) {
        const sourceHighlight = getNodeHighlightState(edge.source);
        const targetHighlight = getNodeHighlightState(edge.target);

        if (
          (sourceHighlight === "completed" || sourceHighlight === "active") &&
          (targetHighlight === "completed" || targetHighlight === "active")
        ) {
          stroke = "#10B981"; // Vibrant emerald path
          strokeWidth = 3.5;
          animated = true;
        } else if (sourceHighlight === "active" || targetHighlight === "active") {
          stroke = "#3B82F6"; // Vibrant blue path
          strokeWidth = 3.5;
          animated = true;
        } else {
          stroke = "#CBD5E1"; // Faded out path
          strokeWidth = 1.5;
          opacity = 0.25;
        }
      } else {
        // Default "All selected" state: highlight connections where both ends contain active contracts
        const sourceHas = contracts.some((c) => MAP_CONTRACT_TO_NODE_ID(c) === edge.source);
        const targetHas = contracts.some((c) => MAP_CONTRACT_TO_NODE_ID(c) === edge.target);
        if (sourceHas && targetHas) {
          stroke = "#3B82F6";
          strokeWidth = 3.0;
          animated = true;
        }
      }

      const isSelected = selectedEdgeId === edge.id;
      if (isSelected) {
        stroke = "#EF4444";
        strokeWidth = 4.0;
        opacity = 1.0;
      }

      return {
        ...edge,
        selected: isSelected,
        animated,
        style: { stroke, strokeWidth, opacity },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: stroke,
          width: 20, // larger and bolder arrowheads
          height: 20
        }
      };
    });
  }, [edges, selectedContractNodeId, getNodeHighlightState, contracts, selectedEdgeId]);

  // Center/Fit overview
  const handleVoltarGeral = useCallback(() => {
    fitView({ duration: 800, padding: 0.1 });
  }, [fitView]);

  // Interactive Node Addition
  const handleAddNode = (type: "process_rect" | "decision_diamond" | "comite_hexagon") => {
    if (isLocked) return;
    pushToHistory(nodes, edges);
    const id = "custom_" + Math.random().toString(36).substr(2, 9);
    const newNode: Node = {
      id,
      type,
      position: { x: 300, y: 300 },
      data: {
        label: type === "process_rect" ? "Novo Processo" : type === "decision_diamond" ? "Nova Decisão" : "Novo Comitê",
        subtitle: "",
        category: type === "process_rect" ? "blue" : type === "decision_diamond" ? "grey_diamond" : "hexagon"
      }
    };
    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    triggerAutoSave(nextNodes, edges, isLocked);
  };

  // Reverse mapping from node configuration to actual system ERP state (etapa & subetapa & status)
  const MAP_NODE_ID_TO_WORKFLOW_STATE = (node: Node): { etapa: string; subetapa: string; status: string } => {
    const nodeId = node.id;
    
    // Official nodes mapping
    const officialMap: Record<string, { etapa: string; subetapa: string; status: string }> = {
      abertura_pasta: { etapa: "Solicitação", subetapa: "Abertura de Pasta", status: "Em Andamento" },
      solicitacao: { etapa: "Solicitação", subetapa: "Análise de Solicitação", status: "Em Andamento" },
      via_pc: { etapa: "Solicitação", subetapa: "Via PC / Hunter", status: "Em Andamento" },
      levantamento: { etapa: "Arquitetura", subetapa: "Levantamento", status: "Em Andamento" },
      arquitetura: { etapa: "Arquitetura", subetapa: "Projeto de Arquitetura", status: "Em Andamento" },
      arquitetura_comite: { etapa: "Arquitetura", subetapa: "Comitê de Arquitetura", status: "Em Andamento" },
      comite_orcamento: { etapa: "Orçamento", subetapa: "Comitê de Orçamento", status: "Em Andamento" },
      comercial_comite: { etapa: "Orçamento", subetapa: "Comercial Comitê", status: "Em Andamento" },
      confeccao_orc: { etapa: "Orçamento", subetapa: "Confecção de Orçamento", status: "Em Andamento" },
      declinado: { etapa: "Proposta", subetapa: "Declinado / Recusado", status: "Atrasado" },
      valores_industria: { etapa: "Proposta", subetapa: "Valores Indústria", status: "Em Andamento" },
      proposta_aprovada: { etapa: "Proposta", subetapa: "Proposta Aprovada", status: "Finalizado" },
      projeto_executivo: { etapa: "Projeto Executivo", subetapa: "Desenvolvimento", status: "Em Andamento" },
      folha_corte: { etapa: "Produção", subetapa: "Folha de Corte", status: "Em Andamento" },
      medicao_loco: { etapa: "Execução", subetapa: "Medição in Loco", status: "Em Andamento" },
      planejamento: { etapa: "Execução", subetapa: "Planejamento / Equipe", status: "Em Andamento" },
      bms: { etapa: "Execução", subetapa: "BMS / Medições", status: "Em Andamento" },
      termo_entrega: { etapa: "Execução", subetapa: "Termo de Entrega", status: "Em Andamento" },
      execucao: { etapa: "Execução", subetapa: "Execução Geral", status: "Em Andamento" },
      financeiro_lancamento: { etapa: "Financeiro", subetapa: "Lançamentos e NF", status: "Em Andamento" },
      contrato_cliente: { etapa: "Financeiro", subetapa: "Contrato com Cliente", status: "Em Andamento" },
      financeiro: { etapa: "Financeiro", subetapa: "Gestão Financeira", status: "Em Andamento" },
      diretoria: { etapa: "Encerrado", subetapa: "Revisão Diretoria", status: "Finalizado" },
      pos_vendas: { etapa: "Encerrado", subetapa: "Pós-Venda", status: "Finalizado" },
      cliente_final: { etapa: "Encerrado", subetapa: "Entrega Final", status: "Finalizado" }
    };

    if (officialMap[nodeId]) {
      return officialMap[nodeId];
    }

    // Custom node mapping based on category style color code matching
    const category = node.data?.category || "blue";
    let etapa = "Produção";
    
    if (category === "blue") etapa = "Solicitação";
    else if (category === "yellow") etapa = "Arquitetura";
    else if (category === "orange") etapa = "Orçamento";
    else if (category === "purple") etapa = "Financeiro";
    else if (category === "green") etapa = "Produção";
    else if (category === "cyan") etapa = "Proposta";
    else if (category === "pink") etapa = "Execução";
    else if (category === "emerald") etapa = "Encerrado";

    return {
      etapa,
      subetapa: node.data?.label || "Etapa Customizada",
      status: "Em Andamento"
    };
  };

  // Helper to resolve handle positions depending on the chosen custom type
  const getConnectionHandles = (type: string) => {
    switch (type) {
      case "right":
        return { sourceHandle: null, targetHandle: null };
      case "left":
        return { sourceHandle: "left", targetHandle: "right" };
      case "up":
        return { sourceHandle: "top", targetHandle: "top_in" };
      case "down":
        return { sourceHandle: "bottom", targetHandle: "bottom" };
      case "bidirectional":
        return { sourceHandle: null, targetHandle: null };
      default:
        return { sourceHandle: null, targetHandle: null };
    }
  };

  // Confirm connection placement and style properties
  const confirmCreateConnection = (type: "right" | "left" | "up" | "down" | "bidirectional") => {
    if (!connectionSourceNodeId || !connectionTargetNodeId) return;

    const handles = getConnectionHandles(type);
    
    pushToHistory(nodes, edges);
    setEdges((eds) => {
      const nextEds = addEdge({
        id: "e-" + Math.random().toString(36).substring(2, 11),
        source: connectionSourceNodeId,
        target: connectionTargetNodeId,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        style: { stroke: "#64748B", strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748B",
          width: 20,
          height: 20
        },
        markerStart: type === "bidirectional" ? {
          type: MarkerType.ArrowClosed,
          color: "#64748B",
          width: 20,
          height: 20
        } : undefined,
        data: { type }
      }, eds);

      // Save directly to the backend
      triggerAutoSave(nodes, nextEds, isLocked);
      return nextEds;
    });

    // Reset states
    setConnectionSourceNodeId(null);
    setConnectionTargetNodeId(null);
    setIsConnectionModalOpen(false);
  };

  // Analyzes workflow targets and advances the selected contract
  const handleAdvanceContract = async () => {
    if (!selectedContract) return;
    const currentId = MAP_CONTRACT_TO_NODE_ID(selectedContract);
    
    // Find outbound edges from currentId
    const targetNodeIds = edges
      .filter((e) => e.source === currentId)
      .map((e) => e.target);
    
    const uniqueTargets = Array.from(new Set(targetNodeIds));
    const nextNodes = uniqueTargets
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean) as Node[];

    if (nextNodes.length === 0) {
      alert("Nenhum caminho de saída definido para este nó no fluxograma. Adicione uma conexão para poder avançar de etapa.");
      return;
    }

    if (nextNodes.length === 1) {
      // Just one option, move immediately!
      await performContractMovement(nextNodes[0]);
    } else {
      // Multiple options, open modal
      setAdvanceOptions(nextNodes);
      setIsAdvanceModalOpen(true);
    }
  };

  // Perform contract movement API call
  const performContractMovement = async (targetNode: Node) => {
    if (!selectedContract) return;
    setIsAdvancingContract(true);
    
    const state = MAP_NODE_ID_TO_WORKFLOW_STATE(targetNode);
    
    try {
      const res = await fetch(`/api/obras/${selectedContract.id}/workflow/movimentar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novaEtapa: state.etapa,
          subetapa: state.subetapa,
          workflowStatus: state.status,
          descricao: `Avanço automático no Fluxograma para: ${state.subetapa}`,
          observacao: `Movimentado via botão Avançar no Fluxograma Tradicional.`
        })
      });

      if (res.ok) {
        if (onRefresh) {
          onRefresh();
        }
        alert(`Contrato avançado com sucesso para a etapa "${state.etapa} - ${state.subetapa}"!`);
        setIsAdvanceModalOpen(false);
      } else {
        const err = await res.json();
        alert(`Erro ao movimentar contrato: ${err.error || "Ocorreu um erro."}`);
      }
    } catch (e) {
      console.error(e);
      alert("Erro técnico ao tentar movimentar o contrato.");
    } finally {
      setIsAdvancingContract(false);
    }
  };

  // Selected Node Property Editing Updates
  const updateSelectedNodeData = (field: string, value: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) => {
      const nextNds = nds.map((n) => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              [field]: value
            }
          };
        }
        return n;
      });
      triggerAutoSave(nextNds, edges, isLocked);
      return nextNds;
    });
  };



  // Node Connection/Edge additions
  const onConnect = useCallback((params: Connection) => {
    if (isLocked) return;
    pushToHistory(nodes, edges);
    setEdges((eds) => {
      const nextEds = addEdge({
        ...params,
        id: "e-" + Math.random().toString(36).substr(2, 9),
        style: { stroke: "#64748B", strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#64748B",
          width: 20,
          height: 20
        }
      }, eds);
      triggerAutoSave(nodes, nextEds, isLocked);
      return nextEds;
    });
  }, [isLocked, nodes, edges, setEdges, pushToHistory, triggerAutoSave]);

  // Selected node currently focused helper
  const selectedNodeObj = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, nodes]);

  // Check if selected node is an official mapped ERP node to warn user about changing ID
  const isSelectedNodeOfficial = useMemo(() => {
    if (!selectedNodeId) return false;
    return CHRONO_ORDER.includes(selectedNodeId);
  }, [selectedNodeId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[750px]">
      
      {/* 1. ERP-STYLE SIDEBAR & INTEGRAL CONTROLS */}
      <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden shadow-xs h-full">
        
        {/* Modern ERP-Style Selection Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">
              Rastreamento Operacional
            </span>
            {(selectedContractId || selectedNodeId || selectedEdgeId) && (
              <button 
                onClick={handleClearSelection}
                className="px-2 py-0.5 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-md text-[9px] font-black uppercase transition-colors flex items-center gap-0.5 cursor-pointer border border-slate-200"
              >
                <X className="w-2.5 h-2.5" />
                Limpar
              </button>
            )}
          </div>

          {/* Autocomplete Search input wrapper */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                placeholder="Pesquisar contrato..."
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary bg-white transition-all cursor-text"
              />
              <button 
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropping Panel options */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-150 rounded-xl shadow-lg z-50 divide-y divide-slate-50"
                >
                  {filteredSearchContracts.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-[10px] font-bold font-mono">
                      Nenhum contrato localizado
                    </div>
                  ) : (
                    filteredSearchContracts.map(c => {
                      const isActive = selectedContractId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelectContract(c.id)}
                          className={`w-full text-left p-2.5 text-xs transition-colors flex items-center justify-between hover:bg-slate-50 cursor-pointer ${isActive ? "bg-indigo-50/55 font-black text-indigo-700" : "font-bold text-slate-700"}`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate">{c.nome}</p>
                            <p className="text-[9px] font-semibold text-slate-400 truncate leading-none mt-0.5">{c.cliente}</p>
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md uppercase shrink-0 text-slate-500 font-mono">
                            {c.workflowEtapa}
                          </span>
                        </button>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic Detail & Selection display area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          
          {/* Visual Designer Panel (Unlocked Mode) */}
          {!isLocked && canEdit && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
              <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block font-mono">
                Ferramentas de Design
              </span>
              
              {/* Add Elements buttons */}
              <div className="space-y-1.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Adicionar Elemento</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => handleAddNode("process_rect")}
                    className="py-1 px-1 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-[9px] font-black text-amber-900 transition-all cursor-pointer shadow-2xs flex flex-col items-center justify-center gap-1 text-center"
                    title="Adicionar Caixa Retangular de Processo"
                  >
                    <span className="w-4 h-2.5 bg-[#E3F2FD] border border-[#1E88E5] rounded-xs" />
                    + Processo
                  </button>
                  <button
                    onClick={() => handleAddNode("decision_diamond")}
                    className="py-1 px-1 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-[9px] font-black text-amber-900 transition-all cursor-pointer shadow-2xs flex flex-col items-center justify-center gap-1 text-center"
                    title="Adicionar Losango de Decisão"
                  >
                    <span className="w-3 h-3 rotate-45 bg-[#EDF2F7] border border-[#4A5568] rounded-2xs" />
                    + Decisão
                  </button>
                  <button
                    onClick={() => handleAddNode("comite_hexagon")}
                    className="py-1 px-1 bg-white hover:bg-amber-100/50 border border-amber-200 rounded-lg text-[9px] font-black text-amber-900 transition-all cursor-pointer shadow-2xs flex flex-col items-center justify-center gap-1 text-center"
                    title="Adicionar Hexágono de Comitê"
                  >
                    <span className="w-3 h-3 bg-white border border-slate-900" style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }} />
                    + Comitê
                  </button>
                </div>
              </div>

              {/* Node Properties Panel */}
              {selectedNodeObj ? (
                <div className="border-t border-amber-200/50 pt-2.5 mt-2.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Propriedades do Nó</span>
                    <button
                      onClick={() => handleDeleteSelected("node")}
                      className="text-[9px] font-extrabold text-rose-600 hover:text-rose-800 flex items-center gap-0.5"
                    >
                      <Trash className="w-3 h-3 shrink-0" />
                      Excluir Nó
                    </button>
                  </div>

                  {/* Add Connection Action button */}
                  <button
                    onClick={() => {
                      setConnectionSourceNodeId(selectedNodeId);
                    }}
                    className={`w-full py-2 flex items-center justify-center gap-1.5 font-black text-[10.5px] uppercase rounded-xl transition-all shadow-sm cursor-pointer border ${
                      connectionSourceNodeId === selectedNodeId
                        ? "bg-emerald-600 text-white border-emerald-700 animate-pulse"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    {connectionSourceNodeId === selectedNodeId ? "Criando Conexão..." : "Adicionar Conexão"}
                  </button>

                  {/* ID Warning for Official integrations */}
                  {isSelectedNodeOfficial && (
                    <div className="p-1.5 bg-blue-100/60 border border-blue-200 rounded-lg text-[8.5px] text-blue-800 leading-tight flex gap-1 items-start">
                      <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span><strong>Nó Operacional do ERP.</strong> Modifique apenas os textos ou cores, evite remover para preservar o rastreamento automático.</span>
                    </div>
                  )}

                  {/* Label input */}
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-extrabold text-slate-500 uppercase">Texto Principal</label>
                    <textarea
                      rows={2}
                      value={selectedNodeObj.data.label || ""}
                      onFocus={() => pushToHistory(nodes, edges)}
                      onChange={(e) => updateSelectedNodeData("label", e.target.value)}
                      className="w-full px-2 py-1 border border-amber-200 bg-white rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-amber-500 resize-none font-sans"
                    />
                  </div>

                  {/* Subtitle / Subtext (for rectangular nodes) */}
                  {selectedNodeObj.type === "process_rect" && (
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-extrabold text-slate-500 uppercase">Subtítulo / Descrição</label>
                      <textarea
                        rows={2}
                        value={selectedNodeObj.data.subtitle || ""}
                        onFocus={() => pushToHistory(nodes, edges)}
                        onChange={(e) => updateSelectedNodeData("subtitle", e.target.value)}
                        className="w-full px-2 py-1 border border-amber-200 bg-white rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-amber-500 resize-none font-mono"
                      />
                    </div>
                  )}

                  {/* Category Dropdown (Styles Mapping) */}
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-extrabold text-slate-500 uppercase">Estilo Visual / Categoria</label>
                    <select
                      value={selectedNodeObj.data.category || "blue"}
                      onFocus={() => pushToHistory(nodes, edges)}
                      onChange={(e) => updateSelectedNodeData("category", e.target.value)}
                      className="w-full px-1.5 py-1 border border-amber-200 bg-white rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {Object.entries(CATEGORY_STYLE_MAP).map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : activeSelectedEdgeId ? (
                <div className="border-t border-amber-200/50 pt-2.5 mt-2.5 flex items-center justify-between">
                  <span className="text-[8.5px] font-black text-slate-500 uppercase">Conexão Selecionada</span>
                  <button
                    onClick={() => handleDeleteSelected("edge")}
                    className="text-[9px] font-extrabold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 border border-rose-200 px-2 py-1 bg-white rounded-lg cursor-pointer"
                  >
                    <Trash className="w-3 h-3 shrink-0" />
                    Remover Conexão
                  </button>
                </div>
              ) : (
                <p className="text-[9px] text-amber-800 italic text-center pt-2 leading-tight">
                  Selecione um nó ou conexão na tela para editar suas propriedades.
                </p>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            {selectedContract ? (
              <motion.div
                key="contract-selected"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4 font-sans"
              >
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest font-mono">Contrato Rastreado</p>
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">{selectedContract.nome}</h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{selectedContract.cliente}</p>
                </div>

                {/* Progress Indicators & stage metadata */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block font-mono">Status de Atividade</span>
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                      <div className="text-[10.5px] font-extrabold text-slate-700 leading-snug">
                        Etapa no Diagrama: <span className="text-indigo-600 font-black uppercase text-[11px] block mt-0.5">{selectedContract.workflowEtapa}</span>
                      </div>
                      
                      {selectedContract.workflowResponsavel && (
                        <div className="text-[9.5px] font-bold text-slate-500 flex items-center gap-1.5 border-t border-slate-150/50 pt-2 font-mono">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Resp: <span className="text-slate-700">{selectedContract.workflowResponsavel}</span></span>
                        </div>
                      )}

                      {selectedContract.workflowPrazo && (
                        <div className="text-[9.5px] font-bold text-slate-500 flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Prazo SLA: <span className="text-slate-700">{selectedContract.workflowPrazo}</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedContract.workflowObservacao && (
                    <div className="space-y-1">
                      <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block font-mono">Observações</span>
                      <p className="text-[10px] text-slate-600 italic bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl leading-relaxed">
                        "{selectedContract.workflowObservacao}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleAdvanceContract}
                    disabled={isAdvancingContract}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-sm text-center flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdvancingContract ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    Avançar para Próxima Etapa
                  </button>

                  <button
                    onClick={() => onContractClick(selectedContract.id)}
                    className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-sm text-center block"
                  >
                    Gerenciar via Drawer
                  </button>
                </div>
              </motion.div>
            ) : selectedNodeId ? (
              <motion.div
                key="node-selected"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 font-mono">Foco de Etapa</span>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-normal whitespace-pre-wrap">
                    {nodes.find(n => n.id === selectedNodeId)?.data.label || selectedNodeId}
                  </h4>
                  <span className="text-[10px] font-bold text-indigo-600 mt-1 block">
                    {contractsInSelectedNode.length} Contratos ativos aqui
                  </span>
                </div>

                {/* Listing contracts positioned inside clicked node */}
                <div className="space-y-2">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block font-mono">Contratos na Etapa</span>
                  {contractsInSelectedNode.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-bold italic py-2">
                      Nenhum contrato posicionado nesta etapa.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {contractsInSelectedNode.map(c => (
                        <div 
                          key={c.id}
                          onClick={() => handleSelectContract(c.id)}
                          className="p-2.5 bg-white border border-slate-150 hover:border-indigo-200 rounded-xl cursor-pointer transition-all hover:shadow-2xs group flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-extrabold text-slate-800 group-hover:text-indigo-600 truncate block">
                              {c.nome}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 truncate block mt-0.5">
                              {c.cliente}
                            </span>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-slate-400"
              >
                <FolderOpen className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
                <p className="text-[10.5px] font-black text-slate-600 uppercase font-mono">Navegação Geral</p>
                <p className="text-[9.5px] text-slate-400 mt-1.5 leading-relaxed">
                  Pesquise um contrato acima para traçar seu caminho completo no fluxograma e centralizar na etapa operacional ativa, ou clique em qualquer caixa do processo para listar as obras presentes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend color code guide footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-[8.5px] font-bold text-slate-500 space-y-2">
          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1 font-mono">Legenda do Fluxograma</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-600 shrink-0" />
            <span>Etapa Concluída (Contrato Selecionado)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-600 shrink-0" />
            <span>Etapa Ativa / Com Contratos</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-white border border-slate-300 shrink-0" />
            <span>Etapa Futura / Não Iniciada</span>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC WEB BPMN CANVAS (REACTFLOW WITH ZOOM/PAN) */}
      <div className={`lg:col-span-3 bg-slate-50 rounded-2xl overflow-hidden shadow-inner h-full relative group transition-all duration-300 border ${
        connectionSourceNodeId
          ? "border-emerald-500 ring-2 ring-emerald-500/20 cursor-cell"
          : isDraggingNode
          ? "border-indigo-500 shadow-md"
          : "border-slate-100"
      }`}>
        
        {/* Floating action map utilities */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          
          {/* Lock/Unlock Toggle and Save layout (Authorized Users Only) */}
          {canEdit && (
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex items-center gap-1">
              
              {/* Lock toggle buttons */}
              {isLocked ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setIsLocked(false);
                      setUnlockMode('edit');
                      // Auto-save the lock state toggle
                      triggerAutoSave(nodes, edges, false);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                    title="Destravar para edições completas de processos e conexões"
                  >
                    <PenTool className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    Destravar Edições
                  </button>
                  <button
                    onClick={() => {
                      setIsLocked(false);
                      setUnlockMode('pan-only');
                      // Auto-save the lock state toggle
                      triggerAutoSave(nodes, edges, false);
                    }}
                    className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                    title="Destravar apenas para movimentar/ajustar visualização do diagrama"
                  >
                    <Move className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    Destravar Mover
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsLocked(true);
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                    triggerAutoSave(nodes, edges, true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white ${
                    unlockMode === 'edit' ? 'animate-pulse' : ''
                  }`}
                  title="Bloquear editor contra qualquer tipo de movimentação"
                >
                  <Lock className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>
                    Bloquear Diagrama ({unlockMode === 'edit' ? 'Modo Edição' : 'Modo Navegação'})
                  </span>
                </button>
              )}

              {/* Save Layout Button */}
              {!isLocked && (
                <button
                  onClick={handleSaveLayout}
                  disabled={isSavingLayout}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                  title="Salvar alterações no banco de dados"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  {isSavingLayout ? "Salvando..." : "Salvar Layout"}
                </button>
              )}

              {/* Undo/Redo buttons */}
              {!isLocked && (
                <div className="flex items-center border-l border-slate-150 pl-1.5 ml-1.5 gap-1">
                  <button
                    onClick={handleUndo}
                    disabled={historyStack.length === 0}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-colors"
                    title="Desfazer alteração (Undo)"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg cursor-pointer transition-colors"
                    title="Refazer alteração (Redo)"
                  >
                    <CornerUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Fit View button */}
          <button
            onClick={handleVoltarGeral}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:text-slate-800 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
            title="Ajustar tela para enquadrar todo o fluxo"
          >
            <Maximize2 className="w-3 h-3 shrink-0" />
            Visão Geral
          </button>
        </div>

        {/* Informative overlay toast */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-200/80 px-3 py-2 rounded-xl text-[9px] font-bold text-slate-500 z-10 shadow-xs flex items-center gap-1.5 pointer-events-none font-mono">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            {isLocked 
              ? "Modo Leitura: Clique nas caixas para listar contratos. Use scroll para zoom." 
              : "Designer Ativado! Arraste caixas, conecte handles e altere nomes no painel esquerdo."}
          </span>
        </div>

        {isLoadingLayout ? (
          <div className="absolute inset-0 bg-slate-50/80 z-20 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Carregando Fluxograma...</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            nodeTypes={NODE_TYPES}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onNodesChange={isLocked || unlockMode === 'pan-only' ? undefined : onNodesChangeCustom}
            onEdgesChange={isLocked || unlockMode === 'pan-only' ? undefined : onEdgesChangeCustom}
            onConnect={isLocked || unlockMode === 'pan-only' ? undefined : onConnect}
            onNodeDragStart={() => {
              setIsDraggingNode(true);
              pushToHistory(nodes, edges);
            }}
            onNodeDragStop={() => {
              setIsDraggingNode(false);
              triggerAutoSave(nodes, edges, isLocked);
            }}
            nodesDraggable={!isLocked && unlockMode === 'edit'}
            nodesConnectable={!isLocked && unlockMode === 'edit'}
            elementsSelectable={!isLocked && unlockMode === 'edit'}
            panOnDrag={!isLocked}
            zoomOnScroll={!isLocked}
            zoomOnPinch={!isLocked}
            zoomOnDoubleClick={!isLocked}
            preventScrolling={isLocked}
            selectionKeyCode={isLocked || unlockMode === 'pan-only' ? null : "Shift"}
            multiSelectionKeyCode={isLocked || unlockMode === 'pan-only' ? null : "Meta"}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            minZoom={0.1}
            maxZoom={2.0}
          >
            <Controls className="!bg-white !border-slate-200 !shadow-xs" />
            <MiniMap 
              nodeColor={(node) => {
                if (node.id === selectedContractNodeId) return "#3B82F6";
                if (getNodeHighlightState(node.id) === "completed") return "#10B981";
                return "#CBD5E1";
              }}
              nodeStrokeWidth={2}
              nodeBorderRadius={8}
              className="!border-slate-200 !shadow-xs"
            />
            <Background color="#94a3b8" gap={18} size={1} />
          </ReactFlow>
        )}

        {/* Floating Instruction Banner for Connection Creation */}
        {connectionSourceNodeId && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-emerald-600/95 backdrop-blur-md border border-emerald-500 text-white px-5 py-2.5 rounded-2xl shadow-xl z-20 flex items-center gap-3 font-sans animate-bounce">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span className="text-[10px] font-black tracking-wider uppercase">
              MODO CONEXÃO: Clique na etapa de destino desejada (ou ESC para cancelar)
            </span>
            <button
              onClick={() => {
                setConnectionSourceNodeId(null);
                setConnectionTargetNodeId(null);
                setIsConnectionModalOpen(false);
              }}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[9px] font-bold cursor-pointer transition-all"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Operation Mode Status Bar - Bottom Right */}
        {(connectionSourceNodeId || isDraggingNode || isAdvanceModalOpen || isConnectionModalOpen) && (
          <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-xs text-white border border-slate-800 px-3.5 py-2 rounded-xl text-[9px] font-bold tracking-wide uppercase font-mono z-15 shadow-lg flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            <span>
              {connectionSourceNodeId
                ? "Criando Conexão Ativa"
                : isDraggingNode
                ? "Movimentando Caixa de Processo"
                : isConnectionModalOpen
                ? "Definindo Tipo de Conexão"
                : "Selecionando Caminho de Avanço"}
            </span>
          </div>
        )}

        {/* Modal: Select Connection Style / Direction */}
        {isConnectionModalOpen && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-35 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-5 shadow-2xl max-w-sm w-full border border-slate-100 font-sans space-y-4 text-left"
            >
              <div className="flex items-center gap-2 text-indigo-600">
                <GitCommit className="w-5 h-5 shrink-0 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Estilo da Conexão</h3>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                Escolha o sentido e a finalidade desta conexão para organizar o fluxo visualmente:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => confirmCreateConnection("right")}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer text-left flex items-center justify-between group"
                >
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase">Seguir Direto (Padrão)</p>
                    <p className="text-[9px] text-slate-400 font-semibold">Caminho sequencial normal para a direita</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-all" />
                </button>
                <button
                  onClick={() => confirmCreateConnection("left")}
                  className="p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition-all cursor-pointer text-left flex items-center justify-between group"
                >
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase">Retorno / Revisão</p>
                    <p className="text-[9px] text-slate-400 font-semibold">Caminho de volta de aprovação ou ajuste</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-all" />
                </button>
                <button
                  onClick={() => confirmCreateConnection("up")}
                  className="p-3 bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 rounded-xl transition-all cursor-pointer text-left flex items-center justify-between group"
                >
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase">Repetição / Loop</p>
                    <p className="text-[9px] text-slate-400 font-semibold">Ligação de reprocessamento pela parte superior</p>
                  </div>
                  <CornerLeftUp className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-all" />
                </button>
                <button
                  onClick={() => confirmCreateConnection("down")}
                  className="p-3 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer text-left flex items-center justify-between group"
                >
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase">Desvio / Subprocesso</p>
                    <p className="text-[9px] text-slate-400 font-semibold">Caminho alternativo secundário para baixo</p>
                  </div>
                  <CornerRightDown className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-all" />
                </button>
                <button
                  onClick={() => confirmCreateConnection("bidirectional")}
                  className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer text-left flex items-center justify-between group"
                >
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase">Via Dupla / Iterativo</p>
                    <p className="text-[9px] text-slate-400 font-semibold">Trânsito iterativo livre entre ambas etapas</p>
                  </div>
                  <Shuffle className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-all" />
                </button>
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => {
                    setConnectionSourceNodeId(null);
                    setConnectionTargetNodeId(null);
                    setIsConnectionModalOpen(false);
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase rounded-xl cursor-pointer transition-all text-center"
                >
                  Descartar Conexão
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Select Target Path for Contract Advancement */}
        {isAdvanceModalOpen && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-35 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-5 shadow-2xl max-w-sm w-full border border-slate-100 font-sans space-y-4 text-left"
            >
              <div className="flex items-center gap-2 text-emerald-600">
                <Compass className="w-5 h-5 shrink-0 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Selecione o Próximo Passo</h3>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                Este contrato possui múltiplos caminhos de saída configurados a partir de sua etapa atual. Escolha para qual destino deseja avançá-lo:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {advanceOptions.map((opt) => {
                  const state = MAP_NODE_ID_TO_WORKFLOW_STATE(opt);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => performContractMovement(opt)}
                      disabled={isAdvancingContract}
                      className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer text-left flex items-center justify-between group disabled:opacity-50"
                    >
                      <div>
                        <p className="text-[11px] font-black text-slate-800 uppercase leading-snug">{state.subetapa}</p>
                        <p className="text-[9px] text-emerald-600 font-black tracking-wider uppercase mt-0.5">{state.etapa}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-all" />
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase rounded-xl cursor-pointer transition-all text-center"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper with ReactFlowProvider to guarantee hooks environment is initialized
export default function WorkflowTraditional(props: WorkflowTraditionalProps) {
  return (
    <ReactFlowProvider>
      <WorkflowTraditionalInner {...props} />
    </ReactFlowProvider>
  );
}
