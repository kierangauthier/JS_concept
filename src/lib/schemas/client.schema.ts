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
  postalCode: z.string().trim().max(20, "Trop long").optional().default(""),
  siren: z
    .string()
    .trim()
    .regex(/^\d{9}$|^$/, "Le SIREN doit contenir 9 chiffres")
    .optional()
    .default(""),
  siret: z
    .string()
    .trim()
    .regex(/^\d{14}$|^$/, "Le SIRET doit contenir 14 chiffres")
    .optional()
    .default(""),
  apeCode: z.string().trim().max(10, "Trop long").optional().default(""),
  type: z.enum(["public", "private"], {
    required_error: "Sélectionnez un type",
  }),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
