import { fetchVideosData } from "../../data";
import { VideosBoard } from "./videos-board";

export async function VideosBoardServer() {
  const data = await fetchVideosData();

  return <VideosBoard serverVideos={data.serverVideos} />;
}
