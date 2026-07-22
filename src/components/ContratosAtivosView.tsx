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

interface ItemInstalacao {
  material: string;
  valor: number;
}

// Global module-level cache for instant rendering
let globalObrasCache: Obra[] | null = null;
let globalContratosAtivosCache: Record<string, ContratoAtivo> | null = null;

export default function ContratosAtivosView() {
  const { hasPermission } = useAuthStore();
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
    setCondicoesComerciais(data.condicoesComerciais || "");
    setFreteTipo(data.freteTipo || "CIF");
    setEntrada(data.entrada !== undefined ? data.entrada : "");
    setSaldoReceber(data.saldoReceber !== undefined ? data.saldoReceber : "");
    setTipoObra(data.tipoObra || "Instalação");
    const rawMetragem = data.metragemAInstalar || (data as any).metragem_a_instalar || "";
    setMetragemAInstalar(rawMetragem ? formatMetragemValue(rawMetragem) : "");
    setObservacoesGerais(data.observacoesGerais || (data as any).observacoes_gerais || "");
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
      setFreteTipo("CIF");
      setEntrada("");
      setSaldoReceber("");
      setTipoObra("Instalação");
      setMetragemAInstalar("");
      setObservacoesGerais("");
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
        scale: 2, 
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          // Garante que o elemento clonado esteja visível para o html2canvas
          const clonedElement = clonedDoc.getElementById("ficha-cadastral-pdf-content");
          if (clonedElement) {
            clonedElement.style.position = "static";
            clonedElement.style.margin = "0";
            clonedElement.style.left = "0";
            clonedElement.style.top = "0";
          }

          // Backup e limpeza radical de estilos oklch/oklab no documento clonado
          const styles = Array.from(clonedDoc.querySelectorAll("style"));
          styles.forEach((el) => {
            let css = el.textContent || "";
            if (css.includes("oklch") || css.includes("oklab") || css.includes("color-mix")) {
              // Substitui color-mix e gradientes que usam oklch/oklab por srgb
              css = css.replace(/in\s+(oklch|oklab)/gi, "in srgb");
              
              // Regex para capturar funções de cor e substituir por um fallback seguro
              const colorRegex = /(oklch|oklab|color-mix|lab|lch|hwb|color)\s*\((?:[^()]+|\([^()]*\))*\)/gi;
              css = css.replace(colorRegex, "rgba(100, 100, 100, 1)");
              el.textContent = css;
            }
          });
          
          const styledElements = Array.from(clonedDoc.querySelectorAll("*")).filter(el => (el as HTMLElement).getAttribute("style"));
          styledElements.forEach(el => {
            const hEl = el as HTMLElement;
            let style = hEl.getAttribute("style") || "";
            if (style.includes("oklch") || style.includes("oklab") || style.includes("color-mix")) {
              const colorRegex = /(oklch|oklab|color-mix|lab|lch|hwb|color)\s*\((?:[^()]+|\([^()]*\))*\)/gi;
              style = style.replace(colorRegex, "rgba(100, 100, 100, 1)");
              hEl.setAttribute("style", style);
            }
          });
        }
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeightInMm = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgHeightInMm);
      
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
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          // Strip oklch/oklab from the cloned document styles ONLY to prevent crashing without affecting the main page
          const styles = Array.from(clonedDoc.querySelectorAll("style"));
          styles.forEach((el) => {
            let css = el.textContent || "";
            if (css.includes("oklch") || css.includes("oklab") || css.includes("color-mix")) {
              css = css.replace(/in\s+(oklch|oklab)/gi, "in srgb");
              const colorRegex = /(oklch|oklab|color-mix|lab|lch|hwb|color)\s*\((?:[^()]+|\([^()]*\))*\)/gi;
              css = css.replace(colorRegex, "rgba(100, 100, 100, 1)");
              el.textContent = css;
            }
          });
          
          const styledElements = Array.from(clonedDoc.querySelectorAll("*")).filter(el => (el as HTMLElement).getAttribute("style"));
          styledElements.forEach(el => {
            const hEl = el as HTMLElement;
            let style = hEl.getAttribute("style") || "";
            if (style.includes("oklch") || style.includes("oklab") || style.includes("color-mix")) {
              const colorRegex = /(oklch|oklab|color-mix|lab|lch|hwb|color)\s*\((?:[^()]+|\([^()]*\))*\)/gi;
              style = style.replace(colorRegex, "rgba(100, 100, 100, 1)");
              hEl.setAttribute("style", style);
            }
          });
        }
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const imgHeightInMm = (canvasHeight * pdfWidth) / canvasWidth;
      
      let heightLeft = imgHeightInMm;
      let position = 0;

      // Draw image
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeightInMm);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeightInMm;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeightInMm);
        heightLeft -= pdfHeight;
      }

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
        setCep(""); // Clear CEP on success
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
                        if (!valStr) return sum;
                        const cleaned = valStr.toString().replace(',', '.').replace(/[^\d.]/g, '');
                        const num = parseFloat(cleaned);
                        return sum + (isNaN(num) ? 0 : num);
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
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative focus-within:ring-2 focus-within:ring-brand-secondary/40 transition-all flex flex-col justify-between">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                    METRAGEM A INSTALAR
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  disabled={!isEditing || !isWritable}
                  value={clienteNome}
                  onChange={e => setClienteNome(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
                />
              </div>

              {/* Nome do Contrato Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nome do Contrato (Obra)
                </label>
                <input
                  type="text"
                  disabled={!isEditing || !isWritable}
                  value={contratoNome}
                  onChange={e => setContratoNome(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
                />
              </div>

              {/* CNPJ Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  CNPJ da Obra
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                    disabled={!isEditing || !isWritable}
                    value={cnpj}
                    onChange={e => setCnpj(formatCNPJ(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
                  />
                </div>
              </div>

              {/* Nome do Contato Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nome do Contato
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Nome do contato (máx. 60 caracteres)"
                    disabled={!isEditing || !isWritable}
                    value={nomeContato}
                    onChange={e => setNomeContato(e.target.value.slice(0, 60))}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
                  />
                </div>
              </div>

              {/* Contato (Telefone) Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Contato (Telefone)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    disabled={!isEditing || !isWritable}
                    value={contato}
                    onChange={e => setContato(formatPhone(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
                  />
                </div>
              </div>

              {/* Endereço da Obra with CEP Search */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        maxLength={9}
                        placeholder="01001-001"
                        disabled={!isEditing || !isWritable || cepLoading}
                        value={cep}
                        onChange={e => setCep(formatCEP(e.target.value))}
                        className="w-full pl-9 pr-2 py-2 bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCepSearch}
                      disabled={!isEditing || !isWritable || cepLoading || cep.length < 8}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white text-[10px] font-extrabold rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider"
                    >
                      {cepLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Map className="w-3 h-3" />}
                      {cepLoading ? "Buscando..." : "BUSCAR CEP"}
                    </button>
                  </div>

                  <textarea
                    placeholder="Endereço"
                    rows={2}
                    disabled={!isEditing || !isWritable}
                    value={enderecoEntrega}
                    onChange={e => setEnderecoEntrega(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all resize-none"
                  />
                </div>
              </div>

              {/* Novos campos de endereço */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Município
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing || !isWritable}
                    value={municipio}
                    onChange={e => setMunicipio(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    UF
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    disabled={!isEditing || !isWritable}
                    value={uf}
                    onChange={e => setUf(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Bairro
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing || !isWritable}
                    value={bairro}
                    onChange={e => setBairro(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Complemento
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing || !isWritable}
                    value={complemento}
                    onChange={e => setComplemento(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all"
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
              <div className="space-y-1.5">
                <textarea
                  rows={8}
                  disabled={!isEditing || !isWritable}
                  value={condicoesComerciais}
                  onChange={e => setCondicoesComerciais(e.target.value)}
                  className="w-full p-4 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all resize-y min-h-[160px] disabled:bg-slate-100/60"
                />
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
                <textarea
                  rows={10}
                  placeholder="Preencher informações / observações gerais..."
                  disabled={!isEditing || !isWritable}
                  value={observacoesGerais}
                  onChange={e => setObservacoesGerais(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand-secondary rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-secondary transition-all resize-y min-h-[220px] disabled:bg-slate-100/60"
                />
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
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-5 transition-all ${
                  isUploading 
                    ? "border-brand-secondary bg-slate-50/50 cursor-not-allowed" 
                    : "border-slate-200 hover:border-brand-accent cursor-pointer hover:bg-slate-50"
                }`}>
                  <div className="flex flex-col items-center justify-center text-center">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 text-brand-accent animate-spin mb-1.5" />
                        <p className="text-xs font-bold text-slate-700">Enviando arquivo...</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Salvando no banco de dados, aguarde...</p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 text-brand-accent mb-1.5" />
                        <p className="text-xs font-extrabold text-slate-700">Anexar Documento (PDF, Imagem, DWG, Excel)</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Clique ou arraste o arquivo aqui</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="application/pdf,image/*,.dwg,.xlsx,.xls" 
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
                className="bg-white text-slate-800 p-8 sm:p-10 shadow-lg rounded-xl max-w-[800px] w-full border border-slate-200/50 flex flex-col space-y-6"
                style={{ minHeight: "1123px" }} // A4 portrait ratio
              >
                {/* 1. Header Block */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://dptxkbsyzfntolgmhniz.supabase.co/storage/v1/object/sign/ProjetoCerto/faviconProjetoCerto.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2MyYjJkMS1hMDBkLTQ5N2EtYTQwMC0zOWM0MjFkZmNmYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJQcm9qZXRvQ2VydG8vZmF2aWNvblByb2pldG9DZXJ0by5wbmciLCJpYXQiOjE3ODA0MjQxNDIsImV4cCI6MjA5NTc4NDE0Mn0._ofXmRtiUUM0MbiBO-FO7fBd5btjixNn1B7EGjNUVy4"
                      alt="Favicon"
                      crossOrigin="anonymous"
                      className="w-12 h-12 object-contain"
                    />
                    <div className="border-l border-slate-200 pl-3">
                      <h2 className="text-md font-black text-slate-800 tracking-tight leading-none uppercase">PROJETO CERTO</h2>
                      <p className="text-[8px] font-bold text-brand-accent tracking-widest uppercase mt-0.5">Soluções Arquitetônica Inteligentes</p>
                    </div>
                  </div>
                  
                  <div className="hidden sm:block h-10 w-[1px] bg-slate-200"></div>

                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none uppercase">Dados para Contrato</h1>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div className="text-[9px] text-slate-400 font-bold leading-tight">
                      <p>Data:</p>
                      <p className="text-slate-600 font-black mt-0.5">
                        {new Date().toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="bg-brand-accent/10 border border-brand-accent/20 rounded-xl p-2.5 text-brand-accent">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Horizontal line divider */}
                <div className="h-1 bg-brand-accent rounded-full"></div>

                {/* 2. Hero Card with Building Image and Main attributes */}
                <div className="border border-slate-200/80 rounded-2xl p-5 bg-white grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="col-span-1 h-44">
                    <BuildingIllustration />
                  </div>
                  <div className="col-span-2 space-y-4">
                    <div>
                      <span className="text-[9px] font-black text-brand-accent tracking-wider uppercase">CLIENTE</span>
                      <h2 className="text-xl font-black text-slate-800 mt-0.5">
                        {clienteNome || "Nome do cliente"}
                      </h2>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-brand-accent tracking-wider uppercase">NOME DA OBRA</span>
                      <h3 className="text-md font-extrabold text-slate-700 mt-0.5 leading-tight">
                        {contratoNome || selectedObra.nome}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">LOCALIZAÇÃO (OBRA)</p>
                          <p className="text-[10px] font-extrabold text-slate-700 leading-tight" title={`${municipio || ""} - ${uf || ""}`}>
                            {municipio ? `${municipio} - ${uf}` : (enderecoEntrega || "Não informado")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">DATA CADASTRO</p>
                          <p className="text-[10px] font-extrabold text-slate-700">
                            {selectedObra.dataInicioContrato 
                              ? new Date(selectedObra.dataInicioContrato).toLocaleDateString("pt-BR") 
                              : selectedObra.createdAt 
                                ? new Date(selectedObra.createdAt).toLocaleDateString("pt-BR") 
                                : new Date().toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">STATUS</p>
                          <div>
                            <span className="inline-block bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                              ATIVA
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Dados Gerais Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                    <div className="w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-[10px] font-black text-brand-accent uppercase tracking-widest">DADOS GERAIS</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    <div className="space-y-1">
                      <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs items-center">
                        <span className="font-bold text-slate-400">Tipo de Obra:</span>
                        {isExportingPdf ? (
                          <span className="font-extrabold text-slate-800">{tipoObra}</span>
                        ) : (
                          <select
                            value={tipoObra}
                            disabled={!isEditing || !isWritable}
                            onChange={(e) => handleSaveTipoObra(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-extrabold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-brand-accent cursor-pointer"
                          >
                            <option value="Instalação">Instalação</option>
                            <option value="Brises e Instalação">Brises e Instalação</option>
                            <option value="Brises">Brises</option>
                          </select>
                        )}
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs">
                        <span className="font-bold text-slate-400">Cliente/Incorporadora:</span>
                        <span className="font-extrabold text-slate-800 text-right max-w-[200px] truncate" title={clienteNome}>{clienteNome || "Não Informado"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs">
                        <span className="font-bold text-slate-400">CNPJ:</span>
                        <span className="font-extrabold text-slate-800">{cnpj ? formatCNPJ(cnpj) : "Não Informado"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs">
                        <span className="font-bold text-slate-400">Nome do Contato:</span>
                        <span className="font-extrabold text-slate-800">{nomeContato || "Não Informado"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs">
                        <span className="font-bold text-slate-400">Contato (Telefone):</span>
                        <span className="font-extrabold text-slate-800">{contato ? formatPhone(contato) : "Não Informado"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs">
                        <span className="font-bold text-slate-400">Metragem a Instalar:</span>
                        <span className="font-extrabold text-slate-800">{metragemAInstalar ? `${formatMetragemValue(metragemAInstalar)} M²` : "Não informada"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 text-xs">
                        <span className="font-bold text-slate-400">Frete Tipo:</span>
                        <span className="font-extrabold text-slate-800">{freteTipo || "CIF"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Informações Complementares Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                    <div className="w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-[10px] font-black text-brand-accent uppercase tracking-widest">INFORMAÇÕES COMPLEMENTARES</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Descrição das Condições Comerciais</h4>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                        {condicoesComerciais || "Sem condições registradas."}
                      </p>
                    </div>

                    <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Observações Gerais</h4>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                        {observacoesGerais || "Sem observações gerais."}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Itens a serem instalados</h4>
                    <div className="mt-2 space-y-1.5">
                      {itensInstalacao.length > 0 ? (
                        itensInstalacao.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                            <span>{it.material}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">Nenhum item cadastrado.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Endereços Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                    <div className="w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-[10px] font-black text-brand-accent uppercase tracking-widest">ENDEREÇOS</h3>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Endereço de Entrega / Instalação</h4>
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      <div className="flex justify-between border-b border-slate-200/50 py-1">
                        <span className="font-bold text-slate-400">Município:</span>
                        <span className="font-extrabold">{municipio || "Não informado"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/50 py-1">
                        <span className="font-bold text-slate-400">UF:</span>
                        <span className="font-extrabold">{uf || "Não informado"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/50 py-1">
                        <span className="font-bold text-slate-400">Bairro:</span>
                        <span className="font-extrabold">{bairro || "Não informado"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/50 py-1">
                        <span className="font-bold text-slate-400">Complemento:</span>
                        <span className="font-extrabold">{complemento || "Não informado"}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="font-bold text-slate-400">Logradouro:</span>
                        <span className="font-extrabold">{enderecoEntrega || "Não informado"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Footer Block */}
                <div className="pt-4 border-t border-slate-100 text-center text-[8px] font-bold text-slate-400 space-y-0.5">
                  <p>Projeto Certo LTDA | CNPJ do Contrato: {cnpj ? formatCNPJ(cnpj) : "Não Informado"}</p>
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
                  onClick={() => setShowConfirmEnviarEquipe(true)}
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-3 rounded-xl cursor-pointer shadow transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-white" /> Enviar para Equipe
                    </>
                  )}
                </button>

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
