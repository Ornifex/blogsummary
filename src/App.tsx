import { useState, useEffect } from "react";

import type { BlogSummary, Classes, ContentType } from "./types";

type SummaryKey = "General" | Classes | ContentType;


import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
} from "@/components/ui/pagination";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"

import { FilterBar } from "@/components/FilterBar";
import { useCallback } from "react";


export default function App() {
  const PAGE_SIZE = 5;
  
  const serializeSelected = useCallback((selected: typeof initialSelected) => ({
    classes: Array.from(selected.classes),
    contentTypes: Array.from(selected.contentTypes),
    expansions: Array.from(selected.expansions),
  }), []);

  type SelectedSerialized = {
    classes?: string[];
    contentTypes?: string[];
    expansions?: string[];
  };

  const deserializeSelected = (obj: SelectedSerialized) => ({
    classes: new Set<string>(obj?.classes || []),
    contentTypes: new Set<string>(obj?.contentTypes || []),
    expansions: new Set<string>(obj?.expansions || []),
  });

  const initialSelected = {
    classes: new Set<string>(),
    contentTypes: new Set<string>(),
    expansions: new Set<string>(),
  };

  const [selected, setSelected] = useState(() => {
    const stored = localStorage.getItem("blogsummary-selected");
    return stored ? deserializeSelected(JSON.parse(stored)) : initialSelected;
  });

  useEffect(() => {
    localStorage.setItem("blogsummary-selected", JSON.stringify(serializeSelected(selected)));
  }, [selected, serializeSelected]);

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [items, setItems] = useState<BlogSummary[]>([]);
  const [summaries, setSummaries] = useState<BlogSummary[]>([]);

  useEffect(() => {
    fetch("/data/summaries.json")
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSummaries(data);
        } else {
          setSummaries([
            {
              id: "dummy-error",
              title: "No Summaries Found",
              original_url: "#",
              date: "Never",
              source: "Nowhere",
              summaries: {
                General: {
                  summary: "No summaries were found on file. Please check your data source.",
                  word_stats: {
                    original: 0,
                    summary: 0,
                    reduction_percent: 0
                  }
                }
              },
            }
          ]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch summaries.json:", err);
        setSummaries([
          {
            id: "dummy-error",
            title: "No Summaries Found",
            original_url: "#",
            date: "",
            source: "",
            summaries: {
              General: {
                summary: "No summaries were found on file. Please check your data source.",
                word_stats: {
                  original: 0,
                  summary: 0,
                  reduction_percent: 0
                }
              }
            },
          }
        ]);
      });
  }, []);

  useEffect(() => {
    setItems(summaries.slice(0, visibleCount));
  }, [visibleCount, summaries]);
  const loadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const selectedTabs = [
    "General",
    ...selected.classes,
    ...selected.contentTypes,
    ...selected.expansions,
  ];

  // i will refactor later
  return (
    <div className="bg-foreground text-card min-h-screen border-accent">
      {/* <h1 className="text-2xl bg-foreground font-bold p-4 text-center">BlogSummary</h1> */}
      <div className="min-h-screen flex w-3xl min-w-3xl mx-auto p-4">
        <div className="flex flex-1 flex-col items-center">
          <FilterBar selected={selected} setSelected={setSelected} />

        {/*<h2 className="text-xl font-semibold mb-4">Latest Summaries</h2>*/}
        {items.map((item) => (
          <div key={item.id} className="hover:scale-[1.01] transition-transform my-2">
          <Card className="bg-card-foreground border-accent-foreground shadow-md rounded-none">
            <CardHeader className="max-w-full">
              <CardTitle className="text-xl max-w-full border-accent-foreground border-b text-white line-clamp-2 pb-2">
                <a href={item.original_url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
              </CardTitle>
              <CardDescription className="text-sm flex justify-between text-gray-400">
                <span>{item.date}</span> 
                <span>{item.source ? item.source : "Unknown Source"}</span>
                
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="General" className="w-full bg-card-foreground text-card rounded-none">
                <TabsList
                  className={`grid w-full grid-cols-12 bg-foreground border-b border-accent text-card rounded-none`}
                >
                  {selectedTabs.map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="text-gray-200 rounded-none data-[state=active]:bg-accent data-[state=active]:text-foreground transition-colors truncate max-w-[10ch]"
                      style={{ minWidth: 0 }}
                      title={tab}
                    >
                      <span className="truncate block">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {selectedTabs.map((tab) => {
                  
                  const summaryData = item.summaries?.[tab as SummaryKey];
                  const wordStats = summaryData?.word_stats;
                  return (
                    <TabsContent key={tab} value={tab}>
                      <div className="text-gray-200" dangerouslySetInnerHTML={{ __html: summaryData?.summary ?? "" }} />
                      <div className="text-sm flex justify-between text-gray-400">
                        <span></span>
                        <span>
                          Original: {wordStats?.original ?? "-"} | Summary: {wordStats?.summary ?? "-"} | Reduction: {wordStats?.reduction_percent ?? "-"}%
                        </span>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
            {/*<CardFooter>
              <span className="text-blue-500 hover:underline">Read full post ↗</span>
            </CardFooter>*/}
          </Card>
        </div>
        ))}


        {visibleCount < summaries.length && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationNext
                  onClick={loadMore}
                  className="cursor-pointer bg-foreground px-4 py-2 rounded-xl transition-colors"
                >
                </PaginationNext>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

    </div>
    </div>
  );
}
