import logoImage from '../../imports/image.png';

export function Logo({ className = "h-12" }: { className?: string }) {
  return (
    <img
      src={logoImage}
      alt="Ferre Alianza"
      className={className}
    />
  );
}
