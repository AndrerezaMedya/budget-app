/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ACCOUNT_CURRENCY_OPTIONS } from "@/config/currencies";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/format";

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
];

const POLL_INTERVAL_MS = 1500;

const JOB_STATUS_LABEL: Record<ReceiptJobStatus, string> = {
  pending: "Menunggu antrian",
  processing: "Memproses struk",
  succeeded: "Berhasil diproses",
  failed: "Gagal diproses",
};

const PROGRESS_STAGE_ORDER: ReceiptProgressStage[] = [
  "uploading",
  "enhancing",
  "ocr",
  "interpreting",
  "validating",
  "persisting",
  "done",
];

const PROGRESS_STEPS: Array<{
  id: ReceiptProgressStage;
  title: string;
  description: string;
  range: [number, number];
}> = [
  {
    id: "uploading",
    title: "Mengunggah struk - 0-10%",
    description: "Mengunggah struk...",
    range: [0, 10],
  },
  {
    id: "enhancing",
    title: "Menjernihkan gambar - 10-25%",
    description: "Menjernihkan gambar untuk dibaca...",
    range: [10, 25],
  },
  {
    id: "ocr",
    title: "Membaca teks (OCR) - 25-55%",
    description: "Membaca teks pada struk...",
    range: [25, 55],
  },
  {
    id: "interpreting",
    title: "Menafsirkan & mengekstrak - 55-75%",
    description: "Menata item dan total belanja...",
    range: [55, 75],
  },
  {
    id: "validating",
    title: "Memeriksa & melengkapi - 75-85%",
    description: "Memeriksa konsistensi data...",
    range: [75, 85],
  },
  {
    id: "persisting",
    title: "Menyimpan ke akun - 85-95%",
    description: "Menyimpan ke akun kamu...",
    range: [85, 95],
  },
  {
    id: "done",
    title: "Selesai - 95-100%",
    description: "Berhasil! Struk tersimpan.",
    range: [95, 100],
  },
];

