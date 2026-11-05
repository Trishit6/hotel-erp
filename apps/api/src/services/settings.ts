import { eq } from "drizzle-orm";
import { db } from "../database/client";
import { systemSettings } from "../database/schema";
import { seedSettings } from "../database/seed-data";
import { logActivity } from "./activity";
import { mapSettings } from "./mappers";

const SETTINGS_ID = "default";

export type SettingsInput = Partial<{
  hotelName: string;
  legalName: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  currency: string;
  taxRateBps: number;
  checkInTime: string;
  checkOutTime: string;
  invoicePrefix: string;
  logoUrl: string;
}>;

async function ensureSettingsRow() {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.id, SETTINGS_ID))
    .limit(1);
  if (existing) return existing;
  await db
    .insert(systemSettings)
    .values({ ...seedSettings, updatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const [created] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.id, SETTINGS_ID))
    .limit(1);
  return created;
}

export async function getSettings() {
  return mapSettings(await ensureSettingsRow());
}

export async function getPublicSettings() {
  const settings = await getSettings();
  return {
    hotelName: settings.hotelName,
    email: settings.email,
    phone: settings.phone,
    website: settings.website,
    address: settings.address,
    city: settings.city,
    state: settings.state,
    postalCode: settings.postalCode,
    country: settings.country,
    timezone: settings.timezone,
    currency: settings.currency,
    taxRateBps: settings.taxRateBps,
    taxRatePercent: settings.taxRatePercent,
    checkInTime: settings.checkInTime,
    checkOutTime: settings.checkOutTime,
    logoUrl: settings.logoUrl,
  };
}

export async function getTaxRateBps(): Promise<number> {
  const [row] = await db
    .select({ taxRateBps: systemSettings.taxRateBps })
    .from(systemSettings)
    .where(eq(systemSettings.id, SETTINGS_ID))
    .limit(1);
  return row?.taxRateBps ?? seedSettings.taxRateBps;
}

export async function updateSettings(
  input: SettingsInput,
  actor: { id: string; name: string },
) {
  await ensureSettingsRow();
  await db
    .update(systemSettings)
    .set({
      ...input,
      updatedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(systemSettings.id, SETTINGS_ID));
  await logActivity(db, {
    actor: actor.name,
    action: "Updated property settings",
    detail: "Hotel profile and tax configuration changed",
    tone: "info",
    userId: actor.id,
  });
  return getSettings();
}
