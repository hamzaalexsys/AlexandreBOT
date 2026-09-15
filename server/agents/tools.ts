import { repositoryFor, type SchoolRead } from "../school/repository";
import type { Session } from "../auth/session";
import type { Language } from "@/lib/contracts";
import { createConceptLab, createSimulation } from "./simulations";
import { solveLinearEquation } from "./learning-tools";
const descriptions: Record<string, string> = {
  read_child_overview:
    "Read the authorised child's school profile and the observation period.",
  read_learning:
    "Read dated learning observations and skills, including uncertainties.",
  read_attendance:
    "Read recorded absences for the authorised child and period.",
  read_school_messages:
    "Read dated direction/teacher messages; never send or modify a message.",
  read_homework:
    "Read recent homework for the authorised child's current class; never create or modify homework.",
  read_school_journey:
    "Read the authorised child's class-by-class school journey across available years.",
  read_year_results:
    "Read validated exam-note summaries for 2023/2024 and 2024/2025, normalized to 20 with sample sizes. These are indicative calculations, not official report-card averages.",
  read_subject_results:
    "Read validated exam-note averages by subject and school year, normalized to 20 with sample sizes.",
  read_term_results:
    "Read validated exam-note averages by semester and school year, normalized to 20 with sample sizes.",
  get_teaching_guidance:
    "Read age-appropriate teaching principles for ages 6 to 12.",
};
const parentTools = [
  "read_child_overview",
  "read_learning",
  "read_attendance",
  "read_school_messages",
  "read_homework",
  "read_school_journey",
  "read_year_results",
  "read_subject_results",
  "read_term_results",
];
export function availableTools(session: Session) {
  if (session.role === "student")
    return [
      {
        type: "function",
        function: {
          name: "create_interactive_simulation",
          description:
            "Create a manipulable, mathematically implemented SVG experiment ONLY when useful: bouncing ball trajectory, orbit, pendulum, water cycle, pizza fractions. Not needed for ordinary conversation, hints, or updating the current experiment. Return the resulting scene in your response with boardAction new; use update for parameter changes to an existing simulation.",
          parameters: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["bounce", "orbit", "pendulum", "water", "fractions"],
              },
              height: {
                type: "number",
                minimum: 1,
                maximum: 5,
                description:
                  "Initial height in metres, default 3. Never pixels.",
              },
              gravity: {
                type: "number",
                minimum: 1.6,
                maximum: 20,
                description: "m/s²: Earth=9.81, Moon=1.62",
              },
              elasticity: {
                type: "number",
                minimum: 0.2,
                maximum: 0.95,
                description: "Restitution coefficient, default 0.75",
              },
              speed: { type: "number", minimum: 0.25, maximum: 3 },
              parts: { type: "integer", minimum: 2, maximum: 12 },
              selected: { type: "integer", minimum: 0, maximum: 12 },
              length: {
                type: "number",
                minimum: 0.5,
                maximum: 2.5,
                description: "Metres",
              },
              title: { type: "string" },
            },
            required: ["type"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_interactive_concept_lab",
          description:
            "Create one implemented, manipulable concept lab when the child asks to experiment with RGB light colours, regular polygon geometry, or addition/subtraction on a number line. The UI provides live sliders and immediate feedback. Return the exact resulting scene with boardAction new.",
          parameters: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["color", "geometry", "numberline"],
                description:
                  "color mixes RGB light, geometry constructs a regular polygon, numberline animates signed jumps.",
              },
              red: { type: "integer", minimum: 0, maximum: 255 },
              green: { type: "integer", minimum: 0, maximum: 255 },
              blue: { type: "integer", minimum: 0, maximum: 255 },
              sides: { type: "integer", minimum: 3, maximum: 8 },
              rotation: { type: "number", minimum: 0, maximum: 360 },
              start: { type: "integer", minimum: -5, maximum: 5 },
              jump: { type: "integer", minimum: -5, maximum: 5 },
              title: { type: "string", maxLength: 100 },
            },
            required: ["type"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "solve_linear_equation",
          description:
            "Solve one first-degree equation a*x+b=c exactly and create a checked step-by-step balance-board scene. Extract a, b and c from the child's text or attached drawing. Use only for a concrete linear equation, never for a general lesson.",
          parameters: {
            type: "object",
            properties: {
              a: {
                type: "number",
                minimum: -20,
                maximum: 20,
                description: "Non-zero coefficient of x.",
              },
              b: {
                type: "number",
                minimum: -100,
                maximum: 100,
                description: "Constant on the left side.",
              },
              c: {
                type: "number",
                minimum: -100,
                maximum: 100,
                description: "Constant on the right side.",
              },
            },
            required: ["a", "b", "c"],
            additionalProperties: false,
          },
        },
      },
    ];
  return parentTools.map((name) => ({
    type: "function",
    function: {
      name,
      description: descriptions[name],
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  }));
}
export async function executeTool(
  name: string,
  args: string,
  session: Session,
  lang: Language,
) {
  if (!availableTools(session).some((t) => t.function.name === name))
    throw new Error("TOOL_FORBIDDEN");
  const parsed = JSON.parse(args || "{}");
  if (name === "create_interactive_simulation")
    return createSimulation(parsed, lang);
  if (name === "create_interactive_concept_lab")
    return createConceptLab(parsed, lang);
  if (name === "solve_linear_equation")
    return solveLinearEquation(parsed, lang);
  if (!parsed || Array.isArray(parsed) || Object.keys(parsed).length)
    throw new Error("TOOL_ARGUMENTS_REJECTED");
  if (name === "get_teaching_guidance")
    return {
      ageRange: "6–12",
      method:
        "Ask one question at a time, use concrete visuals, explain mistakes kindly, provide hints before solutions, adapt to stated age. Never diagnose or rank children.",
    };
  const section: Record<string, SchoolRead> = {
    read_child_overview: "overview",
    read_learning: "learning",
    read_attendance: "attendance",
    read_school_messages: "messages",
    read_homework: "homework",
    read_school_journey: "journey",
    read_year_results: "yearResults",
    read_subject_results: "subjectResults",
    read_term_results: "termResults",
  };
  return repositoryFor(session).read(section[name], session, lang);
}
