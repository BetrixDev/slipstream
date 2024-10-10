import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useMemo } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

type WordyDateProps = {
  timestamp: number;
};

export function WordyDate({ timestamp }: WordyDateProps) {
  const date = useMemo(() => {
    return dayjs.utc(timestamp).local().format("MMMM D, YYYY");
  }, [timestamp]);

  return date;
}
