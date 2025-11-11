/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

import { ACCOUNT_CURRENCY_OPTIONS, getCurrencyDecimals } from "@/config/currencies";
import { createTransactionAction } from "@/actions/transactions";
import { initialActionState } from "@/actions/types";
import { useToast } from "@/components/providers/toast-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const POLL_INTERVAL_MS = 1500;
const AUTO_STAGE_STEP_MS = 2200;
const CATCHUP_STAGE_STEP_MS = 420;

const TEXTAREA_BASE_CLASSES =
  "min-h-[6rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const DROPZONE_BASE_CLASSES =
  "relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const PROGRESS_STAGE_ORDER: ReceiptProgressStage[] = [
  "uploading",
  "enhancing",
  "ocr",
  "interpreting",
  "validating",
  "persisting",
  "done",
];

type LocalizedProgressStep = {
  id: ReceiptProgressStage;
  title: string;
  description: string;
  range: [number, number];
};

function resolveJobStatusLabels(locale: string): Record<ReceiptJobStatus, string> {
  if (locale.startsWith("id")) {
    return {
      pending: "Menunggu antrian",
      processing: "Memproses struk",
      succeeded: "Berhasil diproses",
      failed: "Gagal diproses",
    } satisfies Record<ReceiptJobStatus, string>;
  }

  return {
    pending: "Waiting in queue",
    processing: "Processing receipt",
    succeeded: "Processed successfully",
    failed: "Processing failed",
  } satisfies Record<ReceiptJobStatus, string>;
}

function resolveProgressSteps(locale: string): LocalizedProgressStep[] {
  if (locale.startsWith("id")) {
    return [
      {
        id: "uploading",
        title: "Mengunggah struk",
        description: "Mengunggah struk ke server dengan koneksi aman.",
        range: [0, 10],
      },
      {
        id: "enhancing",
        title: "Menjernihkan gambar",
        description: "Membersihkan citra agar teks lebih mudah dibaca.",
        range: [10, 25],
      },
      {
        id: "ocr",
        title: "Membaca teks (OCR)",
        description: "Menjalankan mesin OCR untuk mengambil detail struk.",
        range: [25, 55],
      },
      {
        id: "interpreting",
        title: "Menganalisis isi struk",
        description: "Menafsirkan item, harga, dan total belanja.",
        range: [55, 75],
      },
      {
        id: "validating",
        title: "Memeriksa hasil",
        description: "Memastikan angka dan format transaksi konsisten.",
        range: [75, 85],
      },
      {
        id: "persisting",
        title: "Menyimpan ke akun",
        description: "Menyimpan struk dan transaksi ke akun kamu.",
        range: [85, 95],
      },
      {
        id: "done",
        title: "Berhasil disimpan",
        description: "Struk selesai diproses dan siap ditinjau.",
        range: [95, 100],
      },
    ];
  }

  return [
    {
      id: "uploading",
      title: "Uploading receipt",
      description: "Sending the receipt to the server securely.",
      range: [0, 10],
    },
    {
      id: "enhancing",
      title: "Enhancing image",
      description: "Improving clarity so the text is readable.",
      range: [10, 25],
    },
    {
      id: "ocr",
      title: "Reading text (OCR)",
      description: "Running OCR to capture receipt details.",
      range: [25, 55],
    },
    {
      id: "interpreting",
      title: "Interpreting receipt contents",
      description: "Parsing items, prices, and totals.",
      range: [55, 75],
    },
    {
      id: "validating",
      title: "Validating results",
      description: "Ensuring amounts and formatting stay consistent.",
      range: [75, 85],
    },
    {
      id: "persisting",
      title: "Saving to workspace",
      description: "Storing the receipt and transaction in your workspace.",
      range: [85, 95],
    },
    {
      id: "done",
      title: "Processing complete",
      description: "Receipt processed and ready to review.",
      range: [95, 100],
    },
  ];
}

function resolveErrorCopyByStage(locale: string): Record<ReceiptProgressStage | "unknown", string> {
  if (locale.startsWith("id")) {
    return {
      uploading: "Unggahan gagal. Periksa koneksi dan coba lagi.",
      enhancing: "Gambar sulit diproses. Pastikan struk tidak buram.",
      ocr: "Teks sulit terbaca. Coba foto lebih dekat atau rata.",
      interpreting: "Data belanja sulit disusun. Coba unggah ulang struk.",
      validating: "Total tidak konsisten. Periksa kembali total di struk.",
      persisting: "Tidak bisa menyimpan ke akun. Coba lagi sebentar.",
      done: "Berhasil! Struk tersimpan.",
      failed: "Terjadi kesalahan saat memproses struk.",
      unknown: "Proses struk terhenti. Coba lagi.",
    } satisfies Record<ReceiptProgressStage | "unknown", string>;
  }

  return {
    uploading: "Upload failed. Check your connection and try again.",
    enhancing: "Could not enhance the image. Make sure the receipt isn’t blurry.",
    ocr: "Text was hard to read. Try a closer, flatter photo.",
    interpreting: "Receipt data was hard to interpret. Please upload again.",
    validating: "Totals looked inconsistent. Double-check the receipt.",
    persisting: "Unable to save to your account. Try again shortly.",
    done: "Success! Receipt stored.",
    failed: "An error occurred while processing the receipt.",
    unknown: "Receipt processing stopped unexpectedly. Try again.",
  } satisfies Record<ReceiptProgressStage | "unknown", string>;
}

function normalizeProgressStage(value: unknown): ReceiptProgressStage | null {
  if (typeof value !== "string") {
    return null;
  }
  if (value === "failed") {
    return "failed";
  }
  return (PROGRESS_STAGE_ORDER as string[]).includes(value) ? (value as ReceiptProgressStage) : null;
}

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatStageRange([start, end]: [number, number]): string {
  return `${start}-${end}%`;
}

function normalizeProgressDetail(payload: unknown): ProgressDetail | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const detail: ProgressDetail = {};
  const raw = payload as { ocr?: unknown };
  if (raw.ocr && typeof raw.ocr === "object") {
    const ocr = raw.ocr as { status?: unknown; progress?: unknown; confidence?: unknown };
    const status = typeof ocr.status === "string" ? ocr.status : "";
    const progress = typeof ocr.progress === "number" && Number.isFinite(ocr.progress) ? ocr.progress : null;
    const confidence = typeof ocr.confidence === "number" && Number.isFinite(ocr.confidence) ? ocr.confidence : undefined;
    if (status || progress !== null || confidence !== undefined) {
      detail.ocr = {
        status: status || "processing",
        progress: progress ?? 0,
        ...(confidence !== undefined ? { confidence } : {}),
      };
    }
  }

  return Object.keys(detail).length > 0 ? detail : null;
}

function formatMinorForInput(minor: number | null | undefined, currency: string): string {
  if (minor === null || minor === undefined) {
    return "";
  }
  if (!Number.isFinite(minor)) {
    return "";
  }
  const decimals = getCurrencyDecimals(currency);
  const factor = 10 ** decimals;
  const normalized = minor / factor;
  return normalized.toFixed(decimals);
}

