import { z } from "zod";
import { simulationSchema, type Language, type Scene } from "@/lib/contracts";
export const simulationInput = simulationSchema.extend({
  title: z.string().max(100).optional(),
});
export function createSimulation(input: unknown, lang: Language): Scene {
  const settings = simulationInput.parse(input);
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const titles = {
    bounce: t("Pourquoi le ballon rebondit ?", "لماذا ترتدّ الكرة؟"),
    orbit: t("Une planète autour du Soleil", "كوكب يدور حول الشمس"),
    pendulum: t("Le secret de la balançoire", "سرّ الأرجوحة"),
    water: t("Le voyage d’une goutte", "رحلة قطرة ماء"),
    fractions: t("On partage une pizza ?", "لنقتسم بيتزا؟"),
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
