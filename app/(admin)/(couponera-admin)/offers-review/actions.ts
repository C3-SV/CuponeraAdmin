"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  OfferActionResult,
  OfferCompanyOption,
  OfferDetail,
  OfferImage,
  OfferListItem,
  OfferOrderDetail,
  OfferQueryParams,
  OffersListResponse,
  OfferListDetail,
} from "@/lib/offers/types";

type OfferCompanyRelation =
  | { company_id: string; company_name: string }
  | { company_id: string; company_name: string }[]
  | null;

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
  offer_status: OfferListItem["offer_status"];
  offer_rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  companies: OfferCompanyRelation;
};

type OfferImageRow = {
  offer_carousel_image_id: string;
  image_url: string;
  image_alt_text: string | null;
  image_sort_order: number;
  main_image: boolean;
};

type OfferListDetailRow = {
  offer_list_detail_id: string;
  item_title: string;
  item_description: string;
  item_sort_order: number;
};

type OfferOrderRelation =
  | {
      order_id: string;
      order_payment_ref: string | null;
      order_paid_at: string | null;
      order_status: string;
    }
  | {
      order_id: string;
      order_payment_ref: string | null;
      order_paid_at: string | null;
      order_status: string;
    }[]
  | null;

type OfferOrderItemRow = {
  order_item_id: string;
  order_id: string | null;
  quantity: number | string;
  unit_price: number | string;
  created_at: string;
  orders: OfferOrderRelation;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const DEFAULT_QUERY: OfferQueryParams = {
  search: "",
  companyId: "",
  state: "PENDING",
  sortBy: "created_at",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeQueryParams(
  params?: Partial<OfferQueryParams>,
): OfferQueryParams {
  return {
    search: params?.search?.trim() ?? DEFAULT_QUERY.search,
    companyId: params?.companyId?.trim() ?? DEFAULT_QUERY.companyId,
    state: params?.state ?? DEFAULT_QUERY.state,
    sortBy: params?.sortBy ?? DEFAULT_QUERY.sortBy,
    sortDir: params?.sortDir ?? DEFAULT_QUERY.sortDir,
    page: Number(params?.page ?? DEFAULT_QUERY.page) || DEFAULT_QUERY.page,
    pageSize: Math.min(
      50,
      Number(params?.pageSize ?? DEFAULT_QUERY.pageSize) || DEFAULT_QUERY.pageSize,
    ),
  };
}

async function requireCouponeraAdmin(): Promise<string> {
  const profile = await getCurrentAuthProfile();

  if (!profile || !profile.user_is_active || profile.user_role !== "ADMIN_PLATFORM") {
    throw new Error("No tienes permisos para administrar ofertas.");
  }

  return profile.user_id;
}

function getCompanyName(row: OfferRow): string {
  if (!row.companies) {
    return "Sin empresa";
  }

  if (Array.isArray(row.companies)) {
    return row.companies[0]?.company_name ?? "Sin empresa";
  }

  return row.companies.company_name;
}

function toOfferListItem(row: OfferRow): OfferListItem {
  return {
    offer_id: row.offer_id,
    offer_title: row.offer_title,
    offer_description: row.offer_description,
    offer_regular_price: Number(row.offer_regular_price),
    offer_price: Number(row.offer_price),
    offer_start_date: row.offer_start_date,
    offer_end_date: row.offer_end_date,
    coupon_usage_deadline: row.coupon_usage_deadline,
    coupon_quantity_limit:
      row.coupon_quantity_limit === null
        ? null
        : Number(row.coupon_quantity_limit),
    offer_status: row.offer_status,
    offer_rejection_reason: row.offer_rejection_reason,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    company_id: row.company_id,
    company_name: getCompanyName(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

function buildOfferImageUrl(
  supabase: SupabaseServerClient,
  imageUrl: string,
): string {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  const normalizedPath = imageUrl.replace(/^product-images\//, "");

  return supabase.storage
    .from("product-images")
    .getPublicUrl(normalizedPath).data.publicUrl;
}

function toOfferImage(
  row: OfferImageRow,
  supabase: SupabaseServerClient,
): OfferImage {
  return {
    offer_carousel_image_id: row.offer_carousel_image_id,
    image_url: buildOfferImageUrl(supabase, row.image_url),
    image_alt_text: row.image_alt_text,
    image_sort_order: Number(row.image_sort_order),
    main_image: row.main_image,
  };
}

function toOfferListDetail(row: OfferListDetailRow): OfferListDetail {
  return {
    offer_list_detail_id: row.offer_list_detail_id,
    item_title: row.item_title,
    item_description: row.item_description,
    item_sort_order: Number(row.item_sort_order),
  };
}

function getOrderRelation(row: OfferOrderItemRow) {
  if (!row.orders) {
    return null;
  }

  return Array.isArray(row.orders) ? row.orders[0] ?? null : row.orders;
}

function toOfferOrderDetail(row: OfferOrderItemRow): OfferOrderDetail {
  const order = getOrderRelation(row);
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unit_price);

  return {
    order_item_id: row.order_item_id,
    order_id: order?.order_id ?? row.order_id,
    order_status: order?.order_status ?? "Sin estado",
    order_paid_at: order?.order_paid_at ?? null,
    order_payment_ref: order?.order_payment_ref ?? null,
    quantity,
    unit_price: unitPrice,
    subtotal: quantity * unitPrice,
    created_at: row.created_at,
  };
}

export async function listOfferCompanies(): Promise<OfferCompanyOption[]> {
  try {
    await requireCouponeraAdmin();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select("company_id, company_name")
      .is("deleted_at", null)
      .order("company_name", { ascending: true });

    if (error) {
      return [];
    }

    return (data ?? []) as OfferCompanyOption[];
  } catch {
    return [];
  }
}

export async function listOffers(
  rawParams?: Partial<OfferQueryParams>,
): Promise<OffersListResponse> {
  const params = normalizeQueryParams(rawParams);
  const pageSize = Math.max(1, params.pageSize);
  const page = Math.max(1, params.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const today = todayIsoDate();

  try {
    await requireCouponeraAdmin();

    const supabase = await createClient();
    let query = supabase
      .from("offers")
      .select(
        "offer_id, offer_title, offer_description, offer_regular_price, offer_price, offer_start_date, offer_end_date, coupon_usage_deadline, coupon_quantity_limit, offer_status, offer_rejection_reason, reviewed_by, reviewed_at, company_id, created_at, updated_at, deleted_at, companies(company_id, company_name)",
        { count: "exact" },
      );

    if (params.state === "ALL") {
      query = query.neq("offer_status", "DISCARDED");
    }

    if (params.state === "DISCARDED") {
      query = query.eq("offer_status", "DISCARDED");
    }

    if (params.state === "PENDING") {
      query = query.eq("offer_status", "PENDING");
    }

    if (params.state === "REJECTED") {
      query = query.eq("offer_status", "REJECTED");
    }

    if (params.state === "APPROVED_FUTURE") {
      query = query.eq("offer_status", "APPROVED").gt("offer_start_date", today);
    }

    if (params.state === "ACTIVE") {
      query = query
        .eq("offer_status", "APPROVED")
        .lte("offer_start_date", today)
        .gte("offer_end_date", today);
    }

    if (params.state === "PAST") {
      query = query.eq("offer_status", "APPROVED").lt("offer_end_date", today);
    }

    if (params.companyId) {
      query = query.eq("company_id", params.companyId);
    }

    if (params.search) {
      query = query.or(
        `offer_title.ilike.%${params.search}%,offer_description.ilike.%${params.search}%`,
      );
    }

    const ascending = params.sortDir === "asc";

    if (params.sortBy === "company_name") {
      const { data, error } = await query;

      if (error) {
        return { data: [], total: 0, page, pageSize, error: error.message };
      }

      const sorted = ((data ?? []) as OfferRow[]).sort((a, b) => {
        const comparison = getCompanyName(a).localeCompare(getCompanyName(b), "es", {
          sensitivity: "base",
        });
        return ascending ? comparison : -comparison;
      });

      return {
        data: sorted.slice(from, to + 1).map(toOfferListItem),
        total: sorted.length,
        page,
        pageSize,
      };
    }

    const { data, count, error } = await query
      .order(params.sortBy, { ascending })
      .range(from, to);

    if (error) {
      return { data: [], total: 0, page, pageSize, error: error.message };
    }

    return {
      data: ((data ?? []) as OfferRow[]).map(toOfferListItem),
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
        error instanceof Error ? error.message : "No fue posible cargar ofertas.",
    };
  }
}

export async function getOfferDetail(
  offerId: string,
): Promise<OfferActionResult<OfferDetail>> {
  try {
    await requireCouponeraAdmin();

    const supabase = await createClient();
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(
        "offer_id, offer_title, offer_description, offer_regular_price, offer_price, offer_start_date, offer_end_date, coupon_usage_deadline, coupon_quantity_limit, offer_status, offer_rejection_reason, reviewed_by, reviewed_at, company_id, created_at, updated_at, deleted_at, companies(company_id, company_name)",
      )
      .eq("offer_id", offerId)
      .single();

    if (offerError || !offer) {
      return {
        ok: false,
        message: offerError?.message ?? "No fue posible cargar la oferta.",
      };
    }

    const [imagesResult, listDetailsResult, orderDetailsResult] =
      await Promise.all([
        supabase
          .from("offer_carousel_images")
          .select(
            "offer_carousel_image_id, image_url, image_alt_text, image_sort_order, main_image",
          )
          .eq("offer_id", offerId)
          .is("deleted_at", null)
          .order("main_image", { ascending: false })
          .order("image_sort_order", { ascending: true }),
        supabase
          .from("offer_list_details")
          .select(
            "offer_list_detail_id, item_title, item_description, item_sort_order",
          )
          .eq("offer_id", offerId)
          .is("deleted_at", null)
          .order("item_sort_order", { ascending: true }),
        supabase
          .from("order_items")
          .select(
            "order_item_id, order_id, quantity, unit_price, created_at, orders(order_id, order_payment_ref, order_paid_at, order_status)",
          )
          .eq("offer_id", offerId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
      ]);

    const detail: OfferDetail = {
      ...toOfferListItem(offer as OfferRow),
      images: imagesResult.error
        ? []
        : ((imagesResult.data ?? []) as OfferImageRow[]).map((image) =>
            toOfferImage(image, supabase),
          ),
      list_details: listDetailsResult.error
        ? []
        : ((listDetailsResult.data ?? []) as OfferListDetailRow[]).map(
            toOfferListDetail,
          ),
      order_details: orderDetailsResult.error
        ? []
        : ((orderDetailsResult.data ?? []) as OfferOrderItemRow[]).map(
            toOfferOrderDetail,
          ),
    };

    return {
      ok: true,
      message: "Detalle cargado.",
      data: detail,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible cargar el detalle de la oferta.",
    };
  }
}

export async function approveOffer(
  offerId: string,
  comment?: string,
): Promise<OfferActionResult> {
  try {
    const reviewerId = await requireCouponeraAdmin();
    const now = new Date().toISOString();
    const cleanComment = comment?.trim() || null;
    const supabase = await createClient();

    const { error } = await supabase
      .from("offers")
      .update({
        offer_status: "APPROVED",
        offer_rejection_reason: cleanComment,
        reviewed_by: reviewerId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("offer_id", offerId)
      .is("deleted_at", null);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/offers-review");
    return { ok: true, message: "Oferta aprobada correctamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No fue posible aprobar la oferta.",
    };
  }
}

export async function rejectOffer(
  offerId: string,
  reason: string,
): Promise<OfferActionResult> {
  const cleanReason = reason.trim();

  if (cleanReason.length < 5) {
    return {
      ok: false,
      message: "Agrega un comentario de rechazo de al menos 5 caracteres.",
    };
  }

  try {
    const reviewerId = await requireCouponeraAdmin();
    const now = new Date().toISOString();
    const supabase = await createClient();

    const { error } = await supabase
      .from("offers")
      .update({
        offer_status: "REJECTED",
        offer_rejection_reason: cleanReason,
        reviewed_by: reviewerId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("offer_id", offerId)
      .is("deleted_at", null);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/offers-review");
    return { ok: true, message: "Oferta rechazada correctamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No fue posible rechazar la oferta.",
    };
  }
}

export async function discardOffer(offerId: string): Promise<OfferActionResult> {
  try {
    const reviewerId = await requireCouponeraAdmin();
    const now = new Date().toISOString();
    const supabase = await createClient();

    const { error } = await supabase
      .from("offers")
      .update({
        offer_status: "DISCARDED",
        reviewed_by: reviewerId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("offer_id", offerId)
      .is("deleted_at", null);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/offers-review");
    return { ok: true, message: "Oferta descartada correctamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible descartar la oferta.",
    };
  }
}
