/* oxlint-disable nextjs/no-img-element -- Original captures and a local device frame retain their native proportions. */
type MacBookPreviewProps = {
  src: string;
  alt: string;
  priority?: boolean;
};

export function MacBookPreview({
  src,
  alt,
  priority = false,
}: MacBookPreviewProps) {
  return (
    <div className="macbook-preview">
      <img
        className="macbook-hardware"
        src="/screenshots/macbook-frame.png"
        alt=""
        aria-hidden="true"
        width="1536"
        height="1024"
        loading={priority ? 'eager' : 'lazy'}
      />
      <div className="macbook-display">
        <div className="macbook-app-window">
          <img
            className="macbook-app-capture"
            src={src}
            alt={alt}
            width="2940"
            height="1664"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
        </div>
      </div>
    </div>
  );
}
