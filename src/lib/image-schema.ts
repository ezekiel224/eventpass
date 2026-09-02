import { z } from "zod";
import { MAX_STORED_IMAGE_CHARACTERS } from "@/lib/image-constraints";

export const storedImageSchema = z.string().trim().max(MAX_STORED_IMAGE_CHARACTERS).refine((value) => {
  if (!value) return true;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "Use an http(s) image URL or a PNG, JPEG, WebP, or GIF upload.");

