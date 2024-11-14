import { fetchVideosData } from "../../data";
import { StorageUsedText } from "./storage-used-text";

export async function StorageUsedTextServer() {
  const data = await fetchVideosData();

  return (
    <StorageUsedText maxStorage={data.userMaxStorage} totalStorageUsed={data.totalStorageUsed} />
  );
}
