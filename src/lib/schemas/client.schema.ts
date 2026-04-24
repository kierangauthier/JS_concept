import { z } from "zod";

/**
 * V4 — Zod schema for client create/update forms.
 *
 * The backend performs its own validation; these rules are for UX only
 * (inline error display before the user hits submit).
 */
export const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(200, "Trop long"),
  contact: z.string().trim().max(200, "Trop long").optional().default(""),
  email: z
    .string()
    .trim()
    .email("Email invalide")
    .max(200, "Trop long"),
  phone: z
    .string()
    .trim()
    .max(40, "Trop long")
    .optional()
    .default(""),
  address: z.string().trim().max(300, "Trop long").optional().default(""),
  city: z.string().trim().max(120, "Trop long").optional().default(""),
  type: z.enum(["public", "private"], {
    required_error: "Sélectionnez un type",
  }),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
