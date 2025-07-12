import { motion } from "framer-motion";
import { Logo } from "../ui/logo";

export default function Loading() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[400px] p-6"
        >
            <Logo size="xl" animated className="text-primary" />
        </motion.div>

    )
}