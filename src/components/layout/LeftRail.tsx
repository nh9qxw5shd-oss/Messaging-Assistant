import Card from "@/components/shared/Card";
import Composer from "@/components/composer/Composer";

export default function LeftRail() {
  return (
    <Card className="p-4 flex flex-col gap-0 sticky top-[57px] max-h-[calc(100vh-57px)] overflow-y-auto">
      <Composer />
    </Card>
  );
}
