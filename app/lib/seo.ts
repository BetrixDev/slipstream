export const seo = ({
  title,
  description,
  keywords,
  image,
  video,
}: {
  title: string;
  description?: string;
  image?: string;
  keywords?: string;
  video?: {
    url?: string;
    type?: string;
    width?: number;
    height?: number;
  };
}) => {
  const siteName = "Flowble";

  const tags = [
    { title: `${title} - ${siteName}` },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "og:type", content: "website" },
    { name: "og:title", content: title },
    { name: "og:description", content: description },
    { name: "og:site_name", content: siteName },
    ...(image
      ? [
          { name: "twitter:image", content: image },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "og:image", content: image },
        ]
      : []),
    ...(video
      ? [
          { name: "og:video", content: video.url },
          { name: "og:video:type", content: video.type || "video/mp4" },
          { name: "og:video:width", content: video.width?.toString() },
          { name: "og:video:height", content: video.height?.toString() },
          { name: "twitter:card", content: "player" },
          { name: "twitter:player", content: video.url },
          ...(video.width
            ? [
                {
                  name: "twitter:player:width",
                  content: video.width.toString(),
                },
              ]
            : []),
          ...(video.height
            ? [
                {
                  name: "twitter:player:height",
                  content: video.height.toString(),
                },
              ]
            : []),
        ]
      : []),
  ];

  return tags;
};
