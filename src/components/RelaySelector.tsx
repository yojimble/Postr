import { useAppContext } from '@/hooks/useAppContext';
import { Card, CardContent } from '@/components/ui/card';

interface RelaySelectorProps {
  className?: string;
}

export function RelaySelector({ className }: RelaySelectorProps) {
  const { config } = useAppContext();

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-2">Currently posting to:</p>
        <ul className="list-disc list-inside text-sm ml-4">
          {config.relayUrls.map((url) => (
            <li key={url}>{url}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
