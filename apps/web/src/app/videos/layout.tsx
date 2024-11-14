import { Provider } from "jotai";

export default function VideosLayout({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