function resolveCurrencyStep(currency: string): string {
  const decimals = getCurrencyDecimals(currency);
  if (decimals <= 0) {
    return "1";
  }
  return `0.${"0".repeat(Math.max(0, decimals - 1))}1`;
}

function toMinorFromInput(value: string, currency: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = Number.parseFloat(trimmed.replace(/,/g, "."));
  if (!Number.isFinite(normalized)) {
    return null;
  }
  const decimals = getCurrencyDecimals(currency);
  const factor = 10 ** decimals;
  return Math.round(normalized * factor);
}

type ReceiptProgressStage =
  | "uploading"
  | "enhancing"
  | "ocr"
  | "interpreting"
  | "validating"
  | "persisting"
  | "done"
  | "failed";

type ProgressDetail = {
  ocr?: {
    status: string;
    progress: number;
    confidence?: number;
  };
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "tracking"; jobId: string }
  | { status: "success"; receiptId: string; warnings: string[] }
  | { status: "error"; message: string };

type ReceiptJobStatus = "pending" | "processing" | "succeeded" | "failed";

type JobStatusSnapshot = {
  jobId: string;
  status: ReceiptJobStatus;
  updatedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  sourceFilename: string | null;
  storagePath: string | null;
  progressStage: ReceiptProgressStage | null;
  progressMessage: string | null;
  progressValue: number | null;
  progressDetail: ProgressDetail | null;
  receipt:
  | {
    id: string;
    merchantName: string;
    merchantAddress: string | null;
    currency: string;
    totalMinor: number;
    subtotalMinor: number | null;
    taxMinor: number | null;
    discountMinor: number | null;
    purchaseAt: string | null;
    paymentMethod: string | null;
    confidence: number | null;
    warnings: string[];
  }
  | null;
};

type JobStatusResponse = {
  job: {
    id: string;
    status: ReceiptJobStatus;
    errorMessage: string | null;
    errorCode: string | null;
    sourceFilename: string | null;
    storagePath: string | null;
    attemptCount: number;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    progressStage: string | null;
    progressMessage: string | null;
    progressValue: number | null;
    progressDetail: unknown;
  };
  receipt?: JobStatusSnapshot["receipt"];
};

type ReceiptDraft = {
  merchantName: string;
  purchaseDate: string;
  paymentMethod: string;
  currency: string;
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  notes: string;
};

type ProcessingMode = "enhanced" | "direct";

type UploadReceiptAccountOption = {
  id: string;
  name: string;
  currency: string;
};

type UploadReceiptFormProps = {
  accounts: UploadReceiptAccountOption[];
};

