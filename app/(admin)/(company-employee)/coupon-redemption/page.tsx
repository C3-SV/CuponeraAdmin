"use client";

import { useMemo, useState } from "react";

type InputMethod = "link" | "code" | "qr";

type Coupon = {
  id: string;
  offerTitle: string;
  customerName: string;
  code: string;
  qrToken: string;
  linkToken: string;
  expiresAt: string;
  redeemedAt: string | null;
};

const initialCoupons: Coupon[] = [
  {
    id: "CP-1001",
    offerTitle: "2x1 Hamburguesa Clasica",
    customerName: "Andrea Perez",
    code: "HAM2X1",
    qrToken: "QR-AX19-KP02",
    linkToken: "lnk-ham2x1-1001",
    expiresAt: "2026-12-31T23:59:59.000Z",
    redeemedAt: null,
  },
  {
    id: "CP-1002",
    offerTitle: "40% en Spa Relax",
    customerName: "Carlos Rodriguez",
    code: "SPA40",
    qrToken: "QR-SP40-TR71",
    linkToken: "lnk-spa40-1002",
    expiresAt: "2025-01-10T23:59:59.000Z",
    redeemedAt: null,
  },
  {
    id: "CP-1003",
    offerTitle: "Entrada Cine + Combo",
    customerName: "Daniela Molina",
    code: "CINEPLUS",
    qrToken: "QR-CN88-ZQ10",
    linkToken: "lnk-cineplus-1003",
    expiresAt: "2026-11-20T23:59:59.000Z",
    redeemedAt: "2026-04-01T17:45:00.000Z",
  },
];

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

export default function CouponRedemptionPage() {
  const [method, setMethod] = useState<InputMethod>("code");
  const [inputValue, setInputValue] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>(
    "Ingresa el cupon por enlace, codigo o QR para validarlo.",
  );

  const selectedCoupon = useMemo(
    () => coupons.find((coupon) => coupon.id === selectedCouponId) ?? null,
    [coupons, selectedCouponId],
  );

  const redeemedCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.redeemedAt !== null),
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
      return (
        coupons.find((coupon) => normalizeInput(coupon.linkToken) === token) ??
        null
      );
    }

    const qrToken = normalizeInput(extractTokenFromQr(rawValue));
    return (
      coupons.find((coupon) => normalizeInput(coupon.qrToken) === qrToken) ?? null
    );
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

  function handleRedeemCoupon() {
    if (!selectedCoupon) {
      setFeedback("Primero valida un cupon antes de canjear.");
      return;
    }

    const validation = validateCoupon(selectedCoupon);
    if (!validation.canRedeem) {
      setFeedback(validation.message);
      return;
    }

    const redemptionDate = new Date().toISOString();

    setCoupons((prevCoupons) =>
      prevCoupons.map((coupon) =>
        coupon.id === selectedCoupon.id
          ? {
              ...coupon,
              redeemedAt: redemptionDate,
            }
          : coupon,
      ),
    );

    setFeedback(
      `Canje exitoso. El cupon ${selectedCoupon.code} quedo marcado como canjeado.`,
    );
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
            className="rounded-xl bg-(--brand-orange) px-4 py-2 text-sm font-semibold text-white hover:bg-(--brand-orange-strong)"
          >
            Canjear
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
                <span className="font-medium">Estado:</span>{" "}
                {selectedCoupon.redeemedAt ? "Canjeado" : "No canjeado"}
              </p>
              {selectedCoupon.redeemedAt ? (
                <p>
                  <span className="font-medium">Fecha de canje:</span>{" "}
                  {formatDate(selectedCoupon.redeemedAt)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-(--text-muted)">
              Aun no has validado ningun cupon.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-(--border) bg-(--surface) p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
            Canjes recientes ({redeemedCoupons.length})
          </p>

          <div className="space-y-3">
            {redeemedCoupons.length === 0 ? (
              <p className="text-sm text-(--text-muted)">No hay canjes registrados.</p>
            ) : (
              redeemedCoupons.map((coupon) => (
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
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
