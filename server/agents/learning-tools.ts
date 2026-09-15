import { z } from "zod";
import type { Language, Scene } from "@/lib/contracts";

export const equationInput = z
  .object({
    a: z.number().min(-20).max(20),
    b: z.number().min(-100).max(100),
    c: z.number().min(-100).max(100),
  })
  .strict()
  .refine((value) => Math.abs(value.a) > 1e-9, "a cannot be zero");

function number(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function equation(a: number, b: number, c: number) {
  const left = `${a === 1 ? "" : a === -1 ? "-" : number(a)}x${b === 0 ? "" : b > 0 ? ` + ${number(b)}` : ` − ${number(Math.abs(b))}`}`;
  return `${left} = ${number(c)}`;
}

export function solveLinearEquation(input: unknown, lang: Language) {
  const { a, b, c } = equationInput.parse(input);
  const afterSubtract = c - b;
  const solution = afterSubtract / a;
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const startingEquation = equation(a, b, c);
  const subtractText =
    b === 0
      ? t("Le terme constant est déjà parti", "لا يوجد حد ثابت لإزالته")
      : b > 0
        ? t(`On enlève ${number(b)} des deux côtés`, `نطرح ${number(b)} من الطرفين`)
        : t(`On ajoute ${number(Math.abs(b))} des deux côtés`, `نضيف ${number(Math.abs(b))} إلى الطرفين`);
  const divideText =
    a === 1
      ? t("x est déjà tout seul", "أصبح x وحده")
      : t(`On divise les deux côtés par ${number(a)}`, `نقسم الطرفين على ${number(a)}`);
  const scene: Scene = {
    id: `equation-${crypto.randomUUID().slice(0, 8)}`,
    title: t("Mission équation", "مهمة المعادلة"),
    subtitle: t(
      "On garde la balance en équilibre, étape par étape.",
      "نحافظ على توازن الميزان، خطوة بخطوة.",
    ),
    shapes: [
      {
        id: "equation-start",
        kind: "text",
        x: 400,
        y: 78,
        fill: "#554778",
        text: startingEquation,
        label: t(`Équation de départ : ${startingEquation}`, `المعادلة في البداية: ${startingEquation}`),
        animation: { type: "pulse", duration: 3, distance: 4 },
      },
      {
        id: "balance-left",
        kind: "rect",
        x: 115,
        y: 153,
        w: 230,
        h: 72,
        fill: "#e7ddff",
        label: t("Le côté gauche de la balance", "الطرف الأيسر من الميزان"),
      },
      {
        id: "balance-right",
        kind: "rect",
        x: 455,
        y: 153,
        w: 230,
        h: 72,
        fill: "#d8f3ee",
        label: t("Le côté droit de la balance", "الطرف الأيمن من الميزان"),
      },
      {
        id: "balance-equal",
        kind: "text",
        x: 400,
        y: 194,
        fill: "#ff8b5d",
        text: "=",
        label: t("Les deux côtés sont égaux", "الطرفان متساويان"),
      },
      {
        id: "step-subtract",
        kind: "text",
        x: 400,
        y: 283,
        fill: "#675985",
        text: subtractText,
        label: subtractText,
        reveal: t(
          "La même opération des deux côtés garde l’égalité vraie.",
          "نقوم بالعملية نفسها في الطرفين حتى تبقى المساواة صحيحة.",
        ),
      },
      {
        id: "equation-middle",
        kind: "text",
        x: 400,
        y: 340,
        fill: "#268576",
        text: `${number(a)}x = ${number(afterSubtract)}`,
        label: t(`Après la première étape : ${number(a)} x égale ${number(afterSubtract)}`, `بعد الخطوة الأولى: ${number(a)} x يساوي ${number(afterSubtract)}`),
      },
      {
        id: "step-divide",
        kind: "text",
        x: 400,
        y: 393,
        fill: "#675985",
        text: divideText,
        label: divideText,
      },
      {
        id: "equation-answer",
        kind: "text",
        x: 400,
        y: 452,
        fill: "#e56745",
        text: `x = ${number(solution)} ✦`,
        label: t(`Solution : x égale ${number(solution)}`, `الحل: x يساوي ${number(solution)}`),
        animation: { type: "bounce", duration: 2.4, distance: 7 },
        reveal: t(
          `Vérification : ${equation(a, b, c).replace("x", `(${number(solution)})`)}.`,
          `التحقق: ${equation(a, b, c).replace("x", `(${number(solution)})`)}.`,
        ),
      },
    ],
    simulation: null,
  };
  return {
    kind: "linear-equation",
    equation: startingEquation,
    solution,
    steps: [subtractText, `${number(a)}x = ${number(afterSubtract)}`, divideText, `x = ${number(solution)}`],
    scene,
  };
}
