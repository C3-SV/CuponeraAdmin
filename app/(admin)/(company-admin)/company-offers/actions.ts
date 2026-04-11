"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getCurrentAuthProfile } from "@/lib/auth";
import {
  normalizeOfferInput,
  validateOfferInput,
} from "@/lib/company-offers/validation";
import type {
  OfferActionResult,
  OfferCarouselImage,
  OfferCategory,
  OfferDetail,
  OfferDetailFormInput,
  OfferFormInput,
  OfferImageFormInput,
  OfferImagePayload,
  OfferListDetail,
  OfferListItem,
  OfferQueryParams,
  OffersListResponse,
  OfferSortBy,
  OfferStatus,
  SortDirection,
} from "@/lib/company-offers/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type OfferRow = {
  offer_id: string;
  offer_title: string;
  offer_description: string;
  offer_regular_price: number | string;
  offer_price: number | string;
  offer_start_date: string;
  offer_end_date: string;
  coupon_usage_deadline: string;
  coupon_quantity_limit: number | string | null;
  offer_status: OfferStatus;
  offer_rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

type OfferImageRow = {
  offer_carousel_image_id: string;
  offer_id: string;
  image_url: string;
  image_alt_text: string | null;
  image_sort_order: number;
  main_image: boolean;
};

type OfferDetailRow = {
  offer_list_detail_id: string;
  offer_id: string;
  item_title: string;
  item_description: string;
  item_sort_order: number;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const OFFER_CATEGORIES: OfferCategory[] = [
  "pending",
  "to_correct",
  "approved",
  "approved_active",
  "all",
];
const OFFER_SORT_FIELDS: OfferSortBy[] = [
  "offer_title",
  "offer_status",
  "offer_start_date",
  "offer_end_date",
  "offer_price",
];
const SORT_DIRECTIONS: SortDirection[] = ["asc", "desc"];

const DEFAULT_QUERY: OfferQueryParams = {
  search: "",
  category: "all",
  sortBy: "offer_start_date",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
};

async function getCompanyIdFromSession(): Promise<
  { ok: true; companyId: string } | { ok: false; message: string }
> {
  const profile = await getCurrentAuthProfile();

  if (!profile?.company_id) {
    return {
      ok: false,
      message: "No hay una empresa asociada al usuario actual.",
    };
  }

  return { ok: true, companyId: profile.company_id };
}

function todayDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeQueryParams(
  params?: Partial<OfferQueryParams>,
): OfferQueryParams {
  const sortBy = OFFER_SORT_FIELDS.includes(params?.sortBy ?? DEFAULT_QUERY.sortBy)
    ? params?.sortBy ?? DEFAULT_QUERY.sortBy
    : DEFAULT_QUERY.sortBy;
  const sortDir = SORT_DIRECTIONS.includes(params?.sortDir ?? DEFAULT_QUERY.sortDir)
    ? params?.sortDir ?? DEFAULT_QUERY.sortDir
    : DEFAULT_QUERY.sortDir;
  const category = OFFER_CATEGORIES.includes(params?.category ?? DEFAULT_QUERY.category)
    ? params?.category ?? DEFAULT_QUERY.category
    : DEFAULT_QUERY.category;

  return {
    search: params?.search?.trim() ?? DEFAULT_QUERY.search,
    category,
    sortBy,
    sortDir,
    page: Number(params?.page ?? DEFAULT_QUERY.page) || DEFAULT_QUERY.page,
    pageSize: Math.min(
      50,
      Number(params?.pageSize ?? DEFAULT_QUERY.pageSize) || DEFAULT_QUERY.pageSize,
    ),
  };
}

function getOfferListCategory(row: OfferRow, today = todayDateValue()): OfferCategory {
  if (row.offer_status === "PENDING") {
    return "pending";
  }

  if (row.offer_status === "REJECTED") {
    return "to_correct";
  }

  if (row.offer_status === "APPROVED") {
    if (row.offer_start_date <= today && row.offer_end_date >= today) {
      return "approved_active";
    }
    return "approved";
  }

  return "all";
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null || value === "") {
    return null;
  }

  return Number(value);
}

function toOfferListItem(
  row: OfferRow,
  mainImageUrl: string | null,
  today = todayDateValue(),
): OfferListItem {
  return {
    offer_id: row.offer_id,
    offer_title: row.offer_title,
    offer_description: row.offer_description,
    offer_regular_price: Number(row.offer_regular_price),
    offer_price: Number(row.offer_price),
    offer_start_date: row.offer_start_date,
    offer_end_date: row.offer_end_date,
    coupon_usage_deadline: row.coupon_usage_deadline,
    coupon_quantity_limit: toNumberOrNull(row.coupon_quantity_limit),
    offer_status: row.offer_status,
    offer_rejection_reason: row.offer_rejection_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    main_image_url: mainImageUrl,
    list_category: getOfferListCategory(row, today),
  };
}

