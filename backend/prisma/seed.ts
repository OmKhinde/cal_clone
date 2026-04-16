import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { PrismaClient } from "@prisma/client";
import type { DayOfWeek } from "../src/types/enums.js";
import {
  DEFAULT_USER_EMAIL,
  DEFAULT_USER_NAME,
  DEFAULT_USER_TIMEZONE,
  DEFAULT_USER_USERNAME
} from "../src/types/index.js";

const prisma = new PrismaClient();
declare const process: { exit(code?: number): void };

function nextWeekdayAt(hour: number, minute: number) {
  let date = new Date();
  date = setMilliseconds(setSeconds(setMinutes(setHours(date, hour), minute), 0), 0);

  for (let index = 1; index <= 14; index += 1) {
    const candidate = addDays(date, index);
    const day = candidate.getDay();
    if (day >= 1 && day <= 5) {
      return candidate;
    }
  }

  return addDays(date, 1);
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {
      name: DEFAULT_USER_NAME,
      username: DEFAULT_USER_USERNAME,
      timezone: DEFAULT_USER_TIMEZONE
    },
    create: {
      name: DEFAULT_USER_NAME,
      email: DEFAULT_USER_EMAIL,
      username: DEFAULT_USER_USERNAME,
      timezone: DEFAULT_USER_TIMEZONE
    }
  });

  await prisma.booking.deleteMany();
  await prisma.eventType.deleteMany({ where: { userId: user.id } });
  await prisma.availability.deleteMany({ where: { userId: user.id } });

  await prisma.eventType.createMany({
    data: [
      {
        userId: user.id,
        title: "15 Minute Chat",
        description: "A quick introductory conversation.",
        duration: 15,
        slug: "15min",
        color: "#111827",
        periodType: "ROLLING",
        periodDays: 30
      },
      {
        userId: user.id,
        title: "30 Minute Meeting",
        description: "A focused sync call.",
        duration: 30,
        slug: "30min",
        color: "#6366f1",
        periodType: "ROLLING",
        periodDays: 30
      },
      {
        userId: user.id,
        title: "60 Minute Deep Dive",
        description: "A longer technical walkthrough.",
        duration: 60,
        slug: "60min",
        color: "#059669",
        periodType: "ROLLING",
        periodDays: 30
      }
    ]
  });

  const weekdays: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  await prisma.availability.createMany({
    data: weekdays.map((dayOfWeek) => ({
      userId: user.id,
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true
    }))
  });

  const meeting = await prisma.eventType.findFirstOrThrow({ where: { userId: user.id, slug: "30min" } });
  const startTime = nextWeekdayAt(10, 0);

  await prisma.booking.create({
    data: {
      eventTypeId: meeting.id,
      bookerName: "Alice Johnson",
      bookerEmail: "alice@example.com",
      startTime,
      endTime: new Date(startTime.getTime() + meeting.duration * 60_000),
      status: "ACCEPTED",
      attendees: {
        create: {
          email: "alice@example.com",
          name: "Alice Johnson",
          timeZone: user.timezone,
          language: "en",
          isPrimary: true
        }
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
