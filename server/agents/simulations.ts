import { z } from "zod";
import { simulationSchema, type Language, type Scene } from "@/lib/contracts";
export const simulationInput = simulationSchema.extend({
  title: z.string().max(100).optional(),
});

export const conceptLabInput = z
  .object({
    type: z.enum(["color", "geometry", "numberline"]),
    red: z.number().int().min(0).max(255).optional(),
    green: z.number().int().min(0).max(255).optional(),
    blue: z.number().int().min(0).max(255).optional(),
    sides: z.number().int().min(3).max(8).optional(),
    rotation: z.number().min(0).max(360).optional(),
    start: z.number().int().min(-5).max(5).optional(),
    jump: z.number().int().min(-5).max(5).optional(),
    title: z.string().max(100).optional(),
  })
  .strict();

export function createConceptLab(input: unknown, lang: Language): Scene {
  const parsed = conceptLabInput.parse(input);
  const defaults =
    parsed.type === "color"
      ? { red: 255, green: 95, blue: 145 }
      : parsed.type === "geometry"
        ? { sides: 5, rotation: 0 }
        : { start: -2, jump: 5, speed: 1 };
  return createSimulation({ ...defaults, ...parsed }, lang);
}

export function createSimulation(input: unknown, lang: Language): Scene {
  const settings = simulationInput.parse(input);
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const titles = {
    bounce: t("Pourquoi le ballon rebondit ?", "لماذا ترتدّ الكرة؟"),
    orbit: t("Une planète autour du Soleil", "كوكب يدور حول الشمس"),
    pendulum: t("Le secret de la balançoire", "سرّ الأرجوحة"),
    water: t("Le voyage d’une goutte", "رحلة قطرة ماء"),
    fractions: t("On partage une pizza ?", "لنقتسم بيتزا؟"),
    color: t("Le laboratoire des couleurs", "مختبر الألوان"),
    geometry: t("La fabrique des formes", "مصنع الأشكال"),
    numberline: t("Les bonds sur la droite", "قفزات على خط الأعداد"),
  };
  return {
    id: `${settings.type}-${crypto.randomUUID().slice(0, 8)}`,
    title: settings.title || titles[settings.type],
    subtitle: t(
      "À toi d’expérimenter. Change un réglage et observe !",
      "جرّب بنفسك. غيّر إعداداً ثم لاحظ!",
    ),
    shapes: [],
    simulation: settings,
  };
}
