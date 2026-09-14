// SI units. Idealised point mass, level ground, no air resistance.
export function bounceAt(
  time: number,
  {
    height = 3,
    gravity = 9.81,
    elasticity = 0.75,
  }: { height?: number; gravity?: number; elasticity?: number },
) {
  let remaining = Math.max(0, time);
  const drop = Math.sqrt((2 * height) / gravity);
  let bounces = 0;
  if (remaining <= drop)
    return {
      height: Math.max(0, height - 0.5 * gravity * remaining * remaining),
      velocity: -gravity * remaining,
      bounces,
    };
  remaining -= drop;
  let velocity = Math.sqrt(2 * gravity * height) * elasticity;
  bounces = 1;
  for (let i = 0; i < 50; i++) {
    const flight = (2 * velocity) / gravity;
    if (remaining <= flight)
      return {
        height: Math.max(
          0,
          velocity * remaining - 0.5 * gravity * remaining * remaining,
        ),
        velocity: velocity - gravity * remaining,
        bounces,
      };
    remaining -= flight;
    velocity *= elasticity;
    bounces++;
    if (velocity < 0.025) return { height: 0, velocity: 0, bounces };
  }
  return { height: 0, velocity: 0, bounces };
}
export function pendulumAngle(time: number, length: number, gravity = 9.81) {
  return 0.55 * Math.cos(Math.sqrt(gravity / length) * time);
}