function toOfferDetail(row: OfferDetailRow): OfferListDetail {
  return {
    offer_list_detail_id: row.offer_list_detail_id,
    item_title: row.item_title,
    item_description: row.item_description,
    item_sort_order: Number(row.item_sort_order),
  };
}

function buildOfferImageUrl(
  supabase: SupabaseServerClient,
  imageUrl: string | null,
): string | null {
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  const normalizedPath = imageUrl
    .replace(/^product-images\//, "")
    .replace(/^\/?storage\/v1\/object\/public\/product-images\//, "");

  return supabase.storage
    .from("product-images")
    .getPublicUrl(normalizedPath).data.publicUrl;
}

function toOfferImage(
  row: OfferImageRow,
  supabase: SupabaseServerClient,
): OfferCarouselImage {
  return {
    offer_carousel_image_id: row.offer_carousel_image_id,
    image_url: buildOfferImageUrl(supabase, row.image_url) ?? row.image_url,
    image_alt_text: row.image_alt_text,
    image_sort_order: Number(row.image_sort_order),
    main_image: row.main_image,
  };
}

function parseDataUrl(payload: OfferImagePayload): {
  bytes: Uint8Array;
  contentType: string;
} {
  const matches = payload.dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!matches) {
    throw new Error("Formato de imagen invalido.");
  }

  const contentType = payload.type || matches[1];
  const buffer = Buffer.from(matches[2], "base64");

  return {
    bytes: new Uint8Array(buffer),
    contentType,
  };
}

async function uploadOfferImage(
  payload: OfferImagePayload,
  offerId: string,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  try {
    const supabaseAdmin = createAdminClient();
    const { bytes, contentType } = parseDataUrl(payload);
    const extension = payload.name.includes(".")
      ? payload.name.split(".").at(-1)?.toLowerCase() ?? "jpg"
      : "jpg";
    const safeExt = extension.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `offers/${offerId}/${Date.now()}-${randomUUID()}.${safeExt}`;

    const { error } = await supabaseAdmin.storage
      .from("product-images")
      .upload(path, bytes, {
        contentType,
        upsert: false,
      });

    if (error) {
      return {
        ok: false,
        message: `No se pudo subir la imagen: ${error.message}`,
      };
    }

    const { data } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(path);

    return {
      ok: true,
      publicUrl: data.publicUrl,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible procesar la imagen.",
    };
  }
}

async function getMainImageUrls(
  offerIds: string[],
): Promise<Map<string, string | null>> {
  const imageUrls = new Map<string, string | null>();

  for (const offerId of offerIds) {
    imageUrls.set(offerId, null);
  }

  if (offerIds.length === 0) {
    return imageUrls;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("offer_carousel_images")
    .select("offer_id, image_url, main_image, image_sort_order")
    .in("offer_id", offerIds)
    .is("deleted_at", null)
    .order("main_image", { ascending: false })
    .order("image_sort_order", { ascending: true });

  for (const image of (data ?? []) as Array<
    Pick<OfferImageRow, "offer_id" | "image_url" | "main_image" | "image_sort_order">
  >) {
    if (!imageUrls.get(image.offer_id)) {
      imageUrls.set(image.offer_id, buildOfferImageUrl(supabase, image.image_url));
    }
  }

  return imageUrls;
}

function getOfferPayload(input: OfferFormInput): Record<string, unknown> {
  return {
    offer_title: input.offer_title,
    offer_description: input.offer_description,
    offer_regular_price: Number(input.offer_regular_price),
    offer_price: Number(input.offer_price),
    offer_start_date: input.offer_start_date,
    offer_end_date: input.offer_end_date,
    coupon_usage_deadline: input.coupon_usage_deadline,
    coupon_quantity_limit: input.coupon_quantity_limit
      ? Number(input.coupon_quantity_limit)
      : null,
  };
}

function getCleanDetails(input: OfferFormInput): OfferDetailFormInput[] {
  return input.details.filter(
    (detail) => detail.item_title || detail.item_description,
  );
}

function getCleanImages(input: OfferFormInput): OfferImageFormInput[] {
  return input.images.filter((image) => image.image_url || image.upload);
}

async function replaceOfferRelations(
  offerId: string,
  input: OfferFormInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: softDeleteDetailsError } = await supabase
    .from("offer_list_details")
    .update({ deleted_at: now, updated_at: now })
    .eq("offer_id", offerId)
    .is("deleted_at", null);

  if (softDeleteDetailsError) {
    return {
      ok: false,
      message: `No se pudieron actualizar los detalles: ${softDeleteDetailsError.message}`,
    };
  }

  const { error: softDeleteImagesError } = await supabase
    .from("offer_carousel_images")
    .update({ deleted_at: now, updated_at: now })
    .eq("offer_id", offerId)
    .is("deleted_at", null);

  if (softDeleteImagesError) {
    return {
      ok: false,
      message: `No se pudieron actualizar las imagenes: ${softDeleteImagesError.message}`,
    };
  }

  const details = getCleanDetails(input);

  if (details.length > 0) {
    const { error } = await supabase.from("offer_list_details").insert(
      details.map((detail, index) => ({
        offer_id: offerId,
        item_title: detail.item_title,
        item_description: detail.item_description,
        item_sort_order: Number(detail.item_sort_order) || index + 1,
      })),
    );

    if (error) {
      return {
        ok: false,
        message: `No se pudieron guardar los detalles: ${error.message}`,
      };
    }
  }

  const images = getCleanImages(input);
  const imageRows: Array<{
    offer_id: string;
    image_url: string;
    image_alt_text: string | null;
    image_sort_order: number;
    main_image: boolean;
  }> = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    let imageUrl = image.image_url;

    if (image.upload) {
      const uploadResult = await uploadOfferImage(image.upload, offerId);

      if (!uploadResult.ok) {
        return uploadResult;
      }

      imageUrl = uploadResult.publicUrl;
    }

    imageRows.push({
      offer_id: offerId,
      image_url: imageUrl,
      image_alt_text: image.image_alt_text || null,
      image_sort_order: Number(image.image_sort_order) || index + 1,
      main_image: image.main_image,
    });
  }

  if (imageRows.length > 0) {
    const { error } = await supabase
      .from("offer_carousel_images")
      .insert(imageRows);

    if (error) {
      return {
        ok: false,
        message: `No se pudieron guardar las imagenes: ${error.message}`,
      };
    }
  }

  return { ok: true };
}

