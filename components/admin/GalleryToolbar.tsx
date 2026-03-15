import React from "react";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  ArrowUpAZ,
  ArrowDownAZ,
  Clock,
  ChevronDown,
} from "lucide-react";

type SortBy = "name-asc" | "name-desc" | "date-newest" | "date-oldest";
type ViewMode = "list" | "grid";

interface GalleryToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  onCreateClick: () => void;
  totalCount: number;
}

const SORT_OPTIONS: { value: SortBy; label: string; icon: React.ElementType }[] = [
  { value: "date-newest", label: "Plus récent", icon: Clock },
  { value: "date-oldest", label: "Plus ancien", icon: Clock },
  { value: "name-asc", label: "A → Z", icon: ArrowUpAZ },
  { value: "name-desc", label: "Z → A", icon: ArrowDownAZ },
];

export function GalleryToolbar({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  onCreateClick,
  totalCount,
}: GalleryToolbarProps) {
  const [sortOpen, setSortOpen] = React.useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);
  const currentSort = SORT_OPTIONS.find((o) => o.value === sortBy)!;

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-[18px] font-semibold text-gray-900 tracking-tight">
          Galeries
        </h2>
        <p className="text-[13px] text-gray-400 mt-0.5">
          {totalCount} galerie{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-9 pr-4 w-[200px] rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-colors"
          />
        </div>

        {/* Sort */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="h-9 px-3 rounded-lg border border-gray-200 flex items-center gap-1.5 text-[13px] text-gray-600 hover:border-gray-300 hover:bg-white transition-colors cursor-pointer"
          >
            <currentSort.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{currentSort.label}</span>
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 w-[160px] bg-white border border-gray-100 rounded-lg shadow-lg shadow-gray-200/50 py-1 z-30">
              {SORT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setSortOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors cursor-pointer
                      ${
                        sortBy === option.value
                          ? "text-gray-900 bg-gray-50 font-medium"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }
                    `}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center h-9 rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => onViewModeChange("list")}
            className={`h-full px-2.5 flex items-center transition-colors cursor-pointer ${
              viewMode === "list"
                ? "bg-gray-900 text-white"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
            aria-label="Vue liste"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={`h-full px-2.5 flex items-center transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-gray-900 text-white"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
            aria-label="Vue grille"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* Create */}
        <button
          onClick={onCreateClick}
          className="h-9 px-4 rounded-lg bg-orange-500 text-white text-[13px] font-medium flex items-center gap-2 hover:bg-orange-600 active:scale-[0.98] transition-all cursor-pointer shadow-sm shadow-orange-500/20"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle galerie</span>
        </button>
      </div>
    </div>
  );
}
