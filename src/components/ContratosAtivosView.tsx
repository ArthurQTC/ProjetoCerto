import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Building,
  Phone,
  User,
  MapPin,
  ArrowLeft,
  Check,
  Loader2,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Map,
  Search,
  FileSpreadsheet,
  Settings,
  Briefcase,
  Download,
  Eye,
  Printer,
  X,
  Calendar,
  Layers,
  FileText,
  CheckCircle,
  ChevronRight,
  Plus,
  Trash2,
  Lock,
  Send,
  UploadCloud
} from "lucide-react";
import { useAuthStore } from "../store";
import { Obra, ContratoAtivo } from "../types";
import * as XLSX from "xlsx";

// Sanitizes CSS content for html2canvas compatibility by converting modern unsupported CSS color functions to standard RGB/RGBA
const sanitizeCssForHtml2Canvas = (css: string): string => {
  if (!css) return "";
  let result = css;
  result = result.replace(/in\s+(oklch|oklab)/gi, "in srgb");

  // Regex to strip unsupported color functions (oklch, color, color-mix, oklab, lab, lch, hwb, light-dark) and replace with standard RGB
  const unsupportedColorRegex = /(color|color-mix|oklch|oklab|lab|lch|hwb|light-dark)\s*\((?:[^()]+|\([^()]*\))*\)/gi;

  let attempts = 0;
  while (unsupportedColorRegex.test(result) && attempts < 10) {
    result = result.replace(unsupportedColorRegex, "rgb(15, 23, 42)");
    attempts++;
  }

  return result;
};

// Helper to sanitize cloned document for html2canvas
const sanitizeClonedDocument = (clonedDoc: Document) => {
  // Hide action elements that shouldn't appear in exported PDFs (e.g. Delete buttons)
  const noPrintEls = Array.from(clonedDoc.querySelectorAll(".no-print"));
  noPrintEls.forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });

  // 1. Sanitize all <style> elements
  const styles = Array.from(clonedDoc.querySelectorAll("style"));
  styles.forEach((el) => {
    if (el.textContent) {
      el.textContent = sanitizeCssForHtml2Canvas(el.textContent);
    }
  });

  // 2. Sanitize all inline styles on all elements
  const allElements = Array.from(clonedDoc.querySelectorAll("*"));
  allElements.forEach((el) => {
    const hEl = el as HTMLElement;
    const styleAttr = hEl.getAttribute("style");
    if (styleAttr) {
      hEl.setAttribute("style", sanitizeCssForHtml2Canvas(styleAttr));
    }
  });

  // 3. Sanitize styleSheets
  try {
    const sheets = Array.from(clonedDoc.styleSheets);
    sheets.forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        rules.forEach((rule: any) => {
          if (rule.style) {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              const val = rule.style.getPropertyValue(prop);
              if (val && (
                val.includes("color(") ||
                val.includes("color-mix") ||
                val.includes("oklch") ||
                val.includes("oklab") ||
                val.includes("lab(")
              )) {
                rule.style.setProperty(prop, sanitizeCssForHtml2Canvas(val));
              }
            }
          }
        });
      } catch (e) {
        // Ignore cross-origin stylesheet error
      }
    });
  } catch (e) {}
};

// Helper to safely render Excel sheet HTML without crashing on empty range (!ref)
const getSheetHtml = (sheet: any) => {
  if (!sheet || !sheet['!ref']) {
    return "<div style='padding: 24px; text-align: center; color: #94a3b8; font-weight: 700; font-size: 12px;'>A aba selecionada está vazia ou não possui dados para exibição.</div>";
  }
  return XLSX.utils.sheet_to_html(sheet);
};

// Helper functions for premium mask experience
const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(val);
};

const formatMetragemValue = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined || val === "") return "";
  const str = val.toString().replace(/m²/gi, '').trim();
  if (!str) return "";
  let cleaned = str;
  if (str.includes(',')) {
    cleaned = str.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = str.replace(/[^\d.]/g, '');
  }
  const num = parseFloat(cleaned);
  if (isNaN(num)) return str;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatMetragemLive = (val: string): string => {
  if (!val) return "";
  const clean = val.replace(/m²/gi, '').trim();
  const digits = clean.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseMetragemToFloat = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined || val === "") return 0;
  const str = val.toString().replace(/m²/gi, '').trim();
  if (!str) return 0;
  let cleaned = str;
  if (str.includes(',')) {
    cleaned = str.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = str.replace(/[^\d.]/g, '');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

interface ItemInstalacao {
  material: string;
  valor: number;
}

interface ComentarioUnico {
  id: string;
  autor: string;
  texto: string;
  data: string;
}

const parseComments = (val: string | null | undefined): ComentarioUnico[] => {
  if (!val) return [];
  const trimmed = val.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Fallback
    }
  }
  return [{ id: "legacy-" + Math.random().toString(36).substring(2, 7), autor: "Anterior", texto: trimmed, data: "" }];
};

// Global module-level cache for instant rendering
let globalObrasCache: Obra[] | null = null;
let globalContratosAtivosCache: Record<string, ContratoAtivo> | null = null;

