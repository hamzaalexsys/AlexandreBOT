import type { Language, Scene, Quiz } from "./contracts";
export type LessonId = "fractions" | "water" | "addition" | "language";
export const lessonIds: LessonId[] = [
  "fractions",
  "water",
  "addition",
  "language",
];
export function lesson(
  id: LessonId,
  lang: Language,
): { scene: Scene; quiz: Quiz; intro: string } {
  const t = (fr: string, ar: string) => (lang === "fr" ? fr : ar);
  const text = (
    id: string,
    x: number,
    y: number,
    value: string,
    fill = "#34456b",
  ) => ({ id, kind: "text" as const, x, y, text: value, fill });
  if (id === "fractions")
    return {
      intro: t(
        "On partage un goûter ? Voici une tablette coupée en 4 parts égales. Deux parts sont orange : c’est 2 sur 4. Touche une part pour en parler !",
        "لنقتسم وجبة خفيفة! قسّمنا اللوح إلى ٤ أجزاء متساوية. جزآن باللون البرتقالي: هذا ٢ من ٤. المس جزءاً لنتحدث عنه!",
      ),
      scene: {
        id,
        title: t("Le plaisir de partager", "متعة المشاركة"),
        subtitle: t(
          "4 parts égales. Combien sont colorées ?",
          "٤ أجزاء متساوية. كم جزءاً ملوّناً؟",
        ),
        shapes: [
          ...Array.from({ length: 4 }, (_, i) => ({
            id: `part-${i}`,
            kind: "rect" as const,
            x: 172 + i * 117,
            y: 135,
            w: 106,
            h: 140,
            fill: i < 2 ? "#f4a45c" : "#65826c",
            label: t(
              `Part ${i + 1} sur 4, ${i < 2 ? "colorée" : "non colorée"}`,
              `الجزء ${i + 1} من ٤، ${i < 2 ? "ملوّن" : "غير ملوّن"}`,
            ),
          })),
          text(
            "caption",
            400,
            325,
            t("2 parts sur 4 = une moitié", "جزآن من أربعة = النصف"),
          ),
          text("fraction", 400, 390, "2/4 = 1/2", "#af7049"),
        ],
      },
      quiz: {
        question: t(
          "Si tu colories encore une part, quelle fraction sera colorée ?",
          "إذا لوّنت جزءاً آخر، فما الكسر الملوّن؟",
        ),
        options: ["1/4", "3/4", "4/4"],
        correctIndex: 1,
        explanation: t(
          "Bravo ! Deux parts + une part = trois parts sur quatre, donc 3/4.",
          "أحسنت! جزآن + جزء = ثلاثة أجزاء من أربعة، أي ٣/٤.",
        ),
      },
    };
  if (id === "water")
    return {
      intro: t(
        "Une goutte part en voyage ! Le soleil chauffe l’eau, la vapeur monte, forme des nuages, puis retombe en pluie. Touche une étape pour l’explorer.",
        "تسافر قطرة الماء! تسخّن الشمس الماء فيتبخّر، ثم تتكوّن السحب ويهطل المطر. المس مرحلة لاكتشافها.",
      ),
      scene: {
        id,
        title: t("Le grand voyage de l’eau", "رحلة الماء الكبيرة"),
        subtitle: t(
          "Touche le soleil, le nuage ou la pluie",
          "المس الشمس أو السحابة أو المطر",
        ),
        shapes: [
          {
            id: "sun",
            kind: "circle",
            x: 142,
            y: 105,
            r: 44,
            fill: "#f7c567",
            label: t(
              "Le soleil chauffe l’eau et provoque l’évaporation",
              "تسخّن الشمس الماء فيتبخّر",
            ),
          },
          {
            id: "sea",
            kind: "rect",
            x: 95,
            y: 330,
            w: 610,
            h: 55,
            fill: "#76c8d2",
            label: t(
              "L’eau se rassemble dans les mers et les lacs",
              "تتجمّع المياه في البحار والبحيرات",
            ),
          },
          ...Array.from({ length: 4 }, (_, i) => ({
            id: `cloud-${i}`,
            kind: "circle" as const,
            x: 420 + i * 44,
            y: 112 + (i % 2) * 12,
            r: 38,
            fill: "#d8ece5",
            label: t(
              "La vapeur refroidit et se condense en gouttes",
              "يبرد البخار ويتكاثف إلى قطرات",
            ),
          })),
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `rain-${i}`,
            kind: "line" as const,
            x: 440 + i * 35,
            y: 205,
            w: 0,
            h: 50,
            fill: "#76c8d2",
            label: t(
              "Les gouttes retombent : la précipitation",
              "تسقط القطرات: هذا هو الهطول",
            ),
          })),
          text(
            "evaporation",
            230,
            250,
            t("↑ Évaporation", "↑ التبخّر"),
            "#f7c567",
          ),
          text("cloud-text", 490, 60, t("Condensation", "التكاثف")),
          text("rain-text", 585, 297, t("La pluie ↓", "المطر ↓")),
        ],
      },
      quiz: {
        question: t(
          "Qu’est-ce qui fait s’évaporer l’eau ?",
          "ما الذي يجعل الماء يتبخّر؟",
        ),
        options: [
          t("La chaleur du soleil", "حرارة الشمس"),
          t("Les poissons", "الأسماك"),
          t("La lune", "القمر"),
        ],
        correctIndex: 0,
        explanation: t(
          "La chaleur du soleil transforme l’eau liquide en vapeur d’eau.",
          "تحوّل حرارة الشمس الماء السائل إلى بخار ماء.",
        ),
      },
    };
  if (id === "addition")
    return {
      intro: t(
        "Comptons ensemble ! Trois fruits à gauche et deux à droite. Touche chaque fruit, puis trouve le total.",
        "لنعدّ معاً! ثلاث ثمرات على اليسار وثمرتان على اليمين. المس كل ثمرة ثم احسب المجموع.",
      ),
      scene: {
        id,
        title: t("Les nombres font équipe", "الأعداد تتعاون"),
        subtitle: t(
          "Réunir deux groupes, c’est additionner",
          "جمع مجموعتين يعني الإضافة",
        ),
        shapes: [
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `fruit-${i}`,
            kind: "circle" as const,
            x: i < 3 ? 155 + i * 90 : 510 + (i - 3) * 90,
            y: 195,
            r: 34,
            fill: i < 3 ? "#f4a45c" : "#afd38a",
            label: t(`Fruit ${i + 1}`, `الثمرة ${i + 1}`),
          })),
          text("plus", 413, 210, "+"),
          text("equation", 400, 320, "3 + 2 = ?", "#f7c567"),
        ],
      },
      quiz: {
        question: t("Combien de fruits en tout ?", "كم ثمرة لدينا؟"),
        options: ["4", "5", "6"],
        correctIndex: 1,
        explanation: t(
          "3 puis encore 2 : 4, 5 ! Il y a 5 fruits.",
          "٣ ثم نضيف ٢: ٤، ٥! لدينا ٥ ثمرات.",
        ),
      },
    };
  return {
    intro: t(
      "Une phrase, c’est une petite histoire. Qui fait l’action ? Que fait-il ? Touche les mots pour en parler.",
      "الجملة حكاية صغيرة. من يقوم بالفعل؟ وماذا يفعل؟ المس الكلمات لنتحدث عنها.",
    ),
    scene: {
      id,
      title: t("La fabrique des phrases", "مصنع الجمل"),
      subtitle: t("Qui ? Fait quoi ?", "من؟ يفعل ماذا؟"),
      shapes: [
        {
          id: "subject",
          kind: "rect",
          x: 135,
          y: 155,
          w: 210,
          h: 85,
          fill: "#79966a",
          label: t(
            "Le chat est le sujet : c’est lui qui fait l’action",
            "القطّ هو من يقوم بالفعل",
          ),
        },
        {
          id: "verb",
          kind: "rect",
          x: 390,
          y: 155,
          w: 260,
          h: 85,
          fill: "#d58f54",
          label: t("saute est le verbe : c’est l’action", "يقفز هو الفعل"),
        },
        text("word-subject", 240, 208, t("Le chat", "القطّ")),
        text("word-verb", 520, 208, t("saute.", "يقفز")),
        text("who", 240, 305, t("Qui ?", "من؟")),
        text("does", 520, 305, t("Fait quoi ?", "يفعل ماذا؟")),
      ],
    },
    quiz: {
      question: t(
        "Quel mot indique l’action ?",
        "ما الكلمة التي تدلّ على الفعل؟",
      ),
      options: [t("chat", "القطّ"), t("saute", "يقفز")],
      correctIndex: 1,
      explanation: t(
        "« Saute » est le verbe. Il nous dit ce que fait le chat.",
        "«يقفز» هو الفعل، ويخبرنا بما يقوم به القطّ.",
      ),
    },
  };
}
