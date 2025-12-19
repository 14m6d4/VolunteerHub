"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useRef } from "react"
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import logoImage from "@/assets/logo.png"
import { useNavigate } from "react-router-dom"
import { ModeToggle } from "@/components/mode-toggle"
import { ThemeSelector } from "@/components/theme-selector"

type NavigationLink = {
  href: string
  label: string
  active?: boolean
}

type NavbarUser = {
  name?: string
  username?: string
  email?: string
  avatar?: string
  profilePicture?: string
}

type Navbar01Props = {
  className?: string
  logo?: React.ReactNode
  logoHref?: string
  navigationLinks?: NavigationLink[]
  signInText?: string
  signInHref?: string
  ctaText?: string
  ctaHref?: string
  onSignInClick?: () => void
  onCtaClick?: () => void
  user?: NavbarUser | null
  onLogout?: () => void
  onNotificationClick?: () => void
  hasNotifications?: boolean
  notificationDropdownOpen?: boolean
  notifications?: any[]
  onMarkAllRead?: () => void
  onMarkRead?: (id: string) => void
  onNotificationOpenChange?: (open: boolean) => void
}

// Simple logo component for the navbar - now using imported image
const Logo = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
  return <img src={logoImage || "/placeholder.svg"} alt="Gizmo Logo" className="h-8 w-8" {...props} />
}

// Hamburger icon component
const HamburgerIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("pointer-events-none", className)}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4 12L20 12"
      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
    />
    <path
      d="M4 12H20"
      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
    />
    <path
      d="M4 12H20"
      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
    />
  </svg>
)

// Bell icon component for notifications
const BellIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
)

// User icon component
const UserIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

// Settings icon component
const SettingsIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

// LogOut icon component
const LogOutIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
)

// FileText icon component for Pastes
const FileTextIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

// Image icon component for Gallery
const ImageIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
)

// MessageSquare icon component for Feedback
const MessageSquareIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

// HelpCircle icon component for Help and Support
const HelpCircleIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={className}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
)

// Default navigation links
const defaultNavigationLinks = [
  { href: "/", label: "Home" },
  { href: "/feed", label: "Feed" },
  { href: "/dashboard", label: "Dashboard" },
  // { href: "/search", label: "Search" },
  { href: "/friends", label: "Friends" },
  { href: "/about", label: "About" },
]

