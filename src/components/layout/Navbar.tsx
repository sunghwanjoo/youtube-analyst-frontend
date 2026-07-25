"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Play, Search, Sparkles, Upload, Heart, LogOut } from "lucide-react";
import { useSession, signIn, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "검색 & 분석", icon: Search },
  { href: "/seo", label: "SEO & 스크립트", icon: Sparkles },
  { href: "/publish", label: "예약 발행", icon: Upload },
  { href: "/favorites", label: "관심영상", icon: Heart },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <div className="flex items-center h-14 gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-red-600">
            <Play className="w-5 h-5 fill-red-600" />
            <span className="hidden sm:inline">YouTube Analyst</span>
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto flex-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  pathname === href
                    ? "bg-red-50 text-red-600"
                    : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {isPending ? null : session ? (
            <div className="flex items-center gap-2">
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name}
                  className="w-7 h-7 rounded-full"
                />
              )}
              <span className="hidden sm:inline text-sm text-muted-foreground max-w-[120px] truncate">
                {session.user.name}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => signIn.social({ provider: "google", callbackURL: pathname })}
            >
              로그인
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
