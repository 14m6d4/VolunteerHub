import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import icon403 from "@/assets/403.svg";
import { useNavigate } from "react-router-dom";

export default function Error403() {
  const navigate = useNavigate();

  return (
    <div className="grid h-screen items-center bg-background pb-8 lg:grid-cols-2 lg:pb-0">
      <div className="text-center">
        <p className="text-base font-semibold text-muted-foreground">403</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl lg:text-7xl">
          Access Forbidden
        </h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground">
          You don't have necessary permission to view this resource.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-2">
          <Button size="lg" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button size="lg" variant="ghost" onClick={() => navigate("/")}>
            Back to home <ArrowRight className="ms-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <img
          src={icon403}
          alt="Login visual"
          className="object-contain"
        />
      </div>
    </div>
  );
}