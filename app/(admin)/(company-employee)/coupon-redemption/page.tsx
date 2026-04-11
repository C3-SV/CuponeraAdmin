"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Swal from "sweetalert2";

type InputMethod = "link" | "code" | "qr";
type CouponStatus = "disponible" | "canjeado" | "vencido";
type RedeemedSort = "newest" | "oldest";

type Coupon = {
  id: string;
  offerTitle: string;
  customerName: string;
  code: string;
  expiresAt: string;
  redeemedAt: string | null;
  redeemedBy: string | null;
  customerId: string;
};

type CustomerProfileRow = {
  user_id: string;
  dui: string | null;
  address: string | null;
  phone: string | null;
  created_at: string;
  deleted_at: string | null;
};

type ProfileRow = {
  user_id: string;
  first_names: string | null;
  last_names: string | null;
  user_is_active: boolean | null;
  created_at?: string | null;
};

type OrderRow = {
  order_id: string;
  customer_id: string;
  order_status: string;
  deleted_at: string | null;
};

type OrderItemRow = {
  order_item_id: string;
  order_id: string;
  offer_id: string;
  created_at: string;
  deleted_at: string | null;
};

type OfferRow = {
  offer_id: string;
  offer_title: string;
};

type CouponRow = {
  coupon_id: string;
  order_item_id: string;
  coupon_code: string;
  coupon_issued_at: string;
  coupon_expires_at: string;
  coupon_redeemed_at: string | null;
  coupon_redeemed_by: string | null;
  coupon_status: string;
  deleted_at: string | null;
};

function getCouponStatus(coupon: Pick<Coupon, "expiresAt" | "redeemedAt">): CouponStatus {
  if (coupon.redeemedAt) {
    return "canjeado";
  }

  const expirationTime = new Date(coupon.expiresAt).getTime();
  if (!Number.isNaN(expirationTime) && expirationTime < Date.now()) {
    return "vencido";
  }

  return "disponible";
}

function normalizeCouponStatus(coupon: CouponRow): CouponStatus {
  if (coupon.coupon_status === "REDEEMED" || coupon.coupon_redeemed_at) {
    return "canjeado";
  }

  const expirationTime = new Date(coupon.coupon_expires_at).getTime();
  if (!Number.isNaN(expirationTime) && expirationTime < Date.now()) {
    return "vencido";
  }

  return "disponible";
}

function buildCustomerName(profile?: ProfileRow): string {
  if (!profile) {
    return "Cliente";
  }

  const first = profile.first_names?.trim() ?? "";
  const last = profile.last_names?.trim() ?? "";
  const full = `${first} ${last}`.trim();

  return full || "Cliente";
}

function normalizeInput(value: string): string {
  return value.trim().toLowerCase();
}

function extractTokenFromLink(rawValue: string): string {
  const cleanValue = rawValue.trim();

  if (!cleanValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(cleanValue);
    const queryToken = parsedUrl.searchParams.get("token");
    if (queryToken) {
      return queryToken;
    }

    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    return pathParts[pathParts.length - 1] ?? "";
  } catch {
    return cleanValue;
  }
}

function extractTokenFromQr(rawValue: string): string {
  const cleanValue = rawValue.trim();

  if (!cleanValue) {
    return "";
  }

  if (cleanValue.includes("|")) {
    const parts = cleanValue.split("|");
    return parts[parts.length - 1].trim();
  }

  return cleanValue;
}

