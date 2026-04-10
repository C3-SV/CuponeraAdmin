"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type InputMethod = "link" | "code" | "qr";

type Coupon = {
  id: string;
  offerTitle: string;
  customerName: string;
  code: string;
  expiresAt: string;
  redeemedAt: string | null;
  redeemedBy: string | null;
  status: string;
};

type ProfileRow = {
  user_id: string;
  first_names: string | null;
  last_names: string | null;
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
  coupon_expires_at: string;
  coupon_redeemed_at: string | null;
  coupon_redeemed_by: string | null;
  coupon_status: string;
  deleted_at: string | null;
};

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
    const explicitCode = parsedUrl.searchParams.get("coupon_code");
    if (explicitCode) {
      return explicitCode;
    }

    const fallbackCode = parsedUrl.searchParams.get("code");
    if (fallbackCode) {
      return fallbackCode;
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

function isExpired(expiresAt: string): boolean {
  const today = new Date();
  const currentDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  ).getTime();
  const expirationDate = new Date(expiresAt).getTime();

  return expirationDate < currentDate;
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

export default function CouponRedemptionPage() {
  const [method, setMethod] = useState<InputMethod>("code");
  const [inputValue, setInputValue] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [feedback, setFeedback] = useState(
    "Ingresa el cupon por enlace, codigo o QR para validarlo.",
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCoupons() {
      setLoadingData(true);
      setLoadingError(null);

      try {
        const supabase = createClient();

        const [profilesResult, ordersResult, orderItemsResult, offersResult, couponsResult] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("user_id, first_names, last_names")
              .eq("user_role", "CUSTOMER"),
            supabase
              .from("orders")
              .select("order_id, customer_id, order_status, deleted_at")
              .is("deleted_at", null)
              .eq("order_status", "COMPLETED"),
            supabase
              .from("order_items")
              .select("order_item_id, order_id, offer_id, deleted_at")
              .is("deleted_at", null),
            supabase.from("offers").select("offer_id, offer_title"),
            supabase
              .from("coupons")
              .select(
                "coupon_id, order_item_id, coupon_code, coupon_expires_at, coupon_redeemed_at, coupon_redeemed_by, coupon_status, deleted_at",
              )
              .is("deleted_at", null),
          ]);

        if (
          profilesResult.error ||
          ordersResult.error ||
          orderItemsResult.error ||
          offersResult.error ||
          couponsResult.error
        ) {
          throw new Error(
            profilesResult.error?.message ||
              ordersResult.error?.message ||
              orderItemsResult.error?.message ||
              offersResult.error?.message ||
              couponsResult.error?.message ||
              "No se pudo cargar cupones.",
          );
        }

        const profiles = (profilesResult.data ?? []) as ProfileRow[];
        const orders = (ordersResult.data ?? []) as OrderRow[];
        const orderItems = (orderItemsResult.data ?? []) as OrderItemRow[];
        const offers = (offersResult.data ?? []) as OfferRow[];
        const couponRows = (couponsResult.data ?? []) as CouponRow[];

        const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
        const orderMap = new Map(orders.map((order) => [order.order_id, order]));
        const orderItemMap = new Map(
          orderItems.map((orderItem) => [orderItem.order_item_id, orderItem]),
        );
        const offerMap = new Map(offers.map((offer) => [offer.offer_id, offer]));

        const nextCoupons: Coupon[] = [];

        for (const coupon of couponRows) {
          const orderItem = orderItemMap.get(coupon.order_item_id);
          if (!orderItem) {
            continue;
          }

          const order = orderMap.get(orderItem.order_id);
          if (!order) {
            continue;
          }

          const profile = profileMap.get(order.customer_id);
          const offerTitle = offerMap.get(orderItem.offer_id)?.offer_title ?? coupon.coupon_code;

          nextCoupons.push({
            id: coupon.coupon_id,
            offerTitle,
            customerName: buildCustomerName(profile),
            code: coupon.coupon_code,
            expiresAt: coupon.coupon_expires_at,
            redeemedAt: coupon.coupon_redeemed_at,
            redeemedBy: coupon.coupon_redeemed_by,
            status: coupon.coupon_status,
          });
        }

        if (!isMounted) {
          return;
        }

        setCoupons(nextCoupons);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadingError(
          error instanceof Error ? error.message : "No fue posible cargar cupones.",
        );
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    }

    loadCoupons();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCoupon = useMemo(
    () => coupons.find((coupon) => coupon.id === selectedCouponId) ?? null,
    [coupons, selectedCouponId],
  );

  const redeemedCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.status === "REDEEMED" || coupon.redeemedAt),
    [coupons],
  );

  function findCouponByInput(currentMethod: InputMethod, rawValue: string): Coupon | null {
    if (!rawValue.trim()) {
      return null;
    }

    if (currentMethod === "code") {
      const normalizedCode = normalizeInput(rawValue);
      return (
        coupons.find((coupon) => normalizeInput(coupon.code) === normalizedCode) ??
        null
      );
    }

    if (currentMethod === "link") {
      const token = normalizeInput(extractTokenFromLink(rawValue));
      return coupons.find((coupon) => normalizeInput(coupon.code) === token) ?? null;
    }

    const qrToken = normalizeInput(extractTokenFromQr(rawValue));
    return coupons.find((coupon) => normalizeInput(coupon.code) === qrToken) ?? null;
  }

  function validateCoupon(coupon: Coupon): { canRedeem: boolean; message: string } {
    if (coupon.status === "REDEEMED" || coupon.redeemedAt) {
      return {
        canRedeem: false,
        message: "Este cupon ya fue reclamado anteriormente.",
      };
    }

    if (isExpired(coupon.expiresAt)) {
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

  function handleValidateCoupon() {
    const foundCoupon = findCouponByInput(method, inputValue);

    if (!foundCoupon) {
      setSelectedCouponId(null);
      setFeedback("No se encontro un cupon con el dato ingresado.");
      return;
    }

    setSelectedCouponId(foundCoupon.id);
    const validation = validateCoupon(foundCoupon);
    setFeedback(validation.message);
  }

  async function handleRedeemCoupon() {
    if (!selectedCoupon) {
      setFeedback("Primero valida un cupon antes de canjear.");
      return;
    }

    const validation = validateCoupon(selectedCoupon);
    if (!validation.canRedeem) {
      setFeedback(validation.message);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFeedback("No se pudo identificar al empleado que realiza el canje.");
      return;
    }

    const now = new Date();
    const redemptionDate = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1,
    ).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

    setIsRedeeming(true);

    try {
      const { error } = await supabase
        .from("coupons")
        .update({
          coupon_status: "REDEEMED",
          coupon_redeemed_at: redemptionDate,
          coupon_redeemed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("coupon_id", selectedCoupon.id)
        .is("deleted_at", null)
        .eq("coupon_status", "AVAILABLE");

      if (error) {
        throw new Error(error.message);
      }

      setCoupons((prevCoupons) =>
        prevCoupons.map((coupon) =>
          coupon.id === selectedCoupon.id
            ? {
                ...coupon,
                redeemedAt: redemptionDate,
                redeemedBy: user.id,
                status: "REDEEMED",
              }
            : coupon,
        ),
      );

      setFeedback(
        `Canje exitoso. El cupon ${selectedCoupon.code} quedo marcado como canjeado.`,
      );
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "No se pudo actualizar el canje.",
      );
    } finally {
      setIsRedeeming(false);
    }
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
        {loadingError ? <p className="text-sm text-red-600">Error: {loadingError}</p> : null}
      </div>

      <div className="rounded-2xl border border-(--border) bg-(--surface-soft) p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
          Metodo de entrada
        </p>
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
            disabled={loadingData || isRedeeming}
            className="rounded-xl border border-(--border) bg-(--surface) px-4 py-2 text-sm font-medium text-foreground hover:bg-(--surface-soft) disabled:cursor-not-allowed disabled:opacity-60"
          >
            Validar
          </button>
          <button
            type="button"
            onClick={handleRedeemCoupon}
            disabled={loadingData || isRedeeming}
            className="rounded-xl bg-(--brand-orange) px-4 py-2 text-sm font-semibold text-white hover:bg-(--brand-orange-strong) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRedeeming ? "Canjeando..." : "Canjear"}
          </button>
        </div>

        <p className="mt-3 text-sm text-(--text-muted)">{feedback}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-(--border) bg-(--surface) p-4">
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
                <span className="font-medium">Estado:</span> {selectedCoupon.status}
              </p>
              {selectedCoupon.redeemedAt ? (
                <p>
                  <span className="font-medium">Fecha de canje:</span>{" "}
                  {formatDate(selectedCoupon.redeemedAt)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-(--text-muted)">Aun no has validado ningun cupon.</p>
          )}
        </section>

        <section className="rounded-2xl border border-(--border) bg-(--surface) p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
            Canjes recientes ({redeemedCoupons.length})
          </p>

          <div className="space-y-3">
            {loadingData ? (
              <p className="text-sm text-(--text-muted)">Cargando cupones...</p>
            ) : redeemedCoupons.length === 0 ? (
              <p className="text-sm text-(--text-muted)">No hay canjes registrados.</p>
            ) : (
              redeemedCoupons.map((coupon) => (
                <article
                  key={coupon.id}
                  className="rounded-xl border border-(--border) bg-(--surface-soft) p-3"
                >
                  <p className="text-sm font-medium text-foreground">{coupon.offerTitle}</p>
                  <p className="text-xs text-(--text-muted)">{coupon.customerName}</p>
                  <p className="mt-1 text-xs text-(--text-muted)">Codigo: {coupon.code}</p>
                  <p className="text-xs text-(--text-muted)">
                    Canjeado: {coupon.redeemedAt ? formatDate(coupon.redeemedAt) : "-"}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
