/** Builds a display title from brand + model, removing duplications.
 *  Handles:
 *   - brand === model  → "Volvo"
 *   - model starts with brand  → "Volvo FH 540" instead of "Volvo Volvo FH 540"
 *   - empty brand or model
 */
export function truckTitle(t: { brand?: string | null; model?: string | null } | null | undefined): string {
  const brand = (t?.brand ?? "").trim();
  const model = (t?.model ?? "").trim();
  if (!brand) return model;
  if (!model) return brand;
  const b = brand.toLowerCase();
  const m = model.toLowerCase();
  if (b === m) return brand;
  if (m.startsWith(b + " ")) return model;
  if (m.startsWith(b)) return model;
  return `${brand} ${model}`;
}