function formatDate(dateIso: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

function getLookupToken(currentMethod: InputMethod, rawValue: string): string {
  if (currentMethod === "code") {
    return rawValue.trim();
  }

  return currentMethod === "link"
    ? extractTokenFromLink(rawValue).trim()
    : extractTokenFromQr(rawValue).trim();
}

export default function CouponRedemptionPage() {
  const [method, setMethod] = useState<InputMethod>("code");
  const [inputValue, setInputValue] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [savingCouponId, setSavingCouponId] = useState<string | null>(null);
  const [redeemedSort, setRedeemedSort] = useState<RedeemedSort>("newest");
  const [redeemedSearchInput, setRedeemedSearchInput] = useState("");
  const [redeemedPageSize, setRedeemedPageSize] = useState(5);
  const [redeemedPage, setRedeemedPage] = useState(1);
  const [feedback, setFeedback] = useState<string>(
    "Ingresa el cupon por enlace, codigo o QR para validarlo.",
  );

  async function loadCoupons() {
    setLoadingData(true);
    setLoadingError(null);

    try {
      const supabase = createClient();

      const [
        customerProfileResult,
        ordersResult,
        orderItemsResult,
        offersResult,
        couponsResult,
        profilesResult,
      ] = await Promise.all([
        supabase
          .from("customer_profile")
          .select("user_id, phone, created_at, deleted_at")
          .is("deleted_at", null),
        supabase
          .from("orders")
          .select("order_id, customer_id, order_status, deleted_at")
          .is("deleted_at", null),
        supabase
          .from("order_items")
          .select("order_item_id, order_id, offer_id, created_at, deleted_at")
          .is("deleted_at", null),
        supabase.from("offers").select("offer_id, offer_title"),
        supabase
          .from("coupons")
          .select(
            "coupon_id, order_item_id, coupon_code, coupon_issued_at, coupon_expires_at, coupon_redeemed_at, coupon_redeemed_by, coupon_status, deleted_at",
          )
          .is("deleted_at", null),
        supabase
          .from("profiles")
          .select("user_id, first_names, last_names, user_is_active, created_at"),
      ]);

      const firstError =
        customerProfileResult.error ||
        ordersResult.error ||
        orderItemsResult.error ||
        offersResult.error ||
        couponsResult.error ||
        profilesResult.error;

      if (firstError) {
        throw new Error(firstError.message);
      }

      const customerProfiles = (customerProfileResult.data ?? []) as CustomerProfileRow[];
      const orders = (ordersResult.data ?? []) as OrderRow[];
      const orderItems = (orderItemsResult.data ?? []) as OrderItemRow[];
      const offers = (offersResult.data ?? []) as OfferRow[];
      const couponsData = (couponsResult.data ?? []) as CouponRow[];
      const profiles = (profilesResult.data ?? []) as ProfileRow[];

      const customerProfileMap = new Map(
        customerProfiles.map((row) => [row.user_id, row]),
      );
      const orderMap = new Map(orders.map((row) => [row.order_id, row]));
      const orderItemMap = new Map(orderItems.map((row) => [row.order_item_id, row]));
      const offerMap = new Map(offers.map((row) => [row.offer_id, row]));
      const profileMap = new Map(profiles.map((row) => [row.user_id, row]));

      const nextCoupons: Coupon[] = [];

      for (const coupon of couponsData) {
        const orderItem = orderItemMap.get(coupon.order_item_id);
        if (!orderItem) {
          continue;
        }

        const order = orderMap.get(orderItem.order_id);
        if (!order) {
          continue;
        }

        const offerTitle = offerMap.get(orderItem.offer_id)?.offer_title ?? coupon.coupon_code;
        const profile = profileMap.get(order.customer_id);

        nextCoupons.push({
          id: coupon.coupon_id,
          offerTitle,
          customerName: buildCustomerName(profile),
          code: coupon.coupon_code,
          expiresAt: coupon.coupon_expires_at,
          redeemedAt: coupon.coupon_redeemed_at,
          redeemedBy: coupon.coupon_redeemed_by,
          customerId: order.customer_id,
        });
      }

      nextCoupons.sort((a, b) => a.offerTitle.localeCompare(b.offerTitle));
      setCoupons(nextCoupons);

      if (!selectedCouponId) {
        setFeedback("Ingresa el cupon por enlace, codigo o QR para validarlo.");
      }
    } catch (error) {
      setLoadingError(
        error instanceof Error ? error.message : "No fue posible cargar cupones.",
      );
    } finally {
      setLoadingData(false);
    }
  }

  const selectedCoupon = useMemo(
    () => coupons.find((coupon) => coupon.id === selectedCouponId) ?? null,
    [coupons, selectedCouponId],
  );

  const redeemedCoupons = useMemo(() => {
    const redeemed = coupons.filter((coupon) => coupon.redeemedAt !== null);

    const query = redeemedSearchInput.trim().toLowerCase();
    const filtered = query
      ? redeemed.filter((coupon) => {
          return [coupon.offerTitle, coupon.customerName, coupon.code, coupon.redeemedBy ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(query);
        })
      : redeemed;

    filtered.sort((a, b) => {
      const aTime = a.redeemedAt ? new Date(a.redeemedAt).getTime() : 0;
      const bTime = b.redeemedAt ? new Date(b.redeemedAt).getTime() : 0;
      return redeemedSort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return filtered;
  }, [coupons, redeemedSort, redeemedSearchInput]);

  const redeemedTotalPages = useMemo(
    () => Math.max(1, Math.ceil(redeemedCoupons.length / redeemedPageSize)),
    [redeemedCoupons.length, redeemedPageSize],
  );

  const paginatedRedeemedCoupons = useMemo(() => {
    const start = (redeemedPage - 1) * redeemedPageSize;
    return redeemedCoupons.slice(start, start + redeemedPageSize);
  }, [redeemedCoupons, redeemedPage, redeemedPageSize]);

  useEffect(() => {
    setRedeemedPage((previous) => Math.min(previous, redeemedTotalPages));
  }, [redeemedTotalPages]);

  useEffect(() => {
    void loadCoupons();
  }, []);

  function findCouponByInput(currentMethod: InputMethod, rawValue: string): Coupon | null {
    if (!rawValue.trim()) {
      return null;
    }

    const normalizedValue = normalizeInput(getLookupToken(currentMethod, rawValue));

    if (currentMethod === "code") {
      return coupons.find((coupon) => normalizeInput(coupon.code) === normalizedValue) ?? null;
    }

    return (
      coupons.find(
        (coupon) =>
          normalizeInput(coupon.code) === normalizedValue ||
          normalizeInput(coupon.id) === normalizedValue,
      ) ?? null
    );
  }

  async function fetchCouponByInputFromDatabase(
    currentMethod: InputMethod,
    rawValue: string,
  ): Promise<Coupon | null> {
    const token = getLookupToken(currentMethod, rawValue);
    if (!token) {
      return null;
    }

    const supabase = createClient();

    let couponRow: CouponRow | null = null;

    if (currentMethod === "code") {
      const { data } = await supabase
        .from("coupons")
        .select(
          "coupon_id, order_item_id, coupon_code, coupon_issued_at, coupon_expires_at, coupon_redeemed_at, coupon_redeemed_by, coupon_status, deleted_at",
        )
        .is("deleted_at", null)
        .ilike("coupon_code", token)
        .limit(1)
        .maybeSingle();
      couponRow = (data as CouponRow | null) ?? null;
    } else {
      const byIdResult = await supabase
        .from("coupons")
        .select(
          "coupon_id, order_item_id, coupon_code, coupon_issued_at, coupon_expires_at, coupon_redeemed_at, coupon_redeemed_by, coupon_status, deleted_at",
        )
        .is("deleted_at", null)
        .eq("coupon_id", token)
        .maybeSingle();

      couponRow = (byIdResult.data as CouponRow | null) ?? null;

      if (!couponRow) {
        const byCodeResult = await supabase
          .from("coupons")
          .select(
            "coupon_id, order_item_id, coupon_code, coupon_issued_at, coupon_expires_at, coupon_redeemed_at, coupon_redeemed_by, coupon_status, deleted_at",
          )
          .is("deleted_at", null)
          .ilike("coupon_code", token)
          .limit(1)
          .maybeSingle();

        couponRow = (byCodeResult.data as CouponRow | null) ?? null;
      }
    }

    if (!couponRow) {
      return null;
    }

    const { data: orderItem } = await supabase
      .from("order_items")
      .select("order_item_id, order_id, offer_id, created_at, deleted_at")
      .eq("order_item_id", couponRow.order_item_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!orderItem) {
      return {
        id: couponRow.coupon_id,
        offerTitle: couponRow.coupon_code,
        customerName: "Cliente",
        code: couponRow.coupon_code,
        expiresAt: couponRow.coupon_expires_at,
        redeemedAt: couponRow.coupon_redeemed_at,
        redeemedBy: couponRow.coupon_redeemed_by,
        customerId: "",
      };
    }

    const [orderResult, offerResult] = await Promise.all([
      supabase
        .from("orders")
        .select("order_id, customer_id, order_status, deleted_at")
        .eq("order_id", orderItem.order_id)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("offers")
        .select("offer_id, offer_title")
        .eq("offer_id", orderItem.offer_id)
        .maybeSingle(),
    ]);

    const order = orderResult.data as OrderRow | null;
    const offer = offerResult.data as OfferRow | null;

    let customerName = "Cliente";
    let customerId = order?.customer_id ?? "";

    if (order?.customer_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, first_names, last_names, user_is_active, created_at")
        .eq("user_id", order.customer_id)
        .maybeSingle();

      customerName = buildCustomerName((profile as ProfileRow | null) ?? undefined);
    }

    return {
      id: couponRow.coupon_id,
      offerTitle: offer?.offer_title ?? couponRow.coupon_code,
      customerName,
      code: couponRow.coupon_code,
      expiresAt: couponRow.coupon_expires_at,
      redeemedAt: couponRow.coupon_redeemed_at,
      redeemedBy: couponRow.coupon_redeemed_by,
      customerId,
    };
  }

  function validateCoupon(coupon: Coupon): { canRedeem: boolean; message: string } {
    const now = Date.now();
    const expiration = new Date(coupon.expiresAt).getTime();

    if (coupon.redeemedAt) {
      return {
        canRedeem: false,
        message: "Este cupon ya fue reclamado anteriormente.",
      };
    }

    if (expiration < now) {
      return {
        canRedeem: false,
        message: "Este cupon ya vencio y no puede canjearse.",
      };
    }

    return {
      canRedeem: true,
      message: "Cupon valido. Puedes proceder con el canje.",
    };
  }

  async function handleRedeemCoupon() {
    if (!selectedCoupon) {
      setFeedback("Primero valida un cupon antes de canjear.");
      await Swal.fire({
        icon: "info",
        title: "Sin cupon validado",
        text: "Primero valida un cupon antes de canjear.",
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    const validation = validateCoupon(selectedCoupon);
    if (!validation.canRedeem) {
      setFeedback(validation.message);
      await Swal.fire({
        icon: "warning",
        title: "Canje no permitido",
        text: validation.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    const redemptionDate = new Date().toISOString();
    const today = redemptionDate.slice(0, 10);
    const supabase = createClient();

    setSavingCouponId(selectedCoupon.id);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setFeedback("No se pudo identificar al usuario autenticado.");
        await Swal.fire({
          icon: "error",
          title: "Sesion invalida",
          text: "No se pudo identificar al usuario autenticado.",
          confirmButtonColor: "#0f3d78",
        });
        return;
      }

      const { data: updatedCoupon, error: redeemError } = await supabase
        .from("coupons")
        .update({
          coupon_status: "REDEEMED",
          coupon_redeemed_at: redemptionDate,
          coupon_redeemed_by: user.id,
        })
        .eq("coupon_id", selectedCoupon.id)
        .is("coupon_redeemed_at", null)
        .eq("coupon_status", "AVAILABLE")
        .gte("coupon_expires_at", today)
        .select("coupon_id")
        .maybeSingle();

      if (redeemError) {
        throw new Error(redeemError.message);
      }

      if (!updatedCoupon) {
        const message =
          "No se pudo canjear: puede estar vencido, ya canjeado o sin permisos por politicas (RLS).";
        throw new Error(message);
      }

      setFeedback(
        `Canje exitoso. El cupon ${selectedCoupon.code} quedo marcado como canjeado.`,
      );
      await Swal.fire({
        icon: "success",
        title: "Canje exitoso",
        text: `El cupon ${selectedCoupon.code} quedo marcado como canjeado.`,
        confirmButtonColor: "#0f3d78",
      });
      setInputValue("");
      setSelectedCouponId(null);
      await loadCoupons();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo completar el canje.";
      setFeedback(message);
      await Swal.fire({
        icon: "error",
        title: "Error al canjear",
        text: message,
        confirmButtonColor: "#0f3d78",
      });
    } finally {
      setSavingCouponId(null);
    }
  }

  async function handleValidateCoupon() {
    let foundCoupon = findCouponByInput(method, inputValue);

    if (!foundCoupon) {
      foundCoupon = await fetchCouponByInputFromDatabase(method, inputValue);
      if (foundCoupon) {
        setCoupons((previousCoupons) => {
          const existingIndex = previousCoupons.findIndex(
            (coupon) => coupon.id === foundCoupon?.id,
          );

          if (existingIndex === -1) {
            return [...previousCoupons, foundCoupon as Coupon];
          }

          const nextCoupons = [...previousCoupons];
          nextCoupons[existingIndex] = foundCoupon as Coupon;
          return nextCoupons;
        });
      }
    }

    if (!foundCoupon) {
      setSelectedCouponId(null);
      setFeedback("No se encontro un cupon con el dato ingresado.");
      await Swal.fire({
        icon: "warning",
        title: "Cupon no encontrado",
        text: "No se encontro un cupon con el dato ingresado.",
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    setSelectedCouponId(foundCoupon.id);
    const validation = validateCoupon(foundCoupon);
    setFeedback(validation.message);
    await Swal.fire({
      icon: validation.canRedeem ? "success" : "warning",
      title: validation.canRedeem ? "Cupon valido" : "Cupon no canjeable",
      text: validation.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  return (
    <section className="space-y-5 rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Activacion y Canje de Cupon
        </h1>
        <p className="text-sm text-(--text-muted)">
          Valida por enlace, codigo o QR y confirma el canje solo si esta vigente y no
          ha sido usado.
        </p>
      </div>

      <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
          Metodo de entrada
        </p>
        {loadingError ? (
          <p className="mb-3 text-sm text-red-600">Error de carga: {loadingError}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMethod("link")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              method === "link"
                ? "bg-(--brand-blue) text-white"
                : "border border-(--border) bg-(--surface) text-foreground"
            }`}
          >
            Enlace
          </button>
          <button
            type="button"
            onClick={() => setMethod("code")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              method === "code"
                ? "bg-(--brand-blue) text-white"
                : "border border-(--border) bg-(--surface) text-foreground"
            }`}
          >
            Codigo
          </button>
          <button
            type="button"
            onClick={() => setMethod("qr")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              method === "qr"
                ? "bg-(--brand-blue) text-white"
                : "border border-(--border) bg-(--surface) text-foreground"
            }`}
          >
            QR
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={
              method === "link"
                ? "Pega el enlace del cupon o token"
                : method === "code"
                  ? "Ingresa el codigo del cupon"
                  : "Escanea o pega el valor QR"
            }
            className="h-10 w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-sm text-foreground outline-none"
          />
          <button
            type="button"
            onClick={handleValidateCoupon}
            className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2 text-sm font-medium text-foreground hover:bg-(--surface-soft)"
          >
            Validar
          </button>
          <button
            type="button"
            onClick={handleRedeemCoupon}
            disabled={savingCouponId === selectedCoupon?.id}
            className="rounded-xl bg-(--brand-orange) px-4 py-2 text-sm font-semibold text-white hover:bg-(--brand-orange-strong)"
          >
            {savingCouponId === selectedCoupon?.id ? "Canjeando..." : "Canjear"}
          </button>
        </div>

        <p className="mt-3 text-sm text-(--text-muted)">{feedback}</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="self-start rounded-2xl border border-(--border) bg-(--surface) p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
            Resultado de validacion
          </p>

          {selectedCoupon ? (
            <div className="space-y-2 text-sm text-foreground">
              <p>
                <span className="font-medium">Cliente:</span> {selectedCoupon.customerName}
              </p>
              <p>
                <span className="font-medium">Oferta:</span> {selectedCoupon.offerTitle}
              </p>
              <p>
                <span className="font-medium">Codigo:</span> {selectedCoupon.code}
              </p>
              <p>
                <span className="font-medium">Expira:</span> {formatDate(selectedCoupon.expiresAt)}
              </p>
              <p>
                <span className="font-medium">Estado:</span>{" "}
                {getCouponStatus(selectedCoupon)}
              </p>
              {selectedCoupon.redeemedAt ? (
                <p>
                  <span className="font-medium">Fecha de canje:</span>{" "}
                  {formatDate(selectedCoupon.redeemedAt)}
                </p>
              ) : null}
              {selectedCoupon.redeemedBy ? (
                <p>
                  <span className="font-medium">Canjeado por:</span> {selectedCoupon.redeemedBy}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-(--text-muted)">
              Aun no has validado ningun cupon.
            </p>
          )}
        </section>

        <section className="self-start rounded-2xl border border-(--border) bg-(--surface) p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
              Canjes recientes ({redeemedCoupons.length})
            </p>
            <div className="flex items-center gap-2">
              <select
                value={redeemedSort}
                onChange={(event) => {
                  setRedeemedSort(event.target.value as RedeemedSort);
                  setRedeemedPage(1);
                }}
                className="h-8 rounded-lg border border-(--border) bg-(--surface) px-2 text-xs text-(--text-muted)"
              >
                <option value="newest">Mas reciente</option>
                <option value="oldest">Mas antiguo</option>
              </select>
              <select
                value={redeemedPageSize}
                onChange={(event) => {
                  setRedeemedPageSize(Number(event.target.value));
                  setRedeemedPage(1);
                }}
                className="h-8 rounded-lg border border-(--border) bg-(--surface) px-2 text-xs text-(--text-muted)"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <input
            type="text"
            value={redeemedSearchInput}
            onChange={(event) => {
              setRedeemedSearchInput(event.target.value);
              setRedeemedPage(1);
            }}
            placeholder="Buscar por oferta, cliente, codigo o usuario..."
            className="mb-3 h-9 w-full rounded-lg border border-(--border) bg-(--surface) px-3 text-xs text-foreground outline-none"
          />

          <div className="space-y-3">
            {redeemedCoupons.length === 0 ? (
              <p className="text-sm text-(--text-muted)">No hay canjes registrados.</p>
            ) : (
              paginatedRedeemedCoupons.map((coupon) => (
                <article
                  key={coupon.id}
                  className="rounded-xl border border-(--border) bg-(--surface-soft) p-3"
                >
                  <p className="text-sm font-medium text-foreground">{coupon.offerTitle}</p>
                  <p className="text-xs text-(--text-muted)">{coupon.customerName}</p>
                  <p className="mt-1 text-xs text-(--text-muted)">
                    Codigo: {coupon.code}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    Canjeado: {coupon.redeemedAt ? formatDate(coupon.redeemedAt) : "-"}
                  </p>
                  {coupon.redeemedBy ? (
                    <p className="text-xs text-(--text-muted)">Usuario: {coupon.redeemedBy}</p>
                  ) : null}
                </article>
              ))
            )}
          </div>

          {redeemedCoupons.length > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-(--text-muted)">
                Mostrando {paginatedRedeemedCoupons.length} de {redeemedCoupons.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRedeemedPage((page) => Math.max(1, page - 1))}
                  disabled={redeemedPage === 1}
                  className="rounded-lg border border-(--border) px-2.5 py-1 text-xs text-(--text-muted) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-xs text-(--text-muted)">
                  Pagina {redeemedPage} de {redeemedTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setRedeemedPage((page) => Math.min(redeemedTotalPages, page + 1))
                  }
                  disabled={redeemedPage === redeemedTotalPages}
                  className="rounded-lg border border-(--border) px-2.5 py-1 text-xs text-(--text-muted) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