const ERROR_COPY_BY_STAGE: Record<ReceiptProgressStage | "unknown", string> = {
  uploading: "Unggahan gagal. Periksa koneksi dan coba lagi.",
  enhancing: "Gambar sulit diproses. Pastikan struk tidak buram.",
  ocr: "Teks sulit terbaca. Coba foto lebih dekat atau rata.",
  interpreting: "Data belanja sulit disusun. Coba unggah ulang struk.",
  validating: "Total tidak konsisten. Periksa kembali total di struk.",
  persisting: "Tidak bisa menyimpan ke akun. Coba lagi sebentar.",
  done: "Berhasil! Struk tersimpan.",
  failed: "Terjadi kesalahan saat memproses struk.",
  unknown: "Proses struk terhenti. Coba lagi.",
};

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
  const [accountId, setAccountId] = useState<string>(() => firstAccount?.id ?? "");
  const [currency, setCurrency] = useState<string>(() => firstAccount?.currency ?? ACCOUNT_CURRENCY_OPTIONS[0]?.value ?? "IDR");
  const [locale, setLocale] = useState<string>("id-ID");
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusSnapshot | null>(null);
  const [isProgressVisible, setIsProgressVisible] = useState(false);
  const [transientNotice, setTransientNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollRetryRef = useRef(0);
  const lastProgressStageRef = useRef<ReceiptProgressStage>("uploading");
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const hasAccounts = accounts.length > 0;
  const handleResetAfterSuccess = useCallback(() => {
    setState({ status: "idle" });
    setJobStatus(null);
    setFile(null);
    setActiveJobId(null);
    setIsProgressVisible(false);
    setTransientNotice(null);
    lastProgressStageRef.current = "uploading";
  }, [setActiveJobId, setFile, setIsProgressVisible, setJobStatus, setState]);
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
    ? JOB_STATUS_LABEL[jobStatus.status]
    : state.status === "tracking"
      ? "Meminta status..."
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

  const progressPercent = useMemo(() => {
    if (state.status === "success") {
      return 100;
    }
    if (jobStatus?.progressValue != null) {
      return clampPercent(jobStatus.progressValue);
    }
    if (state.status === "uploading") {
      return clampPercent(8);
    }
    if (state.status === "tracking") {
      return clampPercent(12);
    }
    if (state.status === "error") {
      return 100;
    }
    return 0;
  }, [jobStatus?.progressValue, state.status]);

  const activeStep = useMemo(() => {
    if (activeProgressStage === "failed" && failingStage) {
      return PROGRESS_STEPS.find((step) => step.id === failingStage) ?? PROGRESS_STEPS[0];
    }
    return PROGRESS_STEPS.find((step) => step.id === activeProgressStage) ?? PROGRESS_STEPS[0];
  }, [activeProgressStage, failingStage]);

  const stageMessage = useMemo(() => {
    if (activeProgressStage === "failed") {
      const stageKey = failingStage ?? lastProgressStageRef.current ?? "unknown";
      return ERROR_COPY_BY_STAGE[stageKey] ?? ERROR_COPY_BY_STAGE.unknown;
    }
    if (transientNotice) {
      return transientNotice;
    }
    return jobStatus?.progressMessage ?? activeStep?.description ?? "";
  }, [activeProgressStage, activeStep, failingStage, jobStatus?.progressMessage, transientNotice]);

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

        if (stageId === "done" && failStageId === "done" && state.status === "success") {
          return "done";
        }

        return "upcoming";
      }

      const activeIndex = PROGRESS_STAGE_ORDER.indexOf(activeProgressStage);

      if (activeIndex === -1) {
        return "upcoming";
      }

      if (resolvedStageIndex < activeIndex) {
        return "done";
      }

      if (resolvedStageIndex === activeIndex) {
        if (stageId === "done") {
          return state.status === "success" ? "done" : "active";
        }
        return "active";
      }

      if (stageId === "done" && activeProgressStage === "done") {
        return "done";
      }

      return "upcoming";
    },
    [activeProgressStage, failingStage, state.status],
  );

  const ocrConfidence = jobStatus?.progressDetail?.ocr?.confidence;
  const lowConfidenceHint =
    typeof ocrConfidence === "number"
    && Number.isFinite(ocrConfidence)
    && ocrConfidence > 0
    && ocrConfidence < 60
    && activeProgressStage !== "failed";

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
        const message = "Perangkat ini tidak mendukung akses kamera di browser.";
        setCameraError(message);
        toast({
          title: "Kamera tidak tersedia",
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
            const message = playError instanceof Error ? playError.message : "Tidak dapat memutar kamera";
            setCameraError(message);
          }
        }
      } catch (error) {
        if (!active) {
          return;
        }
        const message = error instanceof Error ? error.message : "Tidak dapat mengakses kamera";
        setCameraError(message);
        toast({
          title: "Tidak dapat membuka kamera",
          description: "Pastikan izin kamera diizinkan. Safari iOS memerlukan koneksi HTTPS.",
          variant: "error",
        });
      }
    }

    enableCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [isCameraOpen, stopCamera, toast]);

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
          reject(new Error("Gagal menghasilkan gambar dari kamera"));
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
        reject(error instanceof Error ? error : new Error("Gagal menyiapkan gambar"));
      }
    });
  }, []);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setCameraError("Kamera belum siap");
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setCameraError("Menunggu kamera siap...");
      return;
    }

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Canvas tidak tersedia");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    setIsCapturing(true);
    try {
      const blob = await canvasToBlob(canvas);
      const capturedFile = new File([blob], `receipt-${Date.now()}.jpg`, { type: blob.type });
      setFile(capturedFile);
      setState({ status: "idle" });
      setActiveJobId(null);
      setJobStatus(null);
      handleCloseCamera();
      toast({
        title: "Foto ditangkap",
        description: "Tekan Scan struk untuk mulai memproses.",
        variant: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tidak dapat menyimpan foto";
      setCameraError(message);
      toast({
        title: "Kamera gagal",
        description: message,
        variant: "error",
      });
    } finally {
      setIsCapturing(false);
    }
  }, [canvasToBlob, handleCloseCamera, toast]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast({
        title: "Upload gagal",
        description: "Pilih file struk terlebih dahulu.",
        variant: "error",
      });
      return;
    }

    if (!accountId) {
      toast({
        title: "Upload gagal",
        description: "Pilih akun pembayaran terlebih dahulu.",
        variant: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", accountId);
    formData.append("currency", currency.toUpperCase());
    formData.append("locale", locale);

    setState({ status: "uploading" });
    setJobStatus(null);
    setActiveJobId(null);
    setTransientNotice(null);
    pollRetryRef.current = 0;
    lastProgressStageRef.current = "uploading";
    setIsProgressVisible(true);

    try {
      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Gagal memproses struk");
      }

      const jobId = typeof payload?.jobId === "string" ? payload.jobId : null;

      if (!jobId) {
        throw new Error("ID pekerjaan tidak valid");
      }

      setState({ status: "tracking", jobId });
      setActiveJobId(jobId);
    } catch (error) {
      const fallback = ERROR_COPY_BY_STAGE.uploading;
      const message = error instanceof Error ? error.message : fallback;
      const displayMessage = typeof message === "string" && message.trim().length > 0 ? message : fallback;
      setState({ status: "error", message: displayMessage });
      setActiveJobId(null);
      setJobStatus(null);
      toast({
        title: "Upload gagal",
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
          const message = typeof errorPayload?.error === "string" ? errorPayload.error : "Gagal memuat status";
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
              title: "Struk diproses",
              description: "Hasil parsing siap ditinjau di daftar transaksi.",
              variant: "success",
            });
            setFile(null);
            setTransientNotice(null);
          } else {
            const message = "Struk selesai, tetapi data tidak ditemukan.";
            setState({ status: "error", message });
            toast({
              title: "Upload gagal",
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
          const friendly = ERROR_COPY_BY_STAGE[stageForError] ?? ERROR_COPY_BY_STAGE.unknown;
          setState({ status: "error", message: friendly });
          setTransientNotice(null);
          toast({
            title: "Upload gagal",
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
          setTransientNotice("Koneksi lambat, mencoba lagi...");
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS * 2);
          return;
        }

        const message = error instanceof Error ? error.message : "Gagal memuat status";
        const stageForError = lastProgressStageRef.current ?? "unknown";
        const friendly = ERROR_COPY_BY_STAGE[stageForError] ?? message;
        setState({ status: "error", message: friendly });
        setTransientNotice(null);
        toast({
          title: "Upload gagal",
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
  }, [activeJobId, toast]);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="receipt-file">Gambar struk</Label>
          <Input
            id="receipt-file"
            type="file"
            accept={ACCEPTED_MIME_TYPES.join(",")}
            onChange={(event) => {
              const selectedFile = event.currentTarget.files?.[0] ?? null;
              setFile(selectedFile);
              setState({ status: "idle" });
            }}
            required
          />
          <p className="text-xs text-muted-foreground">
            Format yang didukung: JPG, PNG, WEBP, HEIC, HEIF, TIFF (maks 10MB).
          </p>
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCameraOpen(true);
                setCameraError(null);
              }}
            >
              Scan langsung dari kamera
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="receipt-account">Metode bayar</Label>
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
              Pilih akun pembayaran
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {hasAccounts ? (
            <p className="text-xs text-muted-foreground">
              Transaksi akan dicatat ke akun ini.
            </p>
          ) : (
            <p className="text-xs text-destructive">
              Tambahkan akun dulu di menu Accounts sebelum scan struk.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="receipt-currency">Mata uang</Label>
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
          <Label htmlFor="receipt-locale">Locale teks</Label>
          <Input
            id="receipt-locale"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            placeholder="id-ID"
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isBusy || !hasAccounts}>
              {state.status === "uploading"
                ? "Mengunggah..."
                : state.status === "tracking"
                  ? "Memproses..."
                  : "Scan struk"}
            </Button>
            {statusLabel ? (
              <p className="text-xs text-muted-foreground">
                {statusLabel}
                {jobStatus?.receipt ? (
                  <>
                    {" "}• ID struk:
                    {" "}
                    <span className="font-mono">{jobStatus.receipt.id}</span>
                  </>
                ) : null}
                {warnings.length > 0 ? ` • ${warnings.length} catatan` : null}
              </p>
            ) : null}
            {state.status === "error" ? (
              <p className="text-xs text-destructive">{state.message}</p>
            ) : null}
          </div>

          {state.status === "success" && jobStatus?.receipt ? (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="text-sm font-medium text-foreground">{jobStatus.receipt.merchantName}</p>
              <p className="mt-1 text-sm text-foreground">
                {formatCurrency(jobStatus.receipt.totalMinor, jobStatus.receipt.currency)}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {jobStatus.receipt.purchaseAt ? (
                  <span>
                    Tanggal: {formatDate(jobStatus.receipt.purchaseAt)}
                  </span>
                ) : null}
                {jobStatus.receipt.paymentMethod ? (
                  <span>Metode: {jobStatus.receipt.paymentMethod}</span>
                ) : null}
                {typeof jobStatus.receipt.confidence === "number" ? (
                  <span>
                    Keyakinan: {(jobStatus.receipt.confidence * 100).toFixed(0)}%
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {warnings.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-amber-500">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}

        {isCameraOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur">
            <div className="w-full max-w-md rounded-lg border border-border/60 bg-background shadow-lg">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <p className="text-sm font-semibold">Tangkap foto struk</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCloseCamera}
                  disabled={isCapturing}
                >
                  Tutup
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
                  Pastikan pencahayaan cukup dan struk memenuhi bingkai. Tekan capture saat siap.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseCamera}
                    disabled={isCapturing}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCapture}
                    disabled={Boolean(cameraError) || isCapturing}
                  >
                    {isCapturing ? "Menyimpan..." : "Ambil foto"}
                  </Button>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" aria-hidden />
            </div>
          </div>
        ) : null}
      </form>

      {isProgressVisible ? (
        <div className="fixed bottom-6 right-6 z-50 w-80 max-w-full animate-in fade-in slide-in-from-bottom-2">
          <div className="rounded-lg border border-border/60 bg-background p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{activeStep?.title}</p>
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
                Gambar kurang jelas. Coba foto struk di tempat terang.
              </p>
            ) : null}
            {previewUrl ? (
              <div className="mt-3 overflow-hidden rounded-md border border-border/60 bg-muted/50">
                <img src={previewUrl} alt="Preview struk" className="h-24 w-full object-cover" />
              </div>
            ) : null}
            <ul className="mt-3 space-y-1 text-xs">
              {PROGRESS_STEPS.map((step) => {
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
                  <li key={step.id} className={`flex items-center gap-2 ${textClass}`}>
                    <span className={`inline-flex h-2 w-2 rounded-full ${indicatorClass}`} />
                    {step.title}
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
                  Lihat detail
                </Button>
                <Button type="button" size="sm" onClick={handleResetAfterSuccess}>
                  Tambah struk lagi
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
                  Coba lagi
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
