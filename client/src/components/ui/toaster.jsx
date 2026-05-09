import { useToast } from "../../hooks/use-toast"
import { AnimatePresence, motion as Motion } from "framer-motion"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

export function Toaster() {
    const { toasts, dismiss } = useToast()

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map(function ({ id, title, description, variant = "default", ...props }) {
                    return (
                        <Motion.div
                            key={id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            layout
                            className={`
                pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all
                ${variant === "destructive"
                                    ? "border-red-500/50 bg-red-950/90 text-red-50"
                                    : "border-white/10 bg-[#090c14]/90 text-white backdrop-blur-md"}
              `}
                            {...props}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {variant === "destructive" ? (
                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                ) : variant === "success" ? (
                                    <CheckCircle className="h-5 w-5 text-green-400" />
                                ) : (
                                    <Info className="h-5 w-5 text-blue-400" />
                                )}
                            </div>

                            <div className="flex-1 grid gap-1">
                                {title && <div className="text-sm font-semibold">{title}</div>}
                                {description && (
                                    <div className="text-sm opacity-90">{description}</div>
                                )}
                            </div>

                            <button
                                onClick={() => dismiss(id)}
                                className="flex-shrink-0 rounded-md p-1 opacity-50 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </Motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}
