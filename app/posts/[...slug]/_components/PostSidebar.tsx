import { TOC } from '@/components/ui/TOC';

export function PostSidebar({
  content,
  headingCount,
  tocConfig,
}: {
  content: string;
  headingCount: number;
  tocConfig: {
    enabled: boolean;
    number: boolean;
    expand: boolean;
    styleSimple: boolean;
  };
}) {
  if (!tocConfig.enabled || headingCount < 3) return null;
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24">
        <TOC
          content={content}
          config={{
            number: tocConfig.number,
            expand: tocConfig.expand,
            styleSimple: tocConfig.styleSimple,
          }}
        />
      </div>
    </aside>
  );
}
