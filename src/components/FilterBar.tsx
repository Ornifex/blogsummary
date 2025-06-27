import { Button } from "@/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Dispatch, SetStateAction } from "react";
import { CLASSES, CONTENT_TYPES, EXPANSIONS } from "@/types";

const options = {
  classes: CLASSES,
  contentTypes: CONTENT_TYPES,
  expansions: EXPANSIONS,
};

interface FilterBarProps {
  selected: {
    classes: Set<string>;
    contentTypes: Set<string>;
    expansions: Set<string>;
  };
  setSelected: Dispatch<
    SetStateAction<{
      classes: Set<string>;
      contentTypes: Set<string>;
      expansions: Set<string>;
    }>
  >;
}

export function FilterBar({ selected, setSelected }: FilterBarProps) {
  const toggle = (category: keyof typeof selected, value: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev[category]);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      newSet.has(value) ? newSet.delete(value) : newSet.add(value);
      return { ...prev, [category]: newSet };
    });
  };

  const renderDropdown = (
    label: string,
    key: keyof typeof selected,
    items: ReadonlyArray<string>,
  ) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="capitalize bg-foreground border-accent-foreground rounded-none text-card"
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-foreground border-accent-foreground text-card w-auto p-2 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex bg-foreground border-accent-foreground text-card items-center space-x-2"
          >
            <Checkbox
              className="bg-foreground border-accent-foreground text-card"
              id={`${key}-${item}`}
              checked={selected[key].has(item)}
              onCheckedChange={() => toggle(key, item)}
            />
            <Label
              htmlFor={`${key}-${item}`}
              className="capitalize border-accent-foreground text-card"
            >
              {item}
            </Label>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex flex-wrap gap-4 w-3xl justify-between p-4 items-center rounded-none bg-foreground border-0 text-card shadow">
      {renderDropdown("Class", "classes", options.classes)}
      {renderDropdown("Content", "contentTypes", options.contentTypes)}

      {/* {renderDropdown("Expansion", "expansions", options.expansions)} */}
    </div>
  );
}
