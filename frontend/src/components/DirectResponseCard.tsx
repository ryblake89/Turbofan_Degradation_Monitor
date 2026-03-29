import { MessageSquare } from "lucide-react";

interface DirectResponseResult {
  response: string;
}

export default function DirectResponseCard({ result }: { result: DirectResponseResult }) {
  return (
    <div className="border border-border rounded-md px-3 py-2 flex items-start gap-2">
      <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
      <div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Domain Knowledge
        </span>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {result.response}
        </p>
      </div>
    </div>
  );
}
