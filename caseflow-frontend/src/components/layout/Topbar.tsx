import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, LogOut, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { initials } from "@/lib/utils";
import { useGlobalSearch } from "@/hooks/useDomain";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const { data: results } = useGlobalSearch(query);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search cases, customers, CPR, passport…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {focused && query.trim().length > 1 && results && (
          <div className="absolute left-0 right-0 top-11 z-40 max-h-80 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {results.cases.length === 0 && results.customers.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No results for "{query}"</p>
            )}
            {results.cases.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Cases</p>
                {results.cases.map((c) => (
                  <button
                    key={c.id}
                    className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left text-sm hover:bg-secondary"
                    onClick={() => {
                      navigate(`/cases/${c.id}`);
                      setQuery("");
                    }}
                  >
                    <span className="font-tag font-medium">{c.caseNumber}</span>
                    <span className="text-xs text-muted-foreground">{c.customer?.fullName}</span>
                  </button>
                ))}
              </div>
            )}
            {results.customers.length > 0 && (
              <div className="p-2 border-t border-border">
                <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Customers</p>
                {results.customers.map((c) => (
                  <button
                    key={c.id}
                    className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left text-sm hover:bg-secondary"
                    onClick={() => {
                      navigate(`/customers/${c.id}`);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">{c.fullName}</span>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar>
              <AvatarFallback>{initials(user?.firstName, user?.lastName)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {user?.firstName} {user?.lastName}
            <p className="text-xs font-normal text-muted-foreground">{user?.role.replace(/_/g, " ")}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <UserIcon className="h-4 w-4" /> Profile & settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()} className="text-destructive">
            <LogOut className="h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
