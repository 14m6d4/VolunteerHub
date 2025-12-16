"use client"

import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

const themes = [
	{ id: "default", name: "Default", color: "oklch(0.205 0 0)" },
	{ id: "vintage-paper", name: "Vintage Paper", color: "oklch(0.6180 0.0778 65.5444)" },
	{ id: "neo-brutalism", name: "Neo Brutalism", color: "oklch(0.6489 0.2370 26.9728)" },
	{ id: "doom-64", name: "Doom 64", color: "oklch(0.6083 0.2090 27.0276)" },
	{ id: "nature", name: "Nature", color: "oklch(0.5234 0.1347 144.1672)" },
	{ id: "everforest", name: "Everforest", color: "oklch(0.7195 0.0935 128.3741)" },
	{ id: "bubblegum", name: "Bubblegum", color: "oklch(0.6209 0.1801 348.1385)" },
	{ id: "perpetuity", name: "Perpetuity", color: "oklch(0.5624 0.0947 203.2755)" },
	{ id: "notebook", name: "Notebook", color: "oklch(0.4891 0 0)" },
] as const

export function ThemeSelector() {
	const { customTheme, setCustomTheme } = useTheme()
	const currentTheme = themes.find((t) => t.id === customTheme) ?? themes[0]

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-10 w-[200px] justify-between rounded-lg px-3 border border-border/60"
				>
					<div className="flex items-center gap-2 min-w-0">
						<div
							className="h-4 w-4 rounded-full border border-foreground/20 shrink-0"
							style={{ backgroundColor: currentTheme.color }}
						/>
						<span className="truncate text-sm">{currentTheme.name}</span>
					</div>

					<ChevronDown className="h-4 w-4 opacity-70 shrink-0" />
					<span className="sr-only">Select theme</span>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-48">
				{themes.map((theme) => (
					<DropdownMenuItem
						key={theme.id}
						onClick={() => setCustomTheme(theme.id)}
						className="flex items-center justify-between cursor-pointer"
					>
						<div className="flex items-center gap-3">
							<div
								className="h-4 w-4 rounded-full border border-foreground/20"
								style={{ backgroundColor: theme.color }}
							/>
							<span>{theme.name}</span>
						</div>
						{customTheme === theme.id && <Check className="h-4 w-4" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
