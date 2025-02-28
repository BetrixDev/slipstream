export const PLAN_STORAGE_SIZES: {
  free: number;
  pro: number;
  premium: number;
  ultimate: number;
} = {
  free: 3 * 1024 * 1024 * 1024,
  pro: 100 * 1024 * 1024 * 1024,
  premium: 1024 * 1024 * 1024 * 800,
  ultimate: 1024 * 1024 * 1024 * 1024 * 50,
};

export const FREE_PLAN_VIDEO_RETENION_DAYS = 100;

// Don't transcode any more qualities for a video if the lowest bitrate is already at or below this
export const LOWEST_BITRATE_THRESHOLD = 2.5 * 1000 * 1000;

export const MAX_FILE_SIZE_FREE_TIER = 512 * 1024 * 1024; // "512 mb" -> 512mb in bytes
