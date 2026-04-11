"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  OfferActionResult,
  OfferCompanyOption,
  OfferListItem,
  OfferQueryParams,
  OffersListResponse,
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

    if (params.state === "DISCARDED") {
      query = query.not("deleted_at", "is", null);
    } else {
      query = query.is("deleted_at", null);
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
    await requireCouponeraAdmin();

    const now = new Date().toISOString();
    const supabase = await createClient();
    const { error } = await supabase
      .from("offers")
      .update({
        deleted_at: now,
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
