import { prisma } from "../prisma/client.js";
import type { DayOfWeek } from "../types/enums.js";
import { getDefaultUser, syncDefaultUserCache } from "./defaultUser.service.js";

type AvailabilityRow = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type AvailabilityInput = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export async function getAvailability() {
  const user = await getDefaultUser();
  const schedule = await prisma.availability.findMany({
    where: { userId: user.id },
    orderBy: { id: "asc" }
  });

  return {
    timezone: user.timezone,
    schedule: schedule.map(({ dayOfWeek, startTime, endTime, isActive }: AvailabilityRow) => ({
      dayOfWeek,
      startTime,
      endTime,
      isActive
    }))
  };
}

export async function replaceAvailability(timezone: string, schedule: AvailabilityInput[]) {
  const user = await getDefaultUser();

  return prisma.$transaction(async (tx: any) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { timezone }
    });

    syncDefaultUserCache(updatedUser);

    await tx.availability.deleteMany({
      where: { userId: user.id }
    });

    if (schedule.length > 0) {
      await tx.availability.createMany({
        data: schedule.map((item) => ({
          userId: user.id,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          isActive: item.isActive
        }))
      });
    }

    const updatedSchedule = await tx.availability.findMany({
      where: { userId: user.id },
      orderBy: { id: "asc" }
    });

    return {
      timezone: updatedUser.timezone,
      schedule: updatedSchedule.map(({ dayOfWeek, startTime, endTime, isActive }: AvailabilityRow) => ({
        dayOfWeek,
        startTime,
        endTime,
        isActive
      }))
    };
  });
}
