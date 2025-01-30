import Link from 'next/link';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { Analytics } from '@vercel/analytics/react';
import Providers from 'app/(dashboard)/providers';


export default function ENSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-screen w-full flex-col bg-purple-50">
        <div className="flex flex-col sm:gap-10 sm:pt-4 sm:px-14 pb-16">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <DashboardBreadcrumb />
            {/* <SearchInput /> */}
          </header>
          <div className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4">
            {children}
          </div>
        </div>
      </div>
      <footer className="mt-16 bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4">
                  Participating Institutions
                </h3>
                <div className="space-y-4">
                  <a
                    href="https://www.ens.psl.eu"
                    className="flex items-center hover:text-blue-600"
                  >
                    <img
                      src="/ens-logo.png"
                      alt="ENS Paris"
                      className="h-8 w-auto mr-2"
                    />
                    <span>École Normale Supérieure Paris</span>
                  </a>
                  <a
                    href="https://missionspubliques.org"
                    className="flex items-center hover:text-blue-600"
                  >
                    <img
                      src="/mp-logo.png"
                      alt="Mission Publique"
                      className="h-8 w-auto mr-2"
                    />
                    <span>Mission Publique</span>
                  </a>
                  <a
                    href="https://harmonica.ai"
                    className="flex items-center hover:text-blue-600"
                  >
                    <img
                      src="/harmonica-logo.png"
                      alt="Harmonica"
                      className="h-8 w-auto mr-2"
                    />
                    <span>Harmonica AI</span>
                  </a>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li>
                    <a href="/about" className="hover:text-blue-600">
                      About the Summit
                    </a>
                  </li>
                  <li>
                    <a href="/help" className="hover:text-blue-600">
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a href="/contact" className="hover:text-blue-600">
                      Contact Us
                    </a>
                  </li>
                  <li>
                    <a href="/privacy" className="hover:text-blue-600">
                      Privacy Policy
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4">Connect With Us</h3>
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <a
                      href="https://twitter.com/ENSparis"
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {/* Twitter icon path */}
                      </svg>
                    </a>
                    <a
                      href="https://linkedin.com/school/ecolenormalesuperieure"
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {/* LinkedIn icon path */}
                      </svg>
                    </a>
                  </div>
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Contact</h4>
                    <p className="text-sm text-gray-600">
                      Email: ai-summit@ens.psl.eu
                      <br />
                      Phone: +33 (0)1 44 32 30 00
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-12 pt-8 text-center text-sm text-gray-600">
              <p>© 2025 Harmonica AI. All rights reserved.</p>
              <p className="mt-2">
                A collaboration between ENS Paris, Mission Publique, and
                Harmonica AI
              </p>
            </div>
          </div>
        </footer>
      <Analytics />
    </Providers>
  );
}

function DashboardBreadcrumb() {
  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/ens">{'ENS Workshop'}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