export async function listCompanyOffers(
  rawParams?: Partial<OfferQueryParams>,
): Promise<OffersListResponse> {
  const params = normalizeQueryParams(rawParams);
  const pageSize = Math.max(1, params.pageSize);
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const today = todayDateValue();

  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        error: context.message,
      };
    }

    const supabase = await createClient();
    let query = supabase
      .from("offers")
      .select(
        "offer_id, offer_title, offer_description, offer_regular_price, offer_price, offer_start_date, offer_end_date, coupon_usage_deadline, coupon_quantity_limit, offer_status, offer_rejection_reason, created_at, updated_at",
        { count: "exact" },
      )
      .eq("company_id", context.companyId)
      .is("deleted_at", null);

    if (params.search) {
      query = query.or(
        `offer_title.ilike.%${params.search}%,offer_description.ilike.%${params.search}%`,
      );
    }

    if (params.category === "pending") {
      query = query.eq("offer_status", "PENDING");
    } else if (params.category === "to_correct") {
      query = query.eq("offer_status", "REJECTED");
    } else if (params.category === "approved") {
      query = query.eq("offer_status", "APPROVED");
    } else if (params.category === "approved_active") {
      query = query
        .eq("offer_status", "APPROVED")
        .lte("offer_start_date", today)
        .gte("offer_end_date", today);
    }

    query = query.order(params.sortBy, { ascending: params.sortDir === "asc" });

    const { data, count, error } = await query.range(from, to);

    if (error) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        error: error.message,
      };
    }

    const rows = (data ?? []) as OfferRow[];
    const imageUrls = await getMainImageUrls(rows.map((row) => row.offer_id));

    return {
      data: rows.map((row) =>
        toOfferListItem(row, imageUrls.get(row.offer_id) ?? null, today),
      ),
      total: count ?? 0,
      page,
      pageSize,
    };
  } catch (error) {
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      error:
        error instanceof Error
          ? error.message
          : "No fue posible cargar las ofertas.",
    };
  }
}

export async function getCurrentCompanyOfferTitle(): Promise<string> {
  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return "Mi Empresa";
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("company_name")
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      return "Mi Empresa";
    }

    return (data as { company_name: string }).company_name;
  } catch {
    return "Mi Empresa";
  }
}

