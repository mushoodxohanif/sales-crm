"use client";

import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ScrollToTopButton() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={scrollToTop} aria-label="Scroll to top">
          <ArrowUp className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Scroll to top</TooltipContent>
    </Tooltip>
  );
}
