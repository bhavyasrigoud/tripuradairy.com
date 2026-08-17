export const WHATSAPP_NUMBER = "918184974676";
export const CONTACT_PHONE = "+91 70327 30117";
export const CONTACT_PHONE_ALT = "+91 81849 74676";
export const CONTACT_EMAIL = "tripurapremiummilkproducts@gmail.com";
export const BUSINESS_ADDRESS =
  "CH6C+P52, Padmavathi Colony, West Balaji Hill Colony, Hema Nagar, Uppal, Hyderabad, Telangana 500039";

export function openWhatsApp(message: string) {
  if (typeof window === "undefined") return;
  const text = encodeURIComponent(message);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function orderMessage(productName: string, quantity: string) {
  return `Hello Tripura,\n\nI would like to order:\n${productName} - ${quantity}\n\nName:\nAddress:`;
}

export function fullOrderMessage(opts: {
  product?: string;
  size?: string;
  count?: number;
  amount?: string;
  name: string;
  phone: string;
  address: string;
  mapsLink?: string;
  preferredDate?: string;
  deliveryTime?: string;
}) {
  const lines = ["Hello Tripura,", "", "I would like to place an order:"];
  if (opts.product) {
    lines.push(`Product: ${opts.product}`);
    if (opts.size) lines.push(`Size: ${opts.size}`);
    if (opts.count) lines.push(`Quantity: ${opts.count}`);
    if (opts.amount) lines.push(`Total Amount: ${opts.amount}`);
  }
  lines.push("", `Name: ${opts.name}`, `Phone: ${opts.phone}`, `Address: ${opts.address}`);
  if (opts.preferredDate) lines.push(`Preferred Date: ${opts.preferredDate}`);
  if (opts.deliveryTime) lines.push(`Delivery Time: ${opts.deliveryTime}`);
  if (opts.mapsLink) lines.push(`Location: ${opts.mapsLink}`);
  return lines.join("\n");
}

/** Returns YYYY-MM-DD for tomorrow in local time. */
export function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
