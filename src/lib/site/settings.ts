import "server-only";
import { cache } from "react";
import { getSettings } from "@/lib/settings";
import { normalizeSettings } from "./safe-settings";

/** Site settings for public pages: type-checked and with safe external URLs (see normalizeSettings). */
export const getPublicSettings = cache(async () => normalizeSettings(await getSettings()));