export const Navbar01 = React.forwardRef<HTMLElement, Navbar01Props>(
  (
    {
      className,
      logo = <Logo />,
      logoHref = "/",
      navigationLinks = defaultNavigationLinks,
      signInText = "Log In",
      signInHref = "/login",
      ctaText = "Get Started",
      ctaHref = "/signup",
      onSignInClick,
      onCtaClick,
      user = null,
      onLogout,
      onNotificationClick,
      hasNotifications = true,
      notificationDropdownOpen = false,
      notifications = [],
      onMarkAllRead,
      onMarkRead,
      onNotificationOpenChange
    }: Navbar01Props,
    ref,
  ) => {
    const navigate = useNavigate()
    const [isMobile, setIsMobile] = useState(false)
    const containerRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
      const checkWidth = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth
          setIsMobile(width < 768) // 768px is md breakpoint
        }
      }

      checkWidth()

      const resizeObserver = new ResizeObserver(checkWidth)
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current)
      }

      return () => {
        resizeObserver.disconnect()
      }
    }, [])

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLElement | null) => {
        containerRef.current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref],
    )

    // Add navigation handler
    const handleNavigation = (path: string) => {
      navigate(path)
      // If using React Router, use: navigate(path);
    }

    return (
      <header
        ref={combinedRef}
        className={cn(
          "fixed top-0 left-0 z-50 w-full border-b bg-background px-4 md:px-6 [&_*]:no-underline",
          className,
        )}
      >
        <div className="flex h-16 w-full items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {/* Mobile menu trigger */}
            {isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="group h-9 w-9 hover:bg-accent hover:text-accent-foreground"
                    variant="ghost"
                    size="icon"
                  >
                    <HamburgerIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-2">
                  <NavigationMenu className="max-w-none">
                    <NavigationMenuList className="flex-col items-start gap-1">
                      {navigationLinks.map((link, index) => (
                        <NavigationMenuItem key={index} className="w-full">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              handleNavigation(link.href)
                            }}
                            className={cn(
                              "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer no-underline",
                              link.active ? "bg-accent text-accent-foreground" : "text-foreground/80",
                            )}
                          >
                            {link.label}
                          </button>
                        </NavigationMenuItem>
                      ))}
                    </NavigationMenuList>
                  </NavigationMenu>
                </PopoverContent>
              </Popover>
            )}
            {/* Main nav */}
            <div className="flex items-center gap-6">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleNavigation(logoHref)
                }}
                className="flex items-center space-x-2 text-primary hover:text-primary/90 focus:outline-none focus:text-primary active:text-primary transition-colors cursor-pointer"
              >
                <div className="text-2xl">{logo}</div>
                <span className="hidden font-bold text-xl sm:inline-block">VolunteerHub</span>
              </button>
              {/* Navigation menu */}
              {!isMobile && (
                <NavigationMenu className="flex">
                  <NavigationMenuList className="gap-1">
                    {navigationLinks.map((link, index) => (
                      <NavigationMenuItem key={index}>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleNavigation(link.href)
                          }}
                          className={cn(
                            "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer no-underline",
                            link.active
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground/80 hover:text-foreground",
                          )}
                        >
                          {link.label}
                        </button>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              )}
            </div>
          </div>
          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <ThemeSelector />

                {/* Theme toggle - before notification when logged in */}
                <ModeToggle />

                {/* Notification dropdown */}
                <DropdownMenu
                  open={notificationDropdownOpen}
                  onOpenChange={(open) => {
                    if (onNotificationOpenChange) {
                      onNotificationOpenChange(open)
                      return
                    }

                    // Back-compat: fall back to toggle handler
                    if (onNotificationClick) onNotificationClick()
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-10 w-10 rounded-lg hover:bg-accent focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      <BellIcon className="h-5 w-5" />
                      {hasNotifications && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-0">
                    <div className="flex items-center justify-between gap-3 p-4 border-b">
                      <p className="text-sm font-medium leading-none">Notifications</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs"
                        onClick={() => onMarkAllRead?.()}
                        disabled={notifications.length === 0}
                      >
                        Mark all read
                      </Button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6">
                          <p className="text-sm text-muted-foreground">No notifications</p>
                        </div>
                      ) : (
                        <div className="p-2">
                          {notifications.map((n: any) => (
                            <DropdownMenuItem
                              key={n._id}
                              className={cn(
                                "cursor-pointer flex flex-col items-start gap-1 rounded-md p-3",
                                !n.isRead && "bg-accent/50",
                              )}
                              onClick={() => onMarkRead?.(n._id)}
                            >
                              <div className="w-full text-sm font-medium leading-none">{n.title}</div>
                              {n.body ? (
                                <div className="w-full text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                              ) : null}
                              {n.createdAt ? (
                                <div className="w-full text-[11px] text-muted-foreground">
                                  {new Date(n.createdAt).toLocaleString()}
                                </div>
                              ) : null}
                            </DropdownMenuItem>
                          ))}
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Profile dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-accent">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar || user.profilePicture || "/placeholder-user.jpg"} alt={user.name || "User"} />
                        <AvatarFallback className="bg-muted">
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-0">
                    {/* User info section */}
                    <div className="flex items-center gap-3 p-4 border-b">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar || user.profilePicture || "/placeholder-user.jpg"} alt={user.name || "User"} />
                          <AvatarFallback className="bg-muted">
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name || "John Doe"}</p>
                        <p className="text-xs text-muted-foreground leading-none">
                          {user.email || "john.doe@example.com"}
                        </p>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => { if (user?.username) { navigate(`/u/${user.username}`); } else { navigate('/settings'); } }}>
                        <UserIcon className="mr-3 h-4 w-4" />
                        <span>Account</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/pastes")}>
                        <FileTextIcon className="mr-3 h-4 w-4" />
                        <span>Pastes</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/gallery")}>
                        <ImageIcon className="mr-3 h-4 w-4" />
                        <span>Gallery</span>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator />

                    <div className="p-2">
                      <DropdownMenuItem className="cursor-pointer">
                        <MessageSquareIcon className="mr-3 h-4 w-4" />
                        <span>Feedback</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <HelpCircleIcon className="mr-3 h-4 w-4" />
                        <span>Help and Support</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings")}>
                        <SettingsIcon className="mr-3 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator />

                    {/* Logout */}
                    <div className="p-2">
                      <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={onLogout}>
                        <LogOutIcon className="mr-3 h-4 w-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <ThemeSelector />

                {/* Original login/signup buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  onClick={(e) => {
                    e.preventDefault()
                    if (onSignInClick) {
                      onSignInClick()
                    } else {
                      handleNavigation("/login")
                    }
                  }}
                >
                  {signInText}
                </Button>
                <Button
                  size="sm"
                  className="text-sm font-medium px-4 h-9 rounded-md shadow-sm"
                  onClick={(e) => {
                    e.preventDefault()
                    if (onCtaClick) {
                      onCtaClick()
                    } else {
                      handleNavigation("/signup")
                    }
                  }}
                >
                  {ctaText}
                </Button>
                {/* Theme toggle - after Get Started when not logged in */}
                <ModeToggle />
              </>
            )}
          </div>
        </div>
      </header>
    )
  },
)

Navbar01.displayName = "Navbar01"

export { Logo, HamburgerIcon }
