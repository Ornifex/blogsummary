import { useState, useEffect } from "react";

import type { BlogSummary } from "./types";
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


export default function App() {
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [items, setItems] = useState<BlogSummary[]>([]);
  const [summaries, setSummaries] = useState<BlogSummary[]>([]);
  const [selected, setSelected] = useState({
    classes: new Set<string>(),
    contentTypes: new Set<string>(),
    expansions: new Set<string>()
  });

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
              summary: "No summaries were found on file. Please check your data source.",
              word_stats: {
                original: 0,
                summary: 0,
                reduction_percent: 0
              },
              classSummaries: {},
              contentTypeSummaries: {}
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
            summary: "No summaries were found on file. Please check your data source.",
            word_stats: {
              original: 0,
              summary: 0,
              reduction_percent: 0
            },
            classSummaries: {},
            contentTypeSummaries: {}
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
    "general",
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
                <span>{item.date} {item.source ? item.source : "Unknown Source"}</span>
                <span>
                  Original: {item.word_stats.original} | Summary: {item.word_stats.summary} | Reduction: {item.word_stats.reduction_percent}%
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="general" className="w-full bg-card-foreground text-card rounded-none">
                <TabsList
                  className={`grid w-full grid-cols-12 bg-foreground border-b border-accent text-card rounded-none`}
                >
                  {selectedTabs.map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab.toLowerCase()}
                      className="text-gray-200 rounded-none data-[state=active]:bg-accent data-[state=active]:text-foreground transition-colors truncate max-w-[10ch]"
                      style={{ minWidth: 0 }}
                      title={tab}
                    >
                      <span className="truncate block">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {selectedTabs.map((tab) =>
                  tab === "general" ? (
                    <TabsContent key={tab} value="general">
                      <div
                        className="text-gray-200"
                        dangerouslySetInnerHTML={{ __html: item.summary }}
                      />
                    </TabsContent>
                  ) : (
                    <TabsContent key={tab} value={tab.toLowerCase()}>
                      <div
                        className="text-gray-200"
                        dangerouslySetInnerHTML={{
                          __html:
                            item.classSummaries?.[tab as keyof typeof item.classSummaries]?.summary ||
                            item.contentTypeSummaries?.[tab as keyof typeof item.contentTypeSummaries]?.summary ||
                            "No summary available for this filter."
                        }}
                      />
                    </TabsContent>
                  )
                )}
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
