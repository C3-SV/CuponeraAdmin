"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  createCompanyOffer,
  getCompanyOfferDetail,
  listCompanyOffers,
  updateCompanyOffer,
} from "@/app/(admin)/(company-admin)/company-offers/actions";
import type {
  OfferCategory,
  OfferDetail,
  OfferFormInput,
  OfferImageFormInput,
  OfferImagePayload,
  OfferListItem,
  OfferQueryParams,
  OffersListResponse,
  OfferStatus,
} from "@/lib/company-offers/types";
import {
  normalizeOfferInput,
  validateOfferInput,
  type OfferFormErrors,
} from "@/lib/company-offers/validation";

type CompanyOffersCrudProps = {
  initialList: OffersListResponse;
  companyName: string;
};

type FormMode = "create" | "edit";
type OfferImageDraft = OfferImageFormInput & {
  key: string;
  file: File | null;
  previewUrl: string;
};

const DEFAULT_QUERY: OfferQueryParams = {
  search: "",
  category: "all",
  sortBy: "offer_start_date",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
};

const EMPTY_FORM: OfferFormInput = {
  offer_title: "",
  offer_description: "",
  offer_regular_price: "",
  offer_price: "",
  offer_start_date: "",
  offer_end_date: "",
  coupon_usage_deadline: "",
  coupon_quantity_limit: "",
  details: [],
  images: [],
};

const CATEGORY_OPTIONS: Array<{ value: OfferCategory; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "En espera" },
  { value: "to_correct", label: "Por corregir" },
  { value: "approved", label: "Aprobadas" },
];

const STATUS_LABELS: Record<OfferStatus, string> = {
  PENDING: "En espera",
  APPROVED: "Aprobada",
  OUT_OF_STOCK: "Sin stock",
  REJECTED: "Rechazada",
  DISCARDED: "Descartada",
};

const STATUS_CLASSES: Record<OfferStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-green-200 bg-green-50 text-green-700",
  OUT_OF_STOCK: "border-slate-200 bg-slate-50 text-slate-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  DISCARDED: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

function buildDraftKey(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyImageDraft(mainImage = false): OfferImageDraft {
  return {
    key: buildDraftKey(),
    image_url: "",
    image_alt_text: "",
    image_sort_order: "1",
    main_image: mainImage,
    upload: null,
    file: null,
    previewUrl: "",
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function toImagePayload(file: File): Promise<OfferImagePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("No fue posible leer la imagen seleccionada."));
        return;
      }
      resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    };
    reader.onerror = () => {
      reject(new Error("No fue posible procesar el archivo seleccionado."));
    };
    reader.readAsDataURL(file);
  });
}

function StatusBadge({ status }: { status: OfferStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function OffersTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          <td className="px-4 py-3 text-center">
            <div className="mx-auto h-14 w-14 rounded-lg bg-[var(--surface-soft)]" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-48 rounded bg-[var(--surface-soft)]" />
            <div className="mt-2 h-3 w-72 max-w-full rounded bg-[var(--surface-soft)]" />
          </td>
          <td className="px-4 py-3">
            <div className="mx-auto h-4 w-20 rounded bg-[var(--surface-soft)]" />
            <div className="mx-auto mt-2 h-3 w-24 rounded bg-[var(--surface-soft)]" />
          </td>
          <td className="px-4 py-3">
            <div className="mx-auto h-3 w-20 rounded bg-[var(--surface-soft)]" />
            <div className="mx-auto mt-2 h-3 w-20 rounded bg-[var(--surface-soft)]" />
          </td>
          <td className="px-4 py-3">
            <div className="mx-auto h-6 w-24 rounded-full bg-[var(--surface-soft)]" />
          </td>
          <td className="px-4 py-3">
            <div className="mx-auto flex justify-center gap-2">
              <div className="h-7 w-16 rounded-lg bg-[var(--surface-soft)]" />
              <div className="h-7 w-14 rounded-lg bg-[var(--surface-soft)]" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function OfferFormSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
        <div className="h-4 w-40 rounded bg-white" />
        <div className="mt-2 h-3 w-72 max-w-full rounded bg-white" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-10 rounded-xl bg-[var(--surface-soft)] md:col-span-2" />
        <div className="h-24 rounded-xl bg-[var(--surface-soft)] md:col-span-2" />
        <div className="h-10 rounded-xl bg-[var(--surface-soft)]" />
        <div className="h-10 rounded-xl bg-[var(--surface-soft)]" />
        <div className="h-10 rounded-xl bg-[var(--surface-soft)]" />
        <div className="h-10 rounded-xl bg-[var(--surface-soft)]" />
      </div>
      <div className="h-28 rounded-2xl bg-[var(--surface-soft)]" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-72 rounded-2xl bg-[var(--surface-soft)]" />
        <div className="h-72 rounded-2xl bg-[var(--surface-soft)]" />
      </div>
    </div>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M10 16V4" />
      <path d="m5.8 8.2 4.2-4.2 4.2 4.2" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M10 4v12" />
      <path d="m5.8 11.8 4.2 4.2 4.2-4.2" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <circle cx="7" cy="5" r="1.2" />
      <circle cx="13" cy="5" r="1.2" />
      <circle cx="7" cy="10" r="1.2" />
      <circle cx="13" cy="10" r="1.2" />
      <circle cx="7" cy="15" r="1.2" />
      <circle cx="13" cy="15" r="1.2" />
    </svg>
  );
}

function EditImageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <path d="M13.9 3.6a2 2 0 0 1 2.8 2.8l-8.4 8.4-3.4.6.6-3.4 8.4-8.4Z" />
      <path d="m12.5 5 2.5 2.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="m5 5 10 10" />
      <path d="m15 5-10 10" />
    </svg>
  );
}

function SortDirectionIcon({ direction }: { direction: OfferQueryParams["sortDir"] }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      {direction === "asc" ? (
        <>
          <path d="M10 15V4" />
          <path d="m5.8 8.2 4.2-4.2 4.2 4.2" />
        </>
      ) : (
        <>
          <path d="M10 5v11" />
          <path d="m5.8 11.8 4.2 4.2 4.2-4.2" />
        </>
      )}
    </svg>
  );
}

export function CompanyOffersCrud({
  initialList,
  companyName,
}: CompanyOffersCrudProps) {
  const [query, setQuery] = useState<OfferQueryParams>({
    ...DEFAULT_QUERY,
    page: initialList.page,
    pageSize: initialList.pageSize,
  });
  const [searchInput, setSearchInput] = useState("");
  const [listResult, setListResult] = useState(initialList);
  const [listError, setListError] = useState<string | null>(
    initialList.error ?? null,
  );
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingOffer, setEditingOffer] = useState<OfferDetail | null>(null);
  const [formValues, setFormValues] = useState<OfferFormInput>(EMPTY_FORM);
  const [formImages, setFormImages] = useState<OfferImageDraft[]>([
    createEmptyImageDraft(true),
  ]);
  const formImagesRef = useRef<OfferImageDraft[]>(formImages);
  const [draggedImageKey, setDraggedImageKey] = useState<string | null>(null);
  const [draggedDetailIndex, setDraggedDetailIndex] = useState<number | null>(
    null,
  );
  const [formErrors, setFormErrors] = useState<OfferFormErrors>({});
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<OfferDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const queryRef = useRef<OfferQueryParams>({
    ...DEFAULT_QUERY,
    page: initialList.page,
    pageSize: initialList.pageSize,
  });
  const latestRequestIdRef = useRef(0);
  const searchInitializedRef = useRef(false);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(listResult.total / query.pageSize)),
    [listResult.total, query.pageSize],
  );

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    formImagesRef.current = formImages;
  }, [formImages]);

  useEffect(() => {
    return () => {
      for (const image of formImagesRef.current) {
        if (image.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(image.previewUrl);
        }
      }
    };
  }, []);

  const loadOffers = useCallback(async (nextQuery: OfferQueryParams) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setIsTableLoading(true);

    try {
      const response = await listCompanyOffers(nextQuery);
      if (requestId !== latestRequestIdRef.current) {
        return;
      }
      setListResult(response);
      setListError(response.error ?? null);
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) {
        return;
      }
      setListError(
        error instanceof Error ? error.message : "No fue posible cargar ofertas.",
      );
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsTableLoading(false);
      }
    }
  }, []);

  const applyQueryPatch = useCallback(
    async (patch: Partial<OfferQueryParams>): Promise<void> => {
      const nextQuery = { ...queryRef.current, ...patch };
      queryRef.current = nextQuery;
      setQuery(nextQuery);
      await loadOffers(nextQuery);
    },
    [loadOffers],
  );

  useEffect(() => {
    if (!searchInitializedRef.current) {
      searchInitializedRef.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void applyQueryPatch({ search: searchInput.trim(), page: 1 });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [applyQueryPatch, searchInput]);

  function resetFormState() {
    setFormValues({ ...EMPTY_FORM, details: [], images: [] });
    setFormImages([createEmptyImageDraft(true)]);
    setFormErrors({});
    setEditingOffer(null);
  }

  function openCreateModal() {
    resetFormState();
    setFormMode("create");
    setIsFormModalOpen(true);
  }

  function closeFormModal() {
    setIsFormModalOpen(false);
  }

  function closeDetailModal() {
    setIsDetailModalOpen(false);
  }

  function handleValueChange<K extends keyof OfferFormInput>(
    key: K,
    value: OfferFormInput[K],
  ) {
    setFormValues((previous) => ({ ...previous, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  }

  function addDetail() {
    setFormValues((previous) => ({
      ...previous,
      details: withDetailSortOrder([
        ...previous.details,
        {
          item_title: "",
          item_description: "",
          item_sort_order: String(previous.details.length + 1),
        },
      ]),
    }));
  }

  function handleDetailChange(
    index: number,
    key: "item_title" | "item_description" | "item_sort_order",
    value: string,
  ) {
    setFormValues((previous) => ({
      ...previous,
      details: previous.details.map((detail, detailIndex) =>
        detailIndex === index ? { ...detail, [key]: value } : detail,
      ),
    }));
    if (formErrors.details) {
      setFormErrors((previous) => ({ ...previous, details: undefined }));
    }
  }

  function removeDetail(index: number) {
    setFormValues((previous) => ({
      ...previous,
      details: withDetailSortOrder(
        previous.details.filter((_, detailIndex) => detailIndex !== index),
      ),
    }));
  }

  function withDetailSortOrder(
    details: OfferFormInput["details"],
  ): OfferFormInput["details"] {
    return details.map((detail, index) => ({
      ...detail,
      item_sort_order: String(index + 1),
    }));
  }

  function moveDetailByOffset(index: number, offset: number) {
    setFormValues((previous) => {
      const targetIndex = index + offset;

      if (targetIndex < 0 || targetIndex >= previous.details.length) {
        return previous;
      }

      const nextDetails = [...previous.details];
      const [movedDetail] = nextDetails.splice(index, 1);
      nextDetails.splice(targetIndex, 0, movedDetail);

      return {
        ...previous,
        details: withDetailSortOrder(nextDetails),
      };
    });
  }

  function moveDetailToIndex(sourceIndex: number | null, targetIndex: number) {
    if (sourceIndex === null || sourceIndex === targetIndex) {
      return;
    }

    setFormValues((previous) => {
      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex >= previous.details.length ||
        targetIndex >= previous.details.length
      ) {
        return previous;
      }

      const nextDetails = [...previous.details];
      const [movedDetail] = nextDetails.splice(sourceIndex, 1);
      nextDetails.splice(targetIndex, 0, movedDetail);

      return {
        ...previous,
        details: withDetailSortOrder(nextDetails),
      };
    });
  }

  function handleDetailDragStart(
    index: number,
    event: React.DragEvent<HTMLElement>,
  ) {
    setDraggedDetailIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleDetailDrop(
    index: number,
    event: React.DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    const transferValue = event.dataTransfer.getData("text/plain");
    const dataTransferIndex = transferValue ? Number(transferValue) : null;
    moveDetailToIndex(
      draggedDetailIndex ??
        (Number.isInteger(dataTransferIndex) ? dataTransferIndex : null),
      index,
    );
    setDraggedDetailIndex(null);
  }

  function addImage() {
    setFormImages((previous) => [
      ...previous,
      {
        ...createEmptyImageDraft(previous.length === 0),
        image_sort_order: String(previous.length + 1),
      },
    ]);
  }

  function withImageSortOrder(images: OfferImageDraft[]): OfferImageDraft[] {
    return images.map((image, index) => ({
      ...image,
      image_sort_order: String(index + 1),
    }));
  }

  function withOneMainImage<T extends { main_image: boolean }>(images: T[]): T[] {
    if (images.some((image) => image.main_image)) {
      return images;
    }

    return images.map((image, index) => ({
      ...image,
      main_image: index === 0,
    }));
  }

  function removeImage(key: string) {
    setFormImages((previous) => {
      const nextImages = previous.filter((image) => image.key !== key);
      const safeImages = nextImages.length > 0 ? nextImages : [createEmptyImageDraft(true)];
      return withImageSortOrder(withOneMainImage(safeImages));
    });
  }

  function handleImageValueChange(
    key: string,
    field: "image_alt_text",
    value: string,
  ) {
    setFormImages((previous) =>
      previous.map((image) =>
        image.key === key ? { ...image, [field]: value } : image,
      ),
    );
    if (formErrors.images) {
      setFormErrors((previous) => ({ ...previous, images: undefined }));
    }
  }

  function handleMainImageChange(key: string) {
    setFormImages((previous) =>
      previous.map((image) => ({ ...image, main_image: image.key === key })),
    );
  }

  function moveImageByOffset(key: string, offset: number) {
    setFormImages((previous) => {
      const sourceIndex = previous.findIndex((image) => image.key === key);
      const targetIndex = sourceIndex + offset;

      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= previous.length
      ) {
        return previous;
      }

      const nextImages = [...previous];
      const [movedImage] = nextImages.splice(sourceIndex, 1);
      nextImages.splice(targetIndex, 0, movedImage);

      return withImageSortOrder(nextImages);
    });
  }

  function moveImageToKey(sourceKey: string | null, targetKey: string) {
    if (!sourceKey || sourceKey === targetKey) {
      return;
    }

    setFormImages((previous) => {
      const sourceIndex = previous.findIndex((image) => image.key === sourceKey);
      const targetIndex = previous.findIndex((image) => image.key === targetKey);

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return previous;
      }

      const nextImages = [...previous];
      const [movedImage] = nextImages.splice(sourceIndex, 1);
      nextImages.splice(targetIndex, 0, movedImage);

      return withImageSortOrder(nextImages);
    });
  }

  function handleImageDragStart(
    key: string,
    event: React.DragEvent<HTMLElement>,
  ) {
    setDraggedImageKey(key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
  }

  function handleImageDrop(
    key: string,
    event: React.DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    moveImageToKey(draggedImageKey ?? event.dataTransfer.getData("text/plain"), key);
    setDraggedImageKey(null);
  }

  function handleImageFileChange(
    key: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setFormImages((previous) =>
      previous.map((image) => {
        if (image.key !== key) {
          return image;
        }

        if (image.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(image.previewUrl);
        }

        return {
          ...image,
          file,
          previewUrl: file ? URL.createObjectURL(file) : image.image_url,
        };
      }),
    );
  }

  async function buildSubmissionInput(): Promise<OfferFormInput> {
    const images = await Promise.all(
      formImages.map(async (image, index) => ({
        image_url: image.file ? "" : image.image_url,
        image_alt_text: image.image_alt_text,
        image_sort_order: String(index + 1),
        main_image: image.main_image,
        upload: image.file ? await toImagePayload(image.file) : null,
      })),
    );

    return {
      ...formValues,
      details: withDetailSortOrder(formValues.details),
      images: withOneMainImage(images),
    };
  }

  async function openEditModal(offerId: string) {
    resetFormState();
    setFormMode("edit");
    setIsFormModalOpen(true);
    setIsFormLoading(true);

    const result = await getCompanyOfferDetail(offerId);
    setIsFormLoading(false);

    if (!result.ok || !result.data) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      setIsFormModalOpen(false);
      return;
    }

    const offer = result.data;
    setEditingOffer(offer);
    setFormValues({
      offer_title: offer.offer_title,
      offer_description: offer.offer_description,
      offer_regular_price: String(offer.offer_regular_price),
      offer_price: String(offer.offer_price),
      offer_start_date: offer.offer_start_date,
      offer_end_date: offer.offer_end_date,
      coupon_usage_deadline: offer.coupon_usage_deadline,
      coupon_quantity_limit:
        offer.coupon_quantity_limit === null ? "" : String(offer.coupon_quantity_limit),
      details: withDetailSortOrder(offer.details.map((detail) => ({
        item_title: detail.item_title,
        item_description: detail.item_description,
        item_sort_order: String(detail.item_sort_order),
      }))),
      images: [],
    });
    setFormImages(
      offer.images.length > 0
        ? withImageSortOrder(
            withOneMainImage(
              offer.images.map((image) => ({
                key: image.offer_carousel_image_id,
                image_url: image.image_url,
                image_alt_text: image.image_alt_text ?? "",
                image_sort_order: String(image.image_sort_order),
                main_image: image.main_image,
                upload: null,
                file: null,
                previewUrl: image.image_url,
              })),
            ),
          )
        : [createEmptyImageDraft(true)],
    );
  }

  async function openDetailModal(offerId: string) {
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    setDetailData(null);

    const result = await getCompanyOfferDetail(offerId);
    setIsDetailLoading(false);

    if (!result.ok || !result.data) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      setIsDetailModalOpen(false);
      return;
    }

    setDetailData(result.data);
  }

  async function showRejectionReason(offer: OfferListItem) {
    await Swal.fire({
      icon: "info",
      title: "Motivo de rechazo",
      text: offer.offer_rejection_reason || "No hay comentario registrado.",
      confirmButtonColor: "#0f3d78",
    });
  }

  async function handleSubmitOffer(event: React.FormEvent) {
    event.preventDefault();

    let submissionInput: OfferFormInput;
    try {
      submissionInput = await buildSubmissionInput();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Error de imagen",
        text:
          error instanceof Error
            ? error.message
            : "No fue posible procesar las imagenes.",
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    const normalized = normalizeOfferInput(submissionInput);
    const validation = validateOfferInput(normalized);

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      await Swal.fire({
        icon: "warning",
        title: "Formulario incompleto",
        text: "Revisa los campos marcados y vuelve a intentar.",
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    setIsFormSubmitting(true);
    const result =
      formMode === "create"
        ? await createCompanyOffer(normalized)
        : await updateCompanyOffer(editingOffer?.offer_id ?? "", normalized);
    setIsFormSubmitting(false);

    if (!result.ok) {
      await Swal.fire({
        icon: "error",
        title: "Operacion fallida",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    setIsFormModalOpen(false);
    resetFormState();
    await loadOffers(queryRef.current);

    await Swal.fire({
      icon: "success",
      title: formMode === "create" ? "Oferta creada" : "Oferta actualizada",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  return (
    <>
      <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Ofertas de {companyName || "Mi Empresa"}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Crea, corrige y consulta las ofertas asociadas a tu empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)]"
          >
            Crear oferta
          </button>

          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por titulo..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none sm:w-[260px]"
          />

          <select
            value={query.sortBy}
            onChange={(event) =>
              void applyQueryPatch({
                sortBy: event.target.value as OfferQueryParams["sortBy"],
                page: 1,
              })
            }
            className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="offer_start_date">Inicio</option>
            <option value="offer_end_date">Fin</option>
            <option value="offer_title">Titulo</option>
            <option value="offer_status">Estado</option>
            <option value="offer_price">Precio</option>
          </select>

          <button
            type="button"
            onClick={() =>
              void applyQueryPatch({
                sortDir: query.sortDir === "asc" ? "desc" : "asc",
                page: 1,
              })
            }
            aria-label={
              query.sortDir === "asc"
                ? "Cambiar a orden descendente"
                : "Cambiar a orden ascendente"
            }
            title={query.sortDir === "asc" ? "Ascendente" : "Descendente"}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
          >
            <SortDirectionIcon direction={query.sortDir} />
            {query.sortDir === "asc" ? "Asc" : "Desc"}
          </button>

          <label className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            Mostrar
            <select
              value={query.pageSize}
              onChange={(event) =>
                void applyQueryPatch({
                  pageSize: Number(event.target.value),
                  page: 1,
                })
              }
              className="h-9 rounded-lg border border-[var(--border)] bg-white px-2 text-sm text-[var(--text-primary)]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            por pagina
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                void applyQueryPatch({ category: option.value, page: 1 })
              }
              className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                query.category === option.value ||
                (option.value === "approved" &&
                  query.category === "approved_active")
                  ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
              }`}
            >
              {option.label}
            </button>
          ))}
          {query.category === "approved" || query.category === "approved_active" ? (
            <label className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={query.category === "approved_active"}
                onChange={(event) =>
                  void applyQueryPatch({
                    category: event.target.checked
                      ? "approved_active"
                      : "approved",
                    page: 1,
                  })
                }
              />
              Activas ahora
            </label>
          ) : null}
        </div>

        {listError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)] bg-white">
            <thead className="bg-[var(--surface-soft)]">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Imagen
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Oferta
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Precio
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Vigencia
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isTableLoading ? (
                <OffersTableSkeleton rows={query.pageSize >= 10 ? 5 : query.pageSize} />
              ) : null}

              {!isTableLoading && listResult.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                  >
                    No hay ofertas para mostrar.
                  </td>
                </tr>
              ) : null}

              {!isTableLoading
                ? listResult.data.map((offer) => (
                    <tr
                      key={offer.offer_id}
                      className="hover:bg-[var(--surface-soft)]/60"
                    >
                      <td className="px-4 py-3 text-center">
                        {offer.main_image_url ? (
                          <Image
                            src={offer.main_image_url}
                            alt={`Imagen de ${offer.offer_title}`}
                            width={56}
                            height={56}
                            unoptimized
                            className="mx-auto h-14 w-14 rounded-lg border border-[var(--border)] bg-white object-cover"
                          />
                        ) : (
                          <span className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs text-[var(--text-muted)]">
                            Sin imagen
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {offer.offer_title}
                        </p>
                        <p className="mt-1 max-w-[360px] truncate text-xs text-[var(--text-muted)]">
                          {offer.offer_description}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <p className="font-medium text-[var(--text-primary)]">
                          {formatCurrency(offer.offer_price)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Regular {formatCurrency(offer.offer_regular_price)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-[var(--text-muted)]">
                        <p>{formatDate(offer.offer_start_date)}</p>
                        <p>{formatDate(offer.offer_end_date)}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={offer.offer_status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openDetailModal(offer.offer_id)}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
                          >
                            Detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => void openEditModal(offer.offer_id)}
                            className="rounded-lg bg-[var(--brand-blue)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-strong)]"
                          >
                            Editar
                          </button>
                          {offer.offer_status === "REJECTED" ? (
                            <button
                              type="button"
                              onClick={() => void showRejectionReason(offer)}
                              className="rounded-lg bg-[var(--brand-orange)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--brand-orange-strong)]"
                            >
                              Motivo
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            Mostrando {listResult.data.length} de {listResult.total} registros.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void applyQueryPatch({ page: Math.max(1, query.page - 1) })
              }
              disabled={query.page <= 1 || isTableLoading}
              className="h-9 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              Pagina {query.page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                void applyQueryPatch({ page: Math.min(totalPages, query.page + 1) })
              }
              disabled={query.page >= totalPages || isTableLoading}
              className="h-9 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      {isFormModalOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            onClick={closeFormModal}
            aria-label="Cerrar modal de formulario"
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {formMode === "create" ? "Crear oferta" : "Editar oferta"}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Al guardar, la oferta quedara en espera de revision.
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                aria-label="Cerrar formulario"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
              >
                <CloseIcon />
              </button>
            </header>

            {isFormLoading ? (
              <OfferFormSkeleton />
            ) : (
              <form className="space-y-5" onSubmit={handleSubmitOffer}>
                {editingOffer ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)]">
                    <span className="mr-2">Estado actual:</span>
                    <StatusBadge status={editingOffer.offer_status} />
                    {editingOffer.offer_status === "REJECTED" ? (
                      <p className="mt-2 text-sm text-red-700">
                        {editingOffer.offer_rejection_reason ||
                          "No hay comentario registrado."}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Titulo
                    </span>
                    <input
                      type="text"
                      value={formValues.offer_title}
                      onChange={(event) =>
                        handleValueChange("offer_title", event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none"
                    />
                    {formErrors.offer_title ? (
                      <p className="text-xs text-red-600">
                        {formErrors.offer_title}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Descripcion
                    </span>
                    <textarea
                      rows={3}
                      value={formValues.offer_description}
                      onChange={(event) =>
                        handleValueChange("offer_description", event.target.value)
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none"
                    />
                    {formErrors.offer_description ? (
                      <p className="text-xs text-red-600">
                        {formErrors.offer_description}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Precio regular
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formValues.offer_regular_price}
                      onChange={(event) =>
                        handleValueChange("offer_regular_price", event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none"
                    />
                    {formErrors.offer_regular_price ? (
                      <p className="text-xs text-red-600">
                        {formErrors.offer_regular_price}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Precio oferta
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formValues.offer_price}
                      onChange={(event) =>
                        handleValueChange("offer_price", event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none"
                    />
                    {formErrors.offer_price ? (
                      <p className="text-xs text-red-600">{formErrors.offer_price}</p>
                    ) : null}
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Inicio
                    </span>
                    <input
                      type="date"
                      value={formValues.offer_start_date}
                      onChange={(event) =>
                        handleValueChange("offer_start_date", event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none"
                    />
                    {formErrors.offer_start_date ? (
                      <p className="text-xs text-red-600">
                        {formErrors.offer_start_date}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Fin
                    </span>
                    <input
                      type="date"
                      value={formValues.offer_end_date}
                      onChange={(event) =>
                        handleValueChange("offer_end_date", event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none"
                    />
                    {formErrors.offer_end_date ? (
                      <p className="text-xs text-red-600">
                        {formErrors.offer_end_date}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Limite de uso
                    </span>
                    <input
                      type="date"
                      value={formValues.coupon_usage_deadline}
                      onChange={(event) =>
                        handleValueChange(
                          "coupon_usage_deadline",
                          event.target.value,
                        )
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none"
                    />
                    {formErrors.coupon_usage_deadline ? (
                      <p className="text-xs text-red-600">
                        {formErrors.coupon_usage_deadline}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Cantidad limite
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formValues.coupon_quantity_limit}
                      onChange={(event) =>
                        handleValueChange(
                          "coupon_quantity_limit",
                          event.target.value,
                        )
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none"
                    />
                    {formErrors.coupon_quantity_limit ? (
                      <p className="text-xs text-red-600">
                        {formErrors.coupon_quantity_limit}
                      </p>
                    ) : null}
                  </label>
                </div>

                <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Detalles de lista
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Beneficios o condiciones de la oferta.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addDetail}
                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                    >
                      Agregar detalle
                    </button>
                  </div>

                  {formValues.details.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      No hay detalles agregados.
                    </p>
                  ) : null}

                  {formValues.details.map((detail, index) => (
                    <div
                      key={index}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDetailDrop(index, event)}
                      onDragEnd={() => setDraggedDetailIndex(null)}
                      className={`grid gap-3 rounded-xl border bg-white p-3 md:grid-cols-[auto_1fr_1fr_auto] ${
                        draggedDetailIndex === index
                          ? "border-[var(--brand-orange)] opacity-70"
                          : "border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[var(--surface-soft)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                          {index + 1}
                        </span>
                        <span
                          draggable
                          onDragStart={(event) =>
                            handleDetailDragStart(index, event)
                          }
                          onDragEnd={() => setDraggedDetailIndex(null)}
                          className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] active:cursor-grabbing"
                          title="Arrastrar detalle"
                          aria-label="Arrastrar detalle"
                        >
                          <DragHandleIcon />
                        </span>
                      </div>
                      <input
                        type="text"
                        value={detail.item_title}
                        onChange={(event) =>
                          handleDetailChange(index, "item_title", event.target.value)
                        }
                        placeholder="Titulo"
                        className="h-10 rounded-xl border border-[var(--border)] px-3 text-sm outline-none"
                      />
                      <input
                        type="text"
                        value={detail.item_description}
                        onChange={(event) =>
                          handleDetailChange(
                            index,
                            "item_description",
                            event.target.value,
                          )
                        }
                        placeholder="Descripción"
                        className="h-10 rounded-xl border border-[var(--border)] px-3 text-sm outline-none"
                      />
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => moveDetailByOffset(index, -1)}
                          disabled={index === 0}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Subir detalle"
                          title="Subir detalle"
                        >
                          <ArrowUpIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDetailByOffset(index, 1)}
                          disabled={index === formValues.details.length - 1}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Bajar detalle"
                          title="Bajar detalle"
                        >
                          <ArrowDownIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDetail(index)}
                          className="h-8 rounded-lg bg-red-600 px-3 text-xs font-medium text-white"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                  {formErrors.details ? (
                    <p className="text-xs text-red-600">{formErrors.details}</p>
                  ) : null}
                </section>

                <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Imagenes
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Se subiran al bucket product-images.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addImage}
                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                    >
                      Agregar imagen
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {formImages.map((image, index) => (
                      <div
                        key={image.key}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleImageDrop(image.key, event)}
                        onDragEnd={() => setDraggedImageKey(null)}
                        className={`space-y-3 rounded-xl border bg-white p-3 ${
                          draggedImageKey === image.key
                            ? "border-[var(--brand-orange)] opacity-70"
                            : "border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-[var(--surface-soft)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                              Posicion {index + 1}
                            </span>
                            <span
                              draggable
                              onDragStart={(event) =>
                                handleImageDragStart(image.key, event)
                              }
                              onDragEnd={() => setDraggedImageKey(null)}
                              className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] active:cursor-grabbing"
                              title="Arrastrar imagen"
                              aria-label="Arrastrar imagen"
                            >
                              <DragHandleIcon />
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveImageByOffset(image.key, -1)}
                              disabled={index === 0}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Subir imagen"
                              title="Subir imagen"
                            >
                              <ArrowUpIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImageByOffset(image.key, 1)}
                              disabled={index === formImages.length - 1}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Bajar imagen"
                              title="Bajar imagen"
                            >
                              <ArrowDownIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(image.key)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>

                        <input
                          id={`offer-image-${image.key}`}
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleImageFileChange(image.key, event)}
                          className="sr-only"
                        />

                        <label
                          htmlFor={`offer-image-${image.key}`}
                          className="group relative block h-40 cursor-pointer overflow-hidden rounded-lg border border-[var(--border)]"
                        >
                          {image.previewUrl || image.image_url ? (
                            <>
                              <Image
                                src={image.previewUrl || image.image_url}
                                alt={
                                  image.image_alt_text || "Vista previa de oferta"
                                }
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                unoptimized
                                className="object-cover"
                              />
                              <span className="absolute inset-0 grid place-items-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                <EditImageIcon />
                              </span>
                            </>
                          ) : (
                            <span className="grid h-40 place-items-center border border-dashed border-[var(--border)] bg-[var(--surface-soft)] text-xs text-[var(--text-muted)]">
                              <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2">
                                <EditImageIcon />
                                Seleccionar imagen
                              </span>
                            </span>
                          )}
                        </label>

                        <input
                          type="text"
                          value={image.image_alt_text}
                          onChange={(event) =>
                            handleImageValueChange(
                              image.key,
                              "image_alt_text",
                              event.target.value,
                            )
                          }
                          placeholder="Texto alternativo"
                          className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none"
                        />

                        <div className="flex justify-end">
                          <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-medium text-[var(--text-muted)]">
                            <input
                              type="radio"
                              name="offer-main-image"
                              checked={image.main_image}
                              onChange={() => handleMainImageChange(image.key)}
                            />
                            Principal
                          </label>
                        </div>

                      </div>
                    ))}
                  </div>
                  {formErrors.images ? (
                    <p className="text-xs text-red-600">{formErrors.images}</p>
                  ) : null}
                </section>

                <footer className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm text-[var(--text-primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isFormSubmitting}
                    className="h-10 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isFormSubmitting
                      ? "Guardando..."
                      : formMode === "create"
                        ? "Crear"
                        : "Guardar cambios"}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      ) : null}

      {isDetailModalOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            onClick={closeDetailModal}
            aria-label="Cerrar modal de detalle"
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Detalle de oferta
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Estado, fechas, imagenes y detalles.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                aria-label="Cerrar detalle"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
              >
                <CloseIcon />
              </button>
            </header>

            {isDetailLoading ? (
              <p className="text-sm text-[var(--text-muted)]">Cargando detalle...</p>
            ) : null}

            {!isDetailLoading && detailData ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {detailData.offer_title}
                    </h3>
                    <StatusBadge status={detailData.offer_status} />
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {detailData.offer_description}
                  </p>
                  {detailData.offer_status === "REJECTED" ? (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {detailData.offer_rejection_reason ||
                        "No hay comentario registrado."}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm">
                    <p>
                      <span className="font-medium">Precio regular:</span>{" "}
                      {formatCurrency(detailData.offer_regular_price)}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">Precio oferta:</span>{" "}
                      {formatCurrency(detailData.offer_price)}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">Cantidad limite:</span>{" "}
                      {detailData.coupon_quantity_limit ?? "Sin limite"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm">
                    <p>
                      <span className="font-medium">Inicio:</span>{" "}
                      {formatDate(detailData.offer_start_date)}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">Fin:</span>{" "}
                      {formatDate(detailData.offer_end_date)}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">Uso hasta:</span>{" "}
                      {formatDate(detailData.coupon_usage_deadline)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Detalles
                  </h3>
                  {detailData.details.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Sin detalles adicionales.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {detailData.details.map((detail) => (
                        <li
                          key={detail.offer_list_detail_id}
                          className="rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{detail.item_title}:</span>{" "}
                          {detail.item_description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Imagenes
                  </h3>
                  {detailData.images.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Sin imagenes registradas.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {detailData.images.map((image) => (
                        <div
                          key={image.offer_carousel_image_id}
                          className="space-y-2 rounded-lg border border-[var(--border)] p-2"
                        >
                          <div className="relative h-44 w-full overflow-hidden rounded-md">
                            <Image
                              src={image.image_url}
                              alt={image.image_alt_text || "Imagen de oferta"}
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">
                            {image.main_image ? "Imagen principal" : "Imagen"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
