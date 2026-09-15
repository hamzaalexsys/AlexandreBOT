import type { Shape } from "@/lib/contracts";
export function Sticker({ kind }: { kind: Shape["sticker"] }) {
  if (kind === "ball")
    return (
      <g>
        <circle r="40" fill="#ff9051" />
        <path
          d="M-37-12Q0 18 36-13M-31 24Q0-8 31 24M0-40Q-19 0 0 40"
          fill="none"
          stroke="#ca582e"
          strokeWidth="3"
        />
        <ellipse
          cx="-15"
          cy="-22"
          rx="10"
          ry="6"
          fill="#ffc992"
          transform="rotate(-30)"
        />
      </g>
    );
  if (kind === "sun")
    return (
      <g>
        <g stroke="#ffc344" strokeWidth="5" strokeLinecap="round">
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d="M0-48V-58" transform={`rotate(${i * 36})`} />
          ))}
        </g>
        <circle r="36" fill="#ffd467" />
        <circle cx="-12" cy="-2" r="3" fill="#765121" />
        <circle cx="12" cy="-2" r="3" fill="#765121" />
        <path
          d="M-8 12Q0 20 9 12"
          stroke="#765121"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  if (kind === "cloud")
    return (
      <g>
        <path
          d="M-45 18Q-69-6-39-19Q-27-53 7-28Q42-43 48-10Q74 15 42 26H-35Z"
          fill="#fff"
          stroke="#d9e7fb"
          strokeWidth="3"
        />
        <circle cx="-14" cy="7" r="3" fill="#65779a" />
        <circle cx="13" cy="7" r="3" fill="#65779a" />
        <path
          d="M-5 16Q1 20 7 15"
          stroke="#65779a"
          strokeWidth="2"
          fill="none"
        />
      </g>
    );
  if (kind === "plant")
    return (
      <g>
        <path
          d="M0 35V-22"
          stroke="#428878"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M0 6Q-47 9-40-26Q-4-24 0 6M1-9Q32-49 44-20Q39 3 1-9"
          fill="#69b897"
        />
        <path d="M-21 24H22L16 49H-15Z" fill="#ef9d72" />
        <path
          d="M-27 23H27"
          stroke="#d77d59"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
    );
  if (kind === "rocket")
    return (
      <g transform="rotate(20)">
        <path d="M-12 22Q0 69 12 22" fill="#ffbf53" />
        <path d="M-9 23Q0 48 9 23" fill="#fff0b2" />
        <path d="M-17-10L-32 29L-13 20M17-10L32 29L13 20" fill="#ff805b" />
        <path
          d="M0-50Q-29-25-16 26H16Q29-25 0-50"
          fill="#f8f9ff"
          stroke="#cdd6f1"
          strokeWidth="2"
        />
        <path d="M-13-29Q0-54 13-29" fill="#ff805b" />
        <circle
          cy="-7"
          r="10"
          fill="#96d1f4"
          stroke="#5c73b5"
          strokeWidth="4"
        />
      </g>
    );
  if (kind === "star")
    return (
      <g>
        <path
          d="M0-43L13-14L44-12L20 9L27 39L0 23L-27 39L-20 9L-44-12L-13-14Z"
          fill="#ffda69"
          stroke="#ebbc43"
          strokeWidth="2"
        />
        <circle cx="-10" cy="-1" r="3" fill="#9a7833" />
        <circle cx="10" cy="-1" r="3" fill="#9a7833" />
        <path
          d="M-6 10Q0 16 6 10"
          stroke="#9a7833"
          strokeWidth="2"
          fill="none"
        />
      </g>
    );
  if (kind === "water")
    return (
      <g>
        <path d="M0-46Q-56 11-23 35Q2 55 27 30Q50 8 0-46" fill="#75c9eb" />
        <path
          d="M-18-7Q-32 12-18 21"
          fill="none"
          stroke="#c7eeff"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="-8" cy="15" r="3" fill="#337798" />
        <circle cx="12" cy="15" r="3" fill="#337798" />
      </g>
    );
  if (kind === "moon")
    return (
      <g>
        <path
          d="M12-42Q-52-46-39 18Q-17 64 32 30Q-18 21 12-42"
          fill="#b9b4f1"
          stroke="#928bd1"
          strokeWidth="2"
        />
        <circle cx="-22" cy="8" r="6" fill="#a69ee8" />
      </g>
    );
  if (kind === "fox")
    return (
      <g>
        <path d="M-38-10L-42-50L-11-31M11-31L42-50L38-10" fill="#ee7840" stroke="#c95734" strokeWidth="3" strokeLinejoin="round" />
        <ellipse rx="44" ry="37" fill="#f28a4e" stroke="#c95734" strokeWidth="3" />
        <path d="M-37-44L-18-30L-34-22ZM37-44L18-30L34-22Z" fill="#ffd4b4" />
        <path d="M-27 2Q-18 31 0 33Q18 31 27 2Q13 13 0 5Q-13 13-27 2Z" fill="#fff4e8" />
        <path d="M-23-5Q-15-12-8-5M8-5Q15-12 23-5" fill="none" stroke="#493d49" strokeWidth="4" strokeLinecap="round" />
        <path d="M-6 11L0 17L6 11Z" fill="#493d49" />
        <path d="M-6 23Q0 28 6 23" fill="none" stroke="#a64c3c" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
  return (
    <g>
      <path d="M-32-12L-37-43L-9-28M12-28L39-43L32-10" fill="#f1b176" />
      <ellipse rx="42" ry="35" fill="#f4c394" />
      <circle cx="-15" cy="-5" r="4" fill="#5b4c42" />
      <circle cx="15" cy="-5" r="4" fill="#5b4c42" />
      <path d="M-5 8L0 14L5 8Z" fill="#c98277" />
      <path
        d="M-38 3L-51 0M-38 12L-51 16M38 3L51 0M38 12L51 16"
        stroke="#b78f70"
        strokeWidth="2"
      />
    </g>
  );
}
