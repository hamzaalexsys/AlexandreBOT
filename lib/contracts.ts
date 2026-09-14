import { z } from "zod";
export type Language = "fr" | "ar";
export type Role = "student" | "parent";
export const animationSchema = z.object({
  type: z.enum(["float", "pulse", "spin", "swing", "bounce", "orbit"]),
  duration: z.number().min(0.5).max(30).default(3),
  distance: z.number().min(0).max(120).default(15),
});
export const shapeSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(["circle", "rect", "text", "line", "path", "sticker"]),
  x: z.number().min(0).max(800),
  y: z.number().min(0).max(500),
  w: z.number().min(0).max(700).optional(),
  h: z.number().min(0).max(450).optional(),
  r: z.number().min(0).max(200).optional(),
  fill: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#34456b"),
  text: z.string().max(120).optional(),
  label: z.string().max(200).optional(),
  path: z
    .string()
    .max(1600)
    .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/)
    .optional(),
  sticker: z
    .enum([
      "ball",
      "sun",
      "cloud",
      "plant",
      "rocket",
      "star",
      "water",
      "moon",
      "cat",
    ])
    .optional(),
  animation: animationSchema.optional(),
  draggable: z.boolean().optional(),
  reveal: z.string().max(220).optional(),
});
export const simulationSchema = z.object({
  type: z.enum(["bounce", "orbit", "pendulum", "water", "fractions"]),
  height: z.number().min(1).max(5).optional(),
  gravity: z.number().min(1.6).max(20).optional(),
  elasticity: z.number().min(0.2).max(0.95).optional(),
  speed: z.number().min(0.25).max(3).optional(),
  parts: z.number().int().min(2).max(12).optional(),
  selected: z.number().int().min(0).max(12).optional(),
  length: z.number().min(0.5).max(2.5).optional(),
});
export const sceneSchema = z.object({
  id: z.string().min(1).max(60),
  title: z.string().max(100),
  subtitle: z.string().max(180),
  shapes: z.array(shapeSchema).max(45),
  simulation: simulationSchema.nullable().optional(),
});
export const quizSchema = z
  .object({
    question: z.string().max(220),
    options: z.array(z.string().max(100)).min(2).max(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().max(350),
  })
  .refine((q) => q.correctIndex < q.options.length);
export const replySchema = z.object({
  message: z.string().min(1).max(4500),
  scene: sceneSchema.nullable(),
  boardAction: z.enum(["keep", "new", "update"]).default("keep"),
  removeShapeIds: z.array(z.string().max(40)).max(45).default([]),
  quiz: quizSchema.nullable(),
  suggestions: z.array(z.string().max(220)).max(3),
});
export type Scene = z.infer<typeof sceneSchema>;
export type Simulation = z.infer<typeof simulationSchema>;
export type Shape = z.infer<typeof shapeSchema>;
export type Stroke = { points: string; color: string };
export type ChildDrawingContext = { strokeCount: number };
export type Quiz = z.infer<typeof quizSchema>;
export type Reply = z.infer<typeof replySchema> & {
  source: "openrouter" | "guided";
  toolNames?: string[];
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
