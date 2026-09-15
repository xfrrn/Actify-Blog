"use client";

import type { ComponentProps } from "react";
import { useLanguage } from "@/components/layout/language-provider";

export function ScrollableTable(props: ComponentProps<"table">) {
  const { t } = useLanguage();
  return <div className="my-6 border border-border rounded-xl overflow-hidden">
    <div className="w-full overflow-x-auto" tabIndex={0} role="region" aria-label={t.table}>
      <table className="m-0! w-full min-w-full border-separate border-spacing-0" {...props} />
    </div>
  </div>;
}
