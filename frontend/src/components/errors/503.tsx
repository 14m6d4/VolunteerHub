import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import icon503 from "@/assets/503.svg";

export default function Error503() {
  return (
    <div className="grid h-screen items-center bg-background pb-8 lg:grid-cols-2 lg:pb-0">
      <div className="text-center">
        <p className="text-base font-semibold text-muted-foreground">503</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl lg:text-7xl">
          Website is under maintenance!
        </h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground">
          The site is not available at the moment. We'll be back online shortly.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-2">
          <Button size="lg" variant="ghost">
            Contact support <ArrowRight className="ms-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <img
          src={icon503}
          alt="Login visual"
          className="object-contain"
        />
      </div>
    </div>
  );
}