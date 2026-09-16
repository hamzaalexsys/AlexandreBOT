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
      "fox",
    ])
    .optional(),
  animation: animationSchema.optional(),
  draggable: z.boolean().optional(),
  reveal: z.string().max(220).optional(),
});
export const simulationSchema = z.object({
  type: z.enum([
    "bounce",
    "orbit",
    "pendulum",
    "water",
    "fractions",
    "color",
    "geometry",
    "numberline",
  ]),
  height: z.number().min(1).max(5).optional(),
  gravity: z.number().min(1.6).max(20).optional(),
  elasticity: z.number().min(0.2).max(0.95).optional(),
  speed: z.number().min(0.25).max(3).optional(),
  parts: z.number().int().min(2).max(12).optional(),
  selected: z.number().int().min(0).max(12).optional(),
  length: z.number().min(0.5).max(2.5).optional(),
  red: z.number().int().min(0).max(255).optional(),
  green: z.number().int().min(0).max(255).optional(),
  blue: z.number().int().min(0).max(255).optional(),
  sides: z.number().int().min(3).max(8).optional(),
  rotation: z.number().min(0).max(360).optional(),
  start: z.number().int().min(-5).max(5).optional(),
  jump: z.number().int().min(-5).max(5).optional(),
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
const presentationText = z.string().trim().min(1).max(180);
export const parentPresentationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("table"),
      title: presentationText,
      caption: z.string().trim().max(240).optional(),
      columns: z.array(presentationText).min(2).max(4),
      rows: z.array(z.array(presentationText).min(2).max(4)).max(30),
    })
    .strict(),
  z
    .object({
      kind: z.literal("timeline"),
      title: presentationText,
      caption: z.string().trim().max(240).optional(),
      items: z
        .array(
          z
            .object({
              date: presentationText,
              title: presentationText,
              detail: z.string().trim().max(280),
              tone: z.enum(["good", "attention", "neutral"]),
            })
            .strict(),
        )
        .max(12),
    })
    .strict(),
  z
    .object({
      kind: z.literal("tasks"),
      title: presentationText,
      caption: z.string().trim().max(240).optional(),
      items: z
        .array(
          z
            .object({
              dueDate: presentationText,
              subject: presentationText,
              description: z.string().trim().min(1).max(320),
            })
            .strict(),
        )
        .max(12),
    })
    .strict(),
  z
    .object({
      kind: z.literal("empty"),
      title: presentationText,
      detail: z.string().trim().min(1).max(320),
    })
    .strict(),
]);
export const parentPresentationRequestSchema = z.object({
  source: z.enum([
    "latest_marks",
    "mark_details",
    "competencies",
    "teachers",
    "activities",
    "journey",
    "year_results",
    "subject_results",
    "term_results",
    "attendance",
    "assiduity",
    "homework",
    "exams",
  ]),
  title: z.string().trim().max(120).nullable(),
  caption: z.string().trim().max(180).nullable(),
  subject: z.string().trim().max(60).nullable(),
  schoolYear: z.string().trim().max(20).nullable(),
});
export type ParentPresentationRequest = z.infer<
  typeof parentPresentationRequestSchema
>;
export const replySchema = z.object({
  message: z.string().min(1).max(4500),
  scene: sceneSchema.nullable(),
  boardAction: z.enum(["keep", "new", "update"]).default("keep"),
  removeShapeIds: z.array(z.string().max(40)).max(45).default([]),
  quiz: quizSchema.nullable(),
  suggestions: z.array(z.string().max(220)).max(3),
  presentation: parentPresentationSchema.nullable().optional(),
});
export type Scene = z.infer<typeof sceneSchema>;
export type Simulation = z.infer<typeof simulationSchema>;
export type Shape = z.infer<typeof shapeSchema>;
export type Stroke = { points: string; color: string };
export type ChildDrawingContext = { strokeCount: number };
export type Quiz = z.infer<typeof quizSchema>;
export type ParentPresentation = z.infer<typeof parentPresentationSchema>;
export type Reply = z.infer<typeof replySchema> & {
  source: "openrouter" | "guided";
  toolNames?: string[];
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  presentation?: ParentPresentation | null;
};
