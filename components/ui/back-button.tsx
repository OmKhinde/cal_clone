"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";

export function BackButton({
  fallbackHref = "/",
  label = "Back",
  className = "",
  onBack
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
  onBack?: () => void;
}) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="darkGhost"
      size="sm"
      className={className}
      onClick={() => {
        if (onBack) {
          onBack();
          return;
        }

        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </Button>
  );
}
