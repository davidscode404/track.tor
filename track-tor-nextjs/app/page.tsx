import { AlertCircle } from "lucide-react";

import { FertilizeWizard } from "@/components/fertilize/fertilize-wizard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getOptionalEnv } from "@/lib/env";

export default function Home() {
  const mapboxToken = getOptionalEnv("MAP_BOX_ACCESS_TOKEN") ?? "";

  if (!mapboxToken) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Mapbox token is missing</AlertTitle>
          <AlertDescription>
            Set <code>MAP_BOX_ACCESS_TOKEN</code> in <code>.env.local</code> to
            render the map.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return <FertilizeWizard mapboxToken={mapboxToken} />;
}