export async function getCompanyOfferDetail(
  offerId: string,
): Promise<OfferActionResult<OfferDetail>> {
  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return { ok: false, message: context.message };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("offers")
      .select(
        "offer_id, offer_title, offer_description, offer_regular_price, offer_price, offer_start_date, offer_end_date, coupon_usage_deadline, coupon_quantity_limit, offer_status, offer_rejection_reason, created_at, updated_at",
      )
      .eq("offer_id", offerId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        message: "No fue posible obtener el detalle de la oferta.",
      };
    }

    const [{ data: details }, { data: images }] = await Promise.all([
      supabase
        .from("offer_list_details")
        .select(
          "offer_list_detail_id, offer_id, item_title, item_description, item_sort_order",
        )
        .eq("offer_id", offerId)
        .is("deleted_at", null)
        .order("item_sort_order", { ascending: true }),
      supabase
        .from("offer_carousel_images")
        .select(
          "offer_carousel_image_id, offer_id, image_url, image_alt_text, image_sort_order, main_image",
        )
        .eq("offer_id", offerId)
        .is("deleted_at", null)
        .order("image_sort_order", { ascending: true }),
    ]);

    const imageRows = (images ?? []) as OfferImageRow[];
    const normalizedImages = imageRows.map((image) =>
      toOfferImage(image, supabase),
    );
    const base = toOfferListItem(
      data as OfferRow,
      normalizedImages.find((image) => image.main_image)?.image_url ??
        normalizedImages[0]?.image_url ??
        null,
    );

    return {
      ok: true,
      message: "Detalle cargado.",
      data: {
        ...base,
        details: ((details ?? []) as OfferDetailRow[]).map(toOfferDetail),
        images: normalizedImages,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible obtener el detalle de la oferta.",
    };
  }
}

export async function createCompanyOffer(
  input: OfferFormInput,
): Promise<OfferActionResult<OfferDetail>> {
  const normalized = normalizeOfferInput(input);
  const validation = validateOfferInput(normalized);

  if (!validation.isValid) {
    return {
      ok: false,
      message: Object.values(validation.errors)[0] ?? "Datos invalidos.",
    };
  }

  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return { ok: false, message: context.message };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("offers")
      .insert({
        ...getOfferPayload(normalized),
        company_id: context.companyId,
        offer_status: "PENDING",
      })
      .select("offer_id")
      .single();

    if (error || !data) {
      return {
        ok: false,
        message: error?.message ?? "No fue posible crear la oferta.",
      };
    }

    const relationResult = await replaceOfferRelations(data.offer_id, normalized);

    if (!relationResult.ok) {
      await supabase
        .from("offers")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("offer_id", data.offer_id)
        .eq("company_id", context.companyId);

      return relationResult;
    }

    const detailResult = await getCompanyOfferDetail(data.offer_id);
    revalidatePath("/company-offers");

    return {
      ok: true,
      message: "Oferta creada correctamente.",
      data: detailResult.data,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible crear la oferta.",
    };
  }
}

export async function updateCompanyOffer(
  offerId: string,
  input: OfferFormInput,
): Promise<OfferActionResult<OfferDetail>> {
  const normalized = normalizeOfferInput(input);
  const validation = validateOfferInput(normalized);

  if (!validation.isValid) {
    return {
      ok: false,
      message: Object.values(validation.errors)[0] ?? "Datos invalidos.",
    };
  }

  try {
    const context = await getCompanyIdFromSession();

    if (!context.ok) {
      return { ok: false, message: context.message };
    }

    const supabase = await createClient();
    const { data: existingOffer, error: lookupError } = await supabase
      .from("offers")
      .select("offer_id")
      .eq("offer_id", offerId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (lookupError || !existingOffer) {
      return {
        ok: false,
        message: "La oferta no existe o no pertenece a tu empresa.",
      };
    }

    const { error } = await supabase
      .from("offers")
      .update({
        ...getOfferPayload(normalized),
        offer_status: "PENDING",
        offer_rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("offer_id", offerId)
      .eq("company_id", context.companyId)
      .is("deleted_at", null);

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    const relationResult = await replaceOfferRelations(offerId, normalized);

    if (!relationResult.ok) {
      return relationResult;
    }

    const detailResult = await getCompanyOfferDetail(offerId);
    revalidatePath("/company-offers");

    return {
      ok: true,
      message: "Oferta actualizada correctamente. Quedo en espera de revision.",
      data: detailResult.data,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible actualizar la oferta.",
    };
  }
}
