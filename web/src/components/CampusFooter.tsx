'use client';

import { motion } from 'framer-motion';
import type { Brand } from '@erp/common';

interface CampusFooterProps {
  brand: Brand;
}

export function CampusFooter({ brand }: CampusFooterProps) {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-auto py-6 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <div className="font-medium">
            {brand.name} · {brand.address}
          </div>
          <div>
            Powered by{' '}
            <span className="text-brand-primary font-semibold">Verixence</span>
            {' · '}
            <span className="text-brand-primary font-semibold">CampusHoster</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
} 