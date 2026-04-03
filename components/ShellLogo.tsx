export default function ShellLogo({ size = 24 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/shell-white.png"
      alt="Shiny Shell"
      width={size}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
    />
  );
}
