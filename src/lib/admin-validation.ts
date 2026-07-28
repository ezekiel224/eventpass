import { z } from "zod";

export const passwordSchema = z.string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[0-9]/, "Password must contain a number.")
  .regex(/[^A-Za-z0-9]/, "Password must contain a symbol.");

export const initialAdminSetupSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(100),
  password: passwordSchema
}).strict();

export const createAdminUserSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  roleIds: z.array(z.string().min(1)).min(1).max(10),
  temporaryPassword: passwordSchema.optional()
}).strict();

export const updateAdminUserSchema = z.object({
  userId: z.string().min(1),
  roleIds: z.array(z.string().min(1)).min(1).max(10),
  active: z.boolean(),
  overrides: z.array(z.object({
    permissionId: z.string().min(1),
    allowed: z.boolean()
  }).strict()).max(100)
}).strict();

export const roleMutationSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(300),
  permissionIds: z.array(z.string().min(1)).max(100)
}).strict();

export const permissionMutationSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(3).max(100).regex(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/),
  description: z.string().trim().min(1).max(300)
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema
}).strict();
