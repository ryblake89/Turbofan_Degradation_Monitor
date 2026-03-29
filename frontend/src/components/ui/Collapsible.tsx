import { useState } from "react";
import { Info, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Collapsible({
  title,
  children,
  variant = "card",
}: {
  title: string;
  children: React.ReactNode;
  variant?: "card" | "inline";
}) {
  const [open, setOpen] = useState(false);

  if (variant === "inline") {
    return (
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3 w-3 shrink-0" />
          <span>{title}</span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </div>
        {open && (
          <div
            className="mt-2 text-xs text-muted-foreground space-y-1 pl-4 border-l border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        )}
      </button>
    );
  }

  return (
    <Card size="sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
      </button>
      {open && (
        <CardContent className="pt-0 text-xs text-muted-foreground space-y-2">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
