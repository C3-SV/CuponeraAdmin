import type {
  OfferDetailFormInput,
  OfferFormInput,
  OfferImageFormInput,
} from "@/lib/company-offers/types";

export type OfferFormErrors = Partial<Record<keyof OfferFormInput, string>> & {
  details?: string;
  images?: string;
};

function normalizeDetail(detail: OfferDetailFormInput): OfferDetailFormInput {
  return {
    item_title: detail.item_title.trim(),
    item_description: detail.item_description.trim(),
    item_sort_order: detail.item_sort_order.trim(),
  };
}

function normalizeImage(image: OfferImageFormInput): OfferImageFormInput {
  return {
    image_url: image.image_url.trim(),
    image_alt_text: image.image_alt_text.trim(),
    image_sort_order: image.image_sort_order.trim(),
    main_image: image.main_image,
    upload: image.upload ?? null,
  };
}

function normalizeDecimalValue(value: string): string {
  return value.trim().replace(/,/g, ".");
}

export function normalizeOfferInput(input: OfferFormInput): OfferFormInput {
  return {
    offer_title: input.offer_title.trim(),
    offer_description: input.offer_description.trim(),
    offer_regular_price: normalizeDecimalValue(input.offer_regular_price),
    offer_price: normalizeDecimalValue(input.offer_price),
    offer_start_date: input.offer_start_date.trim(),
    offer_end_date: input.offer_end_date.trim(),
    coupon_usage_deadline: input.coupon_usage_deadline.trim(),
    coupon_quantity_limit: input.coupon_quantity_limit.trim(),
    details: input.details.map(normalizeDetail),
    images: input.images.map(normalizeImage),
  };
}

function isValidDateValue(value: string): boolean {
  return Boolean(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function compareDateValues(left: string, right: string): number {
  return new Date(`${left}T00:00:00`).getTime() - new Date(`${right}T00:00:00`).getTime();
}

export function validateOfferInput(
  input: OfferFormInput,
): { isValid: boolean; errors: OfferFormErrors } {
  const normalized = normalizeOfferInput(input);
  const errors: OfferFormErrors = {};

  if (!normalized.offer_title) {
    errors.offer_title = "El titulo es obligatorio.";
  }

  if (!normalized.offer_description) {
    errors.offer_description = "La descripcion es obligatoria.";
  }

  const regularPrice = Number(normalized.offer_regular_price);
  const offerPrice = Number(normalized.offer_price);

  if (!normalized.offer_regular_price || !Number.isFinite(regularPrice)) {
    errors.offer_regular_price = "El precio regular debe ser numerico.";
  } else if (regularPrice <= 0) {
    errors.offer_regular_price = "El precio regular debe ser mayor que 0.";
  }

  if (!normalized.offer_price || !Number.isFinite(offerPrice)) {
    errors.offer_price = "El precio de oferta debe ser numerico.";
  } else if (offerPrice <= 0) {
    errors.offer_price = "El precio de oferta debe ser mayor que 0.";
  } else if (Number.isFinite(regularPrice) && offerPrice > regularPrice) {
    errors.offer_price = "El precio de oferta no puede superar el precio regular.";
  }

  if (!isValidDateValue(normalized.offer_start_date)) {
    errors.offer_start_date = "La fecha de inicio es obligatoria.";
  }

  if (!isValidDateValue(normalized.offer_end_date)) {
    errors.offer_end_date = "La fecha de fin es obligatoria.";
  }

  if (!isValidDateValue(normalized.coupon_usage_deadline)) {
    errors.coupon_usage_deadline = "La fecha limite de uso es obligatoria.";
  }

  if (
    isValidDateValue(normalized.offer_start_date) &&
    isValidDateValue(normalized.offer_end_date) &&
    compareDateValues(normalized.offer_start_date, normalized.offer_end_date) > 0
  ) {
    errors.offer_end_date = "La fecha de fin debe ser posterior o igual al inicio.";
  }

  if (
    isValidDateValue(normalized.offer_end_date) &&
    isValidDateValue(normalized.coupon_usage_deadline) &&
    compareDateValues(normalized.coupon_usage_deadline, normalized.offer_end_date) < 0
  ) {
    errors.coupon_usage_deadline =
      "La fecha limite de uso debe ser igual o posterior al fin de la oferta.";
  }

  if (!normalized.coupon_quantity_limit) {
    errors.coupon_quantity_limit = "La cantidad limite es obligatoria.";
  } else {
    const quantityLimit = Number(normalized.coupon_quantity_limit);

    if (!Number.isInteger(quantityLimit) || quantityLimit < 0) {
      errors.coupon_quantity_limit =
        "La cantidad limite debe ser un entero mayor o igual a 0.";
    }
  }

  const detailsWithContent = normalized.details.filter(
    (detail) => detail.item_title || detail.item_description,
  );

  for (const detail of detailsWithContent) {
    const sortOrder = Number(detail.item_sort_order);
    if (!detail.item_title || !detail.item_description) {
      errors.details = "Cada detalle debe tener titulo y descripcion.";
      break;
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 1) {
      errors.details = "El orden de cada detalle debe ser mayor o igual a 1.";
      break;
    }
  }

  const validImages = normalized.images.filter(
    (image) => image.image_url || image.upload,
  );

  if (validImages.length === 0) {
    errors.images = "Agrega al menos una imagen de oferta.";
  }

  let mainImageCount = 0;
  for (const image of validImages) {
    const sortOrder = Number(image.image_sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 1) {
      errors.images = "El orden de cada imagen debe ser mayor o igual a 1.";
      break;
    }
    if (image.main_image) {
      mainImageCount += 1;
    }
  }

  if (validImages.length > 0 && mainImageCount !== 1) {
    errors.images = "Selecciona exactamente una imagen principal.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
