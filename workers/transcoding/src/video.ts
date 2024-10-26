import { execa } from "execa";
import { LOWEST_BITRATE_THRESHOLD } from "cms";
import { logger } from "./log.js";

type Resolution = {
  width: number;
  height: number;
};

function getAspectRatio(width: number, height: number) {
  return width / height;
}

export function generateSmallerResolutions(nativeResolution: Resolution): Resolution[] {
  const aspectRatio = getAspectRatio(nativeResolution.width, nativeResolution.height);

  // Define common height values to scale down to
  const commonHeights = [2160, 1440, 1080, 720, 480];

  // Determine which heights to skip based on the native resolution
  const heightsToSkip = new Set<number>();

  if (nativeResolution.height === 2160) {
    heightsToSkip.add(1440);
  } else if (nativeResolution.height === 1440) {
    heightsToSkip.add(1080);
  }

  // Generate smaller resolutions maintaining the same aspect ratio
  const smallerResolutions: Resolution[] = commonHeights
    .filter((height) => height < nativeResolution.height && !heightsToSkip.has(height))
    .map((height) => {
      let width = Math.round(height * aspectRatio);
      width = Math.round(width / 2) * 2; // ensures width is always divisible to two for ffmpeg
      return { width, height };
    });

  return smallerResolutions;
}

export async function getVideoFileBitrate(path: string) {
  try {
    const { all: transcodedFileBitRateString } = await execa({
      all: true,
    })`ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 ${path}`;

    const transcodedFileBitRate = parseInt(transcodedFileBitRateString);

    return !isNaN(transcodedFileBitRate) ? transcodedFileBitRate : undefined;
  } catch (error) {
    logger.error(`Failed to get video file bitrate for ${path}`, {
      ...(error as any),
      videoFilePath: path,
    });
    return;
  }
}

export function shouldKeepTranscoding(currentBitrate: number) {
  return currentBitrate > LOWEST_BITRATE_THRESHOLD;
}
