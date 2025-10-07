import React, { useState, useEffect, useRef } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Check, ChevronsUpDown, X, Tag } from "lucide-react";
import { cn } from "./ui/utils";
import { galleryService } from "../services/galleryService";

interface CategorySelectorProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  label?: string;
}

export function CategorySelector({ value, onChange, disabled, label = "Catégorie (nom du client)" }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setIsCreatingNew(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const loadCategories = async () => {
    const cats = await galleryService.getCategories();
    setCategories(cats);
  };

  const handleSelectCategory = (category: string) => {
    onChange(category);
    setOpen(false);
    setIsCreatingNew(false);
  };

  const handleCreateNew = () => {
    if (newCategoryName.trim()) {
      const trimmedName = newCategoryName.trim();
      onChange(trimmedName);

      // Add to local list if not already present
      if (!categories.includes(trimmedName)) {
        setCategories(prev => [...prev, trimmedName].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })));
      }

      setNewCategoryName("");
      setIsCreatingNew(false);
      setOpen(false);
    }
  };

  const handleClearCategory = () => {
    onChange(undefined);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor="category" className="flex items-center gap-2 text-sm font-medium">
        <Tag className="h-4 w-4" />
        {label}
      </Label>

      <div className="flex gap-2 relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          onClick={() => setOpen(!open)}
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">Sélectionner ou créer une catégorie...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute top-full left-0 mt-2 w-[400px] z-50 bg-popover text-popover-foreground border rounded-md shadow-md max-h-[400px] overflow-hidden">
            <Command>
              <CommandInput placeholder="Rechercher une catégorie..." />
              <CommandList>
                <CommandEmpty>
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Aucune catégorie trouvée</p>
                    <Button
                      size="sm"
                      onClick={() => setIsCreatingNew(true)}
                      className="w-full"
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Créer une nouvelle catégorie
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                {!isCreatingNew && categories.length > 0 && (
                  <>
                    {categories.map((category) => (
                      <CommandItem
                        key={category}
                        value={category}
                        onSelect={() => handleSelectCategory(category)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === category ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {category}
                      </CommandItem>
                    ))}
                    <CommandItem
                      onSelect={() => setIsCreatingNew(true)}
                      className="border-t mt-2 pt-2"
                    >
                      <Tag className="mr-2 h-4 w-4" />
                      <span className="font-medium">Créer une nouvelle catégorie...</span>
                    </CommandItem>
                  </>
                )}

                {isCreatingNew && (
                  <div className="p-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-category" className="text-xs">Nom de la nouvelle catégorie</Label>
                      <Input
                        id="new-category"
                        placeholder="ex: Dupont, Martin, etc."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateNew();
                          } else if (e.key === 'Escape') {
                            setIsCreatingNew(false);
                            setNewCategoryName("");
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateNew}
                        disabled={!newCategoryName.trim()}
                        className="flex-1"
                      >
                        Créer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsCreatingNew(false);
                          setNewCategoryName("");
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}

        {value && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleClearCategory}
            disabled={disabled}
            title="Effacer la catégorie"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {value && (
        <p className="text-xs text-muted-foreground">
          Catégorie sélectionnée : <span className="font-medium">{value}</span>
        </p>
      )}
    </div>
  );
}
