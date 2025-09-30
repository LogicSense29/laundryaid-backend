import validator from "validator";
import { isValidPhoneNumber } from "libphonenumber-js";

export function validateRequestBody(body) {
  const {
    name,
    contact,
    address,
    serviceType,
    pickupDate,
    deliveryDate,
    pickupOption,
    paymentRef,
    paidAmount,
    clothes_count = 80,
    promo_code
  } = body;

  const errors = [];
  // console.log(clothes_count)
  // console.log(serviceType)

  // Name
  // if (!validator.isEmpty(name)) {
  //   errors.push("Invalid Name");
  // }

  // Phone number (Nigerian format or global)
  const contactToString = contact ? contact.toString() : "";
  if (!isValidPhoneNumber(contactToString, "NG")) {
    errors.push("Invalid phone number");
  }

  // if (!contact || typeof contact !== 'string' || !isValidPhoneNumber(contact, 'NG')) {
  //   errors.push('Invalid phone number');
  // }

  // Address
  if (!address || validator.isEmpty(address)) {
    errors.push("Address is required");
  }

  // Address
  if (!paymentRef || validator.isEmpty(paymentRef)) {
    errors.push("paymentRef is required");
  }

  // Address
  if (!paidAmount) {
    errors.push("Amount is required");
  }

  // Package
  const allowedPackages = ["wash & fold", "premium", "deluxe"];
  if (!allowedPackages.includes(serviceType)) {
    errors.push(`Invalid package. Allowed: ${allowedPackages.join(", ")}`);
  }

  // Status
  // const allowedStatuses = ["pending", "picked_up", "ready"];
  // if (!allowedStatuses.includes(status)) {
  //   errors.push(`Invalid status. Allowed: ${allowedStatuses.join(", ")}`);
  // }

  // Dates
  if (pickupDate && !validator.isDate(pickupDate)) {
    errors.push("Invalid pickup_date");
  }

  if (deliveryDate && !validator.isDate(deliveryDate)) {
    errors.push("Invalid delivery_date");
  }

  // Pickup Option
  const pickupOptions = ["delivery", "pickup"];
  if (!pickupOptions.includes(pickupOption)) {
    errors.push(`Invalid pickup option. Allowed: ${pickupOptions.join(", ")}`);
  }

  // Clothes count
  if (
    clothes_count === undefined ||
    !validator.isInt(clothes_count.toString(), { min: 1 })
  ) {
    errors.push("clothes_count must be a positive integer");
  }

  const toUpperCase = promo_code?.toUpperCase()

if (toUpperCase?.trim() && toUpperCase?.trim() !== "FREEDOMPROMO") {
  errors.push("Invalid Voucher");
}


  return errors;
}
