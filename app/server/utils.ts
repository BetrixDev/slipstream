export function getPlayableMimeType(mimeType: string) {
  if (mimeType === "video/quicktime") {
    return "video/mp4";
  }

  return mimeType;
}