export function UploadReceiptForm({ accounts }: UploadReceiptFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const firstAccount = accounts[0] ?? null;
  const { locale: activeLocale } = useI18n();
  const [accountId, setAccountId] = useState<string>(() => firstAccount?.id ?? "");
  const [currency, setCurrency] = useState<string>(() => firstAccount?.currency ?? ACCOUNT_CURRENCY_OPTIONS[0]?.value ?? "IDR");
  const [ocrLocale, setOcrLocale] = useState<string>(() => (activeLocale === "id" ? "id-ID" : "en-US"));
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusSnapshot | null>(null);
  const [isProgressVisible, setIsProgressVisible] = useState(false);
  const [transientNotice, setTransientNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [storagePreviewUrl, setStoragePreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollRetryRef = useRef(0);
  const lastProgressStageRef = useRef<ReceiptProgressStage>("uploading");
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>("enhanced");
  const [displayStageIndex, setDisplayStageIndex] = useState(0);
  const stageAdvanceTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const jobStatusLabels = useMemo(() => resolveJobStatusLabels(activeLocale), [activeLocale]);
  const progressSteps = useMemo(() => resolveProgressSteps(activeLocale), [activeLocale]);
  const errorCopyByStage = useMemo(() => resolveErrorCopyByStage(activeLocale), [activeLocale]);
  const isIndonesian = useMemo(() => activeLocale.startsWith("id"), [activeLocale]);
  const fetchingStatusLabel = useMemo(
    () => (isIndonesian ? "Meminta status..." : "Requesting status..."),
    [isIndonesian],
  );
  const [createState, createTransactionFormAction] = useActionState(createTransactionAction, initialActionState);
  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const hasAccounts = accounts.length > 0;
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearStageAdvanceTimer = useCallback(() => {
    if (stageAdvanceTimeoutRef.current) {
      window.clearTimeout(stageAdvanceTimeoutRef.current);
      stageAdvanceTimeoutRef.current = null;
    }
  }, []);

  const handleFileSelection = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) {
        setFile(null);
        setPreviewUrl(null);
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: isIndonesian ? "File terlalu besar" : "File too large",
          description: isIndonesian
            ? "Ukuran maksimum 10MB per struk."
            : "Maximum size is 10MB per receipt.",
          variant: "error",
        });
        return;
      }

      if (selectedFile.type && !ACCEPTED_MIME_TYPES.includes(selectedFile.type)) {
        toast({
          title: isIndonesian ? "Format tidak didukung" : "Unsupported format",
          description: isIndonesian
            ? "Gunakan JPG, PNG, WEBP, HEIC, HEIF, atau TIFF."
            : "Use JPG, PNG, WEBP, HEIC, HEIF, or TIFF.",
          variant: "error",
        });
        return;
      }

      setFile(selectedFile);
      setState({ status: "idle" });
      setJobStatus(null);
      setActiveJobId(null);
      setStoragePreviewUrl(null);
      setReceiptDraft(null);
      setTransientNotice(null);
      setIsProgressVisible(false);
      setIsCreateDialogOpen(false);
      setIsCreatingTransaction(false);
      clearStageAdvanceTimer();
      setDisplayStageIndex(0);
    },
    [clearStageAdvanceTimer, isIndonesian, setState, toast],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragActive(false);
      const droppedFile = event.dataTransfer.files?.[0] ?? null;
      if (droppedFile) {
        handleFileSelection(droppedFile);
      }
      event.dataTransfer.clearData();
    },
    [handleFileSelection],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleDropzoneKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }, [openFilePicker]);

  const handleDraftChange = useCallback((key: keyof ReceiptDraft, value: string) => {
    setReceiptDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const handleCreateDialogOpenChange = useCallback((nextOpen: boolean) => {
    setIsCreateDialogOpen(nextOpen);
    if (!nextOpen) {
      setIsCreatingTransaction(false);
    }
  }, []);
  const handleResetAfterSuccess = useCallback(() => {
    setState({ status: "idle" });
    setJobStatus(null);
    setFile(null);
    setActiveJobId(null);
    setIsProgressVisible(false);
    setTransientNotice(null);
    setReceiptDraft(null);
    setStoragePreviewUrl(null);
    setPreviewUrl(null);
    setIsCreateDialogOpen(false);
    lastProgressStageRef.current = "uploading";
    clearStageAdvanceTimer();
    setDisplayStageIndex(0);
  }, [clearStageAdvanceTimer, setActiveJobId, setFile, setIsProgressVisible, setJobStatus, setPreviewUrl, setReceiptDraft, setState]);
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!hasAccounts) {
      setAccountId("");
      return;
    }
    setAccountId((previous) => {
      if (previous && accountMap.has(previous)) {
        return previous;
      }
      return accounts[0]?.id ?? "";
    });
  }, [accountMap, accounts, hasAccounts]);

  useEffect(() => {
    if (!hasAccounts) {
      return;
    }
    const resolvedAccount = accountId ? accountMap.get(accountId) ?? null : accounts[0] ?? null;
    if (resolvedAccount?.currency) {
      setCurrency(resolvedAccount.currency);
    }
  }, [accountId, accountMap, accounts, hasAccounts]);

  const warnings = jobStatus?.receipt?.warnings ?? (state.status === "success" ? state.warnings : []);
  const isBusy = state.status === "uploading" || state.status === "tracking";
  const statusLabel = jobStatus
    ? jobStatusLabels[jobStatus.status]
    : state.status === "tracking"
      ? fetchingStatusLabel
      : null;
  const failingStage = (jobStatus?.errorCode as ReceiptProgressStage | null) ?? null;
  const activeProgressStage: ReceiptProgressStage = useMemo(() => {
    if (state.status === "error") {
      return "failed";
    }
    if (state.status === "success") {
      return "done";
    }
    if (jobStatus?.progressStage === "failed") {
      return "failed";
    }
    if (jobStatus?.progressStage) {
      return jobStatus.progressStage;
    }
    if (state.status === "uploading") {
      return "uploading";
    }
    return lastProgressStageRef.current ?? "uploading";
  }, [jobStatus?.progressStage, state.status]);

  const { targetStageIndex, stageStepDelay } = useMemo(() => {
    let target = displayStageIndex;
    let delay = AUTO_STAGE_STEP_MS;

    if (activeProgressStage === "failed") {
      const failureStageId = failingStage ?? lastProgressStageRef.current ?? "uploading";
      const failureIndex = PROGRESS_STAGE_ORDER.indexOf(failureStageId);
      target = failureIndex >= 0 ? failureIndex : 0;
      delay = 0;
      return { targetStageIndex: target, stageStepDelay: delay };
    }

    if (state.status === "success" || activeProgressStage === "done") {
      target = PROGRESS_STAGE_ORDER.length - 1;
      delay = CATCHUP_STAGE_STEP_MS;
      return { targetStageIndex: target, stageStepDelay: delay };
    }

    const reportedStage =
      jobStatus?.progressStage && jobStatus.progressStage !== "failed"
        ? jobStatus.progressStage
        : null;

    if (reportedStage) {
      const reportedIndex = PROGRESS_STAGE_ORDER.indexOf(reportedStage);
      if (reportedIndex >= 0) {
        target = Math.max(reportedIndex, displayStageIndex);
        delay = reportedIndex > displayStageIndex ? CATCHUP_STAGE_STEP_MS : 0;
        return { targetStageIndex: target, stageStepDelay: delay };
      }
    }

    if (state.status === "tracking") {
      target = Math.min(displayStageIndex + 1, PROGRESS_STAGE_ORDER.length - 2);
      delay = AUTO_STAGE_STEP_MS;
      return { targetStageIndex: target, stageStepDelay: delay };
    }

    if (state.status === "uploading") {
      target = 0;
      delay = 0;
    }

    return { targetStageIndex: target, stageStepDelay: delay };
  }, [
    activeProgressStage,
    displayStageIndex,
    failingStage,
    jobStatus?.progressStage,
    state.status,
  ]);

  useEffect(() => {
    if (targetStageIndex === displayStageIndex) {
      clearStageAdvanceTimer();
      return;
    }

    if (targetStageIndex < displayStageIndex) {
      clearStageAdvanceTimer();
      setDisplayStageIndex(targetStageIndex);
      return;
    }

    const nextDelay = targetStageIndex - displayStageIndex > 1 ? CATCHUP_STAGE_STEP_MS : stageStepDelay;

    clearStageAdvanceTimer();
    stageAdvanceTimeoutRef.current = window.setTimeout(() => {
      stageAdvanceTimeoutRef.current = null;
      setDisplayStageIndex((current) => {
        if (targetStageIndex <= current) {
          return targetStageIndex;
        }
        return Math.min(current + 1, targetStageIndex);
      });
    }, nextDelay);

    return () => {
      clearStageAdvanceTimer();
    };
  }, [
    clearStageAdvanceTimer,
    displayStageIndex,
    stageStepDelay,
    targetStageIndex,
  ]);

  const displayStageId = useMemo(() => {
    const boundedIndex = Math.min(
      Math.max(displayStageIndex, 0),
      PROGRESS_STAGE_ORDER.length - 1,
    );
    return PROGRESS_STAGE_ORDER[boundedIndex] ?? "uploading";
  }, [displayStageIndex]);

  const displayStep = useMemo(() => {
    if (activeProgressStage === "failed" && failingStage) {
      return progressSteps.find((step) => step.id === failingStage) ?? progressSteps[0];
    }
    return progressSteps.find((step) => step.id === displayStageId) ?? progressSteps[0];
  }, [activeProgressStage, displayStageId, failingStage, progressSteps]);

  const progressPercent = useMemo(() => {
    if (state.status === "success") {
      return 100;
    }
    if (jobStatus?.progressValue != null) {
      return clampPercent(jobStatus.progressValue);
    }
    if (state.status === "error") {
      return 100;
    }
    const step = progressSteps.find((candidate) => candidate.id === displayStageId);
    if (step) {
      const [min, max] = step.range;
      const midpoint = min + (max - min) / 2;
      return clampPercent(Math.round(midpoint));
    }
    return 0;
  }, [displayStageId, jobStatus?.progressValue, progressSteps, state.status]);

  const stageMessage = useMemo(() => {
    if (activeProgressStage === "failed") {
      const stageKey = failingStage ?? lastProgressStageRef.current ?? "unknown";
      return errorCopyByStage[stageKey] ?? errorCopyByStage.unknown;
    }
    if (transientNotice) {
      return transientNotice;
    }
    return jobStatus?.progressMessage ?? displayStep?.description ?? "";
  }, [activeProgressStage, displayStep, errorCopyByStage, failingStage, jobStatus?.progressMessage, transientNotice]);

  const stageState = useCallback(
    (stageId: ReceiptProgressStage): "done" | "active" | "upcoming" | "failed" => {
      const stageIndex = PROGRESS_STAGE_ORDER.indexOf(stageId);
      const resolvedStageIndex = stageIndex === -1 ? Number.MAX_SAFE_INTEGER : stageIndex;

      if (activeProgressStage === "failed") {
        const failStageId = failingStage ?? lastProgressStageRef.current ?? "uploading";
        const failIndex = PROGRESS_STAGE_ORDER.indexOf(failStageId);

        if (failIndex === -1) {
          return stageId === "uploading" ? "failed" : "upcoming";
        }

        if (resolvedStageIndex < failIndex) {
          return "done";
        }

        if (resolvedStageIndex === failIndex) {
          return "failed";
        }

        return "upcoming";
      }

      if (resolvedStageIndex < displayStageIndex) {
        return "done";
      }

      if (resolvedStageIndex === displayStageIndex) {
        return state.status === "success" && stageId === "done" ? "done" : "active";
      }

      return stageId === "done" && activeProgressStage === "done" ? "done" : "upcoming";
    },
    [activeProgressStage, displayStageIndex, failingStage, state.status],
  );

  const ocrConfidence = jobStatus?.progressDetail?.ocr?.confidence;
  const lowConfidenceHint =
    typeof ocrConfidence === "number"
    && Number.isFinite(ocrConfidence)
    && ocrConfidence > 0
    && ocrConfidence < 60
    && activeProgressStage !== "failed";

  const previewImageUrl = previewUrl ?? storagePreviewUrl;
  const dropzoneClasses = `${DROPZONE_BASE_CLASSES} w-full max-w-full ${isDragActive ? "border-primary/80 bg-primary/10 shadow-sm" : "hover:border-primary/60 hover:bg-primary/5"}`;
  const receiptResult = jobStatus?.receipt ?? null;
  const receiptConfidenceLabel =
    typeof receiptResult?.confidence === "number" && Number.isFinite(receiptResult.confidence)
      ? `${Math.round(receiptResult.confidence * 100)}%`
      : null;
  const hasReceiptResult = Boolean(receiptDraft && receiptResult);
  const reviewWarnings = receiptResult?.warnings ?? [];
  const receiptCurrencyStep = resolveCurrencyStep(receiptDraft?.currency ?? currency);
  const canCreateTransaction = Boolean(receiptDraft && receiptDraft.total && accountId);
  const previewTotalMinor = receiptDraft?.total ? toMinorFromInput(receiptDraft.total, receiptDraft.currency) : null;
  const previewSubtotalMinor = receiptDraft?.subtotal ? toMinorFromInput(receiptDraft.subtotal, receiptDraft.currency) : null;
  const previewTaxMinor = receiptDraft?.tax ? toMinorFromInput(receiptDraft.tax, receiptDraft.currency) : null;
  const previewDiscountMinor = receiptDraft?.discount ? toMinorFromInput(receiptDraft.discount, receiptDraft.currency) : null;
  const defaultDialogAccountId = accountId || accounts[0]?.id || "";
  const defaultOccurredAt = receiptDraft?.purchaseDate || new Date().toISOString().slice(0, 10);
  const defaultDescription = receiptDraft?.merchantName ?? "";

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!jobStatus?.storagePath) {
      setStoragePreviewUrl(null);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    supabase.storage
      .from("receipts")
      .createSignedUrl(jobStatus.storagePath, 60 * 60)
      .then((result) => {
        if (cancelled) {
          return;
        }
        const signed = result.data?.signedUrl ?? null;
        setStoragePreviewUrl(signed);
      })
      .catch(() => {
        if (!cancelled) {
          setStoragePreviewUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobStatus?.storagePath]);

  useEffect(() => {
    if (!jobStatus?.receipt) {
      setReceiptDraft(null);
      return;
    }

    const receipt = jobStatus.receipt;
    const receiptCurrency = receipt.currency ?? currency;
    setReceiptDraft({
      merchantName: receipt.merchantName ?? "",
      purchaseDate: receipt.purchaseAt ? receipt.purchaseAt.slice(0, 10) : "",
      paymentMethod: receipt.paymentMethod ?? "",
      currency: receiptCurrency,
      total: formatMinorForInput(receipt.totalMinor, receiptCurrency),
      subtotal: formatMinorForInput(receipt.subtotalMinor, receiptCurrency),
      tax: formatMinorForInput(receipt.taxMinor, receiptCurrency),
      discount: formatMinorForInput(receipt.discountMinor, receiptCurrency),
      notes: receipt.warnings.length > 0 ? receipt.warnings.join("; ") : "",
    });
  }, [currency, jobStatus?.receipt]);

  useEffect(() => {
    if (createState.status === "idle") {
      return;
    }

    if (createState.status === "success") {
      toast({
        title: isIndonesian ? "Transaksi dibuat" : "Transaction created",
        description:
          createState.message
          ?? (isIndonesian
            ? "Transaksi dari struk berhasil ditambahkan."
            : "Receipt details saved as a transaction."),
        variant: "success",
      });
      setIsCreatingTransaction(false);
      setIsCreateDialogOpen(false);
      handleResetAfterSuccess();
      router.push("/app/transactions");
      return;
    }

    if (createState.status === "error") {
      toast({
        title: isIndonesian ? "Gagal membuat transaksi" : "Unable to create transaction",
        description:
          createState.message
          ?? (isIndonesian
            ? "Periksa kembali data transaksi."
            : "Review the transaction details and try again."),
        variant: "error",
      });
      setIsCreatingTransaction(false);
    }
  }, [createState.message, createState.status, handleResetAfterSuccess, isIndonesian, router, toast]);

  useEffect(() => {
    if (state.status === "uploading" || state.status === "tracking") {
      setIsProgressVisible(true);
      return;
    }

    if (state.status === "success") {
      const timeoutId = window.setTimeout(() => {
        setIsProgressVisible(false);
        setTransientNotice(null);
      }, 4000);
      return () => window.clearTimeout(timeoutId);
    }

    if (state.status === "error") {
      const timeoutId = window.setTimeout(() => {
        setIsProgressVisible(false);
      }, 6000);
      return () => window.clearTimeout(timeoutId);
    }

    setTransientNotice(null);
    setIsProgressVisible(false);
    return undefined;
  }, [state.status]);

  useEffect(() => {
    if (!isCameraOpen) {
      stopCamera();
      return;
    }

    let active = true;

    async function enableCamera() {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        const message = isIndonesian
          ? "Perangkat ini tidak mendukung akses kamera di browser."
          : "This device does not support camera access in the browser.";
        setCameraError(message);
        toast({
          title: isIndonesian ? "Kamera tidak tersedia" : "Camera unavailable",
          description: message,
          variant: "error",
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.setAttribute("playsinline", "true");
          video.muted = true;
          video.srcObject = stream;
          try {
            await video.play();
            setCameraError(null);
          } catch (playError) {
            const message = playError instanceof Error
              ? playError.message
              : isIndonesian
                ? "Tidak dapat memutar kamera"
                : "Unable to play camera feed";
            setCameraError(message);
          }
        }
      } catch (error) {
        if (!active) {
          return;
        }
        const message = error instanceof Error
          ? error.message
          : isIndonesian
            ? "Tidak dapat mengakses kamera"
            : "Unable to access camera";
        setCameraError(message);
        toast({
          title: isIndonesian ? "Tidak dapat membuka kamera" : "Camera access blocked",
          description: isIndonesian
            ? "Pastikan izin kamera diizinkan. Safari iOS memerlukan koneksi HTTPS."
            : "Allow camera permissions. Safari on iOS requires an HTTPS connection.",
          variant: "error",
        });
      }
    }

    enableCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [isCameraOpen, isIndonesian, stopCamera, toast]);

  const handleCloseCamera = useCallback(() => {
    setIsCameraOpen(false);
    setCameraError(null);
    stopCamera();
  }, [stopCamera]);

  const canvasToBlob = useCallback((canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const handleBlob = (blob: Blob | null) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(isIndonesian ? "Gagal menghasilkan gambar dari kamera" : "Could not capture image from camera"));
        }
      };

      if (canvas.toBlob) {
        canvas.toBlob(handleBlob, "image/jpeg", 0.92);
        return;
      }

      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const base64 = dataUrl.split(",")[1];
        const byteString = atob(base64 ?? "");
        const array = new Uint8Array(byteString.length);
        for (let index = 0; index < byteString.length; index += 1) {
          array[index] = byteString.charCodeAt(index);
        }
        resolve(new Blob([array], { type: "image/jpeg" }));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(isIndonesian ? "Gagal menyiapkan gambar" : "Failed to prepare image"));
      }
    });
  }, [isIndonesian]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setCameraError(isIndonesian ? "Kamera belum siap" : "Camera not ready yet");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setCameraError(isIndonesian ? "Menunggu kamera siap..." : "Waiting for camera to start...");
      return;
    }

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError(isIndonesian ? "Canvas tidak tersedia" : "Canvas not available");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    setIsCapturing(true);
    try {
      const blob = await canvasToBlob(canvas);
      const capturedFile = new File([blob], `receipt-${Date.now()}.jpg`, { type: blob.type });
      handleFileSelection(capturedFile);
      handleCloseCamera();
      toast({
        title: isIndonesian ? "Foto ditangkap" : "Photo captured",
        description: isIndonesian
          ? "Tekan Scan struk untuk mulai memproses."
          : "Tap Scan receipt to start processing.",
        variant: "success",
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : isIndonesian
          ? "Tidak dapat menyimpan foto"
          : "Unable to save photo";
      setCameraError(message);
      toast({
        title: isIndonesian ? "Kamera gagal" : "Camera capture failed",
        description: message,
        variant: "error",
      });
    } finally {
      setIsCapturing(false);
    }
  }, [canvasToBlob, handleCloseCamera, handleFileSelection, isIndonesian, toast]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast({
        title: isIndonesian ? "Upload gagal" : "Upload failed",
        description: isIndonesian
          ? "Pilih file struk terlebih dahulu."
          : "Select a receipt file first.",
        variant: "error",
      });
      return;
    }

    if (!accountId) {
      toast({
        title: isIndonesian ? "Upload gagal" : "Upload failed",
        description: isIndonesian
          ? "Pilih akun pembayaran terlebih dahulu."
          : "Choose a destination account first.",
        variant: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", accountId);
    formData.append("currency", currency.toUpperCase());
    formData.append("locale", ocrLocale);
    formData.append("mode", processingMode);

    setState({ status: "uploading" });
    setJobStatus(null);
    setActiveJobId(null);
    setTransientNotice(null);
    pollRetryRef.current = 0;
    lastProgressStageRef.current = "uploading";
    clearStageAdvanceTimer();
    setDisplayStageIndex(0);
    setIsProgressVisible(true);

    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : isIndonesian
              ? "Gagal memproses struk"
              : "Failed to process receipt",
        );
      }

      const jobId = typeof payload?.jobId === "string" ? payload.jobId : null;

      if (!jobId) {
        throw new Error(isIndonesian ? "ID pekerjaan tidak valid" : "Invalid job identifier");
      }

      setState({ status: "tracking", jobId });
      setActiveJobId(jobId);
    } catch (error) {
      const fallback = errorCopyByStage.uploading;
      const message = error instanceof Error ? error.message : fallback;
      const displayMessage = typeof message === "string" && message.trim().length > 0 ? message : fallback;
      setState({ status: "error", message: displayMessage });
      setActiveJobId(null);
      setJobStatus(null);
      toast({
        title: isIndonesian ? "Upload gagal" : "Upload failed",
        description: displayMessage,
        variant: "error",
      });
    }
  }

  useEffect(() => {
    if (!activeJobId) {
      return;
    }

    pollRetryRef.current = 0;
    setTransientNotice(null);

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const response = await fetch(`/api/receipts/jobs/${activeJobId}`, {
          method: "GET",
          cache: "no-store",
        });

        const raw = (await response.json()) as unknown;

        if (!response.ok) {
          const errorPayload = raw as { error?: unknown } | null;
          const message = typeof errorPayload?.error === "string"
            ? errorPayload.error
            : isIndonesian
              ? "Gagal memuat status"
              : "Unable to load status";
          throw new Error(message);
        }

        const payload = raw as JobStatusResponse;

        if (cancelled) {
          return;
        }

        const nextStatus: JobStatusSnapshot = {
          jobId: payload.job.id,
          status: payload.job.status,
          updatedAt: payload.job.updatedAt ?? null,
          completedAt: payload.job.completedAt ?? null,
          errorMessage: payload.job.errorMessage ?? null,
          errorCode: payload.job.errorCode ?? null,
          sourceFilename: payload.job.sourceFilename ?? null,
          storagePath: typeof payload.job.storagePath === "string" ? payload.job.storagePath : null,
          progressStage: normalizeProgressStage(payload.job.progressStage),
          progressMessage: typeof payload.job.progressMessage === "string" ? payload.job.progressMessage : null,
          progressValue: (() => {
            if (typeof payload.job.progressValue === "number") {
              return clampPercent(payload.job.progressValue);
            }
            if (typeof payload.job.progressValue === "string") {
              const parsed = Number(payload.job.progressValue);
              return Number.isFinite(parsed) ? clampPercent(parsed) : null;
            }
            return null;
          })(),
          progressDetail: normalizeProgressDetail(payload.job.progressDetail),
          receipt: payload.receipt ?? null,
        };

        setJobStatus(nextStatus);
        setTransientNotice(null);
        pollRetryRef.current = 0;

        const reportedStage = nextStatus.progressStage && nextStatus.progressStage !== "failed"
          ? nextStatus.progressStage
          : null;
        if (reportedStage) {
          lastProgressStageRef.current = reportedStage;
        }

        if (nextStatus.status === "succeeded") {
          lastProgressStageRef.current = "done";
          const receiptId = nextStatus.receipt?.id ?? null;
          if (nextStatus.receipt) {
            setState({
              status: "success",
              receiptId: receiptId ?? nextStatus.receipt.id,
              warnings: nextStatus.receipt.warnings,
            });
            toast({
              title: isIndonesian ? "Struk diproses" : "Receipt processed",
              description: isIndonesian
                ? "Hasil parsing siap ditinjau di daftar transaksi."
                : "Parsed details are ready in the transactions list.",
              variant: "success",
            });
            setFile(null);
            setTransientNotice(null);
          } else {
            const message = isIndonesian
              ? "Struk selesai, tetapi data tidak ditemukan."
              : "Processing finished but no data was returned.";
            setState({ status: "error", message });
            toast({
              title: isIndonesian ? "Upload gagal" : "Upload failed",
              description: message,
              variant: "error",
            });
          }
          setActiveJobId(null);
          return;
        }

        if (nextStatus.status === "failed") {
          const stageForError = (nextStatus.errorCode as ReceiptProgressStage | null) ?? lastProgressStageRef.current ?? "unknown";
          lastProgressStageRef.current = stageForError === "failed" ? lastProgressStageRef.current : stageForError;
          const friendly = errorCopyByStage[stageForError] ?? errorCopyByStage.unknown;
          setState({ status: "error", message: friendly });
          setTransientNotice(null);
          toast({
            title: isIndonesian ? "Upload gagal" : "Upload failed",
            description: friendly,
            variant: "error",
          });
          setActiveJobId(null);
          return;
        }

        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (pollRetryRef.current < 2) {
          pollRetryRef.current += 1;
          setTransientNotice(isIndonesian ? "Koneksi lambat, mencoba lagi..." : "Connection is slow, retrying...");
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS * 2);
          return;
        }

        const message = error instanceof Error
          ? error.message
          : isIndonesian
            ? "Gagal memuat status"
            : "Unable to load status";
        const stageForError = lastProgressStageRef.current ?? "unknown";
        const friendly = errorCopyByStage[stageForError] ?? message;
        setState({ status: "error", message: friendly });
        setTransientNotice(null);
        toast({
          title: isIndonesian ? "Upload gagal" : "Upload failed",
          description: friendly,
          variant: "error",
        });
        setActiveJobId(null);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeJobId, errorCopyByStage, isIndonesian, toast]);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="receipt-file">{isIndonesian ? "Gambar struk" : "Receipt image"}</Label>
          <Input
            ref={fileInputRef}
            id="receipt-file"
            type="file"
            accept={ACCEPTED_MIME_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => handleFileSelection(event.currentTarget.files?.[0] ?? null)}
          />
          <div
            className={dropzoneClasses}
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={handleDropzoneKeyDown}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            aria-describedby="receipt-dropzone-help"
          >
            {previewImageUrl ? (
              <div className="w-full max-w-md overflow-hidden rounded-md border border-border/60 bg-background/60">
                <img
                  src={previewImageUrl}
                  alt={isIndonesian ? "Preview struk" : "Receipt preview"}
                  className="h-56 w-full object-cover"
                />
              </div>
            ) : (
              <div className="space-y-2 text-muted-foreground">
                <p className="text-base font-semibold text-foreground">
                  {isIndonesian ? "Tarik & lepas struk di sini" : "Drag & drop receipt here"}
                </p>
                <p className="text-xs">
                  {isIndonesian ? "atau klik untuk pilih dari perangkat" : "or click to choose from device"}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {file
                ? (isIndonesian ? `Dipilih: ${file.name}` : `Selected: ${file.name}`)
                : jobStatus?.sourceFilename
                  ? (isIndonesian
                    ? `Terakhir diunggah: ${jobStatus.sourceFilename}`
                    : `Last uploaded: ${jobStatus.sourceFilename}`)
                  : isIndonesian
                    ? "Format: JPG, PNG, WEBP, HEIC, HEIF, TIFF • Maks 10MB"
                    : "Formats: JPG, PNG, WEBP, HEIC, HEIF, TIFF • Max 10MB"}
            </p>
          </div>
          <div
            className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground"
            id="receipt-dropzone-help"
          >
            <span>
              {isIndonesian
                ? "Tarik file atau klik area di atas untuk memilih gambar struk."
                : "Drag a file or click the area above to choose a receipt image."}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCameraOpen(true);
                setCameraError(null);
              }}
            >
              {isIndonesian ? "Scan dari kamera" : "Scan from camera"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="receipt-account">{isIndonesian ? "Metode bayar" : "Payment account"}</Label>
          <select
            id="receipt-account"
            name="accountId"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            disabled={!hasAccounts || isBusy}
            required
          >
            <option value="" disabled>
              {isIndonesian ? "Pilih akun pembayaran" : "Select a payment account"}
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {hasAccounts ? (
            <p className="text-xs text-muted-foreground">
              {isIndonesian
                ? "Transaksi akan dicatat ke akun ini."
                : "The transaction will post to this account."}
            </p>
          ) : (
            <p className="text-xs text-destructive">
              {isIndonesian
                ? "Tambahkan akun dulu di menu Accounts sebelum scan struk."
                : "Add an account in the Accounts tab before scanning receipts."}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="receipt-currency">{isIndonesian ? "Mata uang" : "Currency"}</Label>
          <select
            id="receipt-currency"
            name="currency"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
            }}
            disabled={isBusy}
          >
            {ACCOUNT_CURRENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="receipt-locale">{isIndonesian ? "Locale teks" : "Text locale"}</Label>
          <Input
            id="receipt-locale"
            value={ocrLocale}
            onChange={(event) => setOcrLocale(event.target.value)}
            placeholder={isIndonesian ? "id-ID" : "en-US"}
          />
        </div>

        <div className="space-y-2">
          <Label>{isIndonesian ? "Metode pemrosesan" : "Processing mode"}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer flex-col rounded-md border p-3 text-sm transition-colors ${processingMode === "enhanced" ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="processing-mode"
                  value="enhanced"
                  checked={processingMode === "enhanced"}
                  onChange={() => setProcessingMode("enhanced")}
                  disabled={isBusy}
                  className="h-4 w-4 border-input text-primary focus:outline-none"
                />
                <span className="font-medium text-foreground">
                  {isIndonesian ? "Disempurnakan (disarankan)" : "Enhanced (recommended)"}
                </span>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                {isIndonesian
                  ? "Membersihkan gambar dan menjalankan OCR sebelum dikirim ke LLM."
                  : "Cleans up the image and runs OCR before sending it to the LLM."}
              </span>
            </label>
            <label
              className={`flex cursor-pointer flex-col rounded-md border p-3 text-sm transition-colors ${processingMode === "direct" ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="processing-mode"
                  value="direct"
                  checked={processingMode === "direct"}
                  onChange={() => setProcessingMode("direct")}
                  disabled={isBusy}
                  className="h-4 w-4 border-input text-primary focus:outline-none"
                />
                <span className="font-medium text-foreground">
                  {isIndonesian ? "Langsung ke LLM" : "Direct to LLM"}
                </span>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                {isIndonesian
                  ? "Melewati preprocessing dan OCR; cocok untuk percobaan cepat."
                  : "Skips preprocessing and OCR - useful for quick experiments."}
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isBusy || !hasAccounts}>
              {state.status === "uploading"
                ? isIndonesian
                  ? "Mengunggah..."
                  : "Uploading..."
                : state.status === "tracking"
                  ? isIndonesian
                    ? "Memproses..."
                    : "Processing..."
                  : isIndonesian
                    ? "Scan struk"
                    : "Scan receipt"}
            </Button>
            {statusLabel ? (
              <p className="text-xs text-muted-foreground">
                {statusLabel}
                {jobStatus?.receipt ? (
                  <>
                    {" "}
                    {isIndonesian ? "• ID struk:" : "• Receipt ID:"}
                    {" "}
                    <span className="font-mono">{jobStatus.receipt.id}</span>
                  </>
                ) : null}
                {warnings.length > 0
                  ? isIndonesian
                    ? ` • ${warnings.length} catatan`
                    : ` • ${warnings.length} note${warnings.length > 1 ? "s" : ""}`
                  : null}
              </p>
            ) : null}
            {state.status === "error" ? (
              <p className="text-xs text-destructive">{state.message}</p>
            ) : null}
          </div>
        </div>

        {isCameraOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur">
            <div className="w-full max-w-md rounded-lg border border-border/60 bg-background shadow-lg">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <p className="text-sm font-semibold">
                  {isIndonesian ? "Tangkap foto struk" : "Capture receipt photo"}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCloseCamera}
                  disabled={isCapturing}
                >
                  {isIndonesian ? "Tutup" : "Close"}
                </Button>
              </div>
              <div className="flex flex-col gap-3 px-4 py-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border/60 bg-muted">
                  <video ref={videoRef} className="h-full w-full object-contain" playsInline />
                  {cameraError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4 text-center text-sm text-destructive">
                      {cameraError}
                    </div>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isIndonesian
                    ? "Pastikan pencahayaan cukup dan struk memenuhi bingkai. Tekan capture saat siap."
                    : "Ensure good lighting and keep the receipt within frame. Press capture when ready."}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseCamera}
                    disabled={isCapturing}
                  >
                    {isIndonesian ? "Batal" : "Cancel"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCapture}
                    disabled={Boolean(cameraError) || isCapturing}
                  >
                    {isCapturing
                      ? isIndonesian
                        ? "Menyimpan..."
                        : "Saving..."
                      : isIndonesian
                        ? "Ambil foto"
                        : "Capture photo"}
                  </Button>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" aria-hidden />
            </div>
          </div>
        ) : null}
      </form>

      {hasReceiptResult ? (
        <section className="mt-6 space-y-6 rounded-lg border border-border/70 bg-card/95 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isIndonesian ? "Tinjau hasil scan" : "Review scan results"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isIndonesian
                  ? "Perbarui detail sebelum membuat transaksi."
                  : "Update any details before creating a transaction."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {receiptConfidenceLabel ? (
                <span className="rounded-full border border-border/70 px-3 py-1">
                  {isIndonesian ? "Akurasi OCR:" : "OCR confidence:"} {receiptConfidenceLabel}
                </span>
              ) : null}
              {receiptResult?.id ? (
                <span className="font-mono text-muted-foreground/80">#{receiptResult.id.slice(0, 8)}</span>
              ) : null}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                {previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt={isIndonesian ? "Hasil foto struk" : "Captured receipt photo"}
                    className="w-full max-h-[420px] object-cover"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    {isIndonesian
                      ? "Preview tidak tersedia. Unggah ulang untuk melihat gambar."
                      : "Preview unavailable. Upload again to view the image."}
                  </div>
                )}
              </div>
              {reviewWarnings.length > 0 ? (
                <div className="rounded-md border border-amber-500/60 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-200">
                  <p className="text-sm font-medium">
                    {isIndonesian ? "Catatan sistem" : "System notes"}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {reviewWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receipt-merchant">{isIndonesian ? "Nama toko" : "Merchant"}</Label>
                  <Input
                    id="receipt-merchant"
                    value={receiptDraft?.merchantName ?? ""}
                    onChange={(event) => handleDraftChange("merchantName", event.target.value)}
                    placeholder={isIndonesian ? "Nama merchant" : "Merchant name"}
                    disabled={isCreatingTransaction}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-date">{isIndonesian ? "Tanggal" : "Date"}</Label>
                  <Input
                    id="receipt-date"
                    type="date"
                    value={receiptDraft?.purchaseDate ?? ""}
                    onChange={(event) => handleDraftChange("purchaseDate", event.target.value)}
                    disabled={isCreatingTransaction}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receipt-currency-preview">{isIndonesian ? "Mata uang" : "Currency"}</Label>
                  <select
                    id="receipt-currency-preview"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={receiptDraft?.currency ?? ""}
                    onChange={(event) => handleDraftChange("currency", event.target.value)}
                    disabled={isCreatingTransaction}
                  >
                    {ACCOUNT_CURRENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-payment">{isIndonesian ? "Metode bayar" : "Payment method"}</Label>
                  <Input
                    id="receipt-payment"
                    value={receiptDraft?.paymentMethod ?? ""}
                    onChange={(event) => handleDraftChange("paymentMethod", event.target.value)}
                    placeholder={isIndonesian ? "Contoh: Tunai / Kartu" : "e.g. Cash / Card"}
                    disabled={isCreatingTransaction}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receipt-total">{isIndonesian ? "Total" : "Total"}</Label>
                  <Input
                    id="receipt-total"
                    inputMode="decimal"
                    step={receiptCurrencyStep}
                    value={receiptDraft?.total ?? ""}
                    onChange={(event) => handleDraftChange("total", event.target.value)}
                    disabled={isCreatingTransaction}
                  />
                  {receiptDraft?.currency && previewTotalMinor !== null ? (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(previewTotalMinor, receiptDraft.currency)}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-subtotal">{isIndonesian ? "Subtotal" : "Subtotal"}</Label>
                  <Input
                    id="receipt-subtotal"
                    inputMode="decimal"
                    step={receiptCurrencyStep}
                    value={receiptDraft?.subtotal ?? ""}
                    onChange={(event) => handleDraftChange("subtotal", event.target.value)}
                    disabled={isCreatingTransaction}
                  />
                  {receiptDraft?.currency && previewSubtotalMinor !== null ? (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(previewSubtotalMinor, receiptDraft.currency)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receipt-tax">{isIndonesian ? "Pajak" : "Tax"}</Label>
                  <Input
                    id="receipt-tax"
                    inputMode="decimal"
                    step={receiptCurrencyStep}
                    value={receiptDraft?.tax ?? ""}
                    onChange={(event) => handleDraftChange("tax", event.target.value)}
                    disabled={isCreatingTransaction}
                  />
                  {receiptDraft?.currency && previewTaxMinor !== null ? (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(previewTaxMinor, receiptDraft.currency)}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-discount">{isIndonesian ? "Diskon" : "Discount"}</Label>
                  <Input
                    id="receipt-discount"
                    inputMode="decimal"
                    step={receiptCurrencyStep}
                    value={receiptDraft?.discount ?? ""}
                    onChange={(event) => handleDraftChange("discount", event.target.value)}
                    disabled={isCreatingTransaction}
                  />
                  {receiptDraft?.currency && previewDiscountMinor !== null ? (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrency(previewDiscountMinor, receiptDraft.currency)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt-notes">{isIndonesian ? "Catatan" : "Notes"}</Label>
                <textarea
                  id="receipt-notes"
                  className={TEXTAREA_BASE_CLASSES}
                  value={receiptDraft?.notes ?? ""}
                  onChange={(event) => handleDraftChange("notes", event.target.value)}
                  placeholder={isIndonesian ? "Catatan tambahan (opsional)" : "Additional notes (optional)"}
                  disabled={isCreatingTransaction}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleResetAfterSuccess()}
                  disabled={isCreatingTransaction}
                >
                  {isIndonesian ? "Unggah struk baru" : "Upload another receipt"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsCreateDialogOpen(true);
                    setIsCreatingTransaction(false);
                  }}
                  disabled={!canCreateTransaction || isCreatingTransaction}
                >
                  {isCreatingTransaction
                    ? isIndonesian
                      ? "Menyimpan..."
                      : "Saving..."
                    : isIndonesian
                      ? "Buat transaksi"
                      : "Create transaction"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent className="max-w-lg space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isIndonesian ? "Buat transaksi dari struk" : "Create transaction from receipt"}
            </DialogTitle>
          </DialogHeader>
          <form
            action={createTransactionFormAction}
            className="space-y-4"
            onSubmit={() => setIsCreatingTransaction(true)}
          >
            <input type="hidden" name="type" value="expense" />
            <div className="space-y-2">
              <Label htmlFor="receipt-dialog-account">{isIndonesian ? "Akun" : "Account"}</Label>
              <select
                id="receipt-dialog-account"
                name="accountId"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={defaultDialogAccountId}
                required
                disabled={isCreatingTransaction}
              >
                <option value="" disabled>
                  {isIndonesian ? "Pilih akun pembayaran" : "Select a payment account"}
                </option>
                {accounts.map((accountOption) => (
                  <option key={accountOption.id} value={accountOption.id}>
                    {accountOption.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-dialog-amount">{isIndonesian ? "Jumlah" : "Amount"}</Label>
              <Input
                id="receipt-dialog-amount"
                name="amount"
                inputMode="decimal"
                step={receiptCurrencyStep}
                defaultValue={receiptDraft?.total ?? ""}
                required
                disabled={isCreatingTransaction}
              />
              {receiptDraft?.currency && previewTotalMinor !== null ? (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(previewTotalMinor, receiptDraft.currency)}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-dialog-date">{isIndonesian ? "Tanggal" : "Date"}</Label>
              <Input
                id="receipt-dialog-date"
                name="occurredAt"
                type="date"
                defaultValue={defaultOccurredAt}
                required
                disabled={isCreatingTransaction}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-dialog-description">{isIndonesian ? "Deskripsi" : "Description"}</Label>
              <Input
                id="receipt-dialog-description"
                name="description"
                defaultValue={defaultDescription}
                placeholder={isIndonesian ? "Judul transaksi" : "Transaction title"}
                disabled={isCreatingTransaction}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isCreatingTransaction}>
                  {isIndonesian ? "Batal" : "Cancel"}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isCreatingTransaction || !canCreateTransaction}>
                {isCreatingTransaction
                  ? isIndonesian
                    ? "Menyimpan..."
                    : "Saving..."
                  : isIndonesian
                    ? "Simpan transaksi"
                    : "Save transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isProgressVisible ? (
        <div
          className="fixed inset-x-4 bottom-[var(--receipt-progress-bottom)] z-[75] mx-auto w-auto max-w-sm animate-in fade-in slide-in-from-bottom-2 md:inset-auto md:right-6 md:bottom-6 md:w-80"
          style={{ "--receipt-progress-bottom": "calc(var(--app-safe-area-bottom, env(safe-area-inset-bottom, 0px)) + var(--app-mobile-nav-height, 4.5rem) + 1.5rem)" } as CSSProperties}
        >
          <div className="rounded-lg border border-border/60 bg-background p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-foreground">
                  {displayStep?.title ?? (isIndonesian ? "Memproses struk" : "Processing receipt")}
                </p>
                {displayStep ? (
                  <span className="text-[11px] text-muted-foreground">{formatStageRange(displayStep.range)}</span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{stageMessage}</p>
            {lowConfidenceHint ? (
              <p className="mt-2 text-xs text-amber-500">
                {isIndonesian
                  ? "Gambar kurang jelas. Coba foto struk di tempat terang."
                  : "Image is unclear. Try capturing the receipt in brighter lighting."}
              </p>
            ) : null}
            {previewImageUrl ? (
              <div className="mt-3 overflow-hidden rounded-md border border-border/60 bg-muted/50">
                <img
                  src={previewImageUrl}
                  alt={isIndonesian ? "Preview struk" : "Receipt preview"}
                  className="h-24 w-full object-cover"
                />
              </div>
            ) : null}
            <ul className="mt-3 space-y-1 text-xs">
              {progressSteps.map((step) => {
                const status = stageState(step.id);
                const indicatorClass =
                  status === "done"
                    ? "bg-emerald-500"
                    : status === "active"
                      ? "bg-primary animate-pulse"
                      : status === "failed"
                        ? "bg-destructive"
                        : "bg-muted-foreground/40";
                const textClass =
                  status === "failed"
                    ? "text-destructive"
                    : status === "done"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : status === "active"
                        ? "text-foreground"
                        : "text-muted-foreground";
                return (
                  <li key={step.id} className="flex items-start gap-2">
                    <span className={`mt-1 inline-flex h-2 w-2 rounded-full ${indicatorClass}`} />
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium ${textClass}`}>{step.title}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {formatStageRange(step.range)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            {activeProgressStage === "done" ? (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    router.push("/app/receipts");
                    setIsProgressVisible(false);
                  }}
                >
                  {isIndonesian ? "Lihat detail" : "View details"}
                </Button>
                <Button type="button" size="sm" onClick={handleResetAfterSuccess}>
                  {isIndonesian ? "Tambah struk lagi" : "Scan another receipt"}
                </Button>
              </div>
            ) : null}
            {activeProgressStage === "failed" ? (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsProgressVisible(false);
                    setState({ status: "idle" });
                    setJobStatus(null);
                    setActiveJobId(null);
                    setTransientNotice(null);
                    lastProgressStageRef.current = "uploading";
                  }}
                >
                  {isIndonesian ? "Coba lagi" : "Try again"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
