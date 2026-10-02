/**
 * A picture of the work: a plain image from `public/work/`, in the two
 * sizes every one has there (the file, and a half-size `-sm.webp` copy).
 *
 * Deliberately plain. These pictures used to go through `next/image`, which
 * resizes on request and leaves when to load to the browser's lazy loading.
 * Both failed in practice: a picture that never appeared on one screen size,
 * and a site's later screens, clipped inside their frame, never loading at
 * all. Here the files are served as they are, and the caller says when to
 * load (`load`): the picture's parts start fetching about two screens before
 * they are seen, all of them at once, whether clipped or not.
 */
export function Picture({
  src,
  alt,
  width,
  height,
  sizes,
  load,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** How wide it is shown, as for `<img sizes>`. */
  sizes: string;
  /** Whether to fetch it yet. Until then it keeps its shape, empty. */
  load: boolean;
  className?: string;
}) {
  const small = src.replace(/\.webp$/, "-sm.webp");
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served as is, on purpose (above)
    <img
      src={load ? src : undefined}
      srcSet={load ? `${small} ${width / 2}w, ${src} ${width}w` : undefined}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      decoding="async"
      className={className}
    />
  );
}