export default function ContratosAtivosView() {
  const { hasPermission, user } = useAuthStore();
  const isWritable = hasPermission("modulos", "contratosAtivos", "editar");

  const [obras, setObras] = useState<Obra[]>(() => globalObrasCache || []);
  const [activeContracts, setActiveContracts] = useState<Record<string, ContratoAtivo>>(() => globalContratosAtivosCache || {});
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => !globalObrasCache);
  const [search, setSearch] = useState("");

  // Current edit state
  const [cnpj, setCnpj] = useState("");
  const [contato, setContato] = useState("");
  const [nomeContato, setNomeContato] = useState("");
  const [endereco, setEndereco] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [itensInstalacao, setItensInstalacao] = useState<ItemInstalacao[]>([]);
  const [enderecoEntrega, setEnderecoEntrega] = useState("");
  const [condicoesComerciais, setCondicoesComerciais] = useState("");
  const [freteTipo, setFreteTipo] = useState<'CIF' | 'FOB'>("CIF");
  const [entrada, setEntrada] = useState<number | string>("");
  const [saldoReceber, setSaldoReceber] = useState<number | string>("");
  const [tipoObra, setTipoObra] = useState("Instalação");
  const [metragemAInstalar, setMetragemAInstalar] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Comment-style lists for Conditions and Observations
  const [condicoesList, setCondicoesList] = useState<ComentarioUnico[]>([]);
  const [newCondicaoText, setNewCondicaoText] = useState("");
  const [observacoesList, setObservacoesList] = useState<ComentarioUnico[]>([]);
  const [newObservacaoText, setNewObservacaoText] = useState("");

  const handleAddCondicao = () => {
    if (!newCondicaoText.trim()) return;
    const newComment: ComentarioUnico = {
      id: "comment-" + Math.random().toString(36).substring(2, 9),
      autor: user?.nome || "Usuário",
      texto: newCondicaoText.trim(),
      data: new Date().toLocaleString("pt-BR", { hour12: false, dateStyle: "short", timeStyle: "short" })
    };
    const updated = [...condicoesList, newComment];
    setCondicoesList(updated);
    setCondicoesComerciais(JSON.stringify(updated));
    setNewCondicaoText("");
  };

  const handleAddObservacao = () => {
    if (!newObservacaoText.trim()) return;
    const newComment: ComentarioUnico = {
      id: "comment-" + Math.random().toString(36).substring(2, 9),
      autor: user?.nome || "Usuário",
      texto: newObservacaoText.trim(),
      data: new Date().toLocaleString("pt-BR", { hour12: false, dateStyle: "short", timeStyle: "short" })
    };
    const updated = [...observacoesList, newComment];
    setObservacoesList(updated);
    setObservacoesGerais(JSON.stringify(updated));
    setNewObservacaoText("");
  };

  // Edit fields for name of client and name of contract
  const [clienteNome, setClienteNome] = useState("");
  const [contratoNome, setContratoNome] = useState("");
  const [itensMateriais, setItensMateriais] = useState<string[]>([]);
  const [showConfirmEnviarEquipe, setShowConfirmEnviarEquipe] = useState(false);

  // CEP Lookup helper states
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // PDF Export and Preview states
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);

  // Document Preview states
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [excelPreviewData, setExcelPreviewData] = useState<{ sheets: string[]; activeSheetIdx: number; htmlContent: string; workbook?: any } | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [excelTab, setExcelTab] = useState<"microsoft" | "local">("microsoft");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Validate type: PDF, Excel, Image
    const fileType = file.type;
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isPdf = fileType === "application/pdf" || fileExtension === ".pdf";
    const isImage = fileType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(fileExtension);
    const isExcel = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"].includes(fileType) || [".xlsx", ".xls"].includes(fileExtension);

    if (!isPdf && !isImage && !isExcel) {
      alert("Formato de arquivo não suportado. Por favor, envie apenas PDF, Excel ou Imagens.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Url = reader.result as string;
        const novoDoc = {
          id: "doc-" + Date.now(),
          nome: file.name,
          data: new Date().toISOString().split('T')[0],
          tamanho: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          url: base64Url,
        };

        const updatedDocs = [...documentos, novoDoc];
        setDocumentos(updatedDocs);
        await autoSaveDocuments(updatedDocs);
      } catch (err: any) {
        alert("Erro ao enviar arquivo: " + err.message);
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePreviewDocument = async (doc: any) => {
    setPreviewDoc(doc);
    if (!doc || !doc.nome) return;
    const fileExtension = doc.nome.substring(doc.nome.lastIndexOf('.')).toLowerCase();
    const docUrlStr = typeof doc.url === "string" ? doc.url : "";
    const isExcel = [".xlsx", ".xls"].includes(fileExtension) || 
                    docUrlStr.includes("sheet") || 
                    docUrlStr.includes("excel") || 
                    docUrlStr.includes("spreadsheet");
                    
    if (isExcel) {
      setIsParsingExcel(true);
      setExcelPreviewData(null);
      try {
        let arrayBuffer: ArrayBuffer;
        
        if (docUrlStr.startsWith("data:")) {
          const commaIdx = docUrlStr.indexOf(",");
          const base64Data = commaIdx !== -1 ? docUrlStr.substring(commaIdx + 1) : docUrlStr;
          
          // Decode Base64 to ArrayBuffer
          const binaryString = window.atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else if (docUrlStr) {
          // It's a URL, fetch it to get arrayBuffer
          const response = await fetch(docUrlStr);
          arrayBuffer = await response.arrayBuffer();
        } else {
          throw new Error("URL do documento não disponível.");
        }

        // Read Excel workbook
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheets = workbook.SheetNames;
        
        if (sheets.length > 0) {
          const firstSheetName = sheets[0];
          const sheet = workbook.Sheets[firstSheetName];
          const html = getSheetHtml(sheet);
          setExcelPreviewData({
            sheets,
            activeSheetIdx: 0,
            htmlContent: html,
            workbook
          });
        }
      } catch (err) {
        console.error("Erro ao analisar arquivo Excel:", err);
      } finally {
        setIsParsingExcel(false);
      }
    } else {
      setExcelPreviewData(null);
    }
  };

  const handleSwitchExcelSheet = (sheetIdx: number) => {
    if (!excelPreviewData || !excelPreviewData.workbook) return;
    try {
      const workbook = excelPreviewData.workbook;
      const sheetName = excelPreviewData.sheets[sheetIdx];
      if (!sheetName) return;
      const sheet = workbook.Sheets[sheetName];
      const html = getSheetHtml(sheet);

      setExcelPreviewData({
        ...excelPreviewData,
        activeSheetIdx: sheetIdx,
        htmlContent: html
      });
    } catch (err) {
      console.error("Erro ao alternar planilha:", err);
    }
  };

  // Instant Comment Deletion functions for admins
  const handleInstantDeleteCondicao = async (commentId: string) => {
    const updated = condicoesList.filter(c => c.id !== commentId);
    setCondicoesList(updated);
    setCondicoesComerciais(JSON.stringify(updated));

    if (!selectedObra) return;

    if (!isEditing) {
      try {
        const cleanCnpj = cnpj.replace(/\D/g, "");
        const cleanContato = contato.replace(/\D/g, "");
        const payload = {
          obraId: selectedObra.id,
          cnpj: cleanCnpj || null,
          contato: cleanContato || null,
          nomeContato: nomeContato ? nomeContato.trim().slice(0, 60) : null,
          cep: cep || null,
          endereco: endereco || null,
          municipio: municipio || null,
          uf: uf || null,
          bairro: bairro || null,
          complemento: complemento || null,
          itensInstalacao: JSON.stringify(itensInstalacao),
          enderecoEntrega: enderecoEntrega || null,
          condicoesComerciais: JSON.stringify(updated),
          freteTipo,
          entrada: entrada === "" ? 0.0 : Number(entrada),
          saldoReceber: saldoReceber === "" ? 0.0 : Number(saldoReceber),
          tipoObra,
          metragemAInstalar: metragemAInstalar ? metragemAInstalar.replace(/m²/gi, '').trim() : null,
          observacoesGerais: observacoesGerais || null,
          documentos: documentos || []
        };

        const response = await fetch("/api/contratos-ativos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          setActiveContracts(prev => ({
            ...prev,
            [selectedObra.id]: {
              ...prev[selectedObra.id],
              condicoesComerciais: JSON.stringify(updated)
            }
          }));
        }
      } catch (err) {
        console.error("Erro ao salvar exclusão da condição:", err);
      }
    }
  };

  const handleInstantDeleteObservacao = async (commentId: string) => {
    const updated = observacoesList.filter(o => o.id !== commentId);
    setObservacoesList(updated);
    setObservacoesGerais(JSON.stringify(updated));

    if (!selectedObra) return;

    if (!isEditing) {
      try {
        const cleanCnpj = cnpj.replace(/\D/g, "");
        const cleanContato = contato.replace(/\D/g, "");
        const payload = {
          obraId: selectedObra.id,
          cnpj: cleanCnpj || null,
          contato: cleanContato || null,
          nomeContato: nomeContato ? nomeContato.trim().slice(0, 60) : null,
          cep: cep || null,
          endereco: endereco || null,
          municipio: municipio || null,
          uf: uf || null,
          bairro: bairro || null,
          complemento: complemento || null,
          itensInstalacao: JSON.stringify(itensInstalacao),
          enderecoEntrega: enderecoEntrega || null,
          condicoesComerciais: condicoesComerciais || null,
          freteTipo,
          entrada: entrada === "" ? 0.0 : Number(entrada),
          saldoReceber: saldoReceber === "" ? 0.0 : Number(saldoReceber),
          tipoObra,
          metragemAInstalar: metragemAInstalar ? metragemAInstalar.replace(/m²/gi, '').trim() : null,
          observacoesGerais: JSON.stringify(updated),
          documentos: documentos || []
        };

        const response = await fetch("/api/contratos-ativos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          setActiveContracts(prev => ({
            ...prev,
            [selectedObra.id]: {
              ...prev[selectedObra.id],
              observacoesGerais: JSON.stringify(updated)
            }
          }));
        }
      } catch (err) {
        console.error("Erro ao salvar exclusão da observação:", err);
      }
    }
  };

  // Load all projects and contracts active records
  useEffect(() => {
    loadData(!!globalObrasCache);
  }, []);

  const loadData = async (silent = false) => {
    if (!silent && !globalObrasCache) {
      setIsLoading(true);
    }
    try {
      const [resObras, resCA] = await Promise.all([
        fetch("/api/obras"),
        fetch("/api/contratos-ativos")
      ]);

      if (!resObras.ok) {
        const errorData = await resObras.json().catch(() => ({ error: "Erro desconhecido ao buscar obras" }));
        throw new Error(errorData.error || "Erro ao buscar obras");
      }
      const obrasData: Obra[] = await resObras.json();
      
      let caData: ContratoAtivo[] = [];
      if (resCA.ok) {
        caData = await resCA.json().catch(() => []);
      }

      // Filter only CONSOLIDADO for this module
      const consolidadas = obrasData.filter(o => o.statusContrato === "CONSOLIDADO");
      
      // Create mapping by obraId
      const mapping: Record<string, ContratoAtivo> = {};
      caData.forEach(item => {
        const oId = item.obraId || (item as any).obra_id;
        if (oId) {
          mapping[oId] = {
            ...item,
            obraId: oId,
            saldoReceber: item.saldoReceber !== undefined && item.saldoReceber !== null ? Number(item.saldoReceber) : ((item as any).saldo_receber !== undefined ? Number((item as any).saldo_receber) : 0),
            entrada: item.entrada !== undefined && item.entrada !== null ? Number(item.entrada) : 0
          };
        }
      });

      globalObrasCache = consolidadas;
      globalContratosAtivosCache = mapping;

      setObras(consolidadas);
      setActiveContracts(mapping);
    } catch (err) {
      console.error("Erro ao carregar dados de contratos ativos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to populate form fields instantly from contract record
  const populateFormFromContract = (data: ContratoAtivo) => {
    setCnpj(data.cnpj ? formatCNPJ(data.cnpj) : "");
    setContato(data.contato ? formatPhone(data.contato) : "");
    setNomeContato(data.nomeContato || (data as any).nome_contato || "");
    setEndereco(data.endereco || "");
    setMunicipio(data.municipio || "");
    setUf(data.uf || "");
    setBairro(data.bairro || "");
    setComplemento(data.complemento || "");
    setCep(data.cep || "");
    
    try {
      if (data.itensInstalacao && data.itensInstalacao.startsWith("[")) {
        setItensInstalacao(JSON.parse(data.itensInstalacao));
      } else {
        setItensInstalacao(data.itensInstalacao ? [{ material: data.itensInstalacao, valor: 0 }] : []);
      }
    } catch (e) {
      setItensInstalacao(data.itensInstalacao ? [{ material: data.itensInstalacao, valor: 0 }] : []);
    }

    setEnderecoEntrega(data.enderecoEntrega || "");
    const rawCondicoes = data.condicoesComerciais || "";
    setCondicoesComerciais(rawCondicoes);
    setCondicoesList(parseComments(rawCondicoes));

    setFreteTipo(data.freteTipo || "CIF");
    setEntrada(data.entrada !== undefined ? data.entrada : "");
    setSaldoReceber(data.saldoReceber !== undefined ? data.saldoReceber : "");
    setTipoObra(data.tipoObra || "Instalação");
    const rawMetragem = data.metragemAInstalar || (data as any).metragem_a_instalar || "";
    setMetragemAInstalar(rawMetragem ? formatMetragemValue(rawMetragem) : "");
    const rawObservacoes = data.observacoesGerais || (data as any).observacoes_gerais || "";
    setObservacoesGerais(rawObservacoes);
    setObservacoesList(parseComments(rawObservacoes));

    setDocumentos(data.documentos || []);
  };

  // When selected obra changes, load its form state
  const handleSelectObra = async (obra: Obra) => {
    setSelectedObra(obra);
    setClienteNome(obra.cliente || "");
    setContratoNome(obra.nome || "");
    setItensMateriais([]);
    setCep("");
    setCepError("");
    setSaveSuccess(false);
    setSaveError("");

    // 1. Instantly populate form state if cached in activeContracts mapping
    const cachedItem = activeContracts[obra.id];
    if (cachedItem) {
      populateFormFromContract(cachedItem);
    } else {
      // Reset form fields only if no cached record exists
      setCnpj("");
      setContato("");
      setNomeContato("");
      setEndereco("");
      setMunicipio("");
      setUf("");
      setBairro("");
      setComplemento("");
      setItensInstalacao([]);
      setEnderecoEntrega("");
      setCondicoesComerciais("");
      setCondicoesList([]);
      setNewCondicaoText("");
      setFreteTipo("CIF");
      setEntrada("");
      setSaldoReceber("");
      setTipoObra("Instalação");
      setMetragemAInstalar("");
      setObservacoesGerais("");
      setObservacoesList([]);
      setNewObservacaoText("");
      setDocumentos([]);
    }

    // 2. Refresh details concurrently in background
    try {
      const [resObra, resCA] = await Promise.all([
        fetch(`/api/obras/${obra.id}`),
        fetch(`/api/contratos-ativos/${obra.id}`)
      ]);

      if (resObra.ok) {
        const fullObra = await resObra.json().catch(() => null);
        if (fullObra && fullObra.itens) {
          const materials = fullObra.itens
            .map((it: any) => it.descricao)
            .filter((desc: string) => desc && desc !== "Custo ADM" && desc !== "Imposto Fixo");
          setItensMateriais(materials);
        }
      }

      if (resCA.ok) {
        const data: ContratoAtivo = await resCA.json().catch(() => null);
        if (data) {
          populateFormFromContract(data);

          // Update memory mapping
          setActiveContracts(prev => ({
            ...prev,
            [obra.id]: data
          }));
          if (globalContratosAtivosCache) {
            globalContratosAtivosCache[obra.id] = data;
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes em segundo plano:", err);
    }
  };

  // Auto-calculate Saldo a Receber
  useEffect(() => {
    const valContrato = selectedObra?.valorContrato || 0;
    const valEntrada = typeof entrada === 'string' ? parseFloat(entrada) || 0 : entrada;
    setSaldoReceber(valContrato - valEntrada);
  }, [entrada, selectedObra]);

  const handleBackToList = () => {
    setSelectedObra(null);
    loadData(); // reload to refresh active contracts cache
  };

  const formatCurrencyLive = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    const numberValue = Number(cleanValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numberValue);
  };

  const handleEnviarEquipe = async () => {
    if (!selectedObra) return;
    
    setIsSaving(true);
    
    try {
      // First ensure everything is saved if editing
      if (isEditing) {
        const cleanCnpj = cnpj.replace(/\D/g, "");
        const cleanContato = contato.replace(/\D/g, "");

        const payload = {
          obraId: selectedObra.id,
          cnpj: cleanCnpj || null,
          contato: cleanContato || null,
          nomeContato: nomeContato ? nomeContato.trim().slice(0, 60) : null,
          cep: cep || null,
          endereco: endereco || null,
          municipio: municipio || null,
          uf: uf || null,
          bairro: bairro || null,
          complemento: complemento || null,
          itensInstalacao: JSON.stringify(itensInstalacao),
          enderecoEntrega: enderecoEntrega || null,
          condicoesComerciais: condicoesComerciais || null,
          freteTipo,
          entrada: entrada === "" ? 0.0 : Number(entrada),
          saldoReceber: Number(saldoReceber),
          tipoObra
        };

        await fetch("/api/contratos-ativos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        await fetch(`/api/obras/${selectedObra.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: contratoNome, cliente: clienteNome })
        });
      }

      const element = pdfContentRef.current;
      if (!element) {
        // Se não encontrou o elemento, pode ser que o DOM ainda não tenha atualizado
        // Vamos tentar forçar um pequeno delay ou buscar pelo ID como fallback
        const fallbackElement = document.getElementById("ficha-cadastral-pdf-content");
        if (!fallbackElement) throw new Error("Elemento de pré-visualização não encontrado no DOM");
        // Se encontrou pelo ID, usamos ele
      }

      const targetElement = element || document.getElementById("ficha-cadastral-pdf-content");
      if (!targetElement) throw new Error("Elemento de pré-visualização não encontrado");

      const canvas = await html2canvas(targetElement, { 
        scale: 3, // HD quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1280,
        onclone: (clonedDoc) => {
          // Garante que o elemento clonado esteja visível e responsivo no desktop para o html2canvas
          const clonedElement = clonedDoc.getElementById("ficha-cadastral-pdf-content");
          if (clonedElement) {
            clonedElement.style.width = "800px";
            clonedElement.style.minWidth = "800px";
            clonedElement.style.maxWidth = "800px";
            clonedElement.style.padding = "40px";
            clonedElement.style.margin = "0 auto";
            clonedElement.style.boxShadow = "none";
            clonedElement.style.borderRadius = "0px";
            clonedElement.style.border = "none";

            let parent = clonedElement.parentElement;
            while (parent) {
              parent.style.width = "auto";
              parent.style.minWidth = "auto";
              parent.style.maxWidth = "none";
              parent.style.padding = "0";
              parent.style.margin = "0";
              parent.style.overflow = "visible";
              parent = parent.parentElement;
            }
          }

          sanitizeClonedDocument(clonedDoc);
        }
      });
      const imgData = canvas.toDataURL("image/png");
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const pdfWidth = 210;
      const imgHeightInMm = (canvasHeight * pdfWidth) / canvasWidth;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, imgHeightInMm]
      });
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeightInMm, "", "FAST");
      
      const pdfBase64 = pdf.output('datauristring');

      const res = await fetch("/api/enviar-para-equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contratoNome: contratoNome,
          nomeCliente: clienteNome || selectedObra.cliente || "Não informado",
          detalhes: `Contrato fechado para a obra ${contratoNome || selectedObra.nome}.`,
          pdfBase64: pdfBase64,
          valorContrato: selectedObra.valorContrato,
          materiais: JSON.stringify(itensInstalacao)
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error && errorData.error.includes("RESEND_API_KEY")) {
          throw new Error("API Key do Resend não configurada. Por favor, configure a variável RESEND_API_KEY nas configurações do sistema.");
        }
        throw new Error(errorData.error || "Falha ao enviar e-mail");
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Erro ao enviar para equipe:", err);
      setSaveError("Erro ao enviar para equipe: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // PDF Export and Print logic
  const exportToPDF = async () => {
    if (!selectedObra || isExportingPdf) return;
    
    setIsExportingPdf(true);
    
    try {
      const element = pdfContentRef.current;
      if (!element) throw new Error("Elemento de pré-visualização não encontrado");

      const canvas = await html2canvas(element, {
        scale: 3, // Premium ultra-high definition (HD) quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1280, // Force desktop-resolution responsive styling (keeps grid/flex as widescreen)
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        onclone: (clonedDoc) => {
          // Force the PDF container in the cloned document to be exactly 800px wide
          const clonedElement = clonedDoc.getElementById("ficha-cadastral-pdf-content");
          if (clonedElement) {
            clonedElement.style.width = "800px";
            clonedElement.style.minWidth = "800px";
            clonedElement.style.maxWidth = "800px";
            clonedElement.style.padding = "40px";
            clonedElement.style.margin = "0 auto";
            clonedElement.style.boxShadow = "none";
            clonedElement.style.borderRadius = "0px";
            clonedElement.style.border = "none";

            // Traverse and reset parent container limitations so they do not restrict or truncate the render
            let parent = clonedElement.parentElement;
            while (parent) {
              parent.style.width = "auto";
              parent.style.minWidth = "auto";
              parent.style.maxWidth = "none";
              parent.style.padding = "0";
              parent.style.margin = "0";
              parent.style.overflow = "visible";
              parent = parent.parentElement;
            }
          }

          sanitizeClonedDocument(clonedDoc);
        }
      });

      const imgData = canvas.toDataURL("image/png"); // Lossless PNG encoding for ultra HD text crispness
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const pdfWidth = 210; // Standard A4 width in mm
      const imgHeightInMm = (canvasHeight * pdfWidth) / canvasWidth;

      // Generate a dynamic format PDF that matches the aspect ratio perfectly
      // This guarantees the PDF is a single continuous high-definition page with absolutely zero text cuts or line splits!
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, imgHeightInMm]
      });

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeightInMm, "", "FAST");

      const clientCleanName = clienteNome ? clienteNome.trim().replace(/[^a-zA-Z0-9]/g, "_") : "Cliente";
      pdf.save(`Dados_para_Contrato_${clientCleanName}.pdf`);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const element = pdfContentRef.current;
    if (!element) return;
    
    const printContent = element.innerHTML;
    
    // Create hidden printing iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Dados para Contrato - ${clienteNome || "Obra"}</title>
            <!-- Injetando Tailwind para o iframe com a paleta correta -->
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      brand: {
                        accent: '#F97316',
                        secondary: '#1A1A1A'
                      }
                    }
                  }
                }
              }
            </script>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
              body {
                font-family: 'Plus Jakarta Sans', sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background-color: white !important;
                color: #1e293b !important;
              }
              @page {
                size: portrait;
                margin: 12mm;
              }
            </style>
          </head>
          <body class="p-4">
            ${printContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.parent.document.body.removeChild(window.frameElement);
                  }, 100);
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  // SVG Illustration representing real architectural build
  const BuildingIllustration = () => (
    <svg viewBox="0 0 400 300" className="w-full h-full object-cover rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 p-6 border border-orange-200/50">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF7ED" />
          <stop offset="100%" stopColor="#FFEDD5" />
        </linearGradient>
        <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      {/* Background elements */}
      <rect width="400" height="300" fill="url(#skyGrad)" rx="12" />
      <circle cx="320" cy="80" r="30" fill="#FDBA74" opacity="0.3" />
      
      {/* Grid lines in background for drafting vibe */}
      <path d="M 0 50 L 400 50 M 0 100 L 400 100 M 0 150 L 400 150 M 0 200 L 400 200 M 0 250 L 400 250" stroke="#FDBA74" strokeWidth="0.5" opacity="0.25" strokeDasharray="5 5" />
      <path d="M 50 0 L 50 300 M 100 0 L 100 300 M 150 0 L 150 300 M 200 0 L 200 300 M 250 0 L 250 300 M 300 0 L 300 300 M 350 0 L 350 300" stroke="#FDBA74" strokeWidth="0.5" opacity="0.25" strokeDasharray="5 5" />
      
      {/* Ground/floor line */}
      <line x1="30" y1="240" x2="370" y2="240" stroke="#9A3412" strokeWidth="3" strokeLinecap="round" />

      {/* Buildings silhouettes */}
      {/* Tall modern glass skyscraper with geometric facades */}
      <rect x="150" y="60" width="100" height="180" fill="url(#buildingGrad)" rx="3" opacity="0.95" />
      {/* Facade grid */}
      <path d="M 170 60 L 170 240 M 190 60 L 190 240 M 210 60 L 210 240 M 230 60 L 230 240" stroke="#FFF" strokeWidth="0.75" opacity="0.25" />
      <path d="M 150 90 L 250 90 M 150 120 L 250 120 M 150 150 L 250 150 M 150 180 L 250 180 M 150 210 L 250 210" stroke="#FFF" strokeWidth="0.75" opacity="0.25" />

      {/* Left side building with angular roof */}
      <path d="M 70 240 L 70 120 L 150 120 L 150 240 Z" fill="#FDBA74" opacity="0.7" />
      <path d="M 70 120 L 110 90 L 150 120 Z" fill="#EA580C" opacity="0.85" />
      {/* Left building windows */}
      <rect x="85" y="140" width="15" height="15" fill="#FFF" rx="1" opacity="0.8" />
      <rect x="120" y="140" width="15" height="15" fill="#FFF" rx="1" opacity="0.8" />
      <rect x="85" y="175" width="15" height="15" fill="#FFF" rx="1" opacity="0.8" />
      <rect x="120" y="175" width="15" height="15" fill="#FFF" rx="1" opacity="0.8" />
      <rect x="85" y="210" width="15" height="15" fill="#FFF" rx="1" opacity="0.8" />
      <rect x="120" y="210" width="15" height="15" fill="#FFF" rx="1" opacity="0.8" />

      {/* Right modern villa */}
      <rect x="250" y="130" width="90" height="110" fill="#431407" rx="4" opacity="0.85" />
      <rect x="260" y="145" width="70" height="40" fill="#FFF7ED" rx="2" opacity="0.9" />
      {/* Villa deck columns */}
      <line x1="265" y1="185" x2="265" y2="240" stroke="#FFF" strokeWidth="2" />
      <line x1="325" y1="185" x2="325" y2="240" stroke="#FFF" strokeWidth="2" />

      {/* Modern architectural details: Crane vector or trees */}
      <path d="M 330 240 Q 345 220 350 240 Z" fill="#ea580c" opacity="0.4" />
      <path d="M 50 240 Q 60 215 70 240 Z" fill="#f97316" opacity="0.5" />
    </svg>
  );

  // ViaCEP address fetch logic
  const handleCepSearch = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setCepError("CEP inválido. Deve conter 8 dígitos.");
      return;
    }

    setCepLoading(true);
    setCepError("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error();
      const data = await response.json();

      if (data.erro) {
        setCepError("CEP não encontrado.");
      } else {
        setMunicipio(data.localidade || "");
        setUf(data.uf || "");
        setBairro(data.bairro || "");
        setEnderecoEntrega(`${data.logradouro || ""}${data.complemento ? ", " + data.complemento : ""}`);
        // Keep the CEP value in the input state as requested by the user instead of clearing it
      }
    } catch (err) {
      setCepError("Falha na consulta do CEP. Tente digitar manualmente.");
    } finally {
      setCepLoading(false);
    }
  };

  // Save changes to DB
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObra) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError("");

    try {
      // 1. Update the client name and contract name in the obras table
      const resObraUpdate = await fetch(`/api/obras/${selectedObra.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: contratoNome,
          cliente: clienteNome
        })
      });

      if (!resObraUpdate.ok) {
        const errData = await resObraUpdate.json();
        throw new Error(errData.error || "Erro ao atualizar nome do cliente ou contrato");
      }

      // Sync local state for title display
      setSelectedObra(prev => prev ? { ...prev, cliente: clienteNome, nome: contratoNome } : null);

      // 2. Save active contract details
      const cleanCnpj = cnpj.replace(/\D/g, "");
      const cleanContato = contato.replace(/\D/g, "");

      const payload = {
        obraId: selectedObra.id,
        cnpj: cleanCnpj || null,
        contato: cleanContato || null,
        nomeContato: nomeContato ? nomeContato.trim().slice(0, 60) : null,
        cep: cep || null,
        endereco: endereco || null,
        municipio: municipio || null,
        uf: uf || null,
        bairro: bairro || null,
        complemento: complemento || null,
        itensInstalacao: JSON.stringify(itensInstalacao),
        enderecoEntrega: enderecoEntrega || null,
        condicoesComerciais: condicoesComerciais || null,
        freteTipo,
        entrada: entrada === "" ? 0.0 : Number(entrada),
        saldoReceber: saldoReceber === "" ? 0.0 : Number(saldoReceber),
        tipoObra,
        metragemAInstalar: metragemAInstalar ? metragemAInstalar.replace(/m²/gi, '').trim() : null,
        observacoesGerais: observacoesGerais || null,
        documentos: documentos || []
      };

      const response = await fetch("/api/contratos-ativos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao salvar contrato ativo");
      }

      setSaveSuccess(true);
      const updatedItem: ContratoAtivo = await response.json();
      
      // Update local mapping cache
      setActiveContracts(prev => ({
        ...prev,
        [selectedObra.id]: updatedItem
      }));

      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err: any) {
      setSaveError(err.message || "Erro de conexão com o servidor");
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate save for tipoObra directly from the preview
  const handleSaveTipoObra = async (newTipo: string) => {
    setTipoObra(newTipo);
    if (!selectedObra) return;

    try {
      const cleanCnpj = cnpj.replace(/\D/g, "");
      const cleanContato = contato.replace(/\D/g, "");

      const payload = {
        obraId: selectedObra.id,
        cnpj: cleanCnpj || null,
        contato: cleanContato || null,
        nomeContato: nomeContato ? nomeContato.trim().slice(0, 60) : null,
        endereco: endereco || null,
        municipio: municipio || null,
        uf: uf || null,
        bairro: bairro || null,
        complemento: complemento || null,
        itensInstalacao: itensInstalacao || null,
        enderecoEntrega: enderecoEntrega || null,
        condicoesComerciais: condicoesComerciais || null,
        freteTipo,
        entrada: entrada === "" ? 0.0 : Number(entrada),
        saldoReceber: saldoReceber === "" ? 0.0 : Number(saldoReceber),
        tipoObra: newTipo
      };

      const response = await fetch("/api/contratos-ativos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedItem: ContratoAtivo = await response.json();
        setActiveContracts(prev => ({
          ...prev,
          [selectedObra.id]: updatedItem
        }));
      }
    } catch (err) {
      console.error("Erro ao salvar tipo de obra:", err);
    }
  };

  const autoSaveDocuments = async (updatedDocs: any[]) => {
    if (!selectedObra) return;
    setIsSaving(true);
    try {
      const cleanCnpj = cnpj.replace(/\D/g, "");
      const cleanContato = contato.replace(/\D/g, "");

      const payload = {
        obraId: selectedObra.id,
        cnpj: cleanCnpj || null,
        contato: cleanContato || null,
        nomeContato: nomeContato ? nomeContato.trim().slice(0, 60) : null,
        cep: cep || null,
        endereco: endereco || null,
        municipio: municipio || null,
        uf: uf || null,
        bairro: bairro || null,
        complemento: complemento || null,
        itensInstalacao: JSON.stringify(itensInstalacao),
        enderecoEntrega: enderecoEntrega || null,
        condicoesComerciais: condicoesComerciais || null,
        freteTipo,
        entrada: entrada === "" ? 0.0 : Number(entrada),
        saldoReceber: saldoReceber === "" ? 0.0 : Number(saldoReceber),
        tipoObra,
        metragemAInstalar: metragemAInstalar ? metragemAInstalar.replace(/m²/gi, '').trim() : null,
        observacoesGerais: observacoesGerais || null,
        documentos: updatedDocs
      };

      const response = await fetch("/api/contratos-ativos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedItem: ContratoAtivo = await response.json();
        setActiveContracts(prev => ({
          ...prev,
          [selectedObra.id]: updatedItem
        }));
        if (globalContratosAtivosCache) {
          globalContratosAtivosCache[selectedObra.id] = updatedItem;
        }
      }
    } catch (err) {
      console.error("Erro ao salvar anexo:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Url = reader.result as string;
        const novoDoc = {
          id: "doc-" + Date.now(),
          nome: file.name,
          data: new Date().toISOString().split('T')[0],
          tamanho: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          url: base64Url,
        };

        const updatedDocs = [...documentos, novoDoc];
        setDocumentos(updatedDocs);
        await autoSaveDocuments(updatedDocs);
      } catch (err: any) {
        alert("Erro ao enviar arquivo: " + err.message);
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDocument = async (docId: string) => {
    const updatedDocs = documentos.filter((d: any) => d.id !== docId);
    setDocumentos(updatedDocs);
    await autoSaveDocuments(updatedDocs);
  };

  // Filter list of consolidadas
  const filteredObras = obras.filter(o => {
    const term = search.toLowerCase();
    const contractData = activeContracts[o.id];
    return (
      o.nome.toLowerCase().includes(term) ||
      (o.cliente && o.cliente.toLowerCase().includes(term)) ||
      (contractData?.cnpj && contractData.cnpj.includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. LIST VIEW OF ACTIVE CONSOLIDATED PROJECTS */}
      {!selectedObra ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Header section with Stats */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-brand-primary to-slate-900 text-white relative">
            <div className="relative z-10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Contratos Ativos</h1>
                </div>
              </div>

              {/* Mini counters cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 max-w-2xl">
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3.5 shadow-sm">
                  <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider leading-none">Obras Consolidadas</p>
                  {isLoading ? (
                    <div className="h-6 w-12 bg-white/20 animate-pulse rounded mt-2" />
                  ) : (
                    <p className="text-lg font-black text-white mt-2">{obras.length}</p>
                  )}
                </div>

                <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3.5 shadow-sm">
                  <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider leading-none">Metragem a Instalar Total</p>
                  {isLoading ? (
                    <div className="h-6 w-28 bg-white/20 animate-pulse rounded mt-2" />
                  ) : (
                    <p className="text-lg font-black text-white mt-2">
                      {filteredObras.reduce((sum, o) => {
                        const valStr = activeContracts[o.id]?.metragemAInstalar;
                        return sum + parseMetragemToFloat(valStr);
                      }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M²
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action and Search bar */}
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por obra, cliente ou CNPJ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary transition-all"
              />
            </div>
          </div>

          {/* Main Table */}
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-brand-secondary animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">Buscando Contratos...</p>
            </div>
          ) : filteredObras.length === 0 ? (
            <div className="p-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Nenhum contrato encontrado</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Não há obras com status "CONSOLIDADO" correspondentes à busca atual. Garanta que o status da obra esteja consolidado no módulo comercial.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-4 px-6">Cliente</th>
                    <th className="py-4 px-6">Obra</th>
                    <th className="py-4 px-6">Município / UF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredObras.map(obra => {
                    const extraData = activeContracts[obra.id];
                    const isConfigured = !!(extraData?.cnpj || extraData?.enderecoEntrega);
                    const municipioUf = extraData 
                      ? [extraData.municipio, extraData.uf].filter(Boolean).join(" / ") 
                      : "";
                    return (
                      <tr
                        key={obra.id}
                        onClick={() => handleSelectObra(obra)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-6 font-bold text-slate-800">
                          {obra.cliente || "Não Informado"}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-600">
                          {obra.nome}
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-medium">
                          {municipioUf || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* 2. ACTIVE CONTRACT DETAIL & EDIT VIEW */
        <form onSubmit={handleSave} className="space-y-6">
          {/* Back button and Save Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para Contratos Ativos
            </button>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPdfPreview(true)}
                className="inline-flex items-center justify-center gap-2 bg-brand-accent hover:bg-opacity-90 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow transition-all"
              >
                <FileText className="w-4 h-4" /> Exportar Dados para Contrato (PDF)
              </button>

              {isWritable && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  <Settings className="w-4 h-4" /> Editar Cadastro
                </button>
              )}

              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-extrabold px-5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  <X className="w-4 h-4" /> Cancelar Edição
                </button>
              )}

              {isEditing && isWritable && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-secondary hover:bg-opacity-90 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Salvar Alterações
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Form Header block with Description & custom Indicators */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-3 pt-1">
                  <h2 className="text-lg font-black text-slate-800 leading-tight">
                    {clienteNome || "Cliente Não Informado"}
                  </h2>
                  <span className="text-xs text-slate-400 font-bold sm:before:content-['|'] sm:before:mr-2">
                    {contratoNome}
                  </span>
                </div>
              </div>
            </div>

            {/* Side-by-side Block: Metragem a Instalar & Itens a Serem Instalados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Indicator Block: Metragem a Instalar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative focus-within:ring-2 focus-within:ring-brand-secondary/40 transition-all flex flex-col justify-between self-start w-full">
                <div>
                  <label htmlFor="ca_metragem_input" className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
                    METRAGEM A INSTALAR
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        id="ca_metragem_input"
                        type="text"
                        placeholder="Ex: 250 M²"
                        disabled={!isEditing || !isWritable}
                        value={metragemAInstalar}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) {
                            setMetragemAInstalar("");
                            return;
                          }
                          setMetragemAInstalar(formatMetragemLive(val));
                        }}
                        onBlur={() => {
                          if (metragemAInstalar) {
                            setMetragemAInstalar(formatMetragemValue(metragemAInstalar));
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-secondary rounded-lg pl-3 pr-12 py-2 text-base font-black text-slate-800 focus:outline-none transition-all disabled:bg-slate-100/60"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded border border-slate-300/40 select-none pointer-events-none">
                        M²
                      </span>
                    </div>
                    <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center text-brand-accent shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Itens a serem instalados Field */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative focus-within:ring-2 focus-within:ring-brand-secondary/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    ITENS A SEREM INSTALADOS
                  </label>
                  {isEditing && isWritable && (
                    <button
                      type="button"
                      onClick={() => setItensInstalacao([...itensInstalacao, { material: "", valor: 0 }])}
                      className="text-[10px] font-bold text-brand-accent hover:text-orange-600 transition-colors uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Item
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {itensInstalacao.length === 0 ? (
                    <div className="p-3 border-2 border-dashed border-slate-100 rounded-xl text-center">
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Nenhum item adicionado</p>
                    </div>
                  ) : (
                    itensInstalacao.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100 group">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            placeholder="Descrição / Material do Item"
                            disabled={!isEditing || !isWritable}
                            value={item.material}
                            onChange={(e) => {
                              const newItens = [...itensInstalacao];
                              newItens[index].material = e.target.value;
                              setItensInstalacao(newItens);
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-brand-secondary rounded-lg text-xs font-semibold focus:outline-none transition-all"
                          />
                        </div>
                        {isEditing && isWritable && (
                          <button
                            type="button"
                            onClick={() => setItensInstalacao(itensInstalacao.filter((_, i) => i !== index))}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Remover Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Toast feedback states */}
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>As informações do contrato ativo foram salvas e consolidadas no banco de dados com sucesso!</span>
            </div>
          )}

          {saveError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Erro ao salvar dados: {saveError}</span>
            </div>
          )}

          {/* Dual columns layouts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMN 1: DADOS PARA CONTRATO */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                  Dados para Contrato
                </h3>
              </div>

              {/* Nome do Cliente Field */}
              <div className="space-y-1.5">
                <label htmlFor="ca_cliente_nome" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Nome do Cliente
                </label>
                <input
                  id="ca_cliente_nome"
                  type="text"
                  disabled={!isEditing || !isWritable}
                  value={clienteNome}
                  onChange={e => setClienteNome(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                />
              </div>

              {/* Nome do Contrato Field */}
              <div className="space-y-1.5">
                <label htmlFor="ca_contrato_nome" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Nome do Contrato (Obra)
                </label>
                <input
                  id="ca_contrato_nome"
                  type="text"
                  disabled={!isEditing || !isWritable}
                  value={contratoNome}
                  onChange={e => setContratoNome(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                />
              </div>

              {/* CNPJ Field */}
              <div className="space-y-1.5">
                <label htmlFor="ca_cnpj" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  CNPJ da Obra
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="ca_cnpj"
                    type="text"
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                    disabled={!isEditing || !isWritable}
                    value={cnpj}
                    onChange={e => setCnpj(formatCNPJ(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Nome do Contato Field */}
              <div className="space-y-1.5">
                <label htmlFor="ca_nome_contato" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Nome do Contato
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="ca_nome_contato"
                    type="text"
                    maxLength={60}
                    placeholder="Nome do contato (máx. 60 caracteres)"
                    disabled={!isEditing || !isWritable}
                    value={nomeContato}
                    onChange={e => setNomeContato(e.target.value.slice(0, 60))}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Contato (Telefone) Field */}
              <div className="space-y-1.5">
                <label htmlFor="ca_contato_tel" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Contato (Telefone)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="ca_contato_tel"
                    type="text"
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    disabled={!isEditing || !isWritable}
                    value={contato}
                    onChange={e => setContato(formatPhone(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Endereço da Obra with CEP Search */}
              <div className="space-y-1.5">
                <label htmlFor="ca_cep" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Endereço da Obra
                </label>
                <div className="space-y-3.5 bg-slate-100/50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    {cepError && (
                      <span className="text-[9px] font-bold text-red-500 uppercase animate-pulse">{cepError}</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="relative w-[110px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        id="ca_cep"
                        type="text"
                        maxLength={9}
                        placeholder="01001-001"
                        disabled={!isEditing || !isWritable || cepLoading}
                        value={cep}
                        onChange={e => setCep(formatCEP(e.target.value))}
                        className="w-full pl-9 pr-2 py-2 bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCepSearch}
                      disabled={!isEditing || !isWritable || cepLoading || cep.length < 8}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white text-[10px] font-extrabold rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider cursor-pointer"
                    >
                      {cepLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Map className="w-3 h-3" />}
                      {cepLoading ? "Buscando..." : "BUSCAR CEP"}
                    </button>
                  </div>

                  <textarea
                    id="ca_endereco_entrega"
                    placeholder="Endereço"
                    rows={2}
                    disabled={!isEditing || !isWritable}
                    value={enderecoEntrega}
                    onChange={e => setEnderecoEntrega(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all resize-none text-slate-800"
                  />
                </div>
              </div>

              {/* Novos campos de endereço */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="ca_municipio" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Município
                  </label>
                  <input
                    id="ca_municipio"
                    type="text"
                    disabled={!isEditing || !isWritable}
                    value={municipio}
                    onChange={e => setMunicipio(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ca_uf" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    UF
                  </label>
                  <input
                    id="ca_uf"
                    type="text"
                    maxLength={2}
                    disabled={!isEditing || !isWritable}
                    value={uf}
                    onChange={e => setUf(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="ca_bairro" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Bairro
                  </label>
                  <input
                    id="ca_bairro"
                    type="text"
                    disabled={!isEditing || !isWritable}
                    value={bairro}
                    onChange={e => setBairro(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ca_complemento" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Complemento
                  </label>
                  <input
                    id="ca_complemento"
                    type="text"
                    disabled={!isEditing || !isWritable}
                    value={complemento}
                    onChange={e => setComplemento(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all text-slate-800"
                  />
                </div>
              </div>

            </div>

            {/* COLUMN 2: CONDIÇÕES COMERCIAIS */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Settings className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                  Condições Comerciais
                </h3>
              </div>

              {/* Big Description text area */}
              <div className="space-y-3">
                <div className="space-y-2">
                  {condicoesList.length > 0 ? (
                    condicoesList.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative shadow-sm">
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed pr-1 whitespace-pre-line">{c.texto}</p>
                        <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-100/60">
                          {user?.nivel?.toUpperCase() === 'ADMIN' ? (
                            <button
                              type="button"
                              onClick={() => handleInstantDeleteCondicao(c.id)}
                              className="hover:bg-red-50 text-red-500 rounded p-1 transition-colors flex items-center gap-1 text-[10px] font-bold"
                              title="Excluir condição comercial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          ) : <div />}
                          <span className="text-[10px] font-bold text-slate-400">
                            {c.autor} {c.data ? `• ${c.data}` : ""}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 font-medium italic p-2 bg-slate-50/50 rounded-lg text-center border border-dashed border-slate-200">Nenhuma condição comercial registrada.</p>
                  )}
                </div>

                {isEditing && isWritable && (
                  <div className="space-y-2 pt-2 border-t border-slate-150">
                    <textarea
                      rows={3}
                      placeholder="Adicionar nova condição comercial..."
                      value={newCondicaoText}
                      onChange={(e) => setNewCondicaoText(e.target.value)}
                      className="w-full p-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddCondicao}
                        className="px-4 py-2 bg-brand-secondary text-white rounded-lg text-xs font-bold hover:bg-brand-secondary/90 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Adicionar Condição
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Freight CIF or FOB segmented selector control */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Responsabilidade pelo Frete (CIF / FOB)
                </label>
                <div className="flex p-1 bg-slate-200/60 rounded-xl max-w-xs">
                  <button
                    type="button"
                    disabled={!isEditing || !isWritable}
                    onClick={() => (isEditing && isWritable) && setFreteTipo("CIF")}
                    className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all ${
                      freteTipo === "CIF"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    } ${(!isEditing || !isWritable) ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                  >
                    CIF
                  </button>
                  <button
                    type="button"
                    disabled={!isEditing || !isWritable}
                    onClick={() => (isEditing && isWritable) && setFreteTipo("FOB")}
                    className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all ${
                      freteTipo === "FOB"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    } ${(!isEditing || !isWritable) ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                  >
                    FOB
                  </button>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 leading-snug">
                  {freteTipo === "CIF"
                    ? "CIF (Cost, Insurance and Freight): Frete sob responsabilidade de nossa empresa (vendedor). Incluído no custo geral."
                    : "FOB (Free on Board): Frete pago pelo cliente (comprador). O material deve estar disponível para retirada em nossa fábrica."}
                </p>
              </div>

              {/* Observações Gerais Field */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  OBSERVAÇÕES GERAIS:
                </label>
                <div className="space-y-3">
                  <div className="space-y-2">
                    {observacoesList.length > 0 ? (
                      observacoesList.map((o) => (
                        <div key={o.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative shadow-sm">
                          <p className="text-xs font-semibold text-slate-700 leading-relaxed pr-1 whitespace-pre-line">{o.texto}</p>
                          <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-100/60">
                            {user?.nivel?.toUpperCase() === 'ADMIN' ? (
                              <button
                                type="button"
                                onClick={() => handleInstantDeleteObservacao(o.id)}
                                className="hover:bg-red-50 text-red-500 rounded p-1 transition-colors flex items-center gap-1 text-[10px] font-bold"
                                title="Excluir observação geral"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                            ) : <div />}
                            <span className="text-[10px] font-bold text-slate-400">
                              {o.autor} {o.data ? `• ${o.data}` : ""}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic p-2 bg-slate-50/50 rounded-lg text-center border border-dashed border-slate-200">Nenhuma observação geral registrada.</p>
                    )}
                  </div>

                  {isEditing && isWritable && (
                    <div className="space-y-2 pt-2 border-t border-slate-150">
                      <textarea
                        rows={3}
                        placeholder="Adicionar nova observação..."
                        value={newObservacaoText}
                        onChange={(e) => setNewObservacaoText(e.target.value)}
                        className="w-full p-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddObservacao}
                          className="px-4 py-2 bg-brand-secondary text-white rounded-lg text-xs font-bold hover:bg-brand-secondary/90 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Adicionar Observação
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. ANEXOS / ATTACHMENTS FOR ACTIVE CONTRACTS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 mt-6">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-accent" />
                Anexos & Documentos do Contrato Ativo ({documentos?.length || 0})
              </span>
            </h3>

            {/* List of currently attached documents */}
            {documentos && documentos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
                {documentos.map((doc: any) => (
                  <div key={doc.id} className="p-3 border border-slate-150 rounded-xl hover:border-brand-accent transition-all flex items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="w-5 h-5 text-brand-accent shrink-0" />
                      <div className="truncate text-left">
                        <p className="text-xs font-bold text-slate-800 truncate" title={doc.nome}>
                          {doc.nome}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {doc.data} • {doc.tamanho}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.nome && [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"].some(ext => doc.nome.toLowerCase().endsWith(ext)) && (
                        <button
                          type="button"
                          onClick={() => handlePreviewDocument(doc)}
                          className="px-3 py-1.5 bg-brand-accent/10 hover:bg-brand-accent text-brand-accent hover:text-white rounded-lg text-[10px] font-extrabold transition-all uppercase tracking-wider flex items-center gap-1"
                          title="Visualizar documento diretamente"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Visualizar
                        </button>
                      )}
                      <a
                        href={doc.url}
                        download={doc.nome}
                        target="_blank"
                        rel="noreferrer referrerPolicy"
                        className="px-3 py-1.5 hover:bg-white border border-slate-200 text-brand-accent rounded-lg text-[10px] font-extrabold transition-colors uppercase tracking-wider"
                        title="Baixar ou Visualizar Documento"
                      >
                        Baixar
                      </a>
                      {isEditing && isWritable && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 hover:bg-red-50 text-brand-error rounded-lg transition-colors"
                          title="Excluir Documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-350 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                <FileText className="w-6 h-6 mx-auto opacity-30 mb-2" />
                <p className="text-xs font-bold">Nenhum documento anexado para este contrato ativo</p>
                <p className="text-[10px] text-slate-400 mt-1">Os documentos anexados aqui são específicos para este Contrato Ativo.</p>
              </div>
            )}

            {/* Upload Area */}
            {isEditing && isWritable && (
              <div className="pt-2">
                <label 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-5 transition-all ${
                    isUploading 
                      ? "border-brand-secondary bg-slate-50/50 cursor-not-allowed" 
                      : isDragging
                        ? "border-brand-secondary bg-brand-secondary/10 scale-[1.01]"
                        : "border-slate-200 hover:border-brand-accent cursor-pointer hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center text-center pointer-events-none">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 text-brand-accent animate-spin mb-1.5" />
                        <p className="text-xs font-bold text-slate-700">Enviando arquivo...</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Salvando no banco de dados, aguarde...</p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 text-brand-accent mb-1.5" />
                        <p className="text-xs font-extrabold text-slate-700">Anexar Documento (PDF, Excel ou Imagem)</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Clique ou arraste o arquivo aqui</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="application/pdf,image/*,.xlsx,.xls" 
                    className="hidden" 
                    onChange={handleLocalFileUpload} 
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}
          </div>
        </form>
      )}
 
      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full h-[85vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-accent/15 text-brand-accent flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none">
                    {previewDoc.nome}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    Anexo do Contrato Ativo • {previewDoc.tamanho}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewDoc(null);
                  setExcelPreviewData(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-200/60 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-all"
                title="Fechar visualização"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewport Content */}
            <div className="flex-1 overflow-auto bg-slate-100/50 p-6 flex flex-col items-center justify-center relative">
              {/* If it's an Excel file, we show the tab selector */}
              {previewDoc && (previewDoc.nome.toLowerCase().endsWith(".xlsx") || previewDoc.nome.toLowerCase().endsWith(".xls")) && (
                <div className="w-full flex justify-center gap-2 mb-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExcelTab("microsoft")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      excelTab === "microsoft"
                        ? "bg-brand-primary text-white shadow-md"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Visualizador Microsoft Office Online (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcelTab("local")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      excelTab === "local"
                        ? "bg-brand-primary text-white shadow-md"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Visualizador Integrado (Local)
                  </button>
                </div>
              )}

              {isParsingExcel ? (
                <div className="flex flex-col items-center justify-center gap-2 flex-1">
                  <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                  <p className="text-xs font-bold text-slate-600">Processando planilha Excel...</p>
                </div>
              ) : previewDoc && (previewDoc.nome.toLowerCase().endsWith(".xlsx") || previewDoc.nome.toLowerCase().endsWith(".xls")) ? (
                excelTab === "microsoft" ? (
                  /* Microsoft Office Web View */
                  <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner flex-1">
                    <iframe
                      src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(`${window.location.origin}/api/public-document/${previewDoc.id}`)}`}
                      className="w-full h-full border-none"
                      title="Microsoft Excel Viewer"
                    />
                    <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-400 text-center border-t border-slate-150 shrink-0">
                      Nota: O visualizador da Microsoft requer que o servidor esteja acessível publicamente na internet.
                    </div>
                  </div>
                ) : excelPreviewData ? (
                  /* Excel spreadsheet viewer */
                  <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner flex-1">
                    {/* Sheets tabs */}
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
                      {excelPreviewData.sheets.map((sheetName, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSwitchExcelSheet(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                            excelPreviewData.activeSheetIdx === idx
                              ? "bg-brand-accent text-white shadow-sm"
                              : "bg-white text-slate-500 hover:text-slate-800 border border-slate-200"
                          }`}
                        >
                          {sheetName}
                        </button>
                      ))}
                    </div>
                    {/* Worksheet HTML content rendered */}
                    <div className="flex-1 overflow-auto p-4 bg-white select-text">
                      <style dangerouslySetInnerHTML={{ __html: `
                        .excel-preview-table table {
                          border-collapse: collapse;
                          width: auto;
                          min-width: 100%;
                          font-family: ui-sans-serif, system-ui, sans-serif;
                          font-size: 11px;
                        }
                        .excel-preview-table th, .excel-preview-table td {
                          border: 1px solid #e2e8f0;
                          padding: 6px 10px;
                          text-align: left;
                          min-width: 80px;
                        }
                        .excel-preview-table tr:nth-child(even) {
                          background-color: #f8fafc;
                        }
                      `}} />
                      <div 
                        className="excel-preview-table"
                        dangerouslySetInnerHTML={{ __html: excelPreviewData.htmlContent }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-bold">Erro ao carregar dados integrados. Por favor, utilize o visualizador da Microsoft.</div>
                )
              ) : previewDoc.nome.toLowerCase().endsWith(".pdf") || previewDoc.url.startsWith("data:application/pdf") ? (
                /* PDF preview iframe */
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full rounded-2xl border border-slate-200 shadow-sm bg-white"
                  title="PDF Viewer"
                />
              ) : (
                /* Image preview */
                <div className="max-w-full max-h-full flex items-center justify-center p-2">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.nome}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-md border border-slate-200 bg-white"
                  />
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <a
                href={previewDoc.url}
                download={previewDoc.nome}
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Documento
              </a>
              <button
                type="button"
                onClick={() => {
                  setPreviewDoc(null);
                  setExcelPreviewData(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF PREVIEW AND EXPORT MODAL */}
      {selectedObra && (
        <div 
          className={showPdfPreview ? "fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4 overflow-y-auto" : "fixed -left-[10000px] -top-[10000px] pointer-events-none"}
          style={{ visibility: 'visible' }}
        >
          <motion.div
            initial={showPdfPreview ? { opacity: 0, scale: 0.95 } : false}
            animate={showPdfPreview ? { opacity: 1, scale: 1 } : false}
            className="bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full border border-slate-800 text-white flex flex-col md:flex-row h-[90vh] overflow-hidden"
          >
            {/* LEFT / MAIN COLUMN: THE PDF SHEET PREVIEW CANVAS */}
            <div className="flex-1 bg-slate-100 p-4 sm:p-8 overflow-y-auto flex items-start justify-center">
              {/* THE WHITE PAPER CONTAINER TARGETED BY HTML2CANVAS */}
              <div
                ref={pdfContentRef}
                id="ficha-cadastral-pdf-content"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "32px",
                  borderRadius: "12px",
                  maxWidth: "800px",
                  width: "100%",
                  border: "2px solid #cbd5e1",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                  boxSizing: "border-box",
                  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                  minHeight: "1123px"
                }}
              >
                {/* 1. Header Block */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src="https://dptxkbsyzfntolgmhniz.supabase.co/storage/v1/object/sign/ProjetoCerto/faviconProjetoCerto.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2MyYjJkMS1hMDBkLTQ5N2EtYTQwMC0zOWM0MjFkZmNmYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJQcm9qZXRvQ2VydG8vZmF2aWNvblByb2pldG9DZXJ0by5wbmciLCJpYXQiOjE3ODA0MjQxNDIsImV4cCI6MjA5NTc4NDE0Mn0._ofXmRtiUUM0MbiBO-FO7fBd5btjixNn1B7EGjNUVy4"
                      alt="Favicon"
                      crossOrigin="anonymous"
                      style={{ width: "48px", height: "48px", objectFit: "contain" }}
                    />
                    <div style={{ borderLeft: "2px solid #000000", paddingLeft: "12px" }}>
                      <h2 style={{ fontSize: "16px", fontWeight: 900, color: "#000000", textTransform: "uppercase", margin: 0, lineHeight: 1 }}>PROJETO CERTO</h2>
                      <p style={{ fontSize: "8px", fontWeight: 900, color: "#ea580c", textTransform: "uppercase", margin: "2px 0 0 0", letterSpacing: "1px" }}>Soluções Arquitetônicas Inteligentes</p>
                    </div>
                  </div>
                  
                  <div style={{ height: "40px", width: "2px", backgroundColor: "#000000" }}></div>

                  <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: "18px", fontWeight: 900, color: "#000000", textTransform: "uppercase", margin: 0 }}>Dados para Contrato</h1>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", textAlign: "right" }}>
                    <div style={{ fontSize: "9px", color: "#000000", fontWeight: 800 }}>
                      <p style={{ color: "#000000", fontWeight: 700, margin: 0 }}>Data:</p>
                      <p style={{ color: "#000000", fontWeight: 900, margin: "2px 0 0 0" }}>
                        {new Date().toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div style={{ backgroundColor: "#ea580c", color: "#ffffff", borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileText style={{ width: "20px", height: "20px", color: "#ffffff" }} />
                    </div>
                  </div>
                </div>

                {/* Horizontal line divider */}
                <div style={{ height: "6px", backgroundColor: "#ea580c", borderRadius: "9999px" }}></div>

                {/* 2. Hero Card with Building Image and Main attributes */}
                <div style={{ border: "2px solid #cbd5e1", borderRadius: "16px", padding: "20px", backgroundColor: "#ffffff", display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "center" }}>
                  <div style={{ height: "176px" }}>
                    <BuildingIllustration />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 900, color: "#ea580c", letterSpacing: "1px", textTransform: "uppercase", display: "block" }}>CLIENTE</span>
                      <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#000000", margin: "2px 0 0 0" }}>
                        {clienteNome || "Nome do cliente"}
                      </h2>
                    </div>

                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 900, color: "#ea580c", letterSpacing: "1px", textTransform: "uppercase", display: "block" }}>NOME DA OBRA</span>
                      <h3 style={{ fontSize: "15px", fontWeight: 900, color: "#000000", margin: "2px 0 0 0", lineHeight: 1.2 }}>
                        {contratoNome || selectedObra.nome}
                      </h3>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", paddingTop: "8px", borderTop: "2px solid #e2e8f0" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <MapPin style={{ width: "16px", height: "16px", color: "#ea580c", flexShrink: 0, marginTop: "2px" }} />
                        <div>
                          <p style={{ fontSize: "8px", fontWeight: 800, color: "#000000", textTransform: "uppercase", margin: 0 }}>LOCALIZAÇÃO (OBRA)</p>
                          <p style={{ fontSize: "10px", fontWeight: 900, color: "#000000", margin: "2px 0 0 0", lineHeight: 1.2 }} title={`${municipio || ""} - ${uf || ""}`}>
                            {municipio ? `${municipio} - ${uf}` : (enderecoEntrega || "Não informado")}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <Calendar style={{ width: "16px", height: "16px", color: "#ea580c", flexShrink: 0, marginTop: "2px" }} />
                        <div>
                          <p style={{ fontSize: "8px", fontWeight: 800, color: "#000000", textTransform: "uppercase", margin: 0 }}>DATA CADASTRO</p>
                          <p style={{ fontSize: "10px", fontWeight: 900, color: "#000000", margin: "2px 0 0 0" }}>
                            {selectedObra.dataInicioContrato 
                              ? new Date(selectedObra.dataInicioContrato).toLocaleDateString("pt-BR") 
                              : selectedObra.createdAt 
                                ? new Date(selectedObra.createdAt).toLocaleDateString("pt-BR") 
                                : new Date().toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <CheckCircle style={{ width: "16px", height: "16px", color: "#047857", flexShrink: 0, marginTop: "2px" }} />
                        <div>
                          <p style={{ fontSize: "8px", fontWeight: 800, color: "#000000", textTransform: "uppercase", margin: 0 }}>STATUS</p>
                          <div style={{ marginTop: "2px" }}>
                            <span style={{ display: "inline-block", backgroundColor: "#047857", color: "#ffffff", border: "1px solid #065f46", padding: "2px 10px", borderRadius: "6px", fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>
                              ATIVA
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Dados Gerais Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "6px", borderBottom: "2px solid #cbd5e1" }}>
                    <div style={{ width: "24px", height: "24px", backgroundColor: "#ea580c", color: "#ffffff", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                      <Briefcase style={{ width: "14px", height: "14px", color: "#ffffff" }} />
                    </div>
                    <h3 style={{ fontSize: "12px", fontWeight: 900, color: "#ea580c", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>DADOS GERAIS</h3>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #cbd5e1", fontSize: "12px" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>Cliente/Incorporadora:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{clienteNome || "Não Informado"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #cbd5e1", fontSize: "12px" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>CNPJ:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{cnpj ? formatCNPJ(cnpj) : "Não Informado"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #cbd5e1", fontSize: "12px" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>Nome do Contato:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{nomeContato || "Não Informado"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #cbd5e1", fontSize: "12px" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>Contato (Telefone):</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{contato ? formatPhone(contato) : "Não Informado"}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #cbd5e1", fontSize: "12px" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>Metragem a Instalar:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{metragemAInstalar ? `${formatMetragemValue(metragemAInstalar)} M²` : "Não informada"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #cbd5e1", fontSize: "12px" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>Frete Tipo:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{freteTipo || "CIF"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Informações Complementares Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "6px", borderBottom: "2px solid #cbd5e1" }}>
                    <div style={{ width: "24px", height: "24px", backgroundColor: "#ea580c", color: "#ffffff", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                      <FileText style={{ width: "14px", height: "14px", color: "#ffffff" }} />
                    </div>
                    <h3 style={{ fontSize: "12px", fontWeight: 900, color: "#ea580c", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>INFORMAÇÕES COMPLEMENTARES</h3>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "2px solid #cbd5e1" }}>
                      <h4 style={{ fontSize: "10px", fontWeight: 900, color: "#000000", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px 0" }}>Descrição das Condições Comerciais</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {parseComments(condicoesComerciais).length > 0 ? (
                          parseComments(condicoesComerciais).map((c) => (
                            <div key={c.id} style={{ padding: "12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1", position: "relative" }}>
                              <p style={{ fontSize: "12px", color: "#000000", fontWeight: 800, lineHeight: 1.5, margin: "0 0 8px 0", whiteSpace: "pre-line" }}>{c.texto}</p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}>
                                {user?.nivel?.toUpperCase() === 'ADMIN' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleInstantDeleteCondicao(c.id)}
                                    className="no-print"
                                    style={{ color: "#dc2626", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "bold" }}
                                    title="Excluir condição comercial"
                                  >
                                    <Trash2 style={{ width: "14px", height: "14px" }} />
                                    Excluir
                                  </button>
                                ) : <div />}
                                <span style={{ fontSize: "9px", fontWeight: 900, color: "#ffffff", backgroundColor: "#0f172a", padding: "2px 8px", borderRadius: "4px" }}>
                                  {c.autor} {c.data ? `• ${c.data}` : ""}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: "12px", color: "#000000", fontWeight: 700, fontStyle: "italic", margin: 0 }}>Sem condições registradas.</p>
                        )}
                      </div>
                    </div>

                    <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "2px solid #cbd5e1" }}>
                      <h4 style={{ fontSize: "10px", fontWeight: 900, color: "#000000", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px 0" }}>Observações Gerais</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {parseComments(observacoesGerais).length > 0 ? (
                          parseComments(observacoesGerais).map((o) => (
                            <div key={o.id} style={{ padding: "12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1", position: "relative" }}>
                              <p style={{ fontSize: "12px", color: "#000000", fontWeight: 800, lineHeight: 1.5, margin: "0 0 8px 0", whiteSpace: "pre-line" }}>{o.texto}</p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}>
                                {user?.nivel?.toUpperCase() === 'ADMIN' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleInstantDeleteObservacao(o.id)}
                                    className="no-print"
                                    style={{ color: "#dc2626", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "bold" }}
                                    title="Excluir observação geral"
                                  >
                                    <Trash2 style={{ width: "14px", height: "14px" }} />
                                    Excluir
                                  </button>
                                ) : <div />}
                                <span style={{ fontSize: "9px", fontWeight: 900, color: "#ffffff", backgroundColor: "#0f172a", padding: "2px 8px", borderRadius: "4px" }}>
                                  {o.autor} {o.data ? `• ${o.data}` : ""}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: "12px", color: "#000000", fontWeight: 700, fontStyle: "italic", margin: 0 }}>Sem observações gerais.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "2px solid #cbd5e1" }}>
                    <h4 style={{ fontSize: "10px", fontWeight: 900, color: "#000000", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px 0" }}>Itens a serem instalados</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {itensInstalacao.length > 0 ? (
                        itensInstalacao.map((it, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: 900, color: "#000000", backgroundColor: "#ffffff", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                            <span>{it.material}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: "12px", color: "#000000", fontWeight: 700, fontStyle: "italic", margin: 0 }}>Nenhum item cadastrado.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Endereços Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "6px", borderBottom: "2px solid #cbd5e1" }}>
                    <div style={{ width: "24px", height: "24px", backgroundColor: "#ea580c", color: "#ffffff", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                      <MapPin style={{ width: "14px", height: "14px", color: "#ffffff" }} />
                    </div>
                    <h3 style={{ fontSize: "12px", fontWeight: 900, color: "#ea580c", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>ENDEREÇOS</h3>
                  </div>

                  <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "2px solid #cbd5e1" }}>
                    <h4 style={{ fontSize: "10px", fontWeight: 900, color: "#000000", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px 0" }}>Endereço de Entrega / Instalação</h4>
                    <div style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#000000" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #cbd5e1", padding: "8px 0" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>Município:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{municipio || "Não informado"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #cbd5e1", padding: "8px 0" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>UF:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{uf || "Não informado"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #cbd5e1", padding: "8px 0" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>Bairro:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{bairro || "Não informado"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #cbd5e1", padding: "8px 0" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>Complemento:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{complemento || "Não informado"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                        <span style={{ fontWeight: 800, color: "#000000" }}>Logradouro:</span>
                        <span style={{ fontWeight: 900, color: "#000000", textAlign: "right" }}>{enderecoEntrega || "Não informado"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Footer Block */}
                <div style={{ paddingTop: "16px", borderTop: "2px solid #cbd5e1", textAlign: "center", fontSize: "9px", fontWeight: 900, color: "#000000" }}>
                  <p style={{ margin: 0 }}>Projeto Certo LTDA | CNPJ do Contrato: {cnpj ? formatCNPJ(cnpj) : "Não Informado"}</p>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR: CONTROLS */}
            <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Dados para Contrato</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Opções de Exportação</p>
                  </div>
                  <button
                    onClick={() => setShowPdfPreview(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Informações do Contrato</p>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Cliente:</span>
                      <span className="text-slate-200 max-w-[120px] truncate">{clienteNome || "Não informado"}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Contrato:</span>
                      <span className="text-slate-200 max-w-[120px] truncate">{contratoNome || "Não informado"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={exportToPDF}
                  disabled={isExportingPdf}
                  className="w-full inline-flex items-center justify-center gap-2 bg-brand-accent hover:bg-opacity-90 text-white text-xs font-extrabold py-3 rounded-xl cursor-pointer shadow transition-all disabled:opacity-50"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Baixar PDF Comercial
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold py-3 rounded-xl cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" /> Imprimir / Salvar Local
                </button>

                <button
                  type="button"
                  onClick={() => setShowPdfPreview(false)}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-300 font-bold py-2 cursor-pointer transition-colors"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* MODAL: ENVIAR PARA EQUIPE CONFIRMATION */}
      <AnimatePresence>
        {showConfirmEnviarEquipe && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-100 overflow-hidden p-6 space-y-4"
            >
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                Enviar para Equipe
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Deseja enviar e-mail informando toda equipe?
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmEnviarEquipe(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-colors"
                  onClick={() => {
                    setShowConfirmEnviarEquipe(false);
                    handleEnviarEquipe();
                  }}
                >
                  Confirmar e Enviar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple ID Generator helper if needed on client (matches server id pattern)
function generateId() {
  return Math.random().toString(36).substring(2, 11);
}
